from django.db import models
from common.models import TenantModel, BaseModel


class Shift(TenantModel):
    class ShiftType(models.TextChoices):
        FIXED = 'FIXED', 'Fixed Hours'
        ROTATIONAL = 'ROTATIONAL', 'Rotational'
        NIGHT = 'NIGHT', 'Night Shift'
        FLEXIBLE = 'FLEXIBLE', 'Flexible'

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    type = models.CharField(max_length=20, choices=ShiftType.choices, default=ShiftType.FIXED)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_overnight = models.BooleanField(default=False)
    break_duration_minutes = models.IntegerField(default=0)
    grace_period_minutes = models.IntegerField(default=15)
    half_day_hours = models.DecimalField(max_digits=4, decimal_places=2, default=4.0)
    full_day_hours = models.DecimalField(max_digits=4, decimal_places=2, default=8.0)
    overtime_threshold_minutes = models.IntegerField(default=0)
    color = models.CharField(max_length=7, default='#3B82F6')
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'shifts'
        constraints = [
            models.UniqueConstraint(
                fields=['business', 'code'],
                name='unique_shift_code_per_business'
            )
        ]

    def __str__(self):
        return f'{self.name} ({self.start_time.strftime("%H:%M")} - {self.end_time.strftime("%H:%M")})'


class ShiftAssignment(BaseModel):
    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='shift_assignments'
    )
    shift = models.ForeignKey(
        Shift,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    assigned_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'shift_assignments'
        indexes = [
            models.Index(fields=['employee', 'effective_from']),
        ]

