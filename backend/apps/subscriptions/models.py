from decimal import Decimal
from django.db import models
from common.models import BaseModel


class SubscriptionPlan(BaseModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, default='')
    max_employees = models.IntegerField(default=10, help_text='-1 for unlimited')
    max_branches = models.IntegerField(default=1, help_text='-1 for unlimited')
    features = models.JSONField(default=list)
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    annual_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    is_active = models.BooleanField(default=True)
    trial_days = models.IntegerField(default=14)
    display_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'subscription_plans'
        ordering = ['display_order', 'monthly_price']

    def __str__(self):
        return f'{self.name} ({self.code})'


class Subscription(BaseModel):
    class Status(models.TextChoices):
        TRIAL = 'TRIAL', 'Trial'
        ACTIVE = 'ACTIVE', 'Active'
        PAST_DUE = 'PAST_DUE', 'Past Due'
        CANCELLED = 'CANCELLED', 'Cancelled'
        EXPIRED = 'EXPIRED', 'Expired'

    class Cycle(models.TextChoices):
        MONTHLY = 'MONTHLY', 'Monthly'
        ANNUAL = 'ANNUAL', 'Annual'

    business = models.OneToOneField(
        'businesses.Business',
        on_delete=models.CASCADE,
        related_name='subscription'
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='subscriptions'
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIAL)
    billing_cycle = models.CharField(max_length=20, choices=Cycle.choices, default=Cycle.MONTHLY)
    current_period_start = models.DateField()
    current_period_end = models.DateField()
    trial_end = models.DateField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'subscriptions'

    def __str__(self):
        return f'{self.business.name} -> {self.plan.name} ({self.status})'


class Invoice(BaseModel):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SENT = 'SENT', 'Sent'
        PAID = 'PAID', 'Paid'
        OVERDUE = 'OVERDUE', 'Overdue'
        CANCELLED = 'CANCELLED', 'Cancelled'

    business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    invoice_number = models.CharField(max_length=50, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PAID)
    due_date = models.DateField()
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'invoices'
        ordering = ['-created_at']


class PaymentTransaction(BaseModel):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SUCCESS = 'SUCCESS', 'Success'
        FAILED = 'FAILED', 'Failed'
        REFUNDED = 'REFUNDED', 'Refunded'

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=50)
    transaction_id = models.CharField(max_length=100, blank=True, default='')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUCCESS)
    gateway_response = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'payment_transactions'
        ordering = ['-created_at']
