import datetime
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from django.core.cache import cache

from api.models import User, MLTrainingRow

class MockAuthUser:
    """Mock DRF Authenticatable User to be passed to force_authenticate"""
    is_authenticated = True
    def __init__(self, db_user):
        self.db_user = db_user
        self.id = str(db_user.id)

class InsightsAPIAuthTests(APITestCase):

    def setUp(self):
        cache.clear()
        self.user_a = User.objects.create(clerkId='usr_A', email='usera@example.com')
        self.user_b = User.objects.create(clerkId='usr_B', email='userb@example.com')

        self.auth_user_a = MockAuthUser(self.user_a)
        
        self.now = timezone.now()

    def tearDown(self):
        User.objects.all().delete()
        MLTrainingRow.objects.all().delete()

    def test_missing_token(self):
        """Authentication Testing: Missing Token => 401"""
        # Do not force authenticate
        response = self.client.get('/api/insights/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
    def test_invalid_token(self):
        """Authentication Testing: Invalid Token => 401"""
        # The custom ClerkJWTAuthentication parses Authorization headers
        response = self.client.get('/api/insights/', HTTP_AUTHORIZATION='Bearer INVALID_TOKEN_123')
        # Without mocking PyJWKClient, hitting the real endpoint with an invalid token 
        # usually 401s or 403s. DRF returns 401 Unauthorized for custom authentication failures.
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_expired_token(self):
        """Authentication Testing: Expired Token => 401"""
        response = self.client.get('/api/insights/', HTTP_AUTHORIZATION='Bearer EXPIRED_XYZ')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_valid_token_different_user(self):
        """Authentication Testing: Valid Token, verify data isolation"""
        
        # Give User B 5000 in spend
        MLTrainingRow.objects.create(user=self.user_b, amount=5000.0, descriptionRaw="User B Spend", predictedCategory="SecretCategory", occurredAt=self.now)
        
        # User A logs in
        self.client.force_authenticate(user=self.auth_user_a)
        
        # Attempt to get insights
        response = self.client.get('/api/insights/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        # User A should NOT see User B's 5000
        self.assertEqual(data['total_spent'], 0.0)
        
        # Try fetching User A's data after adding something strictly for A
        MLTrainingRow.objects.create(user=self.user_a, amount=100.0, descriptionRaw="User A Spend", predictedCategory="VisibleCategory", occurredAt=self.now)
        # Manually clear cache to bypass the 15-minute ttl cache since same params are queried
        cache.clear()
        
        res_a = self.client.get('/api/insights/')
        data_a = res_a.json()
        self.assertEqual(data_a['total_spent'], 100.0)
