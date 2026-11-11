from rest_framework import serializers
from .models import Branch, Department, Designation


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = [
            'id', 'business', 'name', 'code', 'address', 'city', 'state',
            'country', 'latitude', 'longitude', 'geofence_radius',
            'is_head_office', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'business', 'created_at', 'updated_at']


class DepartmentSerializer(serializers.ModelSerializer):
    head_name = serializers.CharField(source='head.full_name', read_only=True)

    class Meta:
        model = Department
        fields = [
            'id', 'business', 'name', 'code', 'description', 'head',
            'head_name', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'business', 'created_at', 'updated_at']


class DesignationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Designation
        fields = [
            'id', 'business', 'name', 'level', 'description',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'business', 'created_at', 'updated_at']

