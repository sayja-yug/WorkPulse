from decimal import Decimal
from django.db import models
from common.models import TenantModel


class ExpenseCategory(TenantModel):
    class Type(models.TextChoices):
        INCOME = 'INCOME', 'Income Category'
        EXPENSE = 'EXPENSE', 'Expense Category'

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.EXPENSE)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'expense_categories'
        verbose_name_plural = 'Expense categories'
        constraints = [
            models.UniqueConstraint(
                fields=['business', 'code'],
                name='unique_expense_category_per_business'
            )
        ]

    def __str__(self):
        return f'{self.name} ({self.type})'


class Expense(TenantModel):
    class PaymentMode(models.TextChoices):
        CASH = 'CASH', 'Cash'
        BANK_TRANSFER = 'BANK_TRANSFER', 'Bank Transfer'
        UPI = 'UPI', 'UPI'
        CHEQUE = 'CHEQUE', 'Cheque'
        CARD = 'CARD', 'Credit / Debit Card'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.CASCADE,
        related_name='expenses'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField()
    payment_mode = models.CharField(max_length=20, choices=PaymentMode.choices, default=PaymentMode.CASH)
    receipt = models.FileField(upload_to='expense_receipts/', null=True, blank=True)
    date = models.DateField()
    vendor_name = models.CharField(max_length=150, blank=True, default='')
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='created_expenses'
    )
    approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_expenses'
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    class Meta:
        db_table = 'expenses'
        ordering = ['-date', '-created_at']


class CashTransaction(TenantModel):
    class Type(models.TextChoices):
        CASH_IN = 'CASH_IN', 'Cash In (Credit)'
        CASH_OUT = 'CASH_OUT', 'Cash Out (Debit)'

    type = models.CharField(max_length=20, choices=Type.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    description = models.TextField()
    payment_mode = models.CharField(max_length=50, default='Cash')
    reference = models.CharField(max_length=100, blank=True, default='')
    date = models.DateField()
    balance_after = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE
    )

    class Meta:
        db_table = 'cash_transactions'
        ordering = ['-date', '-created_at']

