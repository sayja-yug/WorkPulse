from django.db import models
from common.models import TenantModel, BaseModel


class AttendanceRecord(TenantModel):
    class Status(models.TextChoices):
        PRESENT = 'PRESENT', 'Present'
        ABSENT = 'ABSENT', 'Absent'
        HALF_DAY = 'HALF_DAY', 'Half Day'
        PAID_LEAVE = 'PAID_LEAVE', 'Paid Leave'
        UNPAID_LEAVE = 'UNPAID_LEAVE', 'Unpaid Leave'
        WEEKLY_OFF = 'WEEKLY_OFF', 'Weekly Off'
        HOLIDAY = 'HOLIDAY', 'Holiday'
        ON_DUTY = 'ON_DUTY', 'On Duty'
        COMPENSATORY_OFF = 'COMPENSATORY_OFF', 'Compensatory Off'

    class Source(models.TextChoices):
        MANUAL = 'MANUAL', 'Manual Entry'
        SELF = 'SELF', 'Web Self-Service'
        GPS = 'GPS', 'GPS Mobile Punch'
        BIOMETRIC = 'BIOMETRIC', 'Biometric Device'
        SYSTEM = 'SYSTEM', 'System Automated'

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    date = models.DateField(db_index=True)
    shift = models.ForeignKey(
        'shifts.Shift',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PRESENT
    )
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)
    working_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    is_late = models.BooleanField(default=False)
    late_minutes = models.IntegerField(default=0)
    is_early_departure = models.BooleanField(default=False)
    early_departure_minutes = models.IntegerField(default=0)
    notes = models.TextField(blank=True, default='')
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.SELF
    )
    marked_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    is_locked = models.BooleanField(default=False)

    class Meta:
        db_table = 'attendance_records'
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'date'],
                name='unique_attendance_per_employee_per_day'
            )
        ]
        indexes = [
            models.Index(fields=['business', 'date']),
            models.Index(fields=['employee', 'date']),
            models.Index(fields=['business', 'employee', 'date']),
        ]

    def __str__(self):
        return f'{self.employee.full_name} - {self.date} ({self.status})'


class AttendancePunch(BaseModel):
    class PunchType(models.TextChoices):
        CHECK_IN = 'CHECK_IN', 'Check In'
        CHECK_OUT = 'CHECK_OUT', 'Check Out'
        BREAK_START = 'BREAK_START', 'Break Start'
        BREAK_END = 'BREAK_END', 'Break End'

    attendance = models.ForeignKey(
        AttendanceRecord,
        on_delete=models.CASCADE,
        related_name='punches'
    )
    punch_type = models.CharField(max_length=20, choices=PunchType.choices)
    timestamp = models.DateTimeField()
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    accuracy = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    selfie = models.ImageField(upload_to='attendance_selfies/', null=True, blank=True)
    device_info = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    is_valid = models.BooleanField(default=True)
    validation_notes = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'attendance_punches'
        ordering = ['timestamp']


class AttendanceCorrection(BaseModel):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    attendance = models.ForeignKey(
        AttendanceRecord,
        on_delete=models.CASCADE,
        related_name='corrections'
    )
    requested_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE
    )
    original_status = models.CharField(max_length=20)
    corrected_status = models.CharField(max_length=20)
    original_check_in = models.DateTimeField(null=True, blank=True)
    corrected_check_in = models.DateTimeField(null=True, blank=True)
    original_check_out = models.DateTimeField(null=True, blank=True)
    corrected_check_out = models.DateTimeField(null=True, blank=True)
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    reviewed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_corrections'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'attendance_corrections'


class Holiday(TenantModel):
    class Type(models.TextChoices):
        PUBLIC = 'PUBLIC', 'Public National Holiday'
        COMPANY = 'COMPANY', 'Company Declared Holiday'
        OPTIONAL = 'OPTIONAL', 'Optional Holiday'

    branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text='If null, holiday applies to all branches'
    )
    name = models.CharField(max_length=150)
    date = models.DateField()
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.PUBLIC)
    is_optional = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'holidays'
        constraints = [
            models.UniqueConstraint(
                fields=['business', 'date', 'name'],
                name='unique_holiday_per_day_per_business'
            )
        ]

    def __str__(self):
        return f'{self.name} ({self.date})'


class OvertimeRecord(TenantModel):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='overtime_records'
    )
    date = models.DateField()
    hours = models.DecimalField(max_digits=5, decimal_places=2)
    rate_multiplier = models.DecimalField(max_digits=4, decimal_places=2, default=1.5)
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'overtime_records'

