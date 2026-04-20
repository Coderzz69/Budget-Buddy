"""
Management command to seed default global categories.
Usage: python manage.py seed_categories
"""
from django.core.management.base import BaseCommand
from api.models import Category


DEFAULTS = [
    ('Salary',        'dollarsign.circle.fill', '#34D399'),
    ('Food',          'cart.fill',              '#FBBF24'),
    ('Shopping',      'bag.fill',               '#F472B6'),
    ('Transport',     'car.fill',               '#60A5FA'),
    ('Entertainment', 'gamecontroller.fill',    '#A78BFA'),
    ('Utilities',     'bolt.fill',              '#FCD34D'),
    ('Health',        'heart.fill',             '#FB7185'),
    ('Education',     'book.fill',              '#34D399'),
    ('Investment',    'chart.pie.fill',         '#38BDF8'),
    ('Other',         'ellipsis.circle.fill',   '#94A3B8'),
]


class Command(BaseCommand):
    help = 'Seed default global categories'

    def handle(self, *args, **kwargs):
        created = 0
        for name, icon, color in DEFAULTS:
            _, was_created = Category.objects.get_or_create(
                name=name,
                user=None,
                defaults={'icon': icon, 'color': color},
            )
            if was_created:
                created += 1
        total = Category.objects.filter(user__isnull=True).count()
        self.stdout.write(self.style.SUCCESS(
            f'Done. Created {created} new categories. Total global: {total}'
        ))
