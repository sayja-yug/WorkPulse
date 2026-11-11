from django.db import models
from django.utils.text import slugify
from common.models import BaseModel


class Business(BaseModel):
    """Multi-tenant organization root entity."""
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    logo = models.ImageField(upload_to='business_logos/', null=True, blank=True)
    address = models.TextField(blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')
    state = models.CharField(max_length=100, blank=True, default='')
    country = models.CharField(max_length=100, default='India')
    zip_code = models.CharField(max_length=20, blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    website = models.URLField(blank=True, default='')
    timezone = models.CharField(max_length=50, default='Asia/Kolkata')
    currency = models.CharField(max_length=10, default='INR')
    working_days = models.JSONField(default=list)  # e.g., ["Mon", "Tue", "Wed", "Thu", "Fri"]
    settings = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'businesses'
        verbose_name_plural = 'Businesses'
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Business.objects.filter(slug=slug).exclude(id=self.id).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            self.slug = slug
        if not self.working_days:
            self.working_days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
        super().save(*args, **kwargs)


class BusinessMembership(BaseModel):
    """User membership association with a business."""
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='business_memberships'
    )
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    is_owner = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'business_memberships'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'business'],
                name='unique_user_business_membership'
            )
        ]
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['business', 'is_active']),
        ]

    def __str__(self):
        role_label = 'Owner' if self.is_owner else 'Member'
        return f'{self.user.email} -> {self.business.name} ({role_label})'

