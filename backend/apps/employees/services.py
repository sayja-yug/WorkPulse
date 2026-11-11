from django.db import transaction
from django.utils import timezone
from .models import Employee, EmploymentHistory


class EmployeeService:
    @staticmethod
    def generate_employee_code(business):
        """Generates sequential employee code, e.g. WP-0001."""
        count = Employee.objects.filter(business=business).count() + 1
        prefix = 'WP'
        return f'{prefix}-{count:04d}'

    @classmethod
    @transaction.atomic
    def create_employee(cls, business, validated_data, created_by=None):
        if not validated_data.get('employee_code'):
            validated_data['employee_code'] = cls.generate_employee_code(business)

        employee = Employee.objects.create(business=business, **validated_data)

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

