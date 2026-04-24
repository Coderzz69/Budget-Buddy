import csv
import json
import os
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import (
    User, Account, Category, Transaction, 
    NormalizedMerchant, ModelPrediction, RecurringPattern, InsightSnapshot
)

class Command(BaseCommand):
    help = 'Syncs ML processed data into the live database'

    def add_arguments(self, parser):
        parser.add_argument('--clerk_id', type=str, default='user_3CINIg1acu5NXdMg0XSYsZgQDlj', help='Clerk ID of the user to sync data for')

    def handle(self, *args, **options):
        clerk_id = options['clerk_id']
        try:
            user = User.objects.get(clerkId=clerk_id)
        except User.DoesNotExist:
            self.stderr.write(f"User with clerkId {clerk_id} not found.")
            return

        # 1. Ensure a default account exists
        account, _ = Account.objects.get_or_create(
            user=user,
            name='Primary Account',
            defaults={'type': 'bank', 'balance': 50000.0}
        )

        base_path = '/home/sanathcoonani/Desktop/Budget_Buddy_app/bb_ML/outputs'
        
        # 2. Sync Transactions and Predictions
        csv_file = os.path.join(base_path, 'behavior_event_view.csv')
        if os.path.exists(csv_file):
            self.stdout.write("Syncing transactions from behavior_event_view.csv...")
            with open(csv_file, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                count = 0
                for row in reader:
                    # Map Category
                    category_name = row.get('assigned_category') or 'Other'
                    cat, _ = Category.objects.get_or_create(
                        name=category_name,
                        defaults={'user': None, 'color': '#808080'}
                    )

                    # Create Transaction
                    # Using event_fingerprint as a stable way to avoid duplicates if we had a field for it,
                    # but since we don't, we'll just check if a similar one exists for now or recreate.
                    # For "regeneration", we'll just create.
                    occurred_at = datetime.strptime(row['transaction_ts'], '%Y-%m-%d %H:%M:%S')
                    amount = float(row['amount_inr'])
                    tx_type = row['direction'].lower()
                    
                    tx = Transaction.objects.create(
                        user=user,
                        account=account,
                        category=cat,
                        type='expense' if tx_type == 'debit' else 'income',
                        amount=amount,
                        note=row['counterparty_raw'],
                        occurredAt=occurred_at
                    )

                    # Create Prediction if ML sourced
                    if row.get('category_label_source') == 'merchant_map':
                        ModelPrediction.objects.create(
                            transaction=tx,
                            modelName='NaiveBayesCategoryClassifier',
                            prediction=category_name,
                            confidence=0.9, # Placeholder
                            metadata={'source': 'merchant_map'}
                        )
                    
                    count += 1
                self.stdout.write(self.style.SUCCESS(f"Successfully imported {count} transactions."))

        # 3. Import Recurring Patterns
        recurring_file = os.path.join(base_path, 'recurring_patterns.csv')
        if os.path.exists(recurring_file):
            self.stdout.write("Syncing recurring patterns...")
            with open(recurring_file, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Parse dates
                    last_seen = datetime.strptime(row['last_seen'], '%Y-%m-%d %H:%M:%S')
                    # next_expected_date is YYYY-MM-DD
                    next_expected = datetime.strptime(row['next_expected_date'], '%Y-%m-%d')
                    
                    RecurringPattern.objects.create(
                        user=user,
                        merchantName=row['counterparty_normalized'],
                        frequency=row['recurring_frequency'],
                        amount=float(row['expected_amount_min_inr']),
                        lastOccurredAt=last_seen,
                        nextExpectedAt=next_expected,
                        confidence=float(row['confidence']),
                        isActive=True
                    )
            self.stdout.write(self.style.SUCCESS("Recurring patterns synced."))

        # 4. Generate Insights from behavior_summary.json
        summary_file = os.path.join(base_path, 'behavior_summary.json')
        if os.path.exists(summary_file):
            with open(summary_file, 'r') as f:
                summary = json.load(f)
            
            # Create a summary insight
            InsightSnapshot.objects.create(
                user=user,
                kind='behavioral_summary',
                title='Spending Habits Identified',
                body=f"You have {summary['signals']['recurring_pattern_count']} recurring patterns and {summary['signals']['high_anomaly_count']} unusual spikes this period.",
                data=summary
            )
            self.stdout.write(self.style.SUCCESS("Generated insight snapshots."))

        self.stdout.write(self.style.SUCCESS("Backend data regeneration complete."))
