from django.utils import timezone
from rest_framework import serializers
from .models import Employee, EmployeeDocument, EmploymentHistory


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    designation_name = serializers.CharField(source='designation.name', read_only=True)

    class Meta:
        model = Employee
        fields = [
            'id', 'business', 'user', 'employee_code', 'first_name', 'last_name',
            'full_name', 'email', 'phone', 'branch', 'branch_name',
            'department', 'department_name', 'designation', 'designation_name',
            'employment_type', 'salary_type', 'joining_date', 'probation_end_date',
            'reporting_manager', 'date_of_birth', 'gender', 'blood_group',
            'emergency_contact_name', 'emergency_contact_phone', 'address',
            'city', 'state', 'country', 'zip_code', 'bank_name',
            'bank_account_number', 'bank_ifsc_code', 'pan_number',
            'aadhaar_number', 'is_field_employee', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'business', 'created_at', 'updated_at']
        extra_kwargs = {
            'employee_code': {'required': False, 'allow_blank': True},
        }


class EmployeeListSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    designation_name = serializers.CharField(source='designation.name', read_only=True)
    is_punched_in = serializers.SerializerMethodField()
    check_in_time = serializers.SerializerMethodField()
    duty_status = serializers.SerializerMethodField()

    def _get_today_record(self, obj):
        if not hasattr(obj, '_cached_today_record'):
            today = timezone.now().date()
            from apps.attendance.models import AttendanceRecord
            obj._cached_today_record = AttendanceRecord.objects.filter(employee=obj, date=today).first()
        return obj._cached_today_record

    def get_is_punched_in(self, obj):
        rec = self._get_today_record(obj)
        return bool(rec and rec.check_in and not rec.check_out)

    def get_check_in_time(self, obj):
        rec = self._get_today_record(obj)
        return rec.check_in if rec else None

    def get_duty_status(self, obj):
        # In mid and enterprise companies, punch-out does not make an employee inactive
        return obj.status

    def _get_last_punch_date(self, obj):
        if not hasattr(obj, '_cached_last_punch'):
            from apps.attendance.models import AttendanceRecord
            last_rec = AttendanceRecord.objects.filter(employee=obj, check_in__isnull=False).order_by('-date').first()
            obj._cached_last_punch = str(last_rec.date) if last_rec else None
        return obj._cached_last_punch

    def get_last_punch_date(self, obj):
        return self._get_last_punch_date(obj)

    def get_unpunched_days(self, obj):
        from datetime import date
        today = timezone.now().date()
        last_date = self._get_last_punch_date(obj)
        if last_date:
            try:
                d = date.fromisoformat(last_date)
                return max(0, (today - d).days)
            except Exception:
                pass
        if obj.joining_date:
            return max(0, (today - obj.joining_date).days)
        return 0

    class Meta:
        model = Employee
        fields = [
            'id', 'employee_code', 'first_name', 'last_name', 'full_name',
            'email', 'phone', 'branch', 'branch_name', 'department', 'department_name',
            'designation', 'designation_name', 'employment_type', 'salary_type',
            'status', 'duty_status', 'is_punched_in', 'check_in_time',
            'last_punch_date', 'unpunched_days',
            'joining_date', 'emergency_contact_name', 'emergency_contact_phone',
            'address', 'city'
        ]


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeDocument
        fields = '__all__'
        read_only_fields = ['id', 'uploaded_by', 'created_at', 'updated_at']


class EmploymentHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True)

    class Meta:
        model = EmploymentHistory
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

