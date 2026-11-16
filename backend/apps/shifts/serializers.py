from rest_framework import serializers
from .models import Shift, ShiftAssignment


class ShiftSerializer(serializers.ModelSerializer):
    is_night_shift = serializers.BooleanField(source='is_overnight', required=False)
    assigned_count = serializers.SerializerMethodField()

    class Meta:
        model = Shift
        fields = '__all__'
        read_only_fields = ['id', 'business', 'created_at', 'updated_at']

    def get_assigned_count(self, obj):
        return getattr(obj, 'assignments', None).count() if hasattr(obj, 'assignments') else 0


class ShiftAssignmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    shift_name = serializers.CharField(source='shift.name', read_only=True)

    class Meta:
        model = ShiftAssignment
        fields = '__all__'
        read_only_fields = ['id', 'assigned_by', 'created_at', 'updated_at']

