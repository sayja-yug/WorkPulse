from django.contrib import admin
from .models import (
    SalaryComponent,
    SalaryTemplate,
    EmployeeSalaryStructure,
    PayrollRun,
    PayrollItem,
    PayrollItemComponent,
    Payslip,
    SalaryPayment
)


@admin.register(SalaryComponent)
class SalaryComponentAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'business', 'type', 'calculation_type', 'default_amount']
    list_filter = ['type', 'calculation_type', 'is_active']


@admin.register(SalaryTemplate)
class SalaryTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'business', 'is_active']


@admin.register(EmployeeSalaryStructure)
class EmployeeSalaryStructureAdmin(admin.ModelAdmin):
    list_display = ['employee', 'base_salary', 'effective_from', 'is_current']


@admin.register(PayrollRun)
class PayrollRunAdmin(admin.ModelAdmin):
    list_display = ['name', 'business', 'period_start', 'period_end', 'status', 'total_net']
    list_filter = ['status']


@admin.register(PayrollItem)
class PayrollItemAdmin(admin.ModelAdmin):
    list_display = ['payroll_run', 'employee', 'gross_salary', 'total_deductions', 'net_salary']


@admin.register(Payslip)
class PayslipAdmin(admin.ModelAdmin):
    list_display = ['payslip_number', 'employee', 'period_display', 'generated_at']


@admin.register(SalaryPayment)
class SalaryPaymentAdmin(admin.ModelAdmin):
    list_display = ['employee', 'amount', 'payment_mode', 'payment_date', 'status']

