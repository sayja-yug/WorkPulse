from django.db import models
from common.models import BaseModel


class Notification(BaseModel):
    class Type(models.TextChoices):
        INFO = 'INFO', 'Information'
        WARNING = 'WARNING', 'Warning'
        SUCCESS = 'SUCCESS', 'Success'
        ERROR = 'ERROR', 'Error'
        ATTENDANCE = 'ATTENDANCE', 'Attendance Alert'
        LEAVE = 'LEAVE', 'Leave Update'
        PAYROLL = 'PAYROLL', 'Payroll Notification'
        SYSTEM = 'SYSTEM', 'System Alert'

    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.INFO)
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
        ]

    def __str__(self):
        return f'{self.title} -> {self.user.email}'


class NotificationPreference(BaseModel):
    class Channel(models.TextChoices):
        IN_APP = 'IN_APP', 'In-App'
        EMAIL = 'EMAIL', 'Email'
        SMS = 'SMS', 'SMS'

    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )
    business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.IN_APP)
    event_type = models.CharField(max_length=100)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        db_table = 'notification_preferences'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'business', 'channel', 'event_type'],
                name='unique_user_notification_preference'
            )
        ]
