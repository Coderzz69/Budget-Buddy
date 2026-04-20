import jwt
from datetime import datetime, timezone

from django.db import transaction as django_transaction
from django.db.models import Q, Sum
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import User, Account, Category, Transaction, Budget
from .serializers import (
    UserSerializer, AccountSerializer, CategorySerializer,
    TransactionSerializer, BudgetSerializer,
)
from .user_sync import sync_user_record


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _str_id(value):
    return str(value) if value else None


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

        return Response({
            'totalBalance': total_balance,
            'monthlySpend': monthly_spend,
            'budgetLimit': total_budget_limit,
        })


# ---------------------------------------------------------------------------
# Sync User
# ---------------------------------------------------------------------------

class SyncUserView(APIView):
    authentication_classes = []
    permission_classes = []

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
