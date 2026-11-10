import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from apps.accounts.models import User, Role, Permission, RolePermission, UserRole
from apps.businesses.models import Business, BusinessMembership
from apps.branches.models import Branch, Department, Designation
from apps.employees.models import Employee, EmploymentHistory
from apps.shifts.models import Shift, ShiftAssignment
from apps.attendance.models import AttendanceRecord, AttendancePunch
from apps.leaves.models import LeaveType, LeaveBalance, LeaveRequest
from apps.payroll.models import (
    SalaryComponent,
    SalaryTemplate,
    EmployeeSalaryStructure,
    PayrollRun,
    PayrollItem,
    PayrollItemComponent,
    Payslip
)
from apps.expenses.models import ExpenseCategory, Expense, CashTransaction
from apps.subscriptions.models import SubscriptionPlan, Subscription


class Command(BaseCommand):
    help = 'Seeds realistic enterprise demo data for WorkPulse'

    DEMO_PASSWORD = 'Demo@12345'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting WorkPulse Demo Data Seeding...'))

        # 1. Seed Global Permissions
        self.seed_permissions()

        # 2. Seed System Roles
        self.seed_roles()

        # 3. Seed Subscription Plans
        self.seed_subscription_plans()

        # 4. Seed Super Admin
        superadmin, _ = User.objects.get_or_create(
            email='superadmin@workpulse.com',
            defaults={
                'first_name': 'Global',
                'last_name': 'SuperAdmin',
                'is_staff': True,
                'is_superuser': True,
                'email_verified': True
            }
        )
        superadmin.set_password(self.DEMO_PASSWORD)
        superadmin.save()

        # 5. Seed Demo Business
        business, _ = Business.objects.get_or_create(
            slug='apex-global',
            defaults={
                'name': 'Apex Global Enterprises',
                'address': 'Plot 42, Cyber City Phase 2',
                'city': 'Gurugram',
                'state': 'Haryana',
                'country': 'India',
                'zip_code': '122002',
                'phone': '+91 124 4567890',
                'email': 'contact@apexglobal.com',
                'website': 'https://apexglobal.example.com',
                'timezone': 'Asia/Kolkata',
                'currency': 'INR',
                'working_days': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
            }
        )

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

        # 6. Seed Branches
        br_hq, _ = Branch.objects.get_or_create(
            business=business,
            code='BR-HQ',
            defaults={
                'name': 'Corporate Headquarters',
                'address': 'Cyber City Phase 2',
                'city': 'Gurugram',
                'state': 'Haryana',
                'latitude': Decimal('28.4908000'),
                'longitude': Decimal('77.0890000'),
                'geofence_radius': 300,
                'is_head_office': True
            }
        )

        br_tech, _ = Branch.objects.get_or_create(
            business=business,
            code='BR-TECH',
            defaults={
                'name': 'Bengaluru R&D Center',
                'address': 'Outer Ring Road, Bellandur',
                'city': 'Bengaluru',
                'state': 'Karnataka',
                'latitude': Decimal('12.9260000'),
                'longitude': Decimal('77.6762000'),
                'geofence_radius': 250,
                'is_head_office': False
            }
        )

        br_wh, _ = Branch.objects.get_or_create(
            business=business,
            code='BR-LOG',
            defaults={
                'name': 'Mumbai Logistics Hub',
                'address': 'Bhiwandi Industrial Estate',
                'city': 'Mumbai',
                'state': 'Maharashtra',
                'latitude': Decimal('19.2968000'),
                'longitude': Decimal('73.0631000'),
                'geofence_radius': 500,
                'is_head_office': False
            }
        )

        # 7. Seed Departments & Designations
        dept_eng, _ = Department.objects.get_or_create(business=business, code='ENG', defaults={'name': 'Engineering'})
        dept_hr, _ = Department.objects.get_or_create(business=business, code='HR', defaults={'name': 'Human Resources'})
        dept_fin, _ = Department.objects.get_or_create(business=business, code='FIN', defaults={'name': 'Finance & Accounting'})
        dept_ops, _ = Department.objects.get_or_create(business=business, code='OPS', defaults={'name': 'Operations'})
        dept_sales, _ = Department.objects.get_or_create(business=business, code='SALES', defaults={'name': 'Sales & Marketing'})

        desig_vp, _ = Designation.objects.get_or_create(business=business, name='Vice President', defaults={'level': 5})
        desig_mgr, _ = Designation.objects.get_or_create(business=business, name='Engineering Manager', defaults={'level': 4})
        desig_sr, _ = Designation.objects.get_or_create(business=business, name='Senior Software Engineer', defaults={'level': 3})
        desig_exec, _ = Designation.objects.get_or_create(business=business, name='Operations Executive', defaults={'level': 2})
        desig_assoc, _ = Designation.objects.get_or_create(business=business, name='Sales Associate', defaults={'level': 1})

        # 8. Seed Key Role Demo Accounts
        role_accounts = [
            ('owner@apexglobal.com', 'Vikram', 'Aditya', Role.RoleCode.BUSINESS_OWNER, True, br_hq, dept_eng, desig_vp),
            ('hr@apexglobal.com', 'Pooja', 'Sharma', Role.RoleCode.HR_MANAGER, False, br_hq, dept_hr, desig_mgr),
            ('branchmanager@apexglobal.com', 'Rahul', 'Verma', Role.RoleCode.BRANCH_MANAGER, False, br_tech, dept_eng, desig_mgr),
            ('accountant@apexglobal.com', 'Amit', 'Singhal', Role.RoleCode.ACCOUNTANT, False, br_hq, dept_fin, desig_sr),
            ('supervisor@apexglobal.com', 'Suresh', 'Nair', Role.RoleCode.SUPERVISOR, False, br_wh, dept_ops, desig_mgr),
            ('employee@apexglobal.com', 'Ananya', 'Patel', Role.RoleCode.EMPLOYEE, False, br_tech, dept_eng, desig_sr),
            ('field@apexglobal.com', 'Rajesh', 'Kumar', Role.RoleCode.FIELD_EMPLOYEE, False, br_wh, dept_sales, desig_assoc),
            ('auditor@apexglobal.com', 'Sunita', 'Menon', Role.RoleCode.AUDITOR, False, br_hq, dept_fin, desig_sr),
        ]

        created_employees = []
        for email, f_name, l_name, role_code, is_owner, branch, dept, desig in role_accounts:
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': f_name,
                    'last_name': l_name,
                    'email_verified': True,
                    'active_business': business
                }
            )
            user.set_password(self.DEMO_PASSWORD)
            user.active_business = business
            user.save()

            BusinessMembership.objects.get_or_create(
                user=user,
                business=business,
                defaults={'is_owner': is_owner}
            )

            role_obj = Role.objects.get(code=role_code, is_system=True)
            UserRole.objects.get_or_create(
                user=user,
                role=role_obj,
                business=business,
                defaults={'branch': branch}
            )

            emp, _ = Employee.objects.get_or_create(
                business=business,
                email=email,
                defaults={
                    'user': user,
                    'employee_code': f'WP-{len(created_employees)+1001:04d}',
                    'first_name': f_name,
                    'last_name': l_name,
                    'branch': branch,
                    'department': dept,
                    'designation': desig,
                    'joining_date': datetime.date(2025, 1, 15),
                    'employment_type': Employee.EmploymentType.FULL_TIME,
                    'salary_type': Employee.SalaryType.MONTHLY,
                    'status': Employee.Status.ACTIVE,
                    'is_field_employee': (role_code == Role.RoleCode.FIELD_EMPLOYEE)
                }
            )
            created_employees.append(emp)

        # Seed additional standard employees to satisfy 20+ requirement
        additional_names = [
            ('Rohan', 'Mehta'), ('Sneha', 'Kapoor'), ('Arjun', 'Reddy'), ('Kavita', 'Joshi'),
            ('Manoj', 'Tiwari'), ('Priya', 'Deshmukh'), ('Deepak', 'Chawla'), ('Neha', 'Bansal'),
            ('Karthik', 'Swaminathan'), ('Swati', 'Mishra'), ('Alok', 'Gupta'), ('Simran', 'Kaur'),
            ('Gaurav', 'Bhatia'), ('Divya', 'Srivastava')
        ]

        for i, (fn, ln) in enumerate(additional_names):
            emp_email = f'{fn.lower()}.{ln.lower()}@apexglobal.com'
            user, _ = User.objects.get_or_create(
                email=emp_email,
                defaults={
                    'first_name': fn,
                    'last_name': ln,
                    'email_verified': True,
                    'active_business': business
                }
            )
            user.set_password(self.DEMO_PASSWORD)
            user.active_business = business
            user.save()

            BusinessMembership.objects.get_or_create(user=user, business=business, defaults={'is_owner': False})
            emp_role = Role.objects.get(code=Role.RoleCode.EMPLOYEE, is_system=True)
            UserRole.objects.get_or_create(user=user, role=emp_role, business=business)

            branch = br_tech if i % 2 == 0 else br_hq
            dept = dept_eng if i % 2 == 0 else dept_sales
            desig = desig_sr if i % 3 == 0 else desig_assoc

            emp, _ = Employee.objects.get_or_create(
                business=business,
                email=emp_email,
                defaults={
                    'user': user,
                    'employee_code': f'WP-{len(created_employees)+1001:04d}',
                    'first_name': fn,
                    'last_name': ln,
                    'branch': branch,
                    'department': dept,
                    'designation': desig,
                    'joining_date': datetime.date(2025, 3, 1),
                    'employment_type': Employee.EmploymentType.FULL_TIME,
                    'salary_type': Employee.SalaryType.MONTHLY,
                    'status': Employee.Status.ACTIVE
                }
            )
            created_employees.append(emp)

        # 9. Seed Shifts & Assignments
        shift_gen, _ = Shift.objects.get_or_create(
            business=business,
            code='GEN',
            defaults={
                'name': 'General Day Shift',
                'type': Shift.ShiftType.FIXED,
                'start_time': datetime.time(9, 30),
                'end_time': datetime.time(18, 30),
                'grace_period_minutes': 15,
                'half_day_hours': Decimal('4.0'),
                'full_day_hours': Decimal('8.0'),
                'color': '#3B82F6'
            }
        )

        shift_night, _ = Shift.objects.get_or_create(
            business=business,
            code='NIGHT',
            defaults={
                'name': 'Night Operations Shift',
                'type': Shift.ShiftType.NIGHT,
                'start_time': datetime.time(21, 0),
                'end_time': datetime.time(6, 0),
                'is_overnight': True,
                'grace_period_minutes': 20,
                'color': '#8B5CF6'
            }
        )

        for emp in created_employees:
            ShiftAssignment.objects.get_or_create(
                employee=emp,
                shift=shift_gen,
                effective_from=datetime.date(2026, 1, 1)
            )

        # 10. Seed Attendance Records for Past 7 Days
        today = timezone.now().date()
        for offset in range(7):
            att_date = today - datetime.timedelta(days=offset)
            for emp in created_employees[:15]:
                status = AttendanceRecord.Status.PRESENT
                if offset == 0 and emp.employee_code.endswith('5'):
                    status = AttendanceRecord.Status.ABSENT

                check_in_time = timezone.make_aware(datetime.datetime.combine(att_date, datetime.time(9, 25)))
                check_out_time = timezone.make_aware(datetime.datetime.combine(att_date, datetime.time(18, 35)))

                record, _ = AttendanceRecord.objects.get_or_create(
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

        # 11. Seed Leave Types & Balances
        lt_cl, _ = LeaveType.objects.get_or_create(business=business, code='CL', defaults={'name': 'Casual Leave', 'max_days_per_year': 12})
        lt_sl, _ = LeaveType.objects.get_or_create(business=business, code='SL', defaults={'name': 'Sick Leave', 'max_days_per_year': 10})
        lt_el, _ = LeaveType.objects.get_or_create(business=business, code='EL', defaults={'name': 'Earned Leave', 'max_days_per_year': 15, 'is_carry_forward': True})

        for emp in created_employees:
            LeaveBalance.objects.get_or_create(employee=emp, leave_type=lt_cl, year=2026, defaults={'allocated': Decimal('12.0')})
            LeaveBalance.objects.get_or_create(employee=emp, leave_type=lt_sl, year=2026, defaults={'allocated': Decimal('10.0')})
            LeaveBalance.objects.get_or_create(employee=emp, leave_type=lt_el, year=2026, defaults={'allocated': Decimal('15.0')})

        # Seed sample leave request
        LeaveRequest.objects.get_or_create(
            business=business,
            employee=created_employees[5],
            leave_type=lt_cl,
            start_date=today + datetime.timedelta(days=2),
            end_date=today + datetime.timedelta(days=3),
            defaults={
                'days': Decimal('2.0'),
                'reason': 'Attending family wedding reception',
                'status': LeaveRequest.Status.PENDING
            }
        )

        # 12. Seed Salary Structures & Completed Payroll Run
        for emp in created_employees:
            EmployeeSalaryStructure.objects.get_or_create(
                employee=emp,
                business=business,
                is_current=True,
                defaults={
                    'base_salary': Decimal('45000.00'),
                    'effective_from': datetime.date(2026, 1, 1)
                }
            )

        # Completed October 2026 Payroll Run
        oct_start = datetime.date(2026, 10, 1)
        oct_end = datetime.date(2026, 10, 31)
        run, _ = PayrollRun.objects.get_or_create(
            business=business,
            name='October 2026 Payroll',
            defaults={
                'period_start': oct_start,
                'period_end': oct_end,
                'pay_date': datetime.date(2026, 10, 31),
                'status': PayrollRun.Status.APPROVED,
                'total_gross': Decimal('990000.00'),
                'total_deductions': Decimal('168300.00'),
                'total_net': Decimal('821700.00'),
                'locked_at': timezone.now()
            }
        )

        for i, emp in enumerate(created_employees):
            gross = Decimal('45000.00')
            deductions = Decimal('7650.00')
            net = gross - deductions
            item, _ = PayrollItem.objects.get_or_create(
                payroll_run=run,
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
            Payslip.objects.get_or_create(
                payroll_item=item,
                defaults={
                    'employee': emp,
                    'business': business,
                    'payslip_number': f'PS-202610-{i+1:04d}',
                    'period_display': 'October 2026'
                }
            )

        # 13. Seed Cashbook & Expenses
        cat_off, _ = ExpenseCategory.objects.get_or_create(business=business, code='OFFICE', defaults={'name': 'Office Supplies', 'type': ExpenseCategory.Type.EXPENSE})
        cat_trav, _ = ExpenseCategory.objects.get_or_create(business=business, code='TRAVEL', defaults={'name': 'Client Travel', 'type': ExpenseCategory.Type.EXPENSE})
        cat_inv, _ = ExpenseCategory.objects.get_or_create(business=business, code='INVEST', defaults={'name': 'Client Advance Received', 'type': ExpenseCategory.Type.INCOME})

        owner_user = User.objects.get(email='owner@apexglobal.com')

        CashTransaction.objects.get_or_create(
            business=business,
            description='Initial Petty Cash Reserve',
            date=today - datetime.timedelta(days=10),
            defaults={
                'type': CashTransaction.Type.CASH_IN,
                'amount': Decimal('50000.00'),
                'category': cat_inv,
                'balance_after': Decimal('50000.00'),
                'created_by': owner_user
            }
        )

        CashTransaction.objects.get_or_create(
            business=business,
            description='Stationery & Printer Cartridges',
            date=today - datetime.timedelta(days=4),
            defaults={
                'type': CashTransaction.Type.CASH_OUT,
                'amount': Decimal('3500.00'),
                'category': cat_off,
                'balance_after': Decimal('46500.00'),
                'created_by': owner_user
            }
        )

        Expense.objects.get_or_create(
            business=business,
            description='High-speed fiber internet subscription',
            date=today - datetime.timedelta(days=2),
            defaults={
                'category': cat_off,
                'amount': Decimal('2499.00'),
                'payment_mode': Expense.PaymentMode.BANK_TRANSFER,
                'created_by': owner_user,
                'status': Expense.Status.APPROVED
            }
        )

        self.stdout.write(self.style.SUCCESS('Successfully seeded complete demo environment for WorkPulse!'))
        self.stdout.write(self.style.SUCCESS('Default Demo Password for all accounts: Demo@12345'))

    def seed_permissions(self):
        perms = [
            ('employee.view', 'View employees', 'employees'),
            ('employee.create', 'Create employee', 'employees'),
            ('employee.update', 'Update employee', 'employees'),
            ('employee.deactivate', 'Deactivate employee', 'employees'),
            ('employee.transfer', 'Transfer employee', 'employees'),
            ('attendance.view', 'View attendance', 'attendance'),
            ('attendance.mark', 'Mark attendance', 'attendance'),
            ('attendance.mark_own', 'Mark own attendance', 'attendance'),
            ('attendance.correct', 'Request attendance correction', 'attendance'),
            ('attendance.approve', 'Approve attendance correction', 'attendance'),
            ('attendance.view_reports', 'View attendance reports', 'attendance'),
            ('shift.view', 'View shifts', 'shifts'),
            ('shift.create', 'Create shift', 'shifts'),
            ('shift.assign', 'Assign shift', 'shifts'),
            ('leave.view', 'View leaves', 'leaves'),
            ('leave.apply', 'Apply for leave', 'leaves'),
            ('leave.approve', 'Approve leave', 'leaves'),
            ('leave.reject', 'Reject leave', 'leaves'),
            ('payroll.view', 'View payroll', 'payroll'),
            ('payroll.calculate', 'Calculate payroll', 'payroll'),
            ('payroll.approve', 'Approve payroll', 'payroll'),
            ('payroll.view_own', 'View own payslip', 'payroll'),
            ('advance.view', 'View advances', 'advances'),
            ('advance.request', 'Request advance', 'advances'),
            ('advance.approve', 'Approve advance', 'advances'),
            ('expense.view', 'View expenses', 'expenses'),
            ('expense.create', 'Create expense', 'expenses'),
            ('expense.approve', 'Approve expense', 'expenses'),
            ('report.view', 'View business reports', 'reports'),
            ('role.view', 'View roles', 'roles'),
            ('role.create', 'Create custom roles', 'roles'),
            ('role.assign', 'Assign roles to users', 'roles'),
            ('business.view', 'View business profile', 'businesses'),
            ('business.update', 'Update business profile', 'businesses'),
            ('subscription.view', 'View subscription', 'subscriptions'),
            ('audit.view', 'View audit logs', 'audit')
        ]
        for code, name, module in perms:
            Permission.objects.get_or_create(code=code, defaults={'name': name, 'module': module})

    def seed_roles(self):
        roles_data = [
            (Role.RoleCode.SUPER_ADMIN, 'Super Admin', 'Platform superadmin'),
            (Role.RoleCode.SUPPORT_ADMIN, 'Support Admin', 'Platform support agent'),
            (Role.RoleCode.BILLING_ADMIN, 'Billing Admin', 'Platform billing specialist'),
            (Role.RoleCode.BUSINESS_OWNER, 'Business Owner', 'Supreme business authority'),
            (Role.RoleCode.HR_MANAGER, 'HR Manager', 'People operations & shifts'),
            (Role.RoleCode.BRANCH_MANAGER, 'Branch Manager', 'Site and branch supervisor'),
            (Role.RoleCode.ACCOUNTANT, 'Accountant', 'Payroll & financial accountant'),
            (Role.RoleCode.SUPERVISOR, 'Supervisor', 'Team lead & regularizations'),
            (Role.RoleCode.EMPLOYEE, 'Employee', 'Self service user'),
            (Role.RoleCode.FIELD_EMPLOYEE, 'Field Employee', 'Field mobile clocking user'),
            (Role.RoleCode.AUDITOR, 'Auditor', 'Read-only compliance auditor'),
        ]
        all_perms = Permission.objects.all()
        for code, name, desc in roles_data:
            role, _ = Role.objects.get_or_create(
                code=code,
                is_system=True,
                defaults={'name': name, 'description': desc}
            )
            if code == Role.RoleCode.BUSINESS_OWNER:
                for p in all_perms:
                    RolePermission.objects.get_or_create(role=role, permission=p)

    def seed_subscription_plans(self):
        plans = [
            ('Starter Free', 'FREE', 'Free tier for small workshops up to 5 employees', 5, 1, 0.00, 0.00, 1),
            ('Growth Plan', 'BASIC', 'For expanding operations up to 25 employees', 25, 2, 999.00, 9990.00, 2),
            ('Professional Suite', 'PRO', 'Full feature access for up to 100 employees', 100, 5, 2499.00, 24990.00, 3),
            ('Enterprise Scale', 'ENTERPRISE', 'Unlimited workforce with dedicated support', -1, -1, 4999.00, 49990.00, 4),
        ]
        for name, code, desc, max_emp, max_br, m_price, a_price, order in plans:
            SubscriptionPlan.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'description': desc,
                    'max_employees': max_emp,
                    'max_branches': max_br,
                    'monthly_price': Decimal(str(m_price)),
                    'annual_price': Decimal(str(a_price)),
                    'display_order': order
                }
            )
