from django.contrib import admin
from .models import SubscriptionPlan, Subscription, Invoice, PaymentTransaction


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'monthly_price', 'max_employees', 'max_branches', 'is_active']
    list_filter = ['is_active']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['business', 'plan', 'status', 'billing_cycle', 'current_period_end']
    list_filter = ['status', 'billing_cycle']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'business', 'total', 'status', 'due_date']
    list_filter = ['status']


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'amount', 'payment_method', 'status', 'created_at']
    list_filter = ['status']
