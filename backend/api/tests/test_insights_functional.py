import datetime
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from django.core.cache import cache

from api.models import User, MLTrainingRow
from api.authentication import ClerkJWTAuthentication

class MockAuthUser:
    """Mock DRF Authenticatable User to be passed to force_authenticate"""
    is_authenticated = True
    def __init__(self, db_user):
        self.db_user = db_user
        self.id = str(db_user.id)

class InsightsAPIFunctionalTests(APITestCase):
    
    def setUp(self):
        # Clear cache between tests
        cache.clear()
        
        # Base Dates (Ensure predictable times)
        self.now = timezone.make_aware(datetime.datetime(2026, 4, 15))
        self.current_month_str = "2026-04"
        self.last_month = timezone.make_aware(datetime.datetime(2026, 3, 15))
        self.future_month = timezone.make_aware(datetime.datetime(2099, 1, 15))
        
        # Test User
        self.user = User.objects.create(clerkId='usr_functional_test', email='functest@example.com')
        self.auth_user = MockAuthUser(self.user)
        self.client.force_authenticate(user=self.auth_user)

    def tearDown(self):
        User.objects.all().delete()
        MLTrainingRow.objects.all().delete()

    def seed_data(self):
        """Seed a standard dataset for calculations"""
        # Current Month (April 2026) -> Total 3500.0
        # Food: 1000 + 2000 = 3000
        # Transport: 500
        MLTrainingRow.objects.create(user=self.user, amount=1000.0, descriptionRaw="A", predictedCategory="Food & Dining", occurredAt=self.now)
        MLTrainingRow.objects.create(user=self.user, amount=2000.0, descriptionRaw="B", predictedCategory="Food & Dining", occurredAt=self.now)
        MLTrainingRow.objects.create(user=self.user, amount=500.0, descriptionRaw="C", predictedCategory="Transport", occurredAt=self.now)

        # Previous Month (March 2026) -> Total 1000.0
        # Food: 1000
        MLTrainingRow.objects.create(user=self.user, amount=1000.0, descriptionRaw="D", predictedCategory="Food & Dining", occurredAt=self.last_month)
        
    def seed_spike_data(self):
        """Seed dataset guaranteed to trigger spike constraints: > 1.5x AND diff > 1000"""
        MLTrainingRow.objects.create(user=self.user, amount=3000.0, descriptionRaw="Food 1", predictedCategory="Food & Dining", occurredAt=self.now)
        MLTrainingRow.objects.create(user=self.user, amount=1000.0, descriptionRaw="Food 2", predictedCategory="Food & Dining", occurredAt=self.last_month)
        
    def test_basic_valid_request(self):
        """Test Case 1: Send request with valid token and current month (implied by default)"""
        # Overriding timezone.now inside Insights view is hard to patch without mock.
        # But we pass the explicit month to guarantee it matches seeded data.
        self.seed_data()
        
        response = self.client.get(f'/api/insights/?month={self.current_month_str}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertIn("total_spent", data)
        self.assertIn("previous_total", data)
        self.assertIn("percent_change", data)
        self.assertIn("top_categories", data)
        self.assertIn("spikes", data)
        
        self.assertEqual(data['total_spent'], 3500.0)
        self.assertEqual(data['previous_total'], 1000.0)
        self.assertEqual(data['percent_change'], 250.0) # (3500 - 1000)/1000 = 2.5 * 100 = 250%

    def test_explicit_month_query(self):
        """Test Case 2: Explicit Month Query limits scope correctly and no leakage"""
        self.seed_data()
        # Create a record in May 2026 to ensure no leakage
        future = timezone.make_aware(datetime.datetime(2026, 5, 10))
        MLTrainingRow.objects.create(user=self.user, amount=9999.0, predictedCategory="Food & Dining", occurredAt=future)

        response = self.client.get('/api/insights/?month=2026-04')
        data = response.json()
        
        self.assertEqual(data['total_spent'], 3500.0) # No May data included
        self.assertEqual(data['previous_total'], 1000.0) # March data
        
    def test_no_data_case(self):
        """Test Case 3: No Data Case logic execution limits zero div logic securely"""
        response = self.client.get(f'/api/insights/?month={self.current_month_str}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(data['total_spent'], 0.0)
        self.assertEqual(data['previous_total'], 0.0)
        self.assertEqual(data['percent_change'], 0.0)
        self.assertEqual(data['top_categories'], [])
        self.assertEqual(data['spikes'], [])
        
    def test_single_month_only(self):
        """Test Case 4: Only current month data exists (zero prev month)"""
        MLTrainingRow.objects.create(user=self.user, amount=500.0, descriptionRaw="A", predictedCategory="Transport", occurredAt=self.now)
        
        response = self.client.get(f'/api/insights/?month={self.current_month_str}')
        data = response.json()
        
        self.assertEqual(data['total_spent'], 500.0)
        self.assertEqual(data['previous_total'], 0.0)
        self.assertEqual(data['percent_change'], 100.0) # 100% since prev=0 and curr>0
        
    def test_category_aggregation_accuracy(self):
        """Test Case 5: Category Aggregation Accuracy"""
        self.seed_data()
        response = self.client.get(f'/api/insights/?month={self.current_month_str}')
        data = response.json()
        
        cats = data['top_categories']
        food_cat = next(c for c in cats if c['category'] == 'Food & Dining')
        trans_cat = next(c for c in cats if c['category'] == 'Transport')
        
        self.assertEqual(food_cat['amount'], 3000.0)
        self.assertEqual(round(food_cat['percentage']), 86) # 3000/3500 approx 85.71%
        
        self.assertEqual(trans_cat['amount'], 500.0)
        self.assertEqual(round(trans_cat['percentage']), 14) # 500/3500 approx 14.28%
    
    def test_spike_detection(self):
        """Test Case 6: Spike Detection"""
        self.seed_spike_data()
        response = self.client.get(f'/api/insights/?month={self.current_month_str}')
        data = response.json()
        
        spikes = data['spikes']
        self.assertEqual(len(spikes), 1)
        self.assertEqual(spikes[0]['category'], "Food & Dining")
        self.assertEqual(spikes[0]['increase'], 2000.0)

    def test_invalid_month_format(self):
        """Edge Case: Invalid Month Formats"""
        res1 = self.client.get('/api/insights/?month=April-2026')
        res2 = self.client.get('/api/insights/?month=2026/04')
        
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", res1.json())
        
    def test_future_month_case(self):
        """Edge Case: Future Month query doesn't crash"""
        res = self.client.get('/api/insights/?month=2099-01')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data['total_spent'], 0.0)
        
    def test_negative_corrupted_data(self):
        """Edge Case: Negative / Corrupted Data"""
        # Excludes null category via exclude(predictedCategory__isnull=True) in insights.py
        MLTrainingRow.objects.create(user=self.user, amount=-100.0, descriptionRaw="neg", predictedCategory="Neg Category", occurredAt=self.now)
        MLTrainingRow.objects.create(user=self.user, amount=50.0, descriptionRaw="null", predictedCategory=None, occurredAt=self.now)

        res = self.client.get(f'/api/insights/?month={self.current_month_str}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        
        # Total is -100 + 50 = -50
        self.assertEqual(data['total_spent'], -50.0)
        
        # Test categories exclude Null
        cats = [c['category'] for c in data['top_categories']]
        self.assertNotIn(None, cats)
        self.assertIn("Neg Category", cats)

    def test_api_contract_validation(self):
        """Data Integrity Test: Response structure exactly matches spec"""
        self.seed_data()
        res = self.client.get(f'/api/insights/?month={self.current_month_str}')
        data = res.json()
        
        expected_keys = {"total_spent", "previous_total", "percent_change", "top_categories", "spikes", "top_category", "savings_hint"}
        self.assertEqual(set(data.keys()), expected_keys)
        
        self.assertIsInstance(data['total_spent'], float)
        self.assertIsInstance(data['previous_total'], float)
        self.assertIsInstance(data['percent_change'], float)
        self.assertIsInstance(data['top_categories'], list)
        self.assertIsInstance(data['spikes'], list)

    def test_percentage_data_integrity(self):
        """Data Integrity Tests: Percentages correctly rounded to 100%"""
        # e.g 10/30, 10/30, 10/30 = 33.33 * 3 = 99.99
        MLTrainingRow.objects.create(user=self.user, amount=10.0, descriptionRaw="A", predictedCategory="Cat1", occurredAt=self.now)
        MLTrainingRow.objects.create(user=self.user, amount=10.0, descriptionRaw="B", predictedCategory="Cat2", occurredAt=self.now)
        MLTrainingRow.objects.create(user=self.user, amount=10.0, descriptionRaw="C", predictedCategory="Cat3", occurredAt=self.now)

        res = self.client.get(f'/api/insights/?month={self.current_month_str}')
        data = res.json()
        
        sum_pct = sum([c['percentage'] for c in data['top_categories']])
        self.assertTrue(99.0 <= sum_pct <= 101.0)
        
        sum_amounts = sum([c['amount'] for c in data['top_categories']])
        self.assertEqual(sum_amounts, data['total_spent'])
