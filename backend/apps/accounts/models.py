"""User and RBAC models for WorkPulse."""
import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from common.models import BaseModel, TimeStampedModel, UUIDModel

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin, UUIDModel):
    """Custom user model using email as the primary identifier."""

    email = models.EmailField(unique=True, max_length=255)
    phone = models.CharField(max_length=20, blank=True, default='')
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150, blank=True, default='')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)

    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)

    # Active business context (for quick switching)
    active_business = models.ForeignKey(
        'businesses.Business',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='active_users',
    )

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name']

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phone']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f'{self.full_name} ({self.email})'

    @property
    def full_name(self):
        name = f'{self.first_name} {self.last_name}'.strip()
        return name or self.email


class Permission(BaseModel):
    """System permission definition.

    Permissions are globally defined. They represent actions like
    'employee.view', 'attendance.mark', 'payroll.approve'.
    """

    class ScopeType(models.TextChoices):
        GLOBAL = 'GLOBAL', 'Global'
        BUSINESS = 'BUSINESS', 'Business'
        BRANCH = 'BRANCH', 'Branch'
        DEPARTMENT = 'DEPARTMENT', 'Department'
        TEAM = 'TEAM', 'Team'
        OWN = 'OWN', 'Own'

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    module = models.CharField(max_length=50, db_index=True)
    description = models.TextField(blank=True, default='')
    scope_type = models.CharField(
        max_length=20,
        choices=ScopeType.choices,
        default=ScopeType.BUSINESS,
    )

    class Meta:
        db_table = 'permissions'
        ordering = ['module', 'code']

    def __str__(self):
        return f'{self.code} ({self.name})'


class Role(BaseModel):
    """Role definition.

    System roles are predefined and immutable.
    Business roles are custom roles created by business owners.
    """

    class RoleCode(models.TextChoices):
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
        SUPPORT_ADMIN = 'SUPPORT_ADMIN', 'Support Admin'
        BILLING_ADMIN = 'BILLING_ADMIN', 'Billing Admin'
        BUSINESS_OWNER = 'BUSINESS_OWNER', 'Business Owner'
        HR_MANAGER = 'HR_MANAGER', 'HR Manager'
        BRANCH_MANAGER = 'BRANCH_MANAGER', 'Branch Manager'
        ACCOUNTANT = 'ACCOUNTANT', 'Accountant'
        SUPERVISOR = 'SUPERVISOR', 'Supervisor'
        EMPLOYEE = 'EMPLOYEE', 'Employee'
        FIELD_EMPLOYEE = 'FIELD_EMPLOYEE', 'Field Employee'
        AUDITOR = 'AUDITOR', 'Auditor'

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, db_index=True)
    description = models.TextField(blank=True, default='')
    business = models.ForeignKey(
        'businesses.Business',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='custom_roles',
        help_text='NULL for system roles, set for custom business roles.',
    )
    is_system = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    permissions = models.ManyToManyField(
        Permission,
        through='RolePermission',
        related_name='roles',
    )

    class Meta:
        db_table = 'roles'
        constraints = [
            models.UniqueConstraint(
                fields=['code', 'business'],
                name='unique_role_code_per_business',
            ),
        ]
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_system']),
        ]

    def __str__(self):
        return f'{self.name} ({self.code})'


class RolePermission(BaseModel):
    """Maps permissions to roles."""

    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='permission_roles')

    class Meta:
        db_table = 'role_permissions'
        constraints = [
            models.UniqueConstraint(
                fields=['role', 'permission'],
                name='unique_role_permission',
            ),
        ]

    def __str__(self):
        return f'{self.role.code} -> {self.permission.code}'


class UserRole(BaseModel):
    """Assigns roles to users within a business context.

    A user can have different roles in different businesses.
    A user can also have branch-scoped roles.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_roles')
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='user_role_assignments')
    business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE,
        related_name='user_role_assignments',
    )
    branch = models.ForeignKey(
        'branches.Branch',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='user_role_assignments',
        help_text='If set, this role is scoped to a specific branch.',
    )

    class Meta:
        db_table = 'user_roles'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'role', 'business'],
                name='unique_user_role_business',
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'business']),
        ]

    def __str__(self):
        return f'{self.user.email} - {self.role.code} @ {self.business.name}'


class UserSession(BaseModel):
    """Track user login sessions."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    token_hash = models.CharField(max_length=64, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')
    device_info = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField()
    last_activity = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_sessions'
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f'Session for {self.user.email} ({self.ip_address})'

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at


class Invitation(BaseModel):
    """Business invitations for new employees/users."""

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        DECLINED = 'DECLINED', 'Declined'
        EXPIRED = 'EXPIRED', 'Expired'
        CANCELLED = 'CANCELLED', 'Cancelled'

    business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE,
        related_name='invitations',
    )
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True, default='')
    first_name = models.CharField(max_length=150, blank=True, default='')
    last_name = models.CharField(max_length=150, blank=True, default='')
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    branch = models.ForeignKey(
        'branches.Branch',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    department = models.ForeignKey(
        'employees.Department',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    token = models.CharField(max_length=64, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    message = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'invitations'
        indexes = [
            models.Index(fields=['business', 'status']),
            models.Index(fields=['email']),
            models.Index(fields=['token']),
        ]

    def __str__(self):
        return f'Invitation for {self.email} to {self.business.name}'

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

