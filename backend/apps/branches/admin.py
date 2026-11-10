from django.contrib import admin
from .models import Branch, Department, Designation


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'business', 'city', 'is_head_office', 'is_active']
    search_fields = ['name', 'code', 'business__name']
    list_filter = ['is_head_office', 'is_active']


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'business', 'head', 'is_active']
    search_fields = ['name', 'code', 'business__name']


@admin.register(Designation)
class DesignationAdmin(admin.ModelAdmin):
    list_display = ['name', 'level', 'business', 'is_active']
    search_fields = ['name', 'business__name']
