import jwt
import csv
import io
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from django.db import transaction as django_transaction
from django.db.models import Q, Sum
from django.utils import timezone as django_timezone
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import (
    User, Account, Category, Transaction, Budget, 
    InsightSnapshot, RecurringPattern, MLTrainingRow
)
from .serializers import (
    UserSerializer, AccountSerializer, CategorySerializer, TransactionSerializer, 
    BudgetSerializer, InsightSnapshotSerializer, RecurringPatternSerializer
)
from .user_sync import sync_user_record
from .ml_services import get_ml_summary, predict_category


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _str_id(value):
    return str(value) if value else None


def _safe_percent_change(current, previous):
    if not previous:
        return None
    return round(((current - previous) / previous) * 100, 2)


def _period_bounds(period, now):
    if period == 'week':
        current_start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=6)
        previous_start = current_start - timedelta(days=7)
    elif period == 'year':
        current_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_start = current_start.replace(year=current_start.year - 1)
    else:
        current_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_end_marker = current_start - timedelta(days=1)
        previous_start = previous_end_marker.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    return current_start, now, previous_start, current_start


def _period_label(period):
    return {
        'week': 'week',
        'month': 'month',
        'year': 'year',
    }.get(period, 'period')


def _month_bounds(now):
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def _category_snapshot(category):
    if category:
        return {
            'categoryId': str(category.id),
            'categoryName': category.name,
            'icon': category.icon,
            'color': category.color,
        }
    return {
        'categoryId': None,
        'categoryName': 'Uncategorized',
        'icon': '🏷️',
        'color': '#64748B',
    }


def _tone_for_delta(delta_amount):
    if delta_amount < 0:
        return 'positive'
    if delta_amount > 0:
        return 'warning'
    return 'neutral'


def _amount_or_none(value):
    return round(value, 2) if value is not None else None


def _build_insight_cards(
    *,
    period,
    summary,
    top_category,
    highest_expense,
    budget_alert,
    peak_day,
):
    cards = []
    period_label = _period_label(period)
    delta_amount = summary['deltaAmount']
    delta_pct = summary['deltaPct']

    if delta_pct is not None:
        direction = 'more' if delta_amount > 0 else 'less'
        cards.append({
            'id': 'spend-change',
            'kind': 'spend_change',
            'title': 'Spending Change',
            'message': f"Spent {abs(delta_pct):.0f}% {direction} than last {period_label}.",
            'tone': _tone_for_delta(delta_amount),
            'amount': abs(delta_amount),
            'footer': f"{summary['transactionCount']} expenses this {period_label}",
        })

    if top_category:
        if top_category['changePct'] is not None:
            footer = f"{top_category['changePct']:+.0f}% vs last {period_label}"
        else:
            footer = f"{top_category['transactionCount']} transactions"
        cards.append({
            'id': 'top-category',
            'kind': 'top_category',
            'title': 'Top Category',
            'message': f"{top_category['categoryName']} drove {top_category['percentage']:.0f}% of spending.",
            'tone': 'warning' if top_category['percentage'] >= 40 else 'positive',
            'amount': top_category['amount'],
            'footer': footer,
        })

    if period == 'month' and budget_alert:
        progress_pct = budget_alert['budgetProgress'] * 100
        remaining = budget_alert['budgetLimit'] - budget_alert['budgetSpent']
        cards.append({
            'id': 'budget-watch',
            'kind': 'budget_watch',
            'title': 'Budget Watch',
            'message': f"{budget_alert['categoryName']} is at {progress_pct:.0f}% of its monthly budget.",
            'tone': 'danger' if budget_alert['budgetProgress'] >= 1 else 'warning',
            'amount': budget_alert['budgetSpent'],
            'footer': (
                f"Over by {abs(remaining):.2f}"
                if remaining < 0
                else f"{remaining:.2f} remaining"
            ),
        })

    if highest_expense:
        label = highest_expense['note'] or highest_expense['categoryName']
        cards.append({
            'id': 'largest-expense',
            'kind': 'largest_transaction',
            'title': 'Largest Expense',
            'message': label,
            'tone': 'danger' if highest_expense['amount'] >= max(summary['averageExpense'] * 1.75, 1) else 'neutral',
            'amount': highest_expense['amount'],
            'footer': highest_expense['occurredAt'][:10],
        })

    if peak_day:
        cards.append({
            'id': 'peak-day',
            'kind': 'activity_day',
            'title': 'Peak Spend Day',
            'message': f"Most spending landed on {peak_day['label']}.",
            'tone': 'neutral',
            'amount': peak_day['amount'],
            'footer': f"{peak_day['count']} expenses",
        })

    return cards[:4]


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user.db_user
        accounts = Account.objects.filter(user=user)
        total_balance = accounts.aggregate(total=Sum('balance'))['total'] or 0.0

        now = datetime.now(tz=timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        monthly_spend = Transaction.objects.filter(
            user=user,
            type='expense',
            occurredAt__gte=start_of_month,
        ).aggregate(total=Sum('amount'))['total'] or 0.0

        total_budget_limit = Budget.objects.filter(
            user=user,
            month__gte=start_of_month,
        ).aggregate(total=Sum('limit'))['total'] or 0.0

        insights = InsightSnapshot.objects.filter(user=user).order_by('-createdAt')[:3]
        
        return Response({
            'totalBalance': total_balance,
            'monthlySpend': monthly_spend,
            'budgetLimit': total_budget_limit,
            'insights': InsightSnapshotSerializer(insights, many=True).data
        })


class InsightsSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = (request.query_params.get('period') or 'month').lower()
        if period not in {'week', 'month', 'year'}:
            return Response(
                {'error': 'Invalid period. Use one of: week, month, year.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user.db_user
        now = django_timezone.now()
        current_start, current_end, previous_start, previous_end = _period_bounds(period, now)
        month_start, month_end = _month_bounds(now)

        current_expenses = list(
            Transaction.objects.filter(
                user=user,
                type='expense',
                occurredAt__gte=current_start,
                occurredAt__lt=current_end,
            ).select_related('category')
        )
        previous_expenses = list(
            Transaction.objects.filter(
                user=user,
                type='expense',
                occurredAt__gte=previous_start,
                occurredAt__lt=previous_end,
            ).select_related('category')
        )
        month_expenses = list(
            Transaction.objects.filter(
                user=user,
                type='expense',
                occurredAt__gte=month_start,
                occurredAt__lt=month_end,
            ).select_related('category')
        )
        month_budgets = list(
            Budget.objects.filter(
                user=user,
                month__gte=month_start,
                month__lt=month_end,
            ).select_related('category')
        )

        previous_amounts = defaultdict(float)
        for tx in previous_expenses:
            previous_amounts[_str_id(tx.category_id) or 'uncategorized'] += tx.amount

        current_amounts = defaultdict(float)
        current_counts = defaultdict(int)
        current_categories = {}
        weekday_amounts = defaultdict(float)
        weekday_counts = defaultdict(int)

        for tx in current_expenses:
            key = _str_id(tx.category_id) or 'uncategorized'
            current_amounts[key] += tx.amount
            current_counts[key] += 1
            current_categories[key] = tx.category

            weekday_label = tx.occurredAt.strftime('%A')
            weekday_amounts[weekday_label] += tx.amount
            weekday_counts[weekday_label] += 1

        month_budget_spend = defaultdict(float)
        for tx in month_expenses:
            month_budget_spend[_str_id(tx.category_id) or 'uncategorized'] += tx.amount

        budget_map = {
            _str_id(budget.category_id): budget
            for budget in month_budgets
        }

        total_spend = round(sum(current_amounts.values()), 2)
        previous_spend = round(sum(tx.amount for tx in previous_expenses), 2)
        delta_amount = round(total_spend - previous_spend, 2)
        delta_pct = _safe_percent_change(total_spend, previous_spend)
        average_expense = round(total_spend / len(current_expenses), 2) if current_expenses else 0.0

        breakdown = []
        for key, amount in current_amounts.items():
            category = current_categories.get(key)
            payload = _category_snapshot(category)
            previous_amount = round(previous_amounts.get(key, 0.0), 2)
            budget = budget_map.get(payload['categoryId']) if payload['categoryId'] else None
            budget_spent = month_budget_spend.get(key, 0.0) if period == 'month' else 0.0
            budget_limit = budget.limit if (budget and period == 'month') else None
            budget_progress = (budget_spent / budget_limit) if budget_limit else None
            percentage = round((amount / total_spend) * 100, 2) if total_spend else 0.0

            breakdown.append({
                **payload,
                'amount': round(amount, 2),
                'transactionCount': current_counts[key],
                'percentage': percentage,
                'previousAmount': previous_amount,
                'changePct': _safe_percent_change(amount, previous_amount),
                'budgetLimit': _amount_or_none(budget_limit),
                'budgetSpent': round(budget_spent, 2) if period == 'month' else 0.0,
                'budgetProgress': round(budget_progress, 4) if budget_progress is not None else None,
            })

        breakdown.sort(key=lambda item: (-item['amount'], item['categoryName']))

        top_category = breakdown[0] if breakdown else None
        highest_expense_tx = max(current_expenses, key=lambda tx: tx.amount, default=None)
        highest_expense = None
        if highest_expense_tx:
            highest_expense = {
                'id': str(highest_expense_tx.id),
                'amount': round(highest_expense_tx.amount, 2),
                'occurredAt': highest_expense_tx.occurredAt.isoformat(),
                'categoryName': highest_expense_tx.category.name if highest_expense_tx.category_id else 'Uncategorized',
                'note': highest_expense_tx.note or '',
            }

        budget_alert = None
        if period == 'month':
            budget_candidates = [item for item in breakdown if item['budgetProgress'] is not None]
            if budget_candidates:
                budget_alert = sorted(
                    budget_candidates,
                    key=lambda item: item['budgetProgress'],
                    reverse=True,
                )[0]

        peak_day = None
        if weekday_amounts:
            peak_label, peak_amount = max(weekday_amounts.items(), key=lambda item: item[1])
            peak_day = {
                'label': peak_label,
                'amount': round(peak_amount, 2),
                'count': weekday_counts[peak_label],
            }

        summary = {
            'totalSpend': total_spend,
            'previousSpend': previous_spend,
            'deltaAmount': delta_amount,
            'deltaPct': delta_pct,
            'averageExpense': average_expense,
            'transactionCount': len(current_expenses),
        }

        cards = _build_insight_cards(
            period=period,
            summary=summary,
            top_category=top_category,
            highest_expense=highest_expense,
            budget_alert=budget_alert,
            peak_day=peak_day,
        )

        # Add ML driven cards
        ml_snapshots = InsightSnapshot.objects.filter(user=user).order_by('-createdAt')
        for snap in ml_snapshots:
            cards.insert(0, {
                'id': str(snap.id),
                'kind': snap.kind,
                'title': snap.title,
                'message': snap.body,
                'data': snap.data,
                'tone': 'info',
            })

        recurring = RecurringPattern.objects.filter(user=user, isActive=True).order_by('-confidence')
        if recurring.exists():
            top_rec = recurring[0]
            cards.append({
                'id': 'recurring-detected',
                'kind': 'recurring',
                'title': 'Recurring Pattern',
                'message': f"Detected {top_rec.frequency} payment to {top_rec.merchantName}.",
                'amount': top_rec.amount,
                'tone': 'neutral',
            })

        return Response({
            'period': period,
            'rangeStart': current_start.isoformat(),
            'rangeEnd': current_end.isoformat(),
            'summary': summary,
            'topCategory': top_category,
            'highestExpense': highest_expense,
            'breakdown': breakdown,
            'cards': cards[:10],
            'recurringPatterns': RecurringPatternSerializer(recurring, many=True).data
        })


# ---------------------------------------------------------------------------
# Sync User
# ---------------------------------------------------------------------------

class SyncUserView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def _decode_token(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return {}
        token = auth_header.split(' ', 1)[1]
        try:
            return jwt.decode(token, options={'verify_signature': False})
        except Exception:
            return {}

    def post(self, request):
        decoded = self._decode_token(request)
        payload = request.data or {}

        name = payload.get('name')
        if not name:
            parts = [payload.get('firstName'), payload.get('lastName')]
            name = ' '.join(p for p in parts if p).strip() or payload.get('username')

        clerk_id = payload.get('clerkId') or decoded.get('sub')
        email = (
            payload.get('email')
            or decoded.get('email')
            or decoded.get('email_address')
        )

        if not clerk_id or not email:
            return Response(
                {'error': 'clerkId and email are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user, _ = sync_user_record(
                clerk_id=clerk_id,
                email=email,
                name=name or decoded.get('name'),
                phone_number=payload.get('phoneNumber'),
                profile_pic=payload.get('profilePic'),
                currency=payload.get('currency', 'INR'),
            )
            return Response(UserSerializer(user).data)
        except Exception as e:
            import traceback
            print(f"DEBUG: SyncUser Error: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {
                    'error': str(e),
                    'traceback': traceback.format_exc(),
                    'clerk_id': clerk_id,
                    'email': email,
                    'payload': payload
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ---------------------------------------------------------------------------
# User Profile
# ---------------------------------------------------------------------------

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = getattr(request.user, 'db_user', None)
        if not user:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(UserSerializer(user).data)

    def put(self, request):
        user = getattr(request.user, 'db_user', None)
        if not user:
            return Response(status=status.HTTP_404_NOT_FOUND)

        allowed = ['name', 'currency', 'phoneNumber', 'profilePic']
        for field in allowed:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save()
        return Response(UserSerializer(user).data)


# ---------------------------------------------------------------------------
# Accounts
# ---------------------------------------------------------------------------

class AccountViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        accounts = Account.objects.filter(user=request.user.db_user)
        return Response(AccountSerializer(accounts, many=True).data)

    def retrieve(self, request, pk=None):
        account = Account.objects.filter(id=pk, user=request.user.db_user).first()
        if not account:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(AccountSerializer(account).data)

    def create(self, request):
        serializer = AccountSerializer(data=request.data)
        if serializer.is_valid():
            account = Account.objects.create(
                user=request.user.db_user,
                name=serializer.validated_data['name'],
                type=serializer.validated_data['type'],
                balance=serializer.validated_data.get('balance', 0.0),
            )
            return Response(AccountSerializer(account).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        account = Account.objects.filter(id=pk, user=request.user.db_user).first()
        if not account:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = AccountSerializer(data=request.data)
        if serializer.is_valid():
            account.name = serializer.validated_data['name']
            account.type = serializer.validated_data['type']
            account.balance = serializer.validated_data.get('balance', account.balance)
            account.save()
            return Response(AccountSerializer(account).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        account = Account.objects.filter(id=pk, user=request.user.db_user).first()
        if not account:
            return Response(status=status.HTTP_404_NOT_FOUND)
        try:
            account.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

class CategoryViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        categories = Category.objects.filter(
            Q(user=request.user.db_user) | Q(user__isnull=True)
        )
        return Response(CategorySerializer(categories, many=True).data)

    def retrieve(self, request, pk=None):
        category = Category.objects.filter(
            id=pk
        ).filter(
            Q(user=request.user.db_user) | Q(user__isnull=True)
        ).first()
        if not category:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(CategorySerializer(category).data)

    def create(self, request):
        serializer = CategorySerializer(data=request.data)
        if serializer.is_valid():
            try:
                category = Category.objects.create(
                    user=request.user.db_user,
                    name=serializer.validated_data['name'],
                    icon=serializer.validated_data.get('icon'),
                    color=serializer.validated_data.get('color'),
                )
                return Response(CategorySerializer(category).data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        category = Category.objects.filter(id=pk, user=request.user.db_user).first()
        if not category:
            return Response({'error': 'Category not found or read-only'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CategorySerializer(data=request.data)
        if serializer.is_valid():
            category.name = serializer.validated_data['name']
            category.icon = serializer.validated_data.get('icon')
            category.color = serializer.validated_data.get('color')
            category.save()
            return Response(CategorySerializer(category).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        category = Category.objects.filter(id=pk, user=request.user.db_user).first()
        if not category:
            return Response({'error': 'Category not found or read-only'}, status=status.HTTP_404_NOT_FOUND)
        try:
            category.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Transactions
# ---------------------------------------------------------------------------

class TransactionViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _resolve_category(self, user, category_id=None, category_name=None):
        """Return a Category instance or None."""
        if category_id:
            cat = Category.objects.filter(
                id=category_id
            ).filter(Q(user=user) | Q(user__isnull=True)).first()
            if cat:
                return cat

        if category_name:
            cat = Category.objects.filter(
                name__iexact=category_name
            ).filter(Q(user=user) | Q(user__isnull=True)).first()
            if cat:
                return cat
            # Create a user category on the fly
            return Category.objects.create(
                user=user,
                name=category_name,
                icon='tag.fill',
                color='#38BDF8',
            )

        return None

    def _serialize_tx(self, tx):
        data = TransactionSerializer(tx).data
        data['categoryName'] = tx.category.name if tx.category_id else None
        data['accountName'] = tx.account.name if tx.account_id else None
        data['category'] = tx.category.name if tx.category_id else None
        return data

    def list(self, request):
        filters = Q(user=request.user.db_user)

        if aid := request.query_params.get('account_id'):
            filters &= Q(account_id=aid)
        if cid := request.query_params.get('category_id'):
            filters &= Q(category_id=cid)
        if sd := request.query_params.get('start_date'):
            filters &= Q(occurredAt__gte=sd)
        if ed := request.query_params.get('end_date'):
            filters &= Q(occurredAt__lte=ed)

        page = int(request.query_params.get('page', 1))
        page_size = 20
        skip = (page - 1) * page_size

        qs = Transaction.objects.filter(filters).select_related('category', 'account').order_by('-occurredAt')
        total = qs.count()
        transactions = qs[skip: skip + page_size]

        return Response({
            'count': total,
            'page': page,
            'results': [self._serialize_tx(t) for t in transactions],
        })

    def retrieve(self, request, pk=None):
        tx = Transaction.objects.filter(id=pk, user=request.user.db_user).select_related('category', 'account').first()
        if not tx:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(self._serialize_tx(tx))

    def create(self, request):
        data = dict(request.data)
        # Normalize field aliases
        if 'date' in data and 'occurredAt' not in data:
            data['occurredAt'] = data.pop('date')
        if 'description' in data and 'note' not in data:
            data['note'] = data.pop('description')

        serializer = TransactionSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        vd = serializer.validated_data
        amount = vd['amount']
        if amount <= 0:
            return Response({'error': 'Amount must be strictly positive.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user.db_user

        try:
            category = self._resolve_category(
                user,
                category_id=_str_id(vd.get('category_id')),
                category_name=data.get('category'),
            )

            with django_transaction.atomic():
                account = Account.objects.select_for_update().get(
                    id=vd['account_id'], user=user
                )
                delta = amount if vd['type'] == 'income' else -amount
                account.balance += delta
                account.save()

                tx = Transaction.objects.create(
                    user=user,
                    account=account,
                    category=category,
                    type=vd['type'],
                    amount=amount,
                    note=vd.get('note'),
                    occurredAt=vd['occurredAt'],
                )

            tx.refresh_from_db()
            if tx.category_id:
                tx.category  # prefetch
            if tx.account_id:
                tx.account  # prefetch
            return Response(self._serialize_tx(tx), status=status.HTTP_201_CREATED)

        except Account.DoesNotExist:
            return Response({'error': 'Account not found or not owned by user.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        user = request.user.db_user
        tx = Transaction.objects.filter(id=pk, user=user).first()
        if not tx:
            return Response(status=status.HTTP_404_NOT_FOUND)

        data = dict(request.data)
        if 'date' in data and 'occurredAt' not in data:
            data['occurredAt'] = data.pop('date')
        if 'description' in data and 'note' not in data:
            data['note'] = data.pop('description')

        serializer = TransactionSerializer(data=data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        vd = serializer.validated_data
        new_amount = vd.get('amount', tx.amount)
        new_type = vd.get('type', tx.type)
        new_account_id = vd.get('account_id', tx.account_id)
        new_occurred = vd.get('occurredAt', tx.occurredAt)
        new_note = vd.get('note', tx.note)

        if new_amount <= 0:
            return Response({'error': 'Amount must be strictly positive.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            category = self._resolve_category(
                user,
                category_id=_str_id(vd.get('category_id', tx.category_id)),
                category_name=data.get('category'),
            )

            with django_transaction.atomic():
                old_account = Account.objects.select_for_update().get(id=tx.account_id)
                new_account = Account.objects.select_for_update().get(id=new_account_id, user=user)

                # Reverse old transaction effect
                old_delta = tx.amount if tx.type == 'income' else -tx.amount
                old_account.balance -= old_delta

                if old_account.id == new_account.id:
                    new_delta = new_amount if new_type == 'income' else -new_amount
                    old_account.balance += new_delta
                    old_account.save()
                else:
                    old_account.save()
                    new_delta = new_amount if new_type == 'income' else -new_amount
                    new_account.balance += new_delta
                    new_account.save()

                tx.account = new_account
                tx.category = category
                tx.type = new_type
                tx.amount = new_amount
                tx.note = new_note
                tx.occurredAt = new_occurred
                tx.save()

            tx.refresh_from_db()
            return Response(self._serialize_tx(tx))

        except Account.DoesNotExist:
            return Response({'error': 'Account not found or not owned by user.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        user = request.user.db_user
        tx = Transaction.objects.filter(id=pk, user=user).first()
        if not tx:
            return Response(status=status.HTTP_404_NOT_FOUND)

        try:
            with django_transaction.atomic():
                account = Account.objects.select_for_update().get(id=tx.account_id)
                delta = tx.amount if tx.type == 'income' else -tx.amount
                account.balance -= delta
                account.save()
                tx.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Budgets
# ---------------------------------------------------------------------------

class BudgetViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        budgets = Budget.objects.filter(user=request.user.db_user).select_related('category')
        return Response(BudgetSerializer(budgets, many=True).data)

    def retrieve(self, request, pk=None):
        budget = Budget.objects.filter(id=pk, user=request.user.db_user).first()
        if not budget:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(BudgetSerializer(budget).data)

    def create(self, request):
        serializer = BudgetSerializer(data=request.data)
        if serializer.is_valid():
            vd = serializer.validated_data
            try:
                category = Category.objects.filter(
                    id=vd['category_id']
                ).filter(Q(user=request.user.db_user) | Q(user__isnull=True)).first()
                if not category:
                    return Response({'error': 'Category not found'}, status=status.HTTP_400_BAD_REQUEST)
                budget = Budget.objects.create(
                    user=request.user.db_user,
                    category=category,
                    month=vd['month'],
                    limit=vd['limit'],
                )
                return Response(BudgetSerializer(budget).data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        budget = Budget.objects.filter(id=pk, user=request.user.db_user).first()
        if not budget:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = BudgetSerializer(data=request.data)
        if serializer.is_valid():
            vd = serializer.validated_data
            budget.category_id = vd['category_id']
            budget.month = vd['month']
            budget.limit = vd['limit']
            budget.save()
            return Response(BudgetSerializer(budget).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        budget = Budget.objects.filter(id=pk, user=request.user.db_user).first()
        if not budget:
            return Response(status=status.HTTP_404_NOT_FOUND)
        try:
            budget.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Machine Learning Services
# ---------------------------------------------------------------------------

class MLSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user.db_user
        # Try to get the latest behavioral snapshot from DB
        snap = InsightSnapshot.objects.filter(user=user, kind='behavioral_summary').order_by('-createdAt').first()
        if snap:
            return Response(snap.data)
        
        # Fallback to file system if no DB record
        data = get_ml_summary()
        return Response(data)


class MLCategorizeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        note = request.data.get('note', '') or request.data.get('description', '')
        try:
            amount = float(request.data.get('amount', 0))
        except (ValueError, TypeError):
            amount = 0.0

        if not note:
            return Response(
                {"error": "Note/description is required to predict category."},
                status=status.HTTP_400_BAD_REQUEST
            )

        prediction = predict_category(note, amount)
        if not prediction:
            return Response(
                {"error": "Model offline or could not predict."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response(prediction)

class UploadStatementView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            decoded_file = file_obj.read().decode('utf-8')
            reader = csv.DictReader(io.StringIO(decoded_file))
            
            headers = [h.lower().strip() for h in reader.fieldnames or []]
            
            # Improved column discovery with exclusion
            def find_col(keywords, exclude=None):
                for h in headers:
                    if h in (exclude or []): continue
                    if any(kw in h for kw in keywords):
                        return h
                return None

            # Priority for date: must have 'date' or 'time'
            date_col_slug = find_col(['date', 'time', 'value dt'])
            # Priority for amount: must have 'amount', 'debit', 'credit', 'withdraw', 'deposit'
            amt_col_slug = find_col(['amount', 'debit', 'credit', 'withdraw', 'deposit'], exclude=[date_col_slug])
            # Description: anything related to desc, narration, particular, counterparty, details
            desc_col_slug = find_col(['desc', 'narration', 'remark', 'counterparty', 'particular', 'details'], exclude=[date_col_slug, amt_col_slug])
            
            if not date_col_slug or not desc_col_slug or not amt_col_slug:
                return Response({'error': f'Could not identify necessary columns (Date, Description, Amount). Found: {headers}'}, status=status.HTTP_400_BAD_REQUEST)

            original_headers = reader.fieldnames
            d_col_exact = original_headers[headers.index(date_col_slug)]
            desc_col_exact = original_headers[headers.index(desc_col_slug)]
            amt_col_exact = original_headers[headers.index(amt_col_slug)]

            records = []
            user = request.user.db_user

            for row in reader:
                # Basic row validation - must have some data
                if not any(row.values()):
                    continue

                raw_desc = (row.get(desc_col_exact) or '').strip()
                raw_amt = (row.get(amt_col_exact) or '0').strip()
                raw_date = (row.get(d_col_exact) or '').strip()
                
                if not raw_desc or not raw_date:
                    continue
                    
                # parse amount
                try:
                    import re
                    # Keep digits, dot and minus only
                    clean_amt = re.sub(r'[^\d.-]', '', raw_amt)
                    amount = float(clean_amt) if clean_amt else 0.0
                except (ValueError, TypeError):
                    amount = 0.0
                    
                # parse date
                try:
                    from dateutil.parser import parse
                    dt = parse(raw_date, fuzzy=True)
                    dt = django_timezone.make_aware(dt) if django_timezone.is_naive(dt) else dt
                except Exception:
                    continue # Skip rows with invalid dates instead of defaulting to now
                    
                pred = predict_category(raw_desc, amount)
                cat = pred['predicted_category'] if pred and 'predicted_category' in pred else None
                conf = pred['confidence'] if pred and 'confidence' in pred else None
                
                records.append(MLTrainingRow(
                    user=user,
                    occurredAt=dt,
                    amount=amount,
                    descriptionRaw=raw_desc,
                    predictedCategory=cat,
                    confidence=conf
                ))
            
            if records:
                MLTrainingRow.objects.bulk_create(records, batch_size=500)
                
            return Response({'success': True, 'processed': len(records)})
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
