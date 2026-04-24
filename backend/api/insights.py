import datetime
from dateutil.relativedelta import relativedelta

from django.utils import timezone
from django.db.models import Sum
from django.core.cache import cache

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import MLTrainingRow

class InsightsEngineView(APIView):
    """
    API View capable of generating comprehensive financial insights from the
    machine learning annotated MLTrainingRow table.
    
    Includes features like: month-on-month comparison, category aggregation, 
    and unusual spending spike detection.
    """
    permission_classes = [IsAuthenticated]

    def get_month_range(self, date_obj):
        """
        Takes a datetime.date object and returns the timezone-aware start
        and end datetimes for the month.
        """
        start_date = date_obj.replace(day=1)
        next_month_date = start_date + relativedelta(months=1)
        
        tz = timezone.get_current_timezone()
        start_datetime = timezone.make_aware(datetime.datetime.combine(start_date, datetime.time.min), tz)
        end_datetime = timezone.make_aware(datetime.datetime.combine(next_month_date, datetime.time.min), tz)
        
        return start_datetime, end_datetime

    def get(self, request):
        user = request.user.db_user
        month_str = request.query_params.get('month')
        
        # 1. Parse constraints and default to current month if None
        if month_str:
            try:
                target_date = datetime.datetime.strptime(month_str, '%Y-%m').date()
            except ValueError:
                return Response(
                    {"error": "Invalid month format. Expected YYYY-MM."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            target_date = timezone.localtime(timezone.now()).date()
            
        # Check Cache to prevent loading DB for dashboard views
        cache_key = f"insights_{user.id}_{target_date.strftime('%Y-%m')}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        # 2. Extract Date Ranges
        current_start, current_end = self.get_month_range(target_date)
        prev_start, prev_end = self.get_month_range(target_date - relativedelta(months=1))
        
        # 3. Query base sets
        current_rows = MLTrainingRow.objects.filter(
            user=user, 
            occurredAt__gte=current_start, 
            occurredAt__lt=current_end
        )
        prev_rows = MLTrainingRow.objects.filter(
            user=user, 
            occurredAt__gte=prev_start, 
            occurredAt__lt=prev_end
        )
        
        # 4. Compute Totals 
        current_total = current_rows.aggregate(total=Sum('amount'))['total'] or 0.0
        prev_total = prev_rows.aggregate(total=Sum('amount'))['total'] or 0.0
        
        if prev_total > 0:
            percent_change = ((current_total - prev_total) / prev_total) * 100
        else:
            percent_change = 100.0 if current_total > 0 else 0.0
            
        # 5. Group top categories utilizing DB grouping
        curr_categories = current_rows.exclude(predictedCategory__isnull=True)\
                                      .exclude(predictedCategory="")\
                                      .values('predictedCategory')\
                                      .annotate(total=Sum('amount'))\
                                      .order_by('-total')
        
        top_categories = []
        for cat in curr_categories[:5]:
            cat_total = cat['total']
            percentage = (cat_total / current_total) * 100 if current_total > 0 else 0
            top_categories.append({
                "category": cat['predictedCategory'],
                "amount": round(cat_total, 2),
                "percentage": round(percentage, 2)
            })
            
        # 6. Spikes detection using prior month breakdown
        prev_categories = {
            c['predictedCategory']: c['total'] 
            for c in prev_rows.exclude(predictedCategory__isnull=True)\
                              .exclude(predictedCategory="")\
                              .values('predictedCategory')\
                              .annotate(total=Sum('amount'))
        }
        
        spikes = []
        for cat in curr_categories:
            cat_name = cat['predictedCategory']
            curr_cat_total = cat['total']
            prev_cat_total = prev_categories.get(cat_name, 0.0)
            
            # Spike Threshold: current > 1.5 * previous AND absolute diff > 1000
            if curr_cat_total > 1.5 * prev_cat_total and (curr_cat_total - prev_cat_total) > 1000:
                spikes.append({
                    "category": cat_name,
                    "increase": round(curr_cat_total - prev_cat_total, 2)
                })
        
        top_cat_name = top_categories[0]['category'] if top_categories else None
        
        savings_hint = None
        if top_categories:
            top_perc = top_categories[0]['percentage']
            savings_hint = f"You spent {round(top_perc)}% on {top_cat_name} — consider reducing this next month."
            
        # 7. Aggregate Response
        response_data = {
            "total_spent": round(current_total, 2),
            "previous_total": round(prev_total, 2),
            "percent_change": round(percent_change, 2),
            "top_categories": top_categories,
            "spikes": spikes,
            "top_category": top_cat_name,
            "savings_hint": savings_hint
        }
        
        # Cache memory assignment for 15 minutes (900 seconds)
        cache.set(cache_key, response_data, 60 * 15)
        
        return Response(response_data)
