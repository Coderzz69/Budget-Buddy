from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from .views import (
    SyncUserView, AccountViewSet, CategoryViewSet,
    TransactionViewSet, BudgetViewSet, DashboardView, UserProfileView
)

router = DefaultRouter()
router.register(r'accounts', AccountViewSet, basename='account')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'budgets', BudgetViewSet, basename='budget')

urlpatterns = [
    path('auth/sync-user/', SyncUserView.as_view(), name='sync-user'),
    path('user/profile/', UserProfileView.as_view(), name='user-profile'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('health/', lambda request: JsonResponse({'status': 'ok'}), name='health'),
    path('', include(router.urls)),
]
