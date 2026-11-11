from decimal import Decimal
from django.db import models
from common.models import TenantModel, BaseModel


class Advance(TenantModel):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        DISBURSED = 'DISBURSED', 'Disbursed'
        DEDUCTING = 'DEDUCTING', 'In Deduction'
        COMPLETED = 'COMPLETED', 'Fully Deducted'

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='advances'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_advances'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    deduction_start_month = models.DateField(null=True, blank=True)
    monthly_deduction = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    remaining_balance = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = 'advances'
        ordering = ['-requested_at']

    def save(self, *args, **kwargs):
        if self.remaining_balance is None:
            self.remaining_balance = self.amount
        super().save(*args, **kwargs)


class Loan(TenantModel):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        ACTIVE = 'ACTIVE', 'Active'
        CLOSED = 'CLOSED', 'Closed'
        DEFAULTED = 'DEFAULTED', 'Defaulted'

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='loans'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    tenure_months = models.IntegerField()
    emi_amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    disbursed_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'loans'
        ordering = ['-created_at']


class LoanRepayment(BaseModel):
    loan = models.ForeignKey(
        Loan,
        on_delete=models.CASCADE,
        related_name='repayments'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    payment_mode = models.CharField(max_length=50, default='Salary Deduction')
    principal = models.DecimalField(max_digits=12, decimal_places=2)
    interest = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    remaining_balance = models.DecimalField(max_digits=12, decimal_places=2)
    is_from_salary = models.BooleanField(default=True)

    class Meta:
        db_table = 'loan_repayments'
        ordering = ['-payment_date']


class Reimbursement(TenantModel):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        PAID = 'PAID', 'Reimbursed'

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='reimbursements'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField()
    category = models.CharField(max_length=100)
    receipt = models.FileField(upload_to='reimbursement_receipts/', null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'reimbursements'
        ordering = ['-submitted_at']

