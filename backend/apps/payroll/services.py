from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from apps.employees.models import Employee
from apps.attendance.models import AttendanceRecord
from .models import (
    PayrollRun,
    PayrollItem,
    PayrollItemComponent,
    EmployeeSalaryStructure,
    SalaryComponent,
    Payslip
)


class PayrollService:
    @staticmethod
    def generate_payslip_number(business, payroll_run, index):
        year_month = payroll_run.period_start.strftime('%Y%m')
        return f'PS-{year_month}-{index:04d}'

    @classmethod
    @transaction.atomic
    def calculate_payroll_run(cls, payroll_run):
        business = payroll_run.business
        employees = Employee.objects.filter(business=business, status=Employee.Status.ACTIVE)

        total_gross = Decimal('0.00')
        total_deductions = Decimal('0.00')
        total_net = Decimal('0.00')

        # Clear existing items for re-calculation
        payroll_run.items.all().delete()

        for emp in employees:
            salary_struct = EmployeeSalaryStructure.objects.filter(
                employee=emp,
                is_current=True
            ).first()

            base_salary = salary_struct.base_salary if salary_struct else Decimal('30000.00')

            # Fetch monthly attendance
            att_records = AttendanceRecord.objects.filter(
                employee=emp,
                date__gte=payroll_run.period_start,
                date__lte=payroll_run.period_end
            )
            present_days = Decimal(str(att_records.filter(status=AttendanceRecord.Status.PRESENT).count()))
            paid_leaves = Decimal(str(att_records.filter(status=AttendanceRecord.Status.PAID_LEAVE).count()))
            unpaid_leaves = Decimal(str(att_records.filter(status=AttendanceRecord.Status.UNPAID_LEAVE).count()))

            total_days_in_period = Decimal('30.0')
            effective_payable_days = present_days + paid_leaves

            # If attendance is empty (demo/fallback), assume standard working days
            if effective_payable_days == Decimal('0.0'):
                effective_payable_days = total_days_in_period

            # Basic per-day wage proration
            daily_rate = (base_salary / total_days_in_period).quantize(Decimal('0.01'))
            gross_salary = (daily_rate * effective_payable_days).quantize(Decimal('0.01'))

            # Standard Statutory Deductions: PF (12% of basic up to standard cap), Tax (5%)
            pf_deduction = (gross_salary * Decimal('0.12')).quantize(Decimal('0.01'))
            tax_deduction = (gross_salary * Decimal('0.05')).quantize(Decimal('0.01'))
            emp_deductions = pf_deduction + tax_deduction

            # Net calculation
            net_salary = gross_salary - emp_deductions

            item = PayrollItem.objects.create(
                payroll_run=payroll_run,
                employee=emp,
                working_days=total_days_in_period,
                present_days=present_days,
                leave_days=paid_leaves,
                gross_salary=gross_salary,
                total_deductions=emp_deductions,
                net_salary=net_salary,
                status=PayrollItem.Status.CALCULATED
            )

            # Components detail
            PayrollItemComponent.objects.create(
                payroll_item=item,
                component_name='Basic Salary',
                component_type=SalaryComponent.Type.EARNING,
                amount=gross_salary
            )
            PayrollItemComponent.objects.create(
                payroll_item=item,
                component_name='Provident Fund (PF)',
                component_type=SalaryComponent.Type.DEDUCTION,
                amount=pf_deduction
            )
            PayrollItemComponent.objects.create(
                payroll_item=item,
                component_name='Professional Tax & TDS',
                component_type=SalaryComponent.Type.DEDUCTION,
                amount=tax_deduction
            )

            total_gross += gross_salary
            total_deductions += emp_deductions
            total_net += net_salary

        payroll_run.total_gross = total_gross
        payroll_run.total_deductions = total_deductions
        payroll_run.total_net = total_net
        payroll_run.status = PayrollRun.Status.REVIEW
        payroll_run.save(update_fields=['total_gross', 'total_deductions', 'total_net', 'status', 'updated_at'])

        return payroll_run

    @classmethod
    @transaction.atomic
    def approve_and_lock(cls, payroll_run, approved_by):
        payroll_run.status = PayrollRun.Status.APPROVED
        payroll_run.approved_by = approved_by
        payroll_run.locked_at = timezone.now()
        payroll_run.save(update_fields=['status', 'approved_by', 'locked_at', 'updated_at'])

        payroll_run.items.update(status=PayrollItem.Status.APPROVED)

        # Generate Payslips for each item
        idx = 1
        for item in payroll_run.items.all():
            period_str = payroll_run.period_start.strftime('%B %Y')
            ps_num = cls.generate_payslip_number(payroll_run.business, payroll_run, idx)
            Payslip.objects.get_or_create(
                payroll_item=item,
                defaults={
                    'employee': item.employee,
                    'business': payroll_run.business,
                    'payslip_number': ps_num,
                    'period_display': period_str
                }
            )
            idx += 1

        return payroll_run

