from django.contrib import admin
from .models import User, Role, Permission, RolePermission, UserRole, UserSession, Invitation


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'first_name', 'last_name', 'is_active', 'is_staff', 'date_joined']
    list_filter = ['is_active', 'is_staff', 'is_superuser', 'email_verified']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    ordering = ['-date_joined']


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_system', 'is_active', 'business']
    list_filter = ['is_system', 'is_active']
    search_fields = ['name', 'code']


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'module', 'scope_type']
    list_filter = ['module', 'scope_type']
    search_fields = ['name', 'code']


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ['role', 'permission']
    list_filter = ['role']


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'business', 'branch']
    list_filter = ['role']
    search_fields = ['user__email']


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'ip_address', 'is_active', 'created_at', 'expires_at']
    list_filter = ['is_active']


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ['email', 'business', 'role', 'status', 'created_at', 'expires_at']
    list_filter = ['status']
    search_fields = ['email']

