import uuid
from decimal import Decimal
from rest_framework import serializers
from .models import ExpenseCategory, Expense, CashTransaction


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = '__all__'
        read_only_fields = ['id', 'business', 'created_at', 'updated_at']


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ['id', 'business', 'created_by', 'approved_by', 'created_at', 'updated_at']


class CashTransactionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    category = serializers.PrimaryKeyRelatedField(
        queryset=ExpenseCategory.objects.all(),
        required=False,
        allow_null=True
    )

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        cat_val = data.get('category')
        if cat_val:
            try:
                uuid.UUID(str(cat_val))
            except (ValueError, TypeError):
                # If a string code like 'OFFICE_SUPPLIES' is passed, resolve to category UUID or None
                cat_obj = ExpenseCategory.objects.filter(code__iexact=str(cat_val)).first()
                if not cat_obj:
                    cat_obj = ExpenseCategory.objects.filter(name__icontains=str(cat_val)).first()
                data['category'] = str(cat_obj.id) if cat_obj else None
        else:
            data['category'] = None

        return super().to_internal_value(data)

    class Meta:
        model = CashTransaction
        fields = '__all__'
        read_only_fields = ['id', 'business', 'balance_after', 'created_by', 'created_at', 'updated_at']
