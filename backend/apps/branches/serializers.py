from rest_framework import serializers
from .models import Branch, Department, Designation


class BranchSerializer(serializers.ModelSerializer):
    manager = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()
    manager_email = serializers.SerializerMethodField()
    manager_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    employee_count = serializers.SerializerMethodField()

    def get_manager(self, obj):
        ur = obj.user_role_assignments.filter(role__code='BRANCH_MANAGER').select_related('user').first()
        if not ur:
            return None
        from apps.employees.models import Employee
        emp = Employee.objects.filter(user=ur.user, business=obj.business).select_related('designation').first()
        return {
            'user_id': str(ur.user.id),
            'employee_id': str(emp.id) if emp else None,
            'employee_code': emp.employee_code if emp else None,
            'name': ur.user.full_name or ur.user.email,
            'email': ur.user.email,
            'phone': ur.user.phone or (emp.phone if emp else ''),
            'designation': emp.designation.name if (emp and emp.designation) else 'Branch Manager',
        }

    def get_manager_name(self, obj):
        mgr = self.get_manager(obj)
        return mgr['name'] if mgr else 'Unassigned'

    def get_manager_email(self, obj):
        mgr = self.get_manager(obj)
        return mgr['email'] if mgr else ''

    def get_employee_count(self, obj):
        return obj.employees.count()

    class Meta:
        model = Branch
        fields = [
            'id', 'business', 'name', 'code', 'address', 'city', 'state',
            'country', 'latitude', 'longitude', 'geofence_radius',
            'is_head_office', 'is_active', 'created_at', 'updated_at',
            'manager', 'manager_id', 'manager_name', 'manager_email', 'employee_count',
        ]
        read_only_fields = ['id', 'business', 'created_at', 'updated_at', 'manager', 'manager_name', 'manager_email', 'employee_count']


class DepartmentSerializer(serializers.ModelSerializer):
    head_name = serializers.CharField(source='head.full_name', read_only=True)

    def validate_head(self, user):
        if user and not user.business_memberships.filter(business=self.context['request'].business, is_active=True).exists():
            raise serializers.ValidationError('Select a member of this company.')
        return user

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

