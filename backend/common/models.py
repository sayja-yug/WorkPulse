"""Base models for WorkPulse."""
import uuid

from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    """Abstract model with created_at and updated_at timestamps."""
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']


class UUIDModel(models.Model):
    """Abstract model with UUID primary key."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class BaseModel(UUIDModel, TimeStampedModel):
    """Abstract base model with UUID pk and timestamps."""

    class Meta:
        abstract = True
        ordering = ['-created_at']


class TenantModel(BaseModel):
    """Abstract model for tenant-scoped data.

    All models that belong to a business must inherit from this.
    This ensures every query is automatically scoped to the business.
    """
    business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE,
        related_name='%(class)ss',
        db_index=True,
    )

    class Meta:
        abstract = True
        ordering = ['-created_at']


class SoftDeleteModel(models.Model):
    """Abstract model supporting soft deletes."""
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        'accounts.User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='%(class)s_deleted',
    )

    class Meta:
        abstract = True

    def soft_delete(self, user=None):
        """Soft delete this record."""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'updated_at'])

    def restore(self):
        """Restore soft-deleted record."""
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'updated_at'])

