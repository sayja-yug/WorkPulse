from django.contrib import admin
from .models import Employee, EmployeeDocument, EmploymentHistory


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['employee_code', 'first_name', 'last_name', 'business', 'branch', 'department', 'status']
    search_fields = ['employee_code', 'first_name', 'last_name', 'email']
    list_filter = ['status', 'employment_type', 'salary_type', 'is_field_employee']


@admin.register(EmployeeDocument)
class EmployeeDocumentAdmin(admin.ModelAdmin):
    list_display = ['employee', 'document_type', 'file_name', 'is_verified']
    list_filter = ['document_type', 'is_verified']


@admin.register(EmploymentHistory)
class EmploymentHistoryAdmin(admin.ModelAdmin):
    list_display = ['employee', 'change_type', 'effective_date', 'changed_by']
    list_filter = ['change_type']
