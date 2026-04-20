from rest_framework import serializers
from .models import User, Account, Category, Transaction, Budget


class UserSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    clerkId = serializers.CharField(required=True)
    createdAt = serializers.DateTimeField(read_only=True)
    updatedAt = serializers.DateTimeField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'clerkId', 'email', 'name',
            'phoneNumber', 'profilePic', 'currency',
            'createdAt', 'updatedAt',
        ]
        read_only_fields = ['id', 'createdAt', 'updatedAt']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['id'] = str(instance.id)
        return ret


class AccountSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    userId = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Account
        fields = ['id', 'userId', 'name', 'type', 'balance', 'createdAt']
        read_only_fields = ['id', 'userId', 'createdAt']

    def get_userId(self, obj):
        return str(obj.user_id)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['id'] = str(instance.id)
        return ret


class CategorySerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    userId = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'userId', 'name', 'icon', 'color', 'createdAt']
        read_only_fields = ['id', 'userId', 'createdAt']

    def get_userId(self, obj):
        return str(obj.user_id) if obj.user_id else None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['id'] = str(instance.id)
        return ret


class TransactionSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    userId = serializers.SerializerMethodField()
    accountId = serializers.UUIDField(source='account_id', required=True)
    categoryId = serializers.UUIDField(source='category_id', required=False, allow_null=True)
    # Accept camelCase input aliases
    occurredAt = serializers.DateTimeField(required=False)
    note = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    createdAt = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'userId', 'accountId', 'categoryId',
            'type', 'amount', 'note', 'occurredAt', 'createdAt',
        ]
        read_only_fields = ['id', 'userId', 'createdAt']

    def get_userId(self, obj):
        return str(obj.user_id)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['id'] = str(instance.id)
        ret['accountId'] = str(instance.account_id)
        ret['categoryId'] = str(instance.category_id) if instance.category_id else None
        ret['occurredAt'] = instance.occurredAt.isoformat() if instance.occurredAt else None
        ret['createdAt'] = instance.createdAt.isoformat() if instance.createdAt else None
        return ret

    def to_internal_value(self, data):
        # Accept both 'date' and 'occurredAt' from frontend
        mutable = dict(data)
        if 'date' in mutable and 'occurredAt' not in mutable:
            mutable['occurredAt'] = mutable.pop('date')
        if 'description' in mutable and 'note' not in mutable:
            mutable['note'] = mutable.pop('description')
        # Accept 'accountId' as string
        return super().to_internal_value(mutable)


class BudgetSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    userId = serializers.SerializerMethodField()
    categoryId = serializers.UUIDField(source='category_id')
    createdAt = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Budget
        fields = ['id', 'userId', 'categoryId', 'month', 'limit', 'createdAt']
        read_only_fields = ['id', 'userId', 'createdAt']

    def get_userId(self, obj):
        return str(obj.user_id)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['id'] = str(instance.id)
        ret['categoryId'] = str(instance.category_id)
        return ret
