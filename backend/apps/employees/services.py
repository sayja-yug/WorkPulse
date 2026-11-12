from django.db import transaction
from django.utils import timezone
from .models import Employee, EmploymentHistory


class EmployeeService:
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
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                user = User.objects.create_user(
                    email=email,
                    password='WorkPulse@2026',
                    first_name=validated_data.get('first_name', 'Staff'),
                    last_name=validated_data.get('last_name', ''),
                    phone=validated_data.get('phone', ''),
                    active_business=business,
                    email_verified=True,
                )
            BusinessMembership.objects.get_or_create(
                user=user,
                business=business,
                defaults={'is_owner': False, 'is_active': True}
            )
            emp_role = Role.objects.filter(code=Role.RoleCode.EMPLOYEE, is_system=True).first()
            if emp_role:
                UserRole.objects.get_or_create(
                    user=user,
                    business=business,
                    defaults={'role': emp_role, 'branch': validated_data.get('branch')}
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

