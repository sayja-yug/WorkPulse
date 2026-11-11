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

    class Meta:
        model = CashTransaction
        fields = '__all__'
        read_only_fields = ['id', 'business', 'balance_after', 'created_by', 'created_at', 'updated_at']

