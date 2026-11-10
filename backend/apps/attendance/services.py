import math
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from .models import AttendanceRecord, AttendancePunch


class AttendanceService:
    @staticmethod
    def haversine_distance(lat1, lon1, lat2, lon2):
        """Calculates distance between two GPS points in meters."""
        R = 6371000  # Earth radius in meters
        phi1 = math.radians(float(lat1))
        phi2 = math.radians(float(lat2))
        delta_phi = math.radians(float(lat2) - float(lat1))
        delta_lambda = math.radians(float(lon2) - float(lon1))

        a = math.sin(delta_phi / 2.0) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    @classmethod
    def validate_geofence(cls, latitude, longitude, branch):
        """Verifies if given coordinates fall within branch radius."""
        if not branch or branch.latitude is None or branch.longitude is None:
            return True, "No geofence configured for branch"
        if latitude is None or longitude is None:
            return False, "Missing coordinates for geofence verification"

        dist = cls.haversine_distance(latitude, longitude, branch.latitude, branch.longitude)
        allowed = branch.geofence_radius or 200
        is_valid = dist <= allowed
        msg = f"Distance: {dist:.1f}m (Allowed: {allowed}m)"
        return is_valid, msg

    @classmethod
    @transaction.atomic
    def check_in(cls, employee, timestamp=None, latitude=None, longitude=None, accuracy=None, selfie=None, ip_address=None, device_info=None):
        ts = timestamp or timezone.now()
        today = ts.date()
        business = employee.business

        # Check geofence
        is_valid = True
        notes = ''
        if employee.branch and latitude and longitude:
            is_valid, notes = cls.validate_geofence(latitude, longitude, employee.branch)

        # Retrieve or create today's record
        record, created = AttendanceRecord.objects.get_or_create(
            employee=employee,
            date=today,
            defaults={
                'business': business,
                'status': AttendanceRecord.Status.PRESENT,
                'check_in': ts,
                'source': AttendanceRecord.Source.GPS if (latitude and longitude) else AttendanceRecord.Source.SELF
            }
        )
        if not created and not record.check_in:
            record.check_in = ts
            record.save(update_fields=['check_in'])

        # Create check-in punch
        AttendancePunch.objects.create(
            attendance=record,
            punch_type=AttendancePunch.PunchType.CHECK_IN,
            timestamp=ts,
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
            selfie=selfie,
            device_info=device_info or {},
            ip_address=ip_address,
            is_valid=is_valid,
            validation_notes=notes
        )

        return record

    @classmethod
    @transaction.atomic
    def check_out(cls, employee, timestamp=None, latitude=None, longitude=None, accuracy=None, selfie=None, ip_address=None, device_info=None):
        ts = timestamp or timezone.now()
        today = ts.date()
        business = employee.business

        # Find today's attendance record
        record = AttendanceRecord.objects.filter(employee=employee, date=today).first()
        if not record:
            # Check overnight shift (yesterday's record without checkout)
            yesterday = today - timezone.timedelta(days=1)
            record = AttendanceRecord.objects.filter(employee=employee, date=yesterday, check_out__isnull=True).first()

        if not record:
            record = AttendanceRecord.objects.create(
                employee=employee,
                business=business,
                date=today,
                status=AttendanceRecord.Status.PRESENT,
                check_in=ts,
                check_out=ts,
                working_hours=Decimal('0.00'),
                source=AttendanceRecord.Source.SELF
            )

        record.check_out = ts

        # Compute working hours
        if record.check_in:
            diff_seconds = (ts - record.check_in).total_seconds()
            hours = Decimal(diff_seconds / 3600.0).quantize(Decimal('0.01'))
            record.working_hours = hours
        record.save(update_fields=['check_out', 'working_hours', 'updated_at'])

        # Create punch
        is_valid = True
        notes = ''
        if employee.branch and latitude and longitude:
            is_valid, notes = cls.validate_geofence(latitude, longitude, employee.branch)

        AttendancePunch.objects.create(
            attendance=record,
            punch_type=AttendancePunch.PunchType.CHECK_OUT,
            timestamp=ts,
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
            selfie=selfie,
            device_info=device_info or {},
            ip_address=ip_address,
            is_valid=is_valid,
            validation_notes=notes
        )

        return record

    @staticmethod
    def get_daily_summary(business, date_val):
        qs = AttendanceRecord.objects.filter(business=business, date=date_val)
        return {
            'date': str(date_val),
            'present': qs.filter(status=AttendanceRecord.Status.PRESENT).count(),
            'absent': qs.filter(status=AttendanceRecord.Status.ABSENT).count(),
            'half_day': qs.filter(status=AttendanceRecord.Status.HALF_DAY).count(),
            'leave': qs.filter(status__in=[AttendanceRecord.Status.PAID_LEAVE, AttendanceRecord.Status.UNPAID_LEAVE]).count(),
            'total_marked': qs.count()
        }
