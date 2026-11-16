import pytest
import datetime
from decimal import Decimal
from apps.accounts.models import User
from apps.businesses.models import Business
from apps.employees.models import Employee
from apps.attendance.models import AttendanceRecord
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

        # Set Base Salary: 60,000 for 30 days -> Daily = 2,000. Hourly (8.0h) = 250.00
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

    def test_overtime_calculation(self):
        """Validates overtime bonus calculation when employee logs extra hours."""
        # Policy: 8 hrs/day, 1.5x overtime multiplier
        self.biz.settings = {
            'payroll_policy': {
                'standard_daily_hours': 8.0,
                'enable_overtime': True,
                'overtime_multiplier': 1.5,
                'enable_shortfall_deduction': True,
            }
        }
        self.biz.save()

        # Employee worked 10.0 hours on Nov 2 (2 hours OT)
        # Hourly rate: 60,000 / 30 / 8 = 250/hr. 2 hrs OT * 250 * 1.5 = 750 OT Pay.
        AttendanceRecord.objects.create(
            business=self.biz,
            employee=self.emp,
            date=datetime.date(2026, 11, 2),
            status=AttendanceRecord.Status.PRESENT,
            working_hours=Decimal('10.00')
        )

        run = PayrollRun.objects.create(
            business=self.biz,
            name='Overtime Test Run',
            period_start=datetime.date(2026, 11, 1),
            period_end=datetime.date(2026, 11, 30)
        )

        calculated_run = PayrollService.calculate_payroll_run(run)
        item = calculated_run.items.first()

        assert item.overtime_hours == Decimal('2.00')
        assert item.gross_salary == Decimal('60750.00')  # 60,000 base + 750 OT

    def test_shortfall_deduction(self):
        """Validates salary shortfall cut when employee works fewer hours than standard daily rule."""
        self.biz.settings = {
            'payroll_policy': {
                'standard_daily_hours': 8.0,
                'enable_overtime': True,
                'enable_shortfall_deduction': True,
            }
        }
        self.biz.save()

        # Employee worked only 6.0 hours on Nov 3 (2 hours deficit)
        # Hourly rate: 250/hr. 2 hours deficit * 250 = 500 shortfall cut.
        AttendanceRecord.objects.create(
            business=self.biz,
            employee=self.emp,
            date=datetime.date(2026, 11, 3),
            status=AttendanceRecord.Status.PRESENT,
            working_hours=Decimal('6.00')
        )

        run = PayrollRun.objects.create(
            business=self.biz,
            name='Shortfall Test Run',
            period_start=datetime.date(2026, 11, 1),
            period_end=datetime.date(2026, 11, 30)
        )

        calculated_run = PayrollService.calculate_payroll_run(run)
        item = calculated_run.items.first()

        # PF = 7200, Tax = 3000, Shortfall Cut = 500 -> Total = 10,700
        assert item.total_deductions == Decimal('10700.00')
        assert item.net_salary == Decimal('49300.00')  # 60,000 - 10,700

    def test_multiple_runs_in_same_month_approval(self):
        """Validates that approving multiple payroll runs in the same month does not crash with duplicate payslip_number error."""
        run1 = PayrollRun.objects.create(
            business=self.biz,
            name='First Nov Run',
            period_start=datetime.date(2026, 11, 1),
            period_end=datetime.date(2026, 11, 30)
        )
        PayrollService.calculate_payroll_run(run1)
        PayrollService.approve_and_lock(run1, approved_by=None)

        run2 = PayrollRun.objects.create(
            business=self.biz,
            name='Second Nov Run',
            period_start=datetime.date(2026, 11, 1),
            period_end=datetime.date(2026, 11, 30)
        )
        PayrollService.calculate_payroll_run(run2)
        # This will trigger duplicate key error unless collision-proof payslip numbering is used
        approved_run2 = PayrollService.approve_and_lock(run2, approved_by=None)
        assert approved_run2.status == PayrollRun.Status.APPROVED

        # Now test serialization of the approved run
        from apps.payroll.serializers import PayrollRunSerializer
        data = PayrollRunSerializer(approved_run2).data
        assert data['status'] == 'APPROVED'
        assert len(data['items']) == 1

