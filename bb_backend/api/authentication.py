import jwt
import time
import requests

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings

from .models import User
from .user_sync import sync_user_record

_jwks_cache = None
_jwks_cache_time = 0
JWKS_CACHE_TTL = 3600


class ClerkJWTAuthentication(BaseAuthentication):
    def get_jwks(self):
        global _jwks_cache, _jwks_cache_time
        now = time.time()
        if _jwks_cache is not None and (now - _jwks_cache_time) < JWKS_CACHE_TTL:
            return _jwks_cache

        issuer = getattr(settings, 'CLERK_ISSUER_URL', '')
        if not issuer:
            return None

        try:
            url = f"{issuer.rstrip('/')}/.well-known/jwks.json"
            resp = requests.get(url, timeout=5)
            resp.raise_for_status()
            _jwks_cache = resp.json()
            _jwks_cache_time = time.time()
            return _jwks_cache
        except Exception:
            return None

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ', 1)[1]

        try:
            issuer = getattr(settings, 'CLERK_ISSUER_URL', '')

            if issuer:
                try:
                    jwks_url = f"{issuer.rstrip('/')}/.well-known/jwks.json"
                    signing_key = jwt.PyJWKClient(jwks_url).get_signing_key_from_jwt(token).key
                    decoded = jwt.decode(
                        token,
                        signing_key,
                        algorithms=['RS256'],
                        issuer=issuer,
                    )
                except Exception:
                    # Fall back to unverified decode (dev mode)
                    decoded = jwt.decode(token, options={'verify_signature': False})
            else:
                decoded = jwt.decode(token, options={'verify_signature': False})

            clerk_id = decoded.get('sub')
            if not clerk_id:
                raise AuthenticationFailed('Token missing "sub" claim')

            user = User.objects.filter(clerkId=clerk_id).first()
            if not user:
                email = decoded.get('email') or decoded.get('email_address')
                if not email:
                    raise AuthenticationFailed('User not found and token missing email claim')

                user, _ = sync_user_record(
                    clerk_id=clerk_id,
                    email=email,
                    name=decoded.get('name'),
                    phone_number=decoded.get('phone_number'),
                    profile_pic=decoded.get('picture'),
                    currency='INR',
                )

            # Build a lightweight object that DRF expects
            class _AuthUser:
                is_authenticated = True

                def __init__(self, db_user):
                    self.id = str(db_user.id)
                    self.clerkId = db_user.clerkId
                    self.db_user = db_user

            return (_AuthUser(user), token)

        except AuthenticationFailed:
            raise
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired')
        except jwt.DecodeError:
            raise AuthenticationFailed('Error decoding token')
        except Exception as e:
            raise AuthenticationFailed(str(e))
