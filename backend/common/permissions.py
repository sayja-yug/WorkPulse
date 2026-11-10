"""Custom RBAC permission classes for WorkPulse."""
import logging

from rest_framework import permissions

logger = logging.getLogger(__name__)


class HasPermission(permissions.BasePermission):
    """Check if user has a specific permission for the current business.

    Usage:
        permission_classes = [HasPermission]
        required_permissions = ['employee.view']

    Or for per-action permissions:
        permission_map = {
            'list': ['employee.view'],
            'create': ['employee.create'],
            'update': ['employee.update'],
        }
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Super admin has all permissions
        if request.user.is_superuser:
            return True

        # Get required permissions
        required = self._get_required_permissions(view, request)
        if not required:
            return True

        # Check business context
        business = getattr(request, 'business', None)
        if not business:
            return False

        # Check permissions
        return self._check_permissions(request.user, business, required)

    def _get_required_permissions(self, view, request):
        """Get required permissions from the view."""
        # Check for action-specific permissions
        permission_map = getattr(view, 'permission_map', None)
        if permission_map:
            action = getattr(view, 'action', None) or request.method.lower()
            method_map = {
                'get': 'list',
                'post': 'create',
                'put': 'update',
                'patch': 'partial_update',
                'delete': 'destroy',
            }
            action = method_map.get(action, action)
            return permission_map.get(action, [])

        # Check for view-level permissions
        return getattr(view, 'required_permissions', [])

    @staticmethod
    def _check_permissions(user, business, required_permissions):
        """Check if user has all required permissions in the business."""
        from apps.accounts.services import PermissionService
        return PermissionService.has_permissions(user, business, required_permissions)


class IsSuperAdmin(permissions.BasePermission):
    """Only allow super admins."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_superuser
        )


class IsBusinessOwner(permissions.BasePermission):
    """Only allow business owners."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        business = getattr(request, 'business', None)
        if not business:
            return False
        from apps.businesses.models import BusinessMembership
        return BusinessMembership.objects.filter(
            user=request.user,
            business=business,
            is_owner=True,
            is_active=True,
        ).exists()


class IsBusinessMember(permissions.BasePermission):
    """Ensure user is a member of the current business."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        business = getattr(request, 'business', None)
        if not business:
            return False
        from apps.businesses.models import BusinessMembership
        return BusinessMembership.objects.filter(
            user=request.user,
            business=business,
            is_active=True,
        ).exists()


class IsSelfOrHasPermission(permissions.BasePermission):
    """Allow access to own resources or if user has the required permission.

    Used for endpoints like viewing own profile, own attendance, etc.
    """

    def has_object_permission(self, request, view, obj):
        # Check if user is accessing their own resource
        user_field = getattr(view, 'user_field', 'user')
        obj_user = getattr(obj, user_field, None)
        if obj_user and obj_user == request.user:
            return True

        # Check if user is accessing their own employee record
        employee_field = getattr(view, 'employee_field', 'employee')
        obj_employee = getattr(obj, employee_field, None)
        if obj_employee and hasattr(obj_employee, 'user_id') and obj_employee.user_id == request.user.id:
            return True

        # Fall back to permission check
        required = getattr(view, 'required_permissions', [])
        if not required:
            return True

        business = getattr(request, 'business', None)
        if not business:
            return False

        from apps.accounts.services import PermissionService
        return PermissionService.has_permissions(request.user, business, required)


class TenantAccessPermission(permissions.BasePermission):
    """Validate that the resource belongs to the user's current business.

    This prevents cross-tenant data access (IDOR).
    """

    def has_object_permission(self, request, view, obj):
        business = getattr(request, 'business', None)
        if not business:
            return False

        # Super admin can access any business
        if request.user.is_superuser:
            return True

        # Check if object belongs to the current business
        obj_business = getattr(obj, 'business', None)
        if obj_business is None:
            obj_business_id = getattr(obj, 'business_id', None)
            if obj_business_id is None:
                return True  # Not a tenant-scoped object
            return str(obj_business_id) == str(business.id)

        return str(obj_business.id) == str(business.id)

