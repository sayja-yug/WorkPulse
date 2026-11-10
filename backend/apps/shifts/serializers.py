from rest_framework import serializers
from .models import Shift, ShiftAssignment


class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = '__all__'
        read_only_fields = ['id', 'business', 'created_at', 'updated_at']


class ShiftAssignmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    shift_name = serializers.CharField(source='shift.name', read_only=True)

    class Meta:
        model = ShiftAssignment
        fields = '__all__'
        read_only_fields = ['id', 'assigned_by', 'created_at', 'updated_at']
