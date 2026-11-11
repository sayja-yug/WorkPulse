import pytest
import datetime
from decimal import Decimal
from apps.accounts.models import User
from apps.businesses.models import Business
from apps.employees.models import Employee
from apps.payroll.models import PayrollRun, EmployeeSalaryStructure
from apps.payroll.services import PayrollService


@pytest.mark.django_db
class TestPayrollEngine:
    def setup_method(self):
        self.biz = Business.objects.create(name='Payroll Corp', slug='payroll-corp')
        self.emp = Employee.objects.create(
            business=self.biz,
            employee_code='WP-PAY-01',
            first_name='Salaried',
            last_name='Worker',
            joining_date='2025-01-01'
        )

        # Set Base Salary
        EmployeeSalaryStructure.objects.create(
            employee=self.emp,
            business=self.biz,
            base_salary=Decimal('60000.00'),
            effective_from='2026-01-01',
            is_current=True
        )

    def test_payroll_calculation_and_lock(self):
        """Validates standard payroll calculation, deductions, and state transition."""
        run = PayrollRun.objects.create(
            business=self.biz,
            name='Test November 2026 Payroll',
            period_start=datetime.date(2026, 11, 1),
            period_end=datetime.date(2026, 11, 30)
        )

        calculated_run = PayrollService.calculate_payroll_run(run)

        assert calculated_run.status == PayrollRun.Status.REVIEW
        assert calculated_run.total_gross == Decimal('60000.00')

        # PF (12%) = 7200, Tax (5%) = 3000 -> Total Deductions = 10200
        assert calculated_run.total_deductions == Decimal('10200.00')
        assert calculated_run.total_net == Decimal('49800.00')

        # Approve and Lock
        admin_user = User.objects.create_user(email='approver@payroll.com', password='password123', first_name='Approver')
        approved_run = PayrollService.approve_and_lock(calculated_run, approved_by=admin_user)

        assert approved_run.status == PayrollRun.Status.APPROVED
        assert approved_run.locked_at is not None
        assert approved_run.items.first().payslip is not None

