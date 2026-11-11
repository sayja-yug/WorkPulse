"""
Management command to wipe all demo records from PostgreSQL while retaining system roles, permissions, and subscription plans.
"""
from django.core.management.base import BaseCommand
from apps.accounts.models import User, UserRole
from apps.businesses.models import Business, BusinessMembership
from apps.branches.models import Branch, Department, Designation
from apps.employees.models import Employee, EmployeeDocument
from apps.attendance.models import AttendanceRecord, AttendanceCorrection
from apps.shifts.models import Shift, ShiftAssignment
from apps.leaves.models import LeaveRequest, LeaveBalance, LeaveType
from apps.payroll.models import PayrollRun, Payslip, EmployeeSalaryStructure, SalaryTemplate, SalaryComponent, PayrollItem, SalaryPayment
from apps.advances.models import Advance, Loan, LoanRepayment, Reimbursement
from apps.expenses.models import Expense, ExpenseCategory
from apps.audit_logs.models import AuditLog
from apps.subscriptions.models import Subscription


class Command(BaseCommand):
    help = 'Wipe all demo accounts and transactional data, leaving a clean slate for real user registration'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Cleaning up all demo data...'))

        # Delete transactional records
        AuditLog.objects.all().delete()
        Expense.objects.all().delete()
        ExpenseCategory.objects.all().delete()
        LoanRepayment.objects.all().delete()
        Loan.objects.all().delete()
        Advance.objects.all().delete()
        Reimbursement.objects.all().delete()
        Payslip.objects.all().delete()
        PayrollItem.objects.all().delete()
        PayrollRun.objects.all().delete()
        SalaryPayment.objects.all().delete()
        EmployeeSalaryStructure.objects.all().delete()
        SalaryTemplate.objects.all().delete()
        SalaryComponent.objects.all().delete()
        AttendanceCorrection.objects.all().delete()
        AttendanceRecord.objects.all().delete()
        LeaveRequest.objects.all().delete()
        LeaveBalance.objects.all().delete()
        LeaveType.objects.all().delete()
        ShiftAssignment.objects.all().delete()
        Shift.objects.all().delete()
        EmployeeDocument.objects.all().delete()
        Employee.objects.all().delete()
        Designation.objects.all().delete()
        Department.objects.all().delete()
        Branch.objects.all().delete()
        Subscription.objects.all().delete()
        BusinessMembership.objects.all().delete()
        UserRole.objects.all().delete()
        Business.objects.all().delete()

        # Delete all users (leaving table completely empty for fresh self-registration)
        User.objects.all().delete()

        self.stdout.write(self.style.SUCCESS(
            'Successfully cleared all demo businesses, employees, attendance, payroll, and user accounts!\n'
            'PostgreSQL database is now a clean slate ready for fresh self-registration.'
        ))
