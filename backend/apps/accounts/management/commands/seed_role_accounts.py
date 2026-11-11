import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from apps.accounts.models import User, Role, Permission, RolePermission, UserRole
from apps.businesses.models import Business, BusinessMembership
from apps.branches.models import Branch, Department, Designation
from apps.employees.models import Employee
from apps.subscriptions.models import SubscriptionPlan, Subscription


class Command(BaseCommand):
    help = 'Seeds exactly one user account for each of the 11 system roles with verified credentials'

    DEFAULT_PASSWORD = 'WorkPulse@2026'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Initializing roles, permissions and plans...'))
        from django.core.management import call_command
        call_command('init_system')

        self.stdout.write(self.style.NOTICE('Ensuring primary business organization...'))
        business, _ = Business.objects.get_or_create(
            slug='workpulse-tech',
            defaults={
                'name': 'WorkPulse Technologies',
                'address': 'Tower A, Tech Boulevard, Sector 62',
                'city': 'Noida',
                'state': 'Uttar Pradesh',
                'country': 'India',
                'zip_code': '201301',
                'phone': '+91 98765 00001',
                'email': 'contact@workpulse.com',
                'website': 'https://workpulse.example.com',
                'timezone': 'Asia/Kolkata',
                'currency': 'INR',
                'working_days': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
            }
        )

        # Pro Plan Subscription
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

        # Branches
        br_hq, _ = Branch.objects.get_or_create(
            business=business,
            code='HQ-01',
            defaults={
                'name': 'Corporate Headquarters',
                'address': 'Tower A, Tech Boulevard, Sector 62',
                'city': 'Noida',
                'state': 'Uttar Pradesh',
                'latitude': Decimal('28.6280000'),
                'longitude': Decimal('77.3649000'),
                'geofence_radius': 300,
                'is_head_office': True
            }
        )

        br_blr, _ = Branch.objects.get_or_create(
            business=business,
            code='BR-BLR',
            defaults={
                'name': 'Bengaluru Innovation Center',
                'address': 'Outer Ring Road, Kadubeesanahalli',
                'city': 'Bengaluru',
                'state': 'Karnataka',
                'latitude': Decimal('12.9352000'),
                'longitude': Decimal('77.6946000'),
                'geofence_radius': 300,
                'is_head_office': False
            }
        )

        # Departments
        dept_eng, _ = Department.objects.get_or_create(business=business, code='ENG', defaults={'name': 'Engineering'})
        dept_hr, _ = Department.objects.get_or_create(business=business, code='HR', defaults={'name': 'Human Resources'})
        dept_fin, _ = Department.objects.get_or_create(business=business, code='FIN', defaults={'name': 'Finance & Accounts'})
        dept_ops, _ = Department.objects.get_or_create(business=business, code='OPS', defaults={'name': 'Operations'})
        dept_sales, _ = Department.objects.get_or_create(business=business, code='SALES', defaults={'name': 'Sales & Field'})

        # Designations
        desig_dir, _ = Designation.objects.get_or_create(business=business, name='Managing Director', defaults={'level': 5})
        desig_mgr, _ = Designation.objects.get_or_create(business=business, name='Department Head / Manager', defaults={'level': 4})
        desig_sr, _ = Designation.objects.get_or_create(business=business, name='Senior Specialist', defaults={'level': 3})
        desig_lead, _ = Designation.objects.get_or_create(business=business, name='Team Lead', defaults={'level': 2})
        desig_assoc, _ = Designation.objects.get_or_create(business=business, name='Associate', defaults={'level': 1})

        # 11 Core Role Definitions
        accounts_to_seed = [
            # (email, first_name, last_name, role_code, is_superuser, is_staff, is_owner, branch, dept, desig, is_field)
            ('superadmin@workpulse.com', 'Alexander', 'Pierce', Role.RoleCode.SUPER_ADMIN, True, True, False, br_hq, dept_eng, desig_dir, False),
            ('support@workpulse.com', 'Sarah', 'Jenkins', Role.RoleCode.SUPPORT_ADMIN, False, True, False, br_hq, dept_ops, desig_mgr, False),
            ('billing@workpulse.com', 'Brian', 'Miller', Role.RoleCode.BILLING_ADMIN, False, True, False, br_hq, dept_fin, desig_mgr, False),
            ('owner@workpulse.com', 'Vikram', 'Aditya', Role.RoleCode.BUSINESS_OWNER, False, False, True, br_hq, dept_eng, desig_dir, False),
            ('hr@workpulse.com', 'Pooja', 'Sharma', Role.RoleCode.HR_MANAGER, False, False, False, br_hq, dept_hr, desig_mgr, False),
            ('branchmanager@workpulse.com', 'Rahul', 'Verma', Role.RoleCode.BRANCH_MANAGER, False, False, False, br_blr, dept_ops, desig_mgr, False),
            ('accountant@workpulse.com', 'Amit', 'Singhal', Role.RoleCode.ACCOUNTANT, False, False, False, br_hq, dept_fin, desig_sr, False),
            ('supervisor@workpulse.com', 'Suresh', 'Nair', Role.RoleCode.SUPERVISOR, False, False, False, br_blr, dept_ops, desig_lead, False),
            ('employee@workpulse.com', 'Ananya', 'Patel', Role.RoleCode.EMPLOYEE, False, False, False, br_hq, dept_eng, desig_assoc, False),
            ('field@workpulse.com', 'Rajesh', 'Kumar', Role.RoleCode.FIELD_EMPLOYEE, False, False, False, br_blr, dept_sales, desig_assoc, True),
            ('auditor@workpulse.com', 'Sunita', 'Menon', Role.RoleCode.AUDITOR, False, False, False, br_hq, dept_fin, desig_sr, False),
        ]

        self.stdout.write(self.style.NOTICE('Creating 11 role accounts with password: ' + self.DEFAULT_PASSWORD))
        
        for idx, (email, fn, ln, role_code, is_super, is_staff, is_owner, branch, dept, desig, is_field) in enumerate(accounts_to_seed):
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

            # Membership
            BusinessMembership.objects.update_or_create(
                user=user,
                business=business,
                defaults={'is_owner': is_owner, 'is_active': True}
            )

            # Role Assignment
            role_obj = Role.objects.filter(code=role_code, is_system=True).first()
            if role_obj:
                UserRole.objects.update_or_create(
                    user=user,
                    business=business,
                    defaults={'role': role_obj, 'branch': branch}
                )

            # Employee Profile
            Employee.objects.update_or_create(
                business=business,
                email=email,
                defaults={
                    'user': user,
                    'employee_code': f'WP-{idx+1:04d}',
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

        self.stdout.write(self.style.SUCCESS(
            '\n============================================================\n'
            'SUCCESS: 11 Role Accounts Created Successfully!\n'
            f'Standard Password for all accounts: {self.DEFAULT_PASSWORD}\n'
            '============================================================'
        ))
