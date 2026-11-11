from rest_framework import serializers
from .models import AttendanceRecord, AttendancePunch, AttendanceCorrection, Holiday, OvertimeRecord


class AttendancePunchSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendancePunch
        fields = '__all__'


class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    punches = AttendancePunchSerializer(many=True, read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'business', 'employee', 'employee_name', 'employee_code',
            'date', 'shift', 'status', 'check_in', 'check_out',
            'working_hours', 'overtime_hours', 'is_late', 'late_minutes',
            'is_early_departure', 'early_departure_minutes', 'notes',
            'source', 'marked_by', 'is_locked', 'punches', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'business', 'created_at', 'updated_at']


class CheckInPunchSerializer(serializers.Serializer):
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    accuracy = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, allow_null=True)
    selfie = serializers.ImageField(required=False, allow_null=True)
    device_info = serializers.JSONField(required=False, default=dict)


class AttendanceCorrectionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='attendance.employee.full_name', read_only=True)

    class Meta:
        model = AttendanceCorrection
        fields = '__all__'
        read_only_fields = ['id', 'requested_by', 'status', 'reviewed_by', 'reviewed_at', 'created_at']


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = '__all__'
        read_only_fields = ['id', 'business', 'created_at', 'updated_at']


class OvertimeRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = OvertimeRecord
        fields = '__all__'
        read_only_fields = ['id', 'business', 'created_at', 'updated_at']

