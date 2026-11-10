from rest_framework import serializers
from .models import LeaveType, LeaveBalance, LeaveRequest, LeaveApproval, LeaveTransaction


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = '__all__'
        read_only_fields = ['id', 'business', 'created_at', 'updated_at']


class LeaveBalanceSerializer(serializers.ModelSerializer):
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    leave_type_code = serializers.CharField(source='leave_type.code', read_only=True)
    available = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = LeaveBalance
        fields = [
            'id', 'employee', 'leave_type', 'leave_type_name', 'leave_type_code',
            'year', 'allocated', 'used', 'carried_forward', 'adjusted',
            'available', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LeaveApprovalSerializer(serializers.ModelSerializer):
    approver_name = serializers.CharField(source='approver.full_name', read_only=True)

    class Meta:
        model = LeaveApproval
        fields = '__all__'


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    approvals = LeaveApprovalSerializer(many=True, read_only=True)

    class Meta:
        model = LeaveRequest
        fields = [
            'id', 'business', 'employee', 'employee_name', 'employee_code',
            'leave_type', 'leave_type_name', 'start_date', 'end_date', 'days',
            'is_half_day', 'reason', 'status', 'emergency_contact',
            'approvals', 'applied_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'business', 'status', 'applied_at', 'created_at', 'updated_at']


class LeaveTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveTransaction
        fields = '__all__'
