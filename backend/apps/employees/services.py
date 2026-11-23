from calendar import monthrange
import secrets
from django.core.mail import send_mail
from rest_framework.exceptions import PermissionDenied
from apps.attendance.scope import business_zone

from django.db import transaction
from django.utils import timezone
from .models import Employee, EmploymentHistory


def business_today(business):
    return timezone.localdate(timezone=business_zone(business))


def completed_tenure(joined, as_of):
    """Count calendar-month anniversaries, using month end in shorter months."""
    months = (as_of.year - joined.year) * 12 + as_of.month - joined.month
    anniversary_day = min(joined.day, monthrange(as_of.year, as_of.month)[1])
    months -= as_of.day < anniversary_day
    years, months = divmod(max(months, 0), 12)
    parts = []
    if years:
        parts.append(f"{years} year{'s' if years != 1 else ''}")
    if months or not years:
        parts.append(f"{months} month{'s' if months != 1 else ''}")
    return ' '.join(parts)


class EmployeeService:
    @staticmethod
    @transaction.atomic
    def change_status(employee, new_status, actor):
        employee = Employee.objects.select_for_update().get(pk=employee.pk)
        old_status = employee.status
        if old_status == new_status and (new_status != Employee.Status.INACTIVE or employee.deactivated_on):
            return employee

        effective_date = business_today(employee.business)
        deactivating = new_status in (Employee.Status.INACTIVE, Employee.Status.TERMINATED)
        employee.status = new_status
        employee.deactivated_on = effective_date if deactivating else None
        employee.deactivated_by_name = actor.full_name if deactivating else ''
        employee.save(update_fields=['status', 'deactivated_on', 'deactivated_by_name', 'updated_at'])
        EmploymentHistory.objects.create(
            employee=employee,
            change_type=EmploymentHistory.ChangeType.STATUS_CHANGED,
            from_value={'status': old_status},
            to_value={'status': new_status, 'actor_name': actor.full_name},
            effective_date=effective_date,
            changed_by=actor,
            notes=f'{employee.get_status_display()} status set by {actor.full_name}.',
        )
        from apps.notifications.services import notify_employee
        notify_employee(
            employee=employee, title='Employment status updated',
            message=f'Your employment status is now {employee.get_status_display().lower()}.',
        )
        return employee

    @staticmethod
    def generate_employee_code(business):
        """Generates unique sequential employee code, e.g. WP-0001."""
        prefix = 'WP'
        num = Employee.objects.filter(business=business).count() + 1
        while Employee.objects.filter(business=business, employee_code=f'{prefix}-{num:04d}').exists():
            num += 1
        return f'{prefix}-{num:04d}'

    @classmethod
    @transaction.atomic
    def create_employee(cls, business, validated_data, created_by=None, base_salary=None, shift_id=None, send_invite=True):
        if not validated_data.get('employee_code'):
            validated_data['employee_code'] = cls.generate_employee_code(business)

        # Auto-assign default branch if not specified
        if not validated_data.get('branch') and business:
            from apps.branches.models import Branch
            validated_data['branch'] = Branch.objects.filter(business=business).first()

        # Link or create User account if email is provided and invitation requested
        email = validated_data.get('email')
        if email and send_invite and not validated_data.get('user'):
            from apps.accounts.models import User, Role, UserRole
            from apps.businesses.models import BusinessMembership
            from apps.accounts.services import PermissionService
            emp_role = Role.objects.filter(code=Role.RoleCode.EMPLOYEE, is_system=True, is_active=True).first()
            if not emp_role or not created_by or not PermissionService.has_permissions(created_by, business, ['role.assign']) or not PermissionService.can_delegate_role(created_by, business, emp_role):
                raise PermissionDenied('Creating a login requires permission to delegate the employee role.')
            user = User.objects.filter(email__iexact=email).first()
            initial_password = None
            if not user:
                initial_password = secrets.token_urlsafe(24)
                user = User.objects.create_user(
                    email=email,
                    password=initial_password,
                    first_name=validated_data.get('first_name', 'Staff'),
                    last_name=validated_data.get('last_name', ''),
                    phone=validated_data.get('phone', ''),
                    active_business=business,
                )
            BusinessMembership.objects.get_or_create(
                user=user,
                business=business,
                defaults={'is_owner': False, 'is_active': True}
            )
            UserRole.objects.get_or_create(
                user=user, business=business, role=emp_role,
                defaults={'branch': validated_data.get('branch')}
            )
            if initial_password:
                send_mail(
                    f'Your {business.name} WorkPulse account',
                    f'Use {email} and the initial password {initial_password} to sign in to WorkPulse. Change your password after signing in.',
                    None, [email],
                )
            validated_data['user'] = user

        employee = Employee.objects.create(business=business, **validated_data)

        # Optional Salary Structure creation
        if base_salary and business:
            try:
                from decimal import Decimal
                from apps.payroll.models import EmployeeSalaryStructure
                EmployeeSalaryStructure.objects.create(
                    employee=employee,
                    business=business,
                    base_salary=Decimal(str(base_salary)),
                    effective_from=employee.joining_date or timezone.now().date(),
                    is_current=True,
                )
            except Exception:
                pass

        # Optional Shift Assignment creation
        if shift_id:
            try:
                from apps.shifts.models import Shift, ShiftAssignment
                shift = Shift.objects.filter(id=shift_id, business=business).first()
                if shift:
                    ShiftAssignment.objects.create(
                        employee=employee,
                        shift=shift,
                        effective_from=employee.joining_date or timezone.now().date(),
                    )
            except Exception:
                pass

        # Log employment history
        EmploymentHistory.objects.create(
            employee=employee,
            change_type=EmploymentHistory.ChangeType.JOINED,
            to_value={
                'branch': str(employee.branch_id) if employee.branch else None,
                'department': str(employee.department_id) if employee.department else None,
                'designation': str(employee.designation_id) if employee.designation else None,
                'status': employee.status
            },
            effective_date=employee.joining_date or timezone.now().date(),
            changed_by=created_by,
            notes='Initial employee onboarding'
        )
        return employee

    @staticmethod
    @transaction.atomic
    def transfer_employee(employee, new_branch_id=None, new_dept_id=None, changed_by=None, effective_date=None, notes=''):
        from_val = {
            'branch': str(employee.branch_id) if employee.branch else None,
            'department': str(employee.department_id) if employee.department else None
        }
        if new_branch_id:
            employee.branch_id = new_branch_id
        if new_dept_id:
            employee.department_id = new_dept_id
        employee.save(update_fields=['branch', 'department', 'updated_at'])

        EmploymentHistory.objects.create(
            employee=employee,
            change_type=EmploymentHistory.ChangeType.TRANSFERRED,
            from_value=from_val,
            to_value={
                'branch': str(employee.branch_id) if employee.branch else None,
                'department': str(employee.department_id) if employee.department else None
            },
            effective_date=effective_date or timezone.now().date(),
            changed_by=changed_by,
            notes=notes
        )
        return employee

