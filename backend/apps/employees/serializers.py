from django.utils import timezone
from rest_framework import serializers
from .models import Employee, EmployeeDocument, EmploymentHistory


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    designation_name = serializers.CharField(source='designation.name', read_only=True)
    age = serializers.SerializerMethodField()
    base_salary = serializers.SerializerMethodField()

    def get_base_salary(self, obj):
        struct = obj.salary_structures.filter(is_current=True).first()
        return float(struct.base_salary) if struct else None

    def get_age(self, obj):
        if obj.date_of_birth:
            today = timezone.now().date()
            dob = obj.date_of_birth
            return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return None

    def validate_date_of_birth(self, value):
        if value:
            today = timezone.now().date()
            if value > today:
                raise serializers.ValidationError("Date of birth cannot be in the future.")
            age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
            if age < 18:
                raise serializers.ValidationError(
                    f"Candidate is {age} years old. Employing workers under 18 years of age is illegal under labor laws."
                )
        return value

    is_branch_manager = serializers.SerializerMethodField()
    managed_branch_id = serializers.SerializerMethodField()
    managed_branch_name = serializers.SerializerMethodField()

    def get_is_branch_manager(self, obj):
        if not obj.user:
            return False
        from apps.accounts.models import UserRole
        return UserRole.objects.filter(
            user=obj.user,
            business=obj.business,
            role__code='BRANCH_MANAGER'
        ).exists()

    def get_managed_branch_id(self, obj):
        if not obj.user:
            return None
        from apps.accounts.models import UserRole
        ur = UserRole.objects.filter(
            user=obj.user,
            business=obj.business,
            role__code='BRANCH_MANAGER',
            branch__isnull=False
        ).first()
        return str(ur.branch_id) if ur else None

    def get_managed_branch_name(self, obj):
        if not obj.user:
            return None
        from apps.accounts.models import UserRole
        ur = UserRole.objects.filter(
            user=obj.user,
            business=obj.business,
            role__code='BRANCH_MANAGER',
            branch__isnull=False
        ).select_related('branch').first()
        return ur.branch.name if ur and ur.branch else None

    class Meta:
        model = Employee
        fields = [
            'id', 'business', 'user', 'employee_code', 'first_name', 'last_name',
            'full_name', 'email', 'phone', 'branch', 'branch_name',
            'department', 'department_name', 'designation', 'designation_name',
            'employment_type', 'salary_type', 'base_salary', 'joining_date', 'probation_end_date',
            'reporting_manager', 'date_of_birth', 'age', 'gender', 'blood_group',
            'emergency_contact_name', 'emergency_contact_phone', 'address',
            'city', 'state', 'country', 'zip_code', 'bank_name',
            'bank_account_number', 'bank_ifsc_code', 'pan_number',
            'aadhaar_number', 'is_field_employee', 'status', 'created_at', 'updated_at',
            'is_branch_manager', 'managed_branch_id', 'managed_branch_name'
        ]
        read_only_fields = ['id', 'business', 'age', 'base_salary', 'created_at', 'updated_at']
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
    last_punch_date = serializers.SerializerMethodField()
    unpunched_days = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    base_salary = serializers.SerializerMethodField()
    is_branch_manager = serializers.SerializerMethodField()
    managed_branch_id = serializers.SerializerMethodField()
    managed_branch_name = serializers.SerializerMethodField()

    def get_is_branch_manager(self, obj):
        if not obj.user:
            return False
        from apps.accounts.models import UserRole
        return UserRole.objects.filter(
            user=obj.user,
            business=obj.business,
            role__code='BRANCH_MANAGER'
        ).exists()

    def get_managed_branch_id(self, obj):
        if not obj.user:
            return None
        from apps.accounts.models import UserRole
        ur = UserRole.objects.filter(
            user=obj.user,
            business=obj.business,
            role__code='BRANCH_MANAGER',
            branch__isnull=False
        ).first()
        return str(ur.branch_id) if ur else None

    def get_managed_branch_name(self, obj):
        if not obj.user:
            return None
        from apps.accounts.models import UserRole
        ur = UserRole.objects.filter(
            user=obj.user,
            business=obj.business,
            role__code='BRANCH_MANAGER',
            branch__isnull=False
        ).select_related('branch').first()
        return ur.branch.name if ur and ur.branch else None

    def get_base_salary(self, obj):
        struct = obj.salary_structures.filter(is_current=True).first()
        return float(struct.base_salary) if struct else None

    def get_age(self, obj):
        if obj.date_of_birth:
            today = timezone.now().date()
            dob = obj.date_of_birth
            return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return None

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
        if obj.status in ('TERMINATED', 'RESIGNED', 'ABSCONDING'):
            return obj.status
        unpunched = self.get_unpunched_days(obj)
        if unpunched >= 3:
            return 'INACTIVE'
        return 'ACTIVE'

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
            'designation', 'designation_name', 'employment_type', 'salary_type', 'base_salary',
            'status', 'duty_status', 'is_punched_in', 'check_in_time',
            'last_punch_date', 'unpunched_days', 'date_of_birth', 'age',
            'joining_date', 'emergency_contact_name', 'emergency_contact_phone',
            'address', 'city', 'is_branch_manager', 'managed_branch_id', 'managed_branch_name'
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

