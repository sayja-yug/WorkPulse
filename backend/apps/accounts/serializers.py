"""Serializers for the accounts app."""
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Invitation, Permission, Role, RolePermission, User, UserRole


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details."""
    full_name = serializers.ReadOnlyField()
    role = serializers.SerializerMethodField()

    def get_role(self, obj):
        from .services import PermissionService
        if obj.is_superuser:
            return 'SUPER_ADMIN'
        if obj.active_business:
            roles = PermissionService.get_user_roles(obj, obj.active_business)
            if roles:
                return roles[0]
        return 'EMPLOYEE'

    class Meta:
        model = User
        fields = [
            'id', 'email', 'phone', 'first_name', 'last_name', 'full_name',
            'avatar', 'is_active', 'email_verified', 'phone_verified',
            'active_business', 'date_joined', 'last_login', 'role',
        ]
        read_only_fields = ['id', 'email', 'is_active', 'email_verified', 'phone_verified', 'date_joined', 'last_login', 'role']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(write_only=True, min_length=8, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'phone', 'first_name', 'last_name', 'password', 'password_confirm']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for profile updates."""

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'avatar']


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change."""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Passwords do not match.'})
        return data

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value


class ForgotPasswordSerializer(serializers.Serializer):
    """Serializer for forgot password request."""
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    """Serializer for password reset."""
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8, validators=[validate_password])
    new_password_confirm = serializers.CharField()

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Passwords do not match.'})
        return data


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer that includes user info."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['is_superuser'] = user.is_superuser
        if user.active_business_id:
            token['active_business_id'] = str(user.active_business_id)
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Include user info in response
        data['user'] = UserSerializer(self.user).data
        return data


class PermissionSerializer(serializers.ModelSerializer):
    """Serializer for permission details."""

    class Meta:
        model = Permission
        fields = ['id', 'name', 'code', 'module', 'description', 'scope_type']
        read_only_fields = ['id']


class RoleSerializer(serializers.ModelSerializer):
    """Serializer for role details."""
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Role
        fields = [
            'id', 'name', 'code', 'description', 'business',
            'is_system', 'is_active', 'permissions', 'permission_ids',
        ]
        read_only_fields = ['id', 'is_system']


class RoleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for role lists."""

    class Meta:
        model = Role
        fields = ['id', 'name', 'code', 'description', 'is_system', 'is_active']


class UserRoleSerializer(serializers.ModelSerializer):
    """Serializer for user role assignments."""
    role_name = serializers.CharField(source='role.name', read_only=True)
    role_code = serializers.CharField(source='role.code', read_only=True)
    business_name = serializers.CharField(source='business.name', read_only=True)

    class Meta:
        model = UserRole
        fields = [
            'id', 'user', 'role', 'role_name', 'role_code',
            'business', 'business_name', 'branch',
        ]
        read_only_fields = ['id']


class UserRoleAssignSerializer(serializers.Serializer):
    """Serializer for assigning a role to a user."""
    user_id = serializers.UUIDField()
    role_id = serializers.UUIDField()
    branch_id = serializers.UUIDField(required=False, allow_null=True)


class InvitationSerializer(serializers.ModelSerializer):
    """Serializer for business invitations."""
    invited_by_name = serializers.CharField(source='invited_by.full_name', read_only=True)
    business_name = serializers.CharField(source='business.name', read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True)

    class Meta:
        model = Invitation
        fields = [
            'id', 'business', 'business_name', 'email', 'phone',
            'first_name', 'last_name', 'role', 'role_name',
            'branch', 'department', 'invited_by', 'invited_by_name',
            'status', 'expires_at', 'accepted_at', 'message', 'created_at',
        ]
        read_only_fields = [
            'id', 'invited_by', 'token', 'status', 'expires_at',
            'accepted_at', 'created_at',
        ]


class InvitationCreateSerializer(serializers.Serializer):
    """Serializer for creating invitations."""
    email = serializers.EmailField()
    phone = serializers.CharField(required=False, allow_blank=True, default='')
    first_name = serializers.CharField(required=False, allow_blank=True, default='')
    last_name = serializers.CharField(required=False, allow_blank=True, default='')
    role_id = serializers.UUIDField()
    branch_id = serializers.UUIDField(required=False, allow_null=True)
    department_id = serializers.UUIDField(required=False, allow_null=True)
    message = serializers.CharField(required=False, allow_blank=True, default='')


class InvitationAcceptSerializer(serializers.Serializer):
    """Serializer for accepting an invitation."""
    token = serializers.CharField()
    password = serializers.CharField(min_length=8, validators=[validate_password])
    password_confirm = serializers.CharField()
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return data


class SwitchBusinessSerializer(serializers.Serializer):
    """Serializer for switching active business."""
    business_id = serializers.UUIDField()

