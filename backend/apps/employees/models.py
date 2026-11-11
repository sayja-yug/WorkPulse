from django.db import models
from common.models import TenantModel, BaseModel


class Employee(TenantModel):
    class EmploymentType(models.TextChoices):
        FULL_TIME = 'FULL_TIME', 'Full-Time'
        PART_TIME = 'PART_TIME', 'Part-Time'
        CONTRACT = 'CONTRACT', 'Contract'
        INTERN = 'INTERN', 'Intern'
        TEMPORARY = 'TEMPORARY', 'Temporary'

    class SalaryType(models.TextChoices):
        MONTHLY = 'MONTHLY', 'Monthly'
        WEEKLY = 'WEEKLY', 'Weekly'
        DAILY = 'DAILY', 'Daily Wage'
        HOURLY = 'HOURLY', 'Hourly Wage'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        INACTIVE = 'INACTIVE', 'Inactive'
        ON_NOTICE = 'ON_NOTICE', 'On Notice'
        TERMINATED = 'TERMINATED', 'Terminated'
        ABSCONDING = 'ABSCONDING', 'Absconding'

    class Gender(models.TextChoices):
        MALE = 'MALE', 'Male'
        FEMALE = 'FEMALE', 'Female'
        OTHER = 'OTHER', 'Other'
        PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY', 'Prefer Not to Say'

    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employee_profiles'
    )
    employee_code = models.CharField(max_length=50)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, default='')

    branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees'
    )
    department = models.ForeignKey(
        'branches.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees'
    )
    designation = models.ForeignKey(
        'branches.Designation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees'
    )

    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.FULL_TIME
    )
    salary_type = models.CharField(
        max_length=20,
        choices=SalaryType.choices,
        default=SalaryType.MONTHLY
    )
    joining_date = models.DateField()
    probation_end_date = models.DateField(null=True, blank=True)
    reporting_manager = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='direct_reports'
    )

    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=20,
        choices=Gender.choices,
        default=Gender.PREFER_NOT_TO_SAY
    )
    blood_group = models.CharField(max_length=10, blank=True, default='')
    emergency_contact_name = models.CharField(max_length=150, blank=True, default='')
    emergency_contact_phone = models.CharField(max_length=20, blank=True, default='')
    address = models.TextField(blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')
    state = models.CharField(max_length=100, blank=True, default='')
    country = models.CharField(max_length=100, default='India')
    zip_code = models.CharField(max_length=20, blank=True, default='')

    bank_name = models.CharField(max_length=100, blank=True, default='')
    bank_account_number = models.CharField(max_length=50, blank=True, default='')
    bank_ifsc_code = models.CharField(max_length=20, blank=True, default='')
    pan_number = models.CharField(max_length=20, blank=True, default='')
    aadhaar_number = models.CharField(max_length=20, blank=True, default='')

    is_field_employee = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )

    class Meta:
        db_table = 'employees'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['business', 'employee_code'],
                name='unique_employee_code_per_business'
            )
        ]
        indexes = [
            models.Index(fields=['business', 'status']),
            models.Index(fields=['business', 'branch']),
            models.Index(fields=['business', 'department']),
        ]

    def __str__(self):
        return f'{self.full_name} ({self.employee_code})'

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()


class EmployeeDocument(BaseModel):
    class DocType(models.TextChoices):
        AADHAAR = 'AADHAAR', 'Aadhaar Card'
        PAN = 'PAN', 'PAN Card'
        PASSPORT = 'PASSPORT', 'Passport'
        DRIVING_LICENSE = 'DRIVING_LICENSE', 'Driving License'
        VOTER_ID = 'VOTER_ID', 'Voter ID'
        BANK_STATEMENT = 'BANK_STATEMENT', 'Bank Statement'
        OFFER_LETTER = 'OFFER_LETTER', 'Offer Letter'
        OTHER = 'OTHER', 'Other'

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    document_type = models.CharField(max_length=30, choices=DocType.choices)
    file = models.FileField(upload_to='employee_documents/')
    file_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    is_verified = models.BooleanField(default=False)

    class Meta:
        db_table = 'employee_documents'


class EmploymentHistory(BaseModel):
    class ChangeType(models.TextChoices):
        JOINED = 'JOINED', 'Joined Organization'
        PROMOTED = 'PROMOTED', 'Promoted'
        TRANSFERRED = 'TRANSFERRED', 'Transferred Branch'
        DEPARTMENT_CHANGED = 'DEPARTMENT_CHANGED', 'Department Changed'
        DESIGNATION_CHANGED = 'DESIGNATION_CHANGED', 'Designation Changed'
        SALARY_REVISED = 'SALARY_REVISED', 'Salary Revised'
        TERMINATED = 'TERMINATED', 'Terminated'
        RESIGNED = 'RESIGNED', 'Resigned'
        STATUS_CHANGED = 'STATUS_CHANGED', 'Status Changed'

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='history'
    )
    change_type = models.CharField(max_length=30, choices=ChangeType.choices)
    from_value = models.JSONField(default=dict, blank=True)
    to_value = models.JSONField(default=dict, blank=True)
    effective_date = models.DateField()
    changed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    notes = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'employment_history'
        ordering = ['-effective_date', '-created_at']

