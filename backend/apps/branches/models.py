from django.db import models
from common.models import TenantModel


class Branch(TenantModel):
    """Physical branch or worksite with geofence parameters."""
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    address = models.TextField(blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')
    state = models.CharField(max_length=100, blank=True, default='')
    country = models.CharField(max_length=100, default='India')
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    geofence_radius = models.IntegerField(default=200, help_text='Geofence radius in meters')
    is_head_office = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'branches'
        verbose_name_plural = 'Branches'
        constraints = [
            models.UniqueConstraint(
                fields=['business', 'code'],
                name='unique_branch_code_per_business'
            )
        ]
        indexes = [
            models.Index(fields=['business', 'is_active']),
        ]

    def __str__(self):
        return f'{self.name} ({self.code})'


class Department(TenantModel):
    """Department division within a business."""
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True, default='')
    head = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='headed_departments'
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'departments'
        constraints = [
            models.UniqueConstraint(
                fields=['business', 'code'],
                name='unique_department_code_per_business'
            )
        ]

    def __str__(self):
        return self.name


class Designation(TenantModel):
    """Job role designation and organizational rank."""
    name = models.CharField(max_length=150)
    level = models.IntegerField(default=1, help_text='Seniority hierarchy rank')
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'designations'
        constraints = [
            models.UniqueConstraint(
                fields=['business', 'name'],
                name='unique_designation_name_per_business'
            )
        ]

    def __str__(self):
        return self.name
