import jwt

from rest_framework import status
from rest_framework.test import APITestCase

from .models import User


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
