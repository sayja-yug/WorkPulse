from decimal import Decimal
from django.db import models
from common.models import TenantModel, BaseModel


class LeaveType(TenantModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    is_paid = models.BooleanField(default=True)
    max_days_per_year = models.IntegerField(default=12)
    is_carry_forward = models.BooleanField(default=False)
    max_carry_forward_days = models.IntegerField(default=0)
    is_encashable = models.BooleanField(default=False)
    requires_approval = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'leave_types'
        constraints = [
            models.UniqueConstraint(
                fields=['business', 'code'],
                name='unique_leave_code_per_business'
            )
        ]

    def __str__(self):
        return f'{self.name} ({self.code})'


class LeaveBalance(BaseModel):
    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='leave_balances'
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.CASCADE,
        related_name='balances'
    )
    year = models.IntegerField()
    allocated = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    used = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    carried_forward = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    adjusted = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)

    class Meta:
        db_table = 'leave_balances'
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'leave_type', 'year'],
                name='unique_employee_leave_balance_per_year'
            )
        ]

    @property
    def available(self):
        return (self.allocated + self.carried_forward + self.adjusted) - self.used


class LeaveRequest(TenantModel):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        CANCELLED = 'CANCELLED', 'Cancelled'

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='leave_requests'
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.CASCADE,
        related_name='requests'
    )
    start_date = models.DateField()
    end_date = models.DateField()
    days = models.DecimalField(max_digits=4, decimal_places=1)
    is_half_day = models.BooleanField(default=False)
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    applied_at = models.DateTimeField(auto_now_add=True)
    emergency_contact = models.CharField(max_length=20, blank=True, default='')

    class Meta:
        db_table = 'leave_requests'
        ordering = ['-applied_at']


class LeaveApproval(BaseModel):
    class Action(models.TextChoices):
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    request = models.ForeignKey(
        LeaveRequest,
        on_delete=models.CASCADE,
        related_name='approvals'
    )
    approver = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    comments = models.TextField(blank=True, default='')
    acted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'leave_approvals'


class LeaveTransaction(BaseModel):
    class TxType(models.TextChoices):
        ALLOCATED = 'ALLOCATED', 'Allocated'
        USED = 'USED', 'Used'
        CANCELLED = 'CANCELLED', 'Cancelled'
        CARRY_FORWARD = 'CARRY_FORWARD', 'Carried Forward'
        ADJUSTED = 'ADJUSTED', 'Adjusted'
        ENCASHED = 'ENCASHED', 'Encashed'

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='leave_transactions'
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.CASCADE
    )
    transaction_type = models.CharField(max_length=20, choices=TxType.choices)
    days = models.DecimalField(max_digits=5, decimal_places=2)
    balance_after = models.DecimalField(max_digits=5, decimal_places=2)
    reference_id = models.UUIDField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'leave_transactions'
        ordering = ['-created_at']
