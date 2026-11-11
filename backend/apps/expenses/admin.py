from django.contrib import admin
from .models import ExpenseCategory, Expense, CashTransaction


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'business', 'type', 'is_active']
    list_filter = ['type', 'is_active']


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['description', 'category', 'amount', 'date', 'status', 'payment_mode']
    list_filter = ['status', 'payment_mode']


@admin.register(CashTransaction)
class CashTransactionAdmin(admin.ModelAdmin):
    list_display = ['type', 'amount', 'balance_after', 'date', 'description']
    list_filter = ['type']

