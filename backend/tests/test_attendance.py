import pytest
from decimal import Decimal
from django.utils import timezone
from apps.accounts.models import User
from apps.businesses.models import Business, BusinessMembership
from apps.branches.models import Branch
from apps.employees.models import Employee
from apps.attendance.models import AttendanceRecord
from apps.attendance.services import AttendanceService


@pytest.mark.django_db
class TestAttendanceAndGeofencing:
    def setup_method(self):
        self.user = User.objects.create_user(
            email='tech_emp@apexglobal.com',
            password='TestPassword123!',
            first_name='Tech',
            last_name='Emp'
        )
        self.biz = Business.objects.create(name='Apex Test', slug='apex-test')
        BusinessMembership.objects.create(user=self.user, business=self.biz)

        # Branch with Geofence around Delhi/NCR
        self.branch = Branch.objects.create(
            business=self.biz,
            name='Delhi Office',
            code='DEL-01',
            latitude=Decimal('28.6139000'),
            longitude=Decimal('77.2090000'),
            geofence_radius=200
        )

        self.employee = Employee.objects.create(
            business=self.biz,
            user=self.user,
            employee_code='WP-9901',
            first_name='Tech',
            last_name='Emp',
            branch=self.branch,
            joining_date='2025-01-01'
        )

    def test_geofence_inside_radius_is_valid(self):
        """Clock-in within ~50 meters should be valid."""
        # 28.6142, 77.2092 is roughly 40m away
        is_valid, msg = AttendanceService.validate_geofence(
            latitude=Decimal('28.6142000'),
            longitude=Decimal('77.2092000'),
            branch=self.branch
        )
        assert is_valid is True

    def test_geofence_outside_radius_is_invalid(self):
        """Clock-in several kilometers away must be marked invalid."""
        # Connaught Place to Gurgaon is > 20 km
        is_valid, msg = AttendanceService.validate_geofence(
            latitude=Decimal('28.4595000'),
            longitude=Decimal('77.0266000'),
            branch=self.branch
        )
        assert is_valid is False

    def test_check_in_and_check_out_flow(self):
        """Verify check-in creates record, and check-out calculates net working hours."""
        t1 = timezone.now()
        record = AttendanceService.check_in(
            employee=self.employee,
            timestamp=t1,
            latitude=Decimal('28.6139000'),
            longitude=Decimal('77.2090000')
        )
        assert record.check_in is not None
        assert record.status == AttendanceRecord.Status.PRESENT

        t2 = t1 + timezone.timedelta(hours=8, minutes=30)
        updated_record = AttendanceService.check_out(
            employee=self.employee,
            timestamp=t2,
            latitude=Decimal('28.6139000'),
            longitude=Decimal('77.2090000')
        )
        assert updated_record.check_out == t2
        assert updated_record.working_hours == Decimal('8.50')

