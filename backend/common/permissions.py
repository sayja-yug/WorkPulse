"""Custom RBAC permission classes for WorkPulse."""
import logging
from uuid import UUID

from rest_framework import permissions

logger = logging.getLogger(__name__)


def resolve_business(request):
    """Resolve the selected tenant after DRF authenticates the request."""
    from apps.businesses.models import Business, BusinessMembership
    if not request.user or not request.user.is_authenticated:
        return None
    business_id = request.headers.get('X-Business-ID') or request.user.active_business_id
    if not business_id:
        return None
    try:
        business_id = UUID(str(business_id))
    except ValueError:
        return None
    if request.user.is_superuser:
        request.business = Business.objects.filter(pk=business_id).first()
    else:
        membership = BusinessMembership.objects.filter(
            user=request.user, business_id=business_id, is_active=True, business__is_active=True
        ).select_related('business').first()
        request.business_membership = membership
        request.business = membership.business if membership else None
    return request.business


class HasPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        from apps.accounts.services import PermissionService
        business = resolve_business(request)
        if not business:
            return False
        action = getattr(view, 'action', None)
        mapping = getattr(view, 'permission_map', None)
        if mapping is None:
            required = getattr(view, 'required_permissions', ())
        else:
            required = mapping.get(action)
            if required is None:
                required = mapping.get('read' if request.method in permissions.SAFE_METHODS else 'write')
            if required is None:
                return False
        alternatives = getattr(view, 'any_permissions', ())
        if alternatives and not PermissionService.has_any_permission(request.user, business, alternatives):
            return False
        return PermissionService.has_permissions(request.user, business, required)


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsBusinessOwner(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(resolve_business(request) and (
            request.user.is_superuser or request.business_membership.is_owner
        ))


class IsBusinessMember(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(resolve_business(request))


class IsSelfOrHasPermission(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        from apps.accounts.services import PermissionService
        business = resolve_business(request)
        if not business:
            return False
        employee = getattr(obj, getattr(view, 'employee_field', 'employee'), None)
        if getattr(obj, getattr(view, 'user_field', 'user'), None) == request.user or getattr(employee, 'user_id', None) == request.user.id:
            return True
        return PermissionService.has_permissions(request.user, business, getattr(view, 'required_permissions', ()))


class TenantAccessPermission(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        business = getattr(request, 'business', None)
        return bool(business and getattr(obj, 'business_id', business.id) == business.id)
