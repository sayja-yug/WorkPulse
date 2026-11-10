from django.contrib import admin
from .models import AttendanceRecord, AttendancePunch, AttendanceCorrection, Holiday, OvertimeRecord


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ['employee', 'date', 'status', 'check_in', 'check_out', 'working_hours', 'is_late']
    list_filter = ['status', 'is_late', 'source']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_code']


@admin.register(AttendancePunch)
class AttendancePunchAdmin(admin.ModelAdmin):
    list_display = ['attendance', 'punch_type', 'timestamp', 'is_valid']
    list_filter = ['punch_type', 'is_valid']


@admin.register(AttendanceCorrection)
class AttendanceCorrectionAdmin(admin.ModelAdmin):
    list_display = ['attendance', 'requested_by', 'corrected_status', 'status']
    list_filter = ['status']


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ['name', 'date', 'business', 'type', 'is_active']
    list_filter = ['type', 'is_active']


@admin.register(OvertimeRecord)
class OvertimeRecordAdmin(admin.ModelAdmin):
    list_display = ['employee', 'date', 'hours', 'rate_multiplier', 'status']
    list_filter = ['status']
