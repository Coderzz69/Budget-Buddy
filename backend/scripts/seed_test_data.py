import os
import sys
import django
import random
import datetime

# Setup Django Environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.utils import timezone
from api.models import User, MLTrainingRow

CATEGORIES = ["Food & Dining", "Transport", "Shopping", "Entertainment", "Bills & Utilities", "Health", "Subscriptions", "Income"]

def seed_data(row_count=50000):
    user, _ = User.objects.get_or_create(clerkId="perf_test_user", defaults={"email": "perf@example.com"})
    
    # Clear existing data for this user to be safe
    MLTrainingRow.objects.filter(user=user).delete()
    
    print(f"Generating {row_count} rows for user {user.clerkId}...")
    
    now = timezone.now()
    batch_size = 5000
    batch = []
    
    # Let's target the data tightly around the current month and last month to stress the engine
    start_date = (now.replace(day=1) - datetime.timedelta(days=20)).replace(day=1) # The 1st of previous month
    end_date = now + datetime.timedelta(days=5)

    delta_days = (end_date.date() - start_date.date()).days
    
    for i in range(row_count):
        random_days = random.randint(0, delta_days)
        random_date = start_date + datetime.timedelta(days=random_days)
        
        row = MLTrainingRow(
            user=user,
            amount=round(random.uniform(10.0, 5000.0), 2),
            occurredAt=random_date,
            descriptionRaw=f"Random txn {i}",
            predictedCategory=random.choice(CATEGORIES),
            confidence=round(random.uniform(0.5, 0.99), 2)
        )
        batch.append(row)
        
        if len(batch) >= batch_size:
            MLTrainingRow.objects.bulk_create(batch)
            batch = []
            print(f"Inserted {i+1} rows...")
            
    if batch:
        MLTrainingRow.objects.bulk_create(batch)
        print(f"Inserted {row_count} rows...")
        
    print("Seed complete!")

if __name__ == "__main__":
    import sys
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 50000
    seed_data(count)
