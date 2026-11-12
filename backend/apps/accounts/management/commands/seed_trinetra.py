import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from apps.accounts.models import User, Role, Permission, RolePermission, UserRole
from apps.businesses.models import Business, BusinessMembership
from apps.branches.models import Branch, Department, Designation
from apps.employees.models import Employee
from apps.shifts.models import Shift, ShiftAssignment
from apps.attendance.models import AttendanceRecord, AttendancePunch
from apps.leaves.models import LeaveType, LeaveBalance, LeaveRequest
from apps.payroll.models import (
    SalaryComponent,
    SalaryTemplate,
    EmployeeSalaryStructure,
    PayrollRun,
    PayrollItem,
    Payslip
)
from apps.expenses.models import ExpenseCategory, Expense, CashTransaction
from apps.subscriptions.models import SubscriptionPlan, Subscription


class Command(BaseCommand):
    help = 'Seeds complete production-ready company data for Trinetra Technologies with realistic workflows'

    DEFAULT_PASSWORD = 'WorkPulse@2026'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Initializing core system contracts (roles, permissions, plans)...'))
        from django.core.management import call_command
        call_command('init_system')

        self.stdout.write(self.style.NOTICE('Creating enterprise company: Trinetra Technologies Pvt Ltd...'))
        business, _ = Business.objects.get_or_create(
            slug='trinetra',
            defaults={
                'name': 'Trinetra Technologies Pvt Ltd',
                'address': 'Trinetra Tower, Tech Boulevard, Sector 62',
                'city': 'Noida',
                'state': 'Uttar Pradesh',
                'country': 'India',
                'zip_code': '201301',
                'phone': '+91 98765 11000',
                'email': 'contact@trinetra.com',
                'website': 'https://trinetra.example.com',
                'timezone': 'Asia/Kolkata',
                'currency': 'INR',
                'working_days': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
            }
        )
        # Update name and contact if existing
        business.name = 'Trinetra Technologies Pvt Ltd'
        business.email = 'contact@trinetra.com'
        business.save()

        # Connect Business Subscription to Pro Plan
        pro_plan = SubscriptionPlan.objects.filter(code='PRO').first()
        if pro_plan:
            today = timezone.now().date()
            Subscription.objects.update_or_create(
                business=business,
                defaults={
                    'plan': pro_plan,
                    'status': Subscription.Status.ACTIVE,
                    'billing_cycle': Subscription.Cycle.ANNUAL,
                    'current_period_start': today,
                    'current_period_end': today + timezone.timedelta(days=365)
                }
            )

        # 1. Seed Branches
        br_hq, _ = Branch.objects.get_or_create(
            business=business,
            code='TRIN-HQ',
            defaults={
                'name': 'Trinetra Corporate Campus (HQ)',
                'address': 'Trinetra Tower, Sector 62',
                'city': 'Noida',
                'state': 'Uttar Pradesh',
                'latitude': Decimal('28.6280000'),
                'longitude': Decimal('77.3649000'),
                'geofence_radius': 350,
                'is_head_office': True
            }
        )

        br_blr, _ = Branch.objects.get_or_create(
            business=business,
            code='TRIN-BLR',
            defaults={
                'name': 'Trinetra Innovation Center',
                'address': 'Outer Ring Road, Kadubeesanahalli',
                'city': 'Bengaluru',
                'state': 'Karnataka',
                'latitude': Decimal('12.9352000'),
                'longitude': Decimal('77.6946000'),
                'geofence_radius': 300,
                'is_head_office': False
            }
        )

        br_mum, _ = Branch.objects.get_or_create(
            business=business,
            code='TRIN-MUM',
            defaults={
                'name': 'Trinetra Western Hub',
                'address': 'Bandra Kurla Complex, Bandra East',
                'city': 'Mumbai',
                'state': 'Maharashtra',
                'latitude': Decimal('19.0657000'),
                'longitude': Decimal('72.8687000'),
                'geofence_radius': 450,
                'is_head_office': False
            }
        )

        # 2. Seed Departments
        dept_eng, _ = Department.objects.get_or_create(business=business, code='ENG', defaults={'name': 'Engineering & Technology'})
        dept_hr, _ = Department.objects.get_or_create(business=business, code='HR', defaults={'name': 'People Operations & HR'})
        dept_fin, _ = Department.objects.get_or_create(business=business, code='FIN', defaults={'name': 'Finance & Accounts'})
        dept_ops, _ = Department.objects.get_or_create(business=business, code='OPS', defaults={'name': 'Operations & Infrastructure'})
        dept_sales, _ = Department.objects.get_or_create(business=business, code='SALES', defaults={'name': 'Enterprise Sales & Field'})

        # 3. Seed Designations
        desig_dir, _ = Designation.objects.get_or_create(business=business, name='Chief Technology Officer / VP', defaults={'level': 5})
        desig_mgr, _ = Designation.objects.get_or_create(business=business, name='Engineering Manager', defaults={'level': 4})
        desig_sr, _ = Designation.objects.get_or_create(business=business, name='Senior Full-Stack Engineer', defaults={'level': 3})
        desig_hr, _ = Designation.objects.get_or_create(business=business, name='HR Business Partner', defaults={'level': 3})
        desig_lead, _ = Designation.objects.get_or_create(business=business, name='Operations Lead', defaults={'level': 2})
        desig_assoc, _ = Designation.objects.get_or_create(business=business, name='Associate Consultant', defaults={'level': 1})

        # 4. Seed Platform & Trinetra Role Users
        self.stdout.write(self.style.NOTICE('Seeding Trinetra core role accounts...'))
        role_accounts = [
            # Platform admins
            ('superadmin@workpulse.com', 'Alexander', 'Pierce', Role.RoleCode.SUPER_ADMIN, True, True, False, br_hq, dept_eng, desig_dir, False),
            ('support@workpulse.com', 'Sarah', 'Jenkins', Role.RoleCode.SUPPORT_ADMIN, False, True, False, br_hq, dept_ops, desig_mgr, False),
            ('billing@workpulse.com', 'Brian', 'Miller', Role.RoleCode.BILLING_ADMIN, False, True, False, br_hq, dept_fin, desig_mgr, False),
            # Trinetra business role accounts
            ('owner@trinetra.com', 'Vikram', 'Aditya', Role.RoleCode.BUSINESS_OWNER, False, False, True, br_hq, dept_eng, desig_dir, False),
            ('hr@trinetra.com', 'Pooja', 'Sharma', Role.RoleCode.HR_MANAGER, False, False, False, br_hq, dept_hr, desig_hr, False),
            ('branchmanager@trinetra.com', 'Rahul', 'Verma', Role.RoleCode.BRANCH_MANAGER, False, False, False, br_blr, dept_ops, desig_mgr, False),
            ('accountant@trinetra.com', 'Amit', 'Singhal', Role.RoleCode.ACCOUNTANT, False, False, False, br_hq, dept_fin, desig_sr, False),
            ('supervisor@trinetra.com', 'Suresh', 'Nair', Role.RoleCode.SUPERVISOR, False, False, False, br_mum, dept_ops, desig_lead, False),
            ('employee@trinetra.com', 'Ananya', 'Patel', Role.RoleCode.EMPLOYEE, False, False, False, br_hq, dept_eng, desig_sr, False),
            ('field@trinetra.com', 'Rajesh', 'Kumar', Role.RoleCode.FIELD_EMPLOYEE, False, False, False, br_mum, dept_sales, desig_assoc, True),
            ('auditor@trinetra.com', 'Sunita', 'Menon', Role.RoleCode.AUDITOR, False, False, False, br_hq, dept_fin, desig_sr, False),
        ]

        created_employees = []
        for idx, (email, fn, ln, role_code, is_super, is_staff, is_owner, branch, dept, desig, is_field) in enumerate(role_accounts):
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': fn,
                    'last_name': ln,
                    'is_superuser': is_super,
                    'is_staff': is_staff,
                    'email_verified': True,
                    'is_active': True,
                    'active_business': business
                }
            )
            user.set_password(self.DEFAULT_PASSWORD)
            user.is_superuser = is_super
            user.is_staff = is_staff
            user.email_verified = True
            user.is_active = True
            user.active_business = business
            user.save()

            BusinessMembership.objects.update_or_create(
                user=user,
                business=business,
                defaults={'is_owner': is_owner, 'is_active': True}
            )

            role_obj = Role.objects.filter(code=role_code, is_system=True).first()
            if role_obj:
                UserRole.objects.update_or_create(
                    user=user,
                    business=business,
                    defaults={'role': role_obj, 'branch': branch}
                )

            # Create employee profile for all Trinetra members
            emp, _ = Employee.objects.update_or_create(
                business=business,
                email=email,
                defaults={
                    'user': user,
                    'employee_code': f'TRIN-{idx+1:04d}',
                    'first_name': fn,
                    'last_name': ln,
                    'branch': branch,
                    'department': dept,
                    'designation': desig,
                    'joining_date': datetime.date(2025, 1, 1),
                    'employment_type': Employee.EmploymentType.FULL_TIME,
                    'salary_type': Employee.SalaryType.MONTHLY,
                    'status': Employee.Status.ACTIVE,
                    'is_field_employee': is_field
                }
            )
            created_employees.append(emp)

        # 5. Additional Realistic Employees for Trinetra (Total 20+ workforce)
        additional_team = [
            ('Rohan', 'Mehta', br_hq, dept_eng, desig_sr, '48000.00'),
            ('Sneha', 'Kapoor', br_blr, dept_eng, desig_sr, '52000.00'),
            ('Arjun', 'Reddy', br_blr, dept_eng, desig_mgr, '75000.00'),
            ('Kavita', 'Joshi', br_hq, dept_hr, desig_hr, '42000.00'),
            ('Manoj', 'Tiwari', br_mum, dept_ops, desig_lead, '38000.00'),
            ('Priya', 'Deshmukh', br_mum, dept_sales, desig_assoc, '32000.00'),
            ('Deepak', 'Chawla', br_hq, dept_fin, desig_sr, '46000.00'),
            ('Neha', 'Bansal', br_blr, dept_eng, desig_assoc, '36000.00'),
            ('Karthik', 'Swaminathan', br_blr, dept_eng, desig_sr, '58000.00'),
            ('Swati', 'Mishra', br_hq, dept_sales, desig_assoc, '34000.00'),
            ('Alok', 'Gupta', br_mum, dept_ops, desig_assoc, '31000.00'),
            ('Simran', 'Kaur', br_hq, dept_eng, desig_sr, '50000.00'),
            ('Gaurav', 'Bhatia', br_blr, dept_ops, desig_lead, '40000.00'),
            ('Divya', 'Srivastava', br_mum, dept_sales, desig_assoc, '35000.00'),
        ]

        emp_role = Role.objects.filter(code=Role.RoleCode.EMPLOYEE, is_system=True).first()

        for fn, ln, branch, dept, desig, sal in additional_team:
            emp_email = f'{fn.lower()}.{ln.lower()}@trinetra.com'
            user, _ = User.objects.get_or_create(
                email=emp_email,
                defaults={
                    'first_name': fn,
                    'last_name': ln,
                    'email_verified': True,
                    'is_active': True,
                    'active_business': business
                }
            )
            user.set_password(self.DEFAULT_PASSWORD)
            user.active_business = business
            user.save()

            BusinessMembership.objects.update_or_create(user=user, business=business, defaults={'is_owner': False, 'is_active': True})
            if emp_role:
                UserRole.objects.update_or_create(user=user, role=emp_role, business=business, defaults={'branch': branch})

            emp, _ = Employee.objects.update_or_create(
                business=business,
                email=emp_email,
                defaults={
                    'user': user,
                    'employee_code': f'TRIN-{len(created_employees)+1:04d}',
                    'first_name': fn,
                    'last_name': ln,
                    'branch': branch,
                    'department': dept,
                    'designation': desig,
                    'joining_date': datetime.date(2025, 2, 1),
                    'employment_type': Employee.EmploymentType.FULL_TIME,
                    'salary_type': Employee.SalaryType.MONTHLY,
                    'status': Employee.Status.ACTIVE
                }
            )
            created_employees.append(emp)

        # 6. Seed Shifts & Shift Assignments
        self.stdout.write(self.style.NOTICE('Seeding Trinetra shifts and rosters...'))
        shift_gen, _ = Shift.objects.get_or_create(
            business=business,
            code='GEN',
            defaults={
                'name': 'General Day Shift (9:30 AM - 6:30 PM)',
                'type': Shift.ShiftType.FIXED,
                'start_time': datetime.time(9, 30),
                'end_time': datetime.time(18, 30),
                'grace_period_minutes': 15,
                'half_day_hours': Decimal('4.0'),
                'full_day_hours': Decimal('8.0'),
                'color': '#4F46E5'
            }
        )

        shift_night, _ = Shift.objects.get_or_create(
            business=business,
            code='NIGHT',
            defaults={
                'name': 'Night Operations Shift (9:00 PM - 6:00 AM)',
                'type': Shift.ShiftType.NIGHT,
                'start_time': datetime.time(21, 0),
                'end_time': datetime.time(6, 0),
                'is_overnight': True,
                'grace_period_minutes': 20,
                'color': '#7C3AED'
            }
        )

        for emp in created_employees:
            ShiftAssignment.objects.get_or_create(
                employee=emp,
                shift=shift_gen,
                effective_from=datetime.date(2026, 1, 1)
            )

        # 7. Seed Attendance Records for the Past 6 Days (excluding today so live punches start fresh)
        self.stdout.write(self.style.NOTICE('Seeding Trinetra historical attendance records...'))
        today = timezone.now().date()
        for offset in range(1, 7):
            att_date = today - datetime.timedelta(days=offset)
            for emp in created_employees:
                status = AttendanceRecord.Status.PRESENT
                if offset == 0 and emp.employee_code.endswith('5'):
                    status = AttendanceRecord.Status.ABSENT

                check_in_time = timezone.make_aware(datetime.datetime.combine(att_date, datetime.time(9, 25)))
                check_out_time = timezone.make_aware(datetime.datetime.combine(att_date, datetime.time(18, 35)))

                AttendanceRecord.objects.update_or_create(
                    business=business,
                    employee=emp,
                    date=att_date,
                    defaults={
                        'shift': shift_gen,
                        'status': status,
                        'check_in': check_in_time if status == AttendanceRecord.Status.PRESENT else None,
                        'check_out': check_out_time if status == AttendanceRecord.Status.PRESENT else None,
                        'working_hours': Decimal('8.50') if status == AttendanceRecord.Status.PRESENT else Decimal('0.00'),
                        'source': AttendanceRecord.Source.SELF
                    }
                )

        # 8. Seed Leave Types, Balances & Requests
        self.stdout.write(self.style.NOTICE('Seeding Trinetra leave policies and balances...'))
        lt_cl, _ = LeaveType.objects.get_or_create(business=business, code='CL', defaults={'name': 'Casual Leave', 'max_days_per_year': 12})
        lt_sl, _ = LeaveType.objects.get_or_create(business=business, code='SL', defaults={'name': 'Sick Leave', 'max_days_per_year': 10})
        lt_el, _ = LeaveType.objects.get_or_create(business=business, code='EL', defaults={'name': 'Earned Leave', 'max_days_per_year': 15, 'is_carry_forward': True})

        for emp in created_employees:
            LeaveBalance.objects.get_or_create(employee=emp, leave_type=lt_cl, year=2026, defaults={'allocated': Decimal('12.0')})
            LeaveBalance.objects.get_or_create(employee=emp, leave_type=lt_sl, year=2026, defaults={'allocated': Decimal('10.0')})
            LeaveBalance.objects.get_or_create(employee=emp, leave_type=lt_el, year=2026, defaults={'allocated': Decimal('15.0')})

        # Pending and Approved Leave Requests for UI Verification
        LeaveRequest.objects.get_or_create(
            business=business,
            employee=created_employees[5],
            leave_type=lt_cl,
            start_date=today + datetime.timedelta(days=2),
            end_date=today + datetime.timedelta(days=3),
            defaults={
                'days': Decimal('2.0'),
                'reason': 'Family wedding event in hometown',
                'status': LeaveRequest.Status.PENDING
            }
        )

        LeaveRequest.objects.get_or_create(
            business=business,
            employee=created_employees[8],
            leave_type=lt_sl,
            start_date=today - datetime.timedelta(days=3),
            end_date=today - datetime.timedelta(days=2),
            defaults={
                'days': Decimal('2.0'),
                'reason': 'Viral fever and medical rest',
                'status': LeaveRequest.Status.APPROVED
            }
        )

        # 9. Seed Salary Structures & Completed Payroll Run
        self.stdout.write(self.style.NOTICE('Seeding Trinetra salary structures and locked payslips...'))
        for emp in created_employees:
            EmployeeSalaryStructure.objects.update_or_create(
                employee=emp,
                business=business,
                is_current=True,
                defaults={
                    'base_salary': Decimal('55000.00'),
                    'effective_from': datetime.date(2026, 1, 1)
                }
            )

        # Completed October 2026 Payroll Run
        oct_start = datetime.date(2026, 10, 1)
        oct_end = datetime.date(2026, 10, 31)
        payroll_run, _ = PayrollRun.objects.get_or_create(
            business=business,
            name='October 2026 Monthly Payroll',
            defaults={
                'period_start': oct_start,
                'period_end': oct_end,
                'pay_date': datetime.date(2026, 10, 31),
                'status': PayrollRun.Status.APPROVED,
                'total_gross': Decimal(f'{len(created_employees) * 55000}.00'),
                'total_deductions': Decimal(f'{len(created_employees) * 8800}.00'),
                'total_net': Decimal(f'{len(created_employees) * 46200}.00'),
                'locked_at': timezone.now()
            }
        )

        for i, emp in enumerate(created_employees):
            gross = Decimal('55000.00')
            deductions = Decimal('8800.00')
            net = gross - deductions
            item, _ = PayrollItem.objects.update_or_create(
                payroll_run=payroll_run,
                employee=emp,
                defaults={
                    'working_days': Decimal('30.0'),
                    'present_days': Decimal('30.0'),
                    'gross_salary': gross,
                    'total_deductions': deductions,
                    'net_salary': net,
                    'status': PayrollItem.Status.APPROVED
                }
            )
            Payslip.objects.update_or_create(
                payroll_item=item,
                defaults={
                    'employee': emp,
                    'business': business,
                    'payslip_number': f'PS-TRIN-202610-{i+1:04d}',
                    'period_display': 'October 2026'
                }
            )

        # 10. Seed Cashbook & Expenses
        self.stdout.write(self.style.NOTICE('Seeding Trinetra cashbook ledgers and operating expenses...'))
        cat_off, _ = ExpenseCategory.objects.get_or_create(business=business, code='OFFICE', defaults={'name': 'Office Supplies & Stationery', 'type': ExpenseCategory.Type.EXPENSE})
        cat_trav, _ = ExpenseCategory.objects.get_or_create(business=business, code='TRAVEL', defaults={'name': 'Client Onsite Travel', 'type': ExpenseCategory.Type.EXPENSE})
        cat_cloud, _ = ExpenseCategory.objects.get_or_create(business=business, code='CLOUD', defaults={'name': 'Cloud Infrastructure & SaaS', 'type': ExpenseCategory.Type.EXPENSE})
        cat_inv, _ = ExpenseCategory.objects.get_or_create(business=business, code='CAPITAL', defaults={'name': 'Customer Advance Received', 'type': ExpenseCategory.Type.INCOME})

        owner_user = User.objects.get(email='owner@trinetra.com')

        CashTransaction.objects.get_or_create(
            business=business,
            description='Client Project Retainer Payment (Q4)',
            date=today - datetime.timedelta(days=12),
            defaults={
                'type': CashTransaction.Type.CASH_IN,
                'amount': Decimal('150000.00'),
                'category': cat_inv,
                'balance_after': Decimal('150000.00'),
                'created_by': owner_user
            }
        )

        CashTransaction.objects.get_or_create(
            business=business,
            description='Ergonomic Chairs & Workstations for Noida HQ',
            date=today - datetime.timedelta(days=5),
            defaults={
                'type': CashTransaction.Type.CASH_OUT,
                'amount': Decimal('18500.00'),
                'category': cat_off,
                'balance_after': Decimal('131500.00'),
                'created_by': owner_user
            }
        )

        Expense.objects.get_or_create(
            business=business,
            description='AWS Cloud Hosting & Dedicated Bandwidth',
            date=today - datetime.timedelta(days=2),
            defaults={
                'category': cat_cloud,
                'amount': Decimal('14999.00'),
                'payment_mode': Expense.PaymentMode.BANK_TRANSFER,
                'created_by': owner_user,
                'status': Expense.Status.APPROVED
            }
        )

        self.stdout.write(self.style.SUCCESS(
            '\n============================================================\n'
            'SUCCESS: Trinetra Technologies Pvt Ltd Environment Ready!\n'
            f'Total Workforce: {len(created_employees)} Employees\n'
            'Standard Password for all accounts: WorkPulse@2026\n'
            'Primary Owner: owner@trinetra.com\n'
            'HR Manager: hr@trinetra.com\n'
            'Accountant: accountant@trinetra.com\n'
            '============================================================'
        ))

