from decimal import Decimal
from django.db import models
from common.models import TenantModel, BaseModel


class SalaryComponent(TenantModel):
    class Type(models.TextChoices):
        EARNING = 'EARNING', 'Earning Allowance'
        DEDUCTION = 'DEDUCTION', 'Deduction'

    class CalcType(models.TextChoices):
        FIXED = 'FIXED', 'Fixed Monthly Amount'
        PERCENTAGE = 'PERCENTAGE', 'Percentage of Component'

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    type = models.CharField(max_length=20, choices=Type.choices)
    calculation_type = models.CharField(max_length=20, choices=CalcType.choices, default=CalcType.FIXED)
    default_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    percentage_of = models.CharField(max_length=50, blank=True, default='')
    is_taxable = models.BooleanField(default=True)
    is_mandatory = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'salary_components'
        constraints = [
            models.UniqueConstraint(
                fields=['business', 'code'],
                name='unique_salary_component_code_per_business'
            )
        ]

    def __str__(self):
        return f'{self.name} ({self.code})'


class SalaryTemplate(TenantModel):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'salary_templates'

    def __str__(self):
        return self.name


class EmployeeSalaryStructure(BaseModel):
    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='salary_structures'
    )
    business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE
    )
    template = models.ForeignKey(
        SalaryTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    base_salary = models.DecimalField(max_digits=12, decimal_places=2)
    components = models.JSONField(default=list)  # list of {component_id, name, type, amount}
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'employee_salary_structures'
        ordering = ['-effective_from']


class PayrollRun(TenantModel):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PROCESSING = 'PROCESSING', 'Processing'
        REVIEW = 'REVIEW', 'Under Review'
        APPROVED = 'APPROVED', 'Approved'
        LOCKED = 'LOCKED', 'Locked'

    name = models.CharField(max_length=150)
    period_start = models.DateField()
    period_end = models.DateField()
    pay_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    total_gross = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    total_deductions = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    total_net = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    processed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_payrolls'
    )
    approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_payrolls'
    )
    locked_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'payroll_runs'
        ordering = ['-period_start']


class PayrollItem(BaseModel):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CALCULATED = 'CALCULATED', 'Calculated'
        REVIEWED = 'REVIEWED', 'Reviewed'
        APPROVED = 'APPROVED', 'Approved'

    payroll_run = models.ForeignKey(
        PayrollRun,
        on_delete=models.CASCADE,
        related_name='items'
    )
    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='payroll_items'
    )
    working_days = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal('30.0'))
    present_days = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal('30.0'))
    leave_days = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal('0.0'))
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.0'))
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    net_salary = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    advance_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    loan_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CALCULATED)
    notes = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'payroll_items'
        constraints = [
            models.UniqueConstraint(
                fields=['payroll_run', 'employee'],
                name='unique_payroll_item_per_run_per_employee'
            )
        ]


class PayrollItemComponent(BaseModel):
    payroll_item = models.ForeignKey(
        PayrollItem,
        on_delete=models.CASCADE,
        related_name='components'
    )
    component_name = models.CharField(max_length=100)
    component_type = models.CharField(max_length=20, choices=SalaryComponent.Type.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    calculation_details = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'payroll_item_components'


class Payslip(BaseModel):
    payroll_item = models.OneToOneField(
        PayrollItem,
        on_delete=models.CASCADE,
        related_name='payslip'
    )
    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='payslips'
    )
    business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE
    )
    payslip_number = models.CharField(max_length=64, unique=True)
    period_display = models.CharField(max_length=50)
    file_url = models.FileField(upload_to='payslips/', null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'payslips'
        ordering = ['-generated_at']


class SalaryPayment(BaseModel):
    class Mode(models.TextChoices):
        BANK_TRANSFER = 'BANK_TRANSFER', 'Bank Transfer'
        CASH = 'CASH', 'Cash'
        CHEQUE = 'CHEQUE', 'Cheque'
        UPI = 'UPI', 'UPI'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    payroll_item = models.ForeignKey(
        PayrollItem,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_mode = models.CharField(max_length=20, choices=Mode.choices, default=Mode.BANK_TRANSFER)
    payment_date = models.DateField()
    reference_number = models.CharField(max_length=100, blank=True, default='')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.COMPLETED)
    paid_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'salary_payments'
