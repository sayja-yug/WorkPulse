"""
Initialize system roles, permissions, and subscription plans in production without seeding demo accounts.
"""
from decimal import Decimal
from django.core.management.base import BaseCommand
from apps.accounts.models import Role, Permission, RolePermission
from apps.subscriptions.models import SubscriptionPlan


class Command(BaseCommand):
    help = 'Initialize essential system roles, permissions, and plans for production'

    def handle(self, *args, **options):
        self.stdout.write('Initializing system permissions...')
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

        self.stdout.write('Initializing system roles and permission matrix...')
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
        all_perms = {p.code: p for p in Permission.objects.all()}

        role_matrix = {
            Role.RoleCode.SUPER_ADMIN: list(all_perms.keys()),
            Role.RoleCode.BUSINESS_OWNER: list(all_perms.keys()),
            Role.RoleCode.HR_MANAGER: [
                'employee.view', 'employee.create', 'employee.update', 'employee.deactivate', 'employee.transfer',
                'attendance.view', 'attendance.mark', 'attendance.correct', 'attendance.approve', 'attendance.view_reports',
                'shift.view', 'shift.create', 'shift.assign',
                'leave.view', 'leave.apply', 'leave.approve', 'leave.reject',
                'report.view', 'business.view'
            ],
            Role.RoleCode.ACCOUNTANT: [
                'payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.view_own',
                'advance.view', 'advance.request', 'advance.approve',
                'expense.view', 'expense.create', 'expense.approve',
                'report.view', 'business.view'
            ],
            Role.RoleCode.BRANCH_MANAGER: [
                'employee.view', 'employee.create', 'employee.update',
                'attendance.view', 'attendance.mark', 'attendance.correct', 'attendance.approve', 'attendance.view_reports',
                'shift.view', 'shift.assign',
                'leave.view', 'leave.apply', 'leave.approve', 'leave.reject',
                'report.view', 'business.view'
            ],
            Role.RoleCode.SUPERVISOR: [
                'employee.view',
                'attendance.view', 'attendance.mark', 'attendance.correct', 'attendance.approve',
                'shift.view',
                'leave.view', 'leave.approve',
                'report.view'
            ],
            Role.RoleCode.EMPLOYEE: [
                'attendance.view', 'attendance.mark_own', 'attendance.correct',
                'shift.view',
                'leave.view', 'leave.apply',
                'payroll.view_own',
                'advance.request', 'advance.view'
            ],
            Role.RoleCode.FIELD_EMPLOYEE: [
                'attendance.view', 'attendance.mark_own', 'attendance.correct',
                'shift.view',
                'leave.view', 'leave.apply',
                'payroll.view_own',
                'advance.request', 'advance.view'
            ],
            Role.RoleCode.AUDITOR: [
                'employee.view', 'attendance.view', 'attendance.view_reports',
                'payroll.view', 'advance.view', 'expense.view', 'report.view',
                'audit.view', 'business.view'
            ],
            Role.RoleCode.SUPPORT_ADMIN: [
                'business.view', 'employee.view', 'report.view', 'audit.view'
            ],
            Role.RoleCode.BILLING_ADMIN: [
                'subscription.view', 'business.view', 'report.view'
            ],
        }

        for code, name, desc in roles_data:
            role, _ = Role.objects.get_or_create(code=code, is_system=True, defaults={'name': name, 'description': desc})
            assigned = role_matrix.get(code, [])
            for p_code in assigned:
                if p_code in all_perms:
                    RolePermission.objects.get_or_create(role=role, permission=all_perms[p_code])

        self.stdout.write('Initializing subscription plans...')
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

        self.stdout.write(self.style.SUCCESS('Production system roles, permissions & plans ready! (Zero demo accounts seeded)'))
