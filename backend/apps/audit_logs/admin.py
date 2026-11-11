from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'business', 'action', 'resource_type', 'created_at', 'ip_address']
    list_filter = ['action', 'resource_type']
    search_fields = ['user__email', 'resource_type', 'ip_address']

