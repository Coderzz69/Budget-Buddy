import jwt
from datetime import timedelta

from rest_framework import status
from rest_framework.test import APITestCase
from django.utils import timezone

from .models import User, Account, Category, Transaction, Budget


class AuthenticationProvisioningTests(APITestCase):
    def test_accounts_request_auto_provisions_user_from_token(self):
        token = jwt.encode(
            {
                'sub': 'clerk_test_user',
                'email': 'auto@example.com',
                'name': 'Auto Provisioned',
            },
            'dev-secret',
            algorithm='HS256',
        )

        response = self.client.get(
            '/api/accounts/',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        user = User.objects.get(clerkId='clerk_test_user')
        self.assertEqual(user.email, 'auto@example.com')
        self.assertEqual(user.name, 'Auto Provisioned')


class InsightsSummaryTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create(
            clerkId='insights_user',
            email='insights@example.com',
            name='Insights User',
        )
        self.account = Account.objects.create(
            user=self.user,
            name='Main',
            type='bank',
            balance=1000,
        )
        self.food = Category.objects.create(
            user=self.user,
            name='Food',
            icon='🍔',
            color='#10B981',
        )
        self.travel = Category.objects.create(
            user=self.user,
            name='Travel',
            icon='✈️',
            color='#38BDF8',
        )

        now = timezone.now()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_month_tx_at = current_month_start - timedelta(hours=1)
        current_food_tx_at = current_month_start + timedelta(hours=1)
        current_travel_tx_at = current_month_start + timedelta(hours=2)
        if current_travel_tx_at > now:
            current_food_tx_at = now - timedelta(minutes=20)
            current_travel_tx_at = now - timedelta(minutes=10)

        Transaction.objects.create(
            user=self.user,
            account=self.account,
            category=self.food,
            type='expense',
            amount=120,
            note='Lunches',
            occurredAt=current_food_tx_at,
        )
        Transaction.objects.create(
            user=self.user,
            account=self.account,
            category=self.travel,
            type='expense',
            amount=80,
            note='Cab rides',
            occurredAt=current_travel_tx_at,
        )
        Transaction.objects.create(
            user=self.user,
            account=self.account,
            category=self.food,
            type='expense',
            amount=100,
            note='Last month food',
            occurredAt=previous_month_tx_at,
        )
        Budget.objects.create(
            user=self.user,
            category=self.food,
            month=current_month_start,
            limit=150,
        )

        token = jwt.encode(
            {
                'sub': self.user.clerkId,
                'email': self.user.email,
                'name': self.user.name,
            },
            'dev-secret',
            algorithm='HS256',
        )
        self.auth_header = f'Bearer {token}'

    def test_monthly_insights_summary_returns_breakdown_and_cards(self):
        response = self.client.get(
            '/api/insights/summary/?period=month',
            HTTP_AUTHORIZATION=self.auth_header,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['period'], 'month')
        self.assertEqual(response.data['summary']['totalSpend'], 200.0)
        self.assertEqual(response.data['summary']['previousSpend'], 100.0)
        self.assertEqual(response.data['topCategory']['categoryName'], 'Food')
        self.assertEqual(response.data['breakdown'][0]['budgetLimit'], 150.0)

        card_kinds = {card['kind'] for card in response.data['cards']}
        self.assertIn('top_category', card_kinds)
        self.assertIn('budget_watch', card_kinds)

    def test_invalid_period_returns_bad_request(self):
        response = self.client.get(
            '/api/insights/summary/?period=quarter',
            HTTP_AUTHORIZATION=self.auth_header,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
