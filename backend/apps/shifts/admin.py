from django.contrib import admin
from .models import Shift, ShiftAssignment


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'business', 'start_time', 'end_time', 'is_overnight', 'is_active']
    search_fields = ['name', 'code', 'business__name']
    list_filter = ['type', 'is_overnight', 'is_active']


@admin.register(ShiftAssignment)
class ShiftAssignmentAdmin(admin.ModelAdmin):
    list_display = ['employee', 'shift', 'effective_from', 'effective_to']
    search_fields = ['employee__first_name', 'employee__last_name', 'shift__name']
