"""
Thin compatibility shim that replaces Prisma with Django ORM.

Usage in views.py stays the same:
    db.user.find_unique(where={"clerkId": "..."})
    db.user.upsert(where=..., data={"create": {...}, "update": {...}})
    db.account.find_many(where={"userId": ...})
    db.transaction.create({...})
    db.tx() as transaction_db   <- now a no-op context manager
"""

from __future__ import annotations
from contextlib import contextmanager
from django.db import transaction as django_transaction
from django.db.models import Model, Q
from typing import Any, Dict, List, Optional, Type


def _build_q(where: Dict) -> Q:
    """Convert a Prisma-style where dict to a Django Q object."""
    if not where:
        return Q()

    q = Q()
    for key, value in where.items():
        if key == "OR":
            or_q = Q()
            for item in value:
                or_q |= _build_q(item)
            q &= or_q
        elif key == "AND":
            and_q = Q()
            for item in value:
                and_q &= _build_q(item)
            q &= and_q
        elif isinstance(value, dict):
            # Range filters: {"gte": ..., "lte": ...}
            for op, op_val in value.items():
                if op == "gte":
                    q &= Q(**{f"{key}__gte": op_val})
                elif op == "lte":
                    q &= Q(**{f"{key}__lte": op_val})
                elif op == "gt":
                    q &= Q(**{f"{key}__gt": op_val})
                elif op == "lt":
                    q &= Q(**{f"{key}__lt": op_val})
                elif op == "contains":
                    q &= Q(**{f"{key}__icontains": op_val})
        elif value is None:
            q &= Q(**{f"{key}__isnull": True})
        else:
            q &= Q(**{key: value})

    return q


def _map_field(key: str, model_class: Type[Model]) -> str:
    """Map Prisma camelCase FK names to Django ORM field names."""
    fk_map = {
        "userId": "user_id",
        "accountId": "account_id",
        "categoryId": "category_id",
    }
    return fk_map.get(key, key)


def _coerce_where(where: Dict, model_class: Type[Model]) -> Dict:
    """Translate Prisma-style field names to Django field names in where filters."""
    fk_map = {
        "userId": "user_id",
        "accountId": "account_id",
        "categoryId": "category_id",
    }
    result = {}
    for key, value in where.items():
        new_key = fk_map.get(key, key)
        if key == "OR":
            result["OR"] = [_coerce_where(item, model_class) for item in value]
        elif key == "AND":
            result["AND"] = [_coerce_where(item, model_class) for item in value]
        elif isinstance(value, dict) and key not in ("OR", "AND"):
            result[new_key] = value
        else:
            result[new_key] = value
    return result


def _coerce_data(data: Dict, model_class: Type[Model]) -> Dict:
    """Map Prisma field names to Django model field names for create/update."""
    fk_map = {
        "userId": "user_id",
        "accountId": "account_id",
        "categoryId": "category_id",
    }
    result = {}
    for key, value in data.items():
        new_key = fk_map.get(key, key)
        result[new_key] = value
    return result


class ModelProxy:
    """Prisma-style interface proxy over a Django model."""

    def __init__(self, model_class: Type[Model]):
        self.model = model_class

    def _qs(self, where: Dict = None):
        qs = self.model.objects.all()
        if where:
            coerced = _coerce_where(where, self.model)
            qs = qs.filter(_build_q(coerced))
        return qs

    def find_unique(self, where: Dict) -> Optional[Model]:
        coerced = _coerce_where(where, self.model)
        try:
            return self.model.objects.get(**coerced)
        except self.model.DoesNotExist:
            return None
        except self.model.MultipleObjectsReturned:
            return self.model.objects.filter(**coerced).first()

    def find_first(self, where: Dict) -> Optional[Model]:
        coerced = _coerce_where(where, self.model)
        q = _build_q(coerced)
        return self.model.objects.filter(q).first()

    def find_many(
        self,
        where: Dict = None,
        order: Dict = None,
        skip: int = 0,
        take: int = None,
    ) -> List[Model]:
        qs = self._qs(where)
        if order:
            order_args = []
            for field, direction in order.items():
                prefix = "-" if direction.lower() == "desc" else ""
                order_args.append(f"{prefix}{field}")
            qs = qs.order_by(*order_args)
        if skip:
            qs = qs[skip:]
        if take is not None:
            qs = qs[:take] if not skip else qs[:take]  # slice already handled
        return list(qs)

    def count(self, where: Dict = None) -> int:
        return self._qs(where).count()

    def create(self, data: Dict) -> Model:
        coerced = _coerce_data(data, self.model)
        instance = self.model(**coerced)
        instance.save()
        instance.refresh_from_db()
        return instance

    def update(self, where: Dict, data: Dict) -> Model:
        instance = self.find_unique(where)
        if instance is None:
            raise self.model.DoesNotExist(f"{self.model.__name__} not found")
        coerced = _coerce_data(data, self.model)
        for key, value in coerced.items():
            setattr(instance, key, value)
        instance.save()
        instance.refresh_from_db()
        return instance

    def upsert(self, where: Dict, data: Dict) -> Model:
        instance = self.find_unique(where)
        if instance is None:
            create_data = data.get("create", {})
            return self.create(create_data)
        else:
            update_data = data.get("update", {})
            coerced = _coerce_data(update_data, self.model)
            for key, value in coerced.items():
                setattr(instance, key, value)
            instance.save()
            instance.refresh_from_db()
            return instance

    def delete(self, where: Dict) -> Model:
        instance = self.find_unique(where)
        if instance is None:
            raise self.model.DoesNotExist(f"{self.model.__name__} not found")
        instance.delete()
        return instance


class _TxContext:
    """Wraps atomic transaction so views.py `with db.tx() as tx_db: tx_db.X...` works."""
    def __init__(self, db_instance):
        self._db = db_instance
        self._atomic = django_transaction.atomic()

    def __enter__(self):
        self._atomic.__enter__()
        return self._db  # return the same db object so tx_db.account.update(...) works

    def __exit__(self, *args):
        return self._atomic.__exit__(*args)


class Database:
    """Drop-in for the Prisma `db` object."""

    def __init__(self):
        from api.models import User, Account, Category, Transaction, Budget
        self.user = ModelProxy(User)
        self.account = ModelProxy(Account)
        self.category = ModelProxy(Category)
        self.transaction = ModelProxy(Transaction)
        self.budget = ModelProxy(Budget)

    def tx(self) -> _TxContext:
        return _TxContext(self)

    # Compatibility stubs (Prisma called these)
    def is_connected(self):
        return True

    def connect(self):
        pass

    def disconnect(self):
        pass


db = Database()
