from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from apps.employees.models import Employee
from apps.attendance.models import AttendanceRecord
from apps.advances.models import Advance
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
    def get_company_policy(business):
        settings = getattr(business, 'settings', {}) or {}
        default_policy = {
            'standard_daily_hours': 8.0,
            'standard_weekly_hours': 40.0,
            'enable_overtime': True,
            'overtime_multiplier': 1.5,
            'enable_shortfall_deduction': True,
            'enable_unpaid_leave_deduction': True,
        }
        policy = dict(default_policy)
        if isinstance(settings, dict) and 'payroll_policy' in settings and isinstance(settings['payroll_policy'], dict):
            policy.update(settings['payroll_policy'])
        return policy

    @classmethod
    def generate_unique_payslip_number(cls, business, payroll_run, employee, index):
        year_month = payroll_run.period_start.strftime('%Y%m')
        biz_slug = getattr(business, 'slug', '') or 'WP'
        biz_prefix = biz_slug.replace('-', '')[:4].upper()
        emp_code = (getattr(employee, 'employee_code', '') or f'{index:04d}').replace('-', '')
        run_hash = str(payroll_run.id).replace('-', '')[:4].upper()

        candidate = f'PS-{biz_prefix}-{year_month}-{emp_code}-{run_hash}'
        if not Payslip.objects.filter(payslip_number=candidate).exists():
            return candidate

        counter = 1
        while Payslip.objects.filter(payslip_number=f'{candidate}-{counter}').exists():
            counter += 1
        return f'{candidate}-{counter}'

    @classmethod
    def generate_payslip_number(cls, business, payroll_run, index):
        year_month = payroll_run.period_start.strftime('%Y%m')
        run_hash = str(payroll_run.id).replace('-', '')[:4].upper()
        return f'PS-{year_month}-{index:04d}-{run_hash}'

    @classmethod
    @transaction.atomic
    def calculate_payroll_run(cls, payroll_run):
        business = payroll_run.business
        policy = cls.get_company_policy(business)

        standard_daily_hours = Decimal(str(policy.get('standard_daily_hours', 8.0)))
        enable_overtime = bool(policy.get('enable_overtime', True))
        overtime_multiplier = Decimal(str(policy.get('overtime_multiplier', 1.5)))
        enable_shortfall_deduction = bool(policy.get('enable_shortfall_deduction', True))
        enable_unpaid_leave_deduction = bool(policy.get('enable_unpaid_leave_deduction', True))

        employees = Employee.objects.filter(business=business).exclude(status=Employee.Status.TERMINATED)

        total_gross = Decimal('0.00')
        total_deductions = Decimal('0.00')
        total_net = Decimal('0.00')

        # Clear existing items for re-calculation
        payroll_run.items.all().delete()

        # Total calendar days in period
        period_days = (payroll_run.period_end - payroll_run.period_start).days + 1
        total_days_in_period = Decimal(str(max(1, period_days)))

        for emp in employees:
            salary_struct = EmployeeSalaryStructure.objects.filter(
                employee=emp,
                is_current=True
            ).first()

            base_salary = salary_struct.base_salary if salary_struct else Decimal('30000.00')

            effective_daily_hours = standard_daily_hours if standard_daily_hours > Decimal('0.00') else Decimal('8.0')
            salary_type = getattr(emp, 'salary_type', 'MONTHLY') or 'MONTHLY'

            if salary_type == 'HOURLY':
                hourly_rate = base_salary.quantize(Decimal('0.01'))
                daily_rate = (hourly_rate * effective_daily_hours).quantize(Decimal('0.01'))
            elif salary_type == 'DAILY':
                daily_rate = base_salary.quantize(Decimal('0.01'))
                hourly_rate = (daily_rate / effective_daily_hours).quantize(Decimal('0.01'))
            elif salary_type == 'WEEKLY':
                daily_rate = (base_salary / Decimal('7.0')).quantize(Decimal('0.01'))
                hourly_rate = (daily_rate / effective_daily_hours).quantize(Decimal('0.01'))
            else:
                # MONTHLY
                daily_rate = (base_salary / total_days_in_period).quantize(Decimal('0.01'))
                hourly_rate = (daily_rate / effective_daily_hours).quantize(Decimal('0.01'))

            # Fetch monthly attendance records
            att_records = AttendanceRecord.objects.filter(
                employee=emp,
                date__gte=payroll_run.period_start,
                date__lte=payroll_run.period_end
            )

            total_overtime_hours = Decimal('0.00')
            total_shortfall_hours = Decimal('0.00')
            total_worked_hours = Decimal('0.00')
            unpaid_leave_days = Decimal('0.00')
            present_days = Decimal('0.00')
            paid_leave_days = Decimal('0.00')

            if att_records.exists():
                for rec in att_records:
                    if rec.status == AttendanceRecord.Status.PRESENT:
                        present_days += Decimal('1.0')
                        hrs = Decimal(str(rec.working_hours or 0.0))
                        if hrs == Decimal('0.00') and rec.check_in and rec.check_out:
                            diff = (rec.check_out - rec.check_in).total_seconds() / 3600.0
                            hrs = Decimal(str(round(diff, 2)))
                        total_worked_hours += hrs

                        if hrs > Decimal('0.00'):
                            if hrs > standard_daily_hours:
                                total_overtime_hours += (hrs - standard_daily_hours)
                            elif hrs < standard_daily_hours:
                                total_shortfall_hours += (standard_daily_hours - hrs)

                    elif rec.status == AttendanceRecord.Status.HALF_DAY:
                        present_days += Decimal('0.5')
                        hrs = Decimal(str(rec.working_hours or 0.0))
                        total_worked_hours += hrs
                        target = (standard_daily_hours / Decimal('2.0')).quantize(Decimal('0.01'))
                        if hrs > target:
                            total_overtime_hours += (hrs - target)
                        elif hrs < target:
                            total_shortfall_hours += (target - hrs)

                    elif rec.status == AttendanceRecord.Status.PAID_LEAVE:
                        paid_leave_days += Decimal('1.0')

                    elif rec.status in [AttendanceRecord.Status.UNPAID_LEAVE, AttendanceRecord.Status.ABSENT]:
                        unpaid_leave_days += Decimal('1.0')

                total_overtime_hours = total_overtime_hours.quantize(Decimal('0.01'))
                total_shortfall_hours = total_shortfall_hours.quantize(Decimal('0.01'))
            else:
                # Fallback if no punch records exist for this period
                present_days = total_days_in_period

            # EARNINGS
            if salary_type == 'HOURLY':
                effective_hours = total_worked_hours if att_records.exists() else (present_days * effective_daily_hours)
                basic_earning = (effective_hours * hourly_rate).quantize(Decimal('0.01'))
                basic_component_name = f'Hourly Wages ({effective_hours} hrs @ ₹{hourly_rate}/hr)'
            elif salary_type == 'DAILY':
                basic_earning = (present_days * daily_rate).quantize(Decimal('0.01'))
                basic_component_name = f'Daily Wages ({present_days} days @ ₹{daily_rate}/day)'
            elif salary_type == 'WEEKLY':
                basic_earning = (base_salary * (total_days_in_period / Decimal('7.0'))).quantize(Decimal('0.01'))
                basic_component_name = 'Weekly Wage Basic'
            else:
                basic_earning = base_salary
                basic_component_name = 'Basic Salary'

            # Overtime pay
            overtime_pay = Decimal('0.00')
            if enable_overtime and total_overtime_hours > Decimal('0.00'):
                overtime_pay = (total_overtime_hours * hourly_rate * overtime_multiplier).quantize(Decimal('0.01'))

            gross_salary = (basic_earning + overtime_pay).quantize(Decimal('0.01'))

            # DEDUCTIONS
            # 1. Statutory PF (12% of basic)
            pf_deduction = (basic_earning * Decimal('0.12')).quantize(Decimal('0.01'))

            # 2. Professional Tax / TDS (5% of basic)
            tax_deduction = (basic_earning * Decimal('0.05')).quantize(Decimal('0.01'))

            # 3. Shortfall Cut (Hours worked < standard required hours)
            shortfall_deduction = Decimal('0.00')
            if enable_shortfall_deduction and total_shortfall_hours > Decimal('0.00'):
                shortfall_deduction = (total_shortfall_hours * hourly_rate).quantize(Decimal('0.01'))

            # 4. Unpaid Leave / Absent Cut
            unpaid_leave_deduction = Decimal('0.00')
            if enable_unpaid_leave_deduction and unpaid_leave_days > Decimal('0.00'):
                unpaid_leave_deduction = (unpaid_leave_days * daily_rate).quantize(Decimal('0.01'))

            # 5. Advance / Loan deduction
            advance_deduction = Decimal('0.00')
            active_advances = Advance.objects.filter(
                employee=emp,
                status__in=[Advance.Status.APPROVED, Advance.Status.DISBURSED, Advance.Status.DEDUCTING],
                remaining_balance__gt=Decimal('0.00')
            )
            for adv in active_advances:
                to_deduct = adv.monthly_deduction if (adv.monthly_deduction and adv.monthly_deduction > Decimal('0.00')) else adv.remaining_balance
                to_deduct = min(to_deduct, adv.remaining_balance)
                advance_deduction += to_deduct

            advance_deduction = advance_deduction.quantize(Decimal('0.01'))

            total_emp_deductions = (pf_deduction + tax_deduction + shortfall_deduction + unpaid_leave_deduction + advance_deduction).quantize(Decimal('0.01'))
            net_salary = max(Decimal('0.00'), (gross_salary - total_emp_deductions).quantize(Decimal('0.01')))

            item = PayrollItem.objects.create(
                payroll_run=payroll_run,
                employee=emp,
                working_days=total_days_in_period,
                present_days=present_days,
                leave_days=paid_leave_days + unpaid_leave_days,
                overtime_hours=total_overtime_hours,
                gross_salary=gross_salary,
                total_deductions=total_emp_deductions,
                net_salary=net_salary,
                advance_deduction=advance_deduction,
                status=PayrollItem.Status.CALCULATED
            )

            # Record item components
            PayrollItemComponent.objects.create(
                payroll_item=item,
                component_name=basic_component_name,
                component_type=SalaryComponent.Type.EARNING,
                amount=basic_earning,
                calculation_details={'base_salary': float(base_salary), 'salary_type': salary_type, 'days': float(total_days_in_period)}
            )

            if overtime_pay > Decimal('0.00'):
                PayrollItemComponent.objects.create(
                    payroll_item=item,
                    component_name=f'Overtime Pay ({total_overtime_hours} hrs @ {overtime_multiplier}x)',
                    component_type=SalaryComponent.Type.EARNING,
                    amount=overtime_pay,
                    calculation_details={
                        'overtime_hours': float(total_overtime_hours),
                        'hourly_rate': float(hourly_rate),
                        'multiplier': float(overtime_multiplier)
                    }
                )

            PayrollItemComponent.objects.create(
                payroll_item=item,
                component_name='Provident Fund (PF - 12%)',
                component_type=SalaryComponent.Type.DEDUCTION,
                amount=pf_deduction,
                calculation_details={'rate': 0.12}
            )

            PayrollItemComponent.objects.create(
                payroll_item=item,
                component_name='Professional Tax & TDS (5%)',
                component_type=SalaryComponent.Type.DEDUCTION,
                amount=tax_deduction,
                calculation_details={'rate': 0.05}
            )

            if shortfall_deduction > Decimal('0.00'):
                PayrollItemComponent.objects.create(
                    payroll_item=item,
                    component_name=f'Work Hour Shortfall Cut ({total_shortfall_hours} hrs deficit)',
                    component_type=SalaryComponent.Type.DEDUCTION,
                    amount=shortfall_deduction,
                    calculation_details={
                        'shortfall_hours': float(total_shortfall_hours),
                        'hourly_rate': float(hourly_rate)
                    }
                )

            if unpaid_leave_deduction > Decimal('0.00'):
                PayrollItemComponent.objects.create(
                    payroll_item=item,
                    component_name=f'Unpaid Leave / Absent Cut ({unpaid_leave_days} days)',
                    component_type=SalaryComponent.Type.DEDUCTION,
                    amount=unpaid_leave_deduction,
                    calculation_details={
                        'unpaid_days': float(unpaid_leave_days),
                        'daily_rate': float(daily_rate)
                    }
                )

            if advance_deduction > Decimal('0.00'):
                PayrollItemComponent.objects.create(
                    payroll_item=item,
                    component_name='Salary Advance Recovery',
                    component_type=SalaryComponent.Type.DEDUCTION,
                    amount=advance_deduction,
                    calculation_details={'advance_deduction': float(advance_deduction)}
                )

            total_gross += gross_salary
            total_deductions += total_emp_deductions
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

        # Apply advance recoveries towards employee balance
        for item in payroll_run.items.all():
            if item.advance_deduction > Decimal('0.00'):
                advances = Advance.objects.filter(
                    employee=item.employee,
                    status__in=[Advance.Status.APPROVED, Advance.Status.DISBURSED, Advance.Status.DEDUCTING],
                    remaining_balance__gt=Decimal('0.00')
                )
                rem = item.advance_deduction
                for adv in advances:
                    if rem <= Decimal('0.00'):
                        break
                    ded = min(rem, adv.remaining_balance)
                    adv.remaining_balance -= ded
                    rem -= ded
                    if adv.remaining_balance <= Decimal('0.00'):
                        adv.status = Advance.Status.COMPLETED
                    else:
                        adv.status = Advance.Status.DEDUCTING
                    adv.save(update_fields=['remaining_balance', 'status', 'updated_at'])

        # Generate Payslips for each item with collision-proof unique numbers
        idx = 1
        for item in payroll_run.items.all():
            period_str = payroll_run.period_start.strftime('%B %Y')
            existing_ps = Payslip.objects.filter(payroll_item=item).first()
            if not existing_ps:
                ps_num = cls.generate_unique_payslip_number(payroll_run.business, payroll_run, item.employee, idx)
                Payslip.objects.create(
                    payroll_item=item,
                    employee=item.employee,
                    business=payroll_run.business,
                    payslip_number=ps_num,
                    period_display=period_str
                )
            idx += 1

        return payroll_run
