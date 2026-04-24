import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

import datetime
from django.utils import timezone
from api.models import User, MLTrainingRow
from rest_framework.test import APIClient

# 1. Create a fake user
user, _ = User.objects.get_or_create(clerkId='test_insights_user', defaults={'email':'testinsights@example.com'})

# 2. Add some MLTrainingRow data
MLTrainingRow.objects.filter(user=user).delete()

# We need the dates to be aligned. Today is April 2026.
now = timezone.now()
target_date = now.replace(day=15)
last_month = (target_date.replace(day=1) - datetime.timedelta(days=1)).replace(day=15)

# Current month data
MLTrainingRow.objects.create(user=user, amount=500.0, descriptionRaw="A", predictedCategory="Food & Dining", occurredAt=target_date)
MLTrainingRow.objects.create(user=user, amount=2500.0, descriptionRaw="B", predictedCategory="Shopping", occurredAt=target_date)

# Prior month data
MLTrainingRow.objects.create(user=user, amount=400.0, descriptionRaw="C", predictedCategory="Food & Dining", occurredAt=last_month)
# Shopping spikes! prev=200, current=2500 (2500 > 1.5*200 and curr-prev > 1000)
MLTrainingRow.objects.create(user=user, amount=200.0, descriptionRaw="D", predictedCategory="Shopping", occurredAt=last_month)

# 3. Test API endpoint
client = APIClient()

class MockAuthUser:
    is_authenticated = True
    def __init__(self, db_user):
        self.db_user = db_user
        self.id = db_user.id

client.force_authenticate(user=MockAuthUser(user))

# No month param
response = client.get('/api/insights/', SERVER_NAME='localhost')
print("=== Default Month Response ===")
print("Status:", response.status_code)
print(response.json())

# With month param (target date month)
month_str = target_date.strftime('%Y-%m')
response = client.get(f'/api/insights/?month={month_str}', SERVER_NAME='localhost')
print("\n=== Specific Month Response ===")
print("Status:", response.status_code)
print(response.json())

# Clean up
MLTrainingRow.objects.filter(user=user).delete()
user.delete()
