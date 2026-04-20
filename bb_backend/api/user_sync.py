import time

from django.db import OperationalError, transaction

from .models import User


SQLITE_LOCK_RETRY_DELAYS = (0.1, 0.2, 0.4)


def sync_user_record(*, clerk_id, email, name=None, phone_number=None, profile_pic=None, currency='INR'):
    last_error = None

    for attempt, delay in enumerate((*SQLITE_LOCK_RETRY_DELAYS, None), start=1):
        try:
            with transaction.atomic():
                return User.objects.update_or_create(
                    clerkId=clerk_id,
                    defaults={
                        'email': email,
                        'name': name,
                        'phoneNumber': phone_number,
                        'profilePic': profile_pic,
                        'currency': currency or 'INR',
                    },
                )
        except OperationalError as exc:
            if 'database is locked' not in str(exc).lower() or delay is None:
                raise
            last_error = exc
            time.sleep(delay)

    if last_error:
        raise last_error
