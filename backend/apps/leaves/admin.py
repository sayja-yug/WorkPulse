from django.contrib import admin
from .models import LeaveType, LeaveBalance, LeaveRequest, LeaveApproval, LeaveTransaction


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'business', 'is_paid', 'max_days_per_year', 'is_active']
    list_filter = ['is_paid', 'is_active']


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ['employee', 'leave_type', 'year', 'allocated', 'used', 'available']
    list_filter = ['year']


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ['employee', 'leave_type', 'start_date', 'end_date', 'days', 'status']
    list_filter = ['status']


@admin.register(LeaveApproval)
class LeaveApprovalAdmin(admin.ModelAdmin):
    list_display = ['request', 'approver', 'action', 'acted_at']


@admin.register(LeaveTransaction)
class LeaveTransactionAdmin(admin.ModelAdmin):
    list_display = ['employee', 'leave_type', 'transaction_type', 'days', 'balance_after']

