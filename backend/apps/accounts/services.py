"""Permission and authentication services for WorkPulse."""
import hashlib
import logging
import secrets
from datetime import timedelta
from functools import lru_cache

from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone

logger = logging.getLogger(__name__)


class PermissionService:
    """Service for checking and managing user permissions."""

    CACHE_TTL = 300  # 5 minutes

    @classmethod
    def get_user_permissions(cls, user, business):
        """Get all permission codes for a user in a business.

        Returns a set of permission code strings.
        """
        cache_key = f'user_perms:{user.id}:{business.id}'
        permissions = cache.get(cache_key)
        if permissions is not None:
            return permissions

        from apps.accounts.models import UserRole
        user_roles = UserRole.objects.filter(
            user=user,
            business=business,
        ).select_related('role').prefetch_related('role__role_permissions__permission')

        permissions = set()
        for user_role in user_roles:
            for rp in user_role.role.role_permissions.all():
                permissions.add(rp.permission.code)

        cache.set(cache_key, permissions, cls.CACHE_TTL)
        return permissions

    @classmethod
    def has_permissions(cls, user, business, required_permissions):
        """Check if user has ALL the required permissions."""
        if user.is_superuser:
            return True

        user_permissions = cls.get_user_permissions(user, business)
        return all(perm in user_permissions for perm in required_permissions)

    @classmethod
    def has_any_permission(cls, user, business, permissions):
        """Check if user has ANY of the specified permissions."""
        if user.is_superuser:
            return True

        user_permissions = cls.get_user_permissions(user, business)
        return any(perm in user_permissions for perm in permissions)

    @classmethod
    def get_user_roles(cls, user, business):
        """Get all role codes for a user in a business."""
        from apps.accounts.models import UserRole
        return list(
            UserRole.objects.filter(
                user=user,
                business=business,
            ).values_list('role__code', flat=True)
        )

    @classmethod
    def has_role(cls, user, business, role_code):
        """Check if user has a specific role in a business."""
        from apps.accounts.models import UserRole
        return UserRole.objects.filter(
            user=user,
            business=business,
            role__code=role_code,
        ).exists()

    @classmethod
    def invalidate_cache(cls, user_id, business_id):
        """Clear cached permissions when roles change."""
        cache_key = f'user_perms:{user_id}:{business_id}'
        cache.delete(cache_key)

    @classmethod
    def get_user_scope(cls, user, business):
        """Determine the user's data access scope.

        Returns one of: GLOBAL, BUSINESS, BRANCH, DEPARTMENT, TEAM, OWN
        """
        from apps.accounts.models import Role, UserRole

        user_roles = UserRole.objects.filter(
            user=user,
            business=business,
        ).select_related('role')

        # Priority order for scope
        scope_priority = {
            Role.RoleCode.BUSINESS_OWNER: 'BUSINESS',
            Role.RoleCode.HR_MANAGER: 'BUSINESS',
            Role.RoleCode.ACCOUNTANT: 'BUSINESS',
            Role.RoleCode.BRANCH_MANAGER: 'BRANCH',
            Role.RoleCode.SUPERVISOR: 'TEAM',
            Role.RoleCode.EMPLOYEE: 'OWN',
            Role.RoleCode.FIELD_EMPLOYEE: 'OWN',
            Role.RoleCode.AUDITOR: 'BUSINESS',
        }

        highest_scope = 'OWN'
        scope_rank = {'BUSINESS': 5, 'BRANCH': 4, 'DEPARTMENT': 3, 'TEAM': 2, 'OWN': 1}

        for user_role in user_roles:
            scope = scope_priority.get(user_role.role.code, 'OWN')
            if scope_rank.get(scope, 0) > scope_rank.get(highest_scope, 0):
                highest_scope = scope

        return highest_scope

    @classmethod
    def get_accessible_branch_ids(cls, user, business):
        """Get branch IDs the user can access."""
        from apps.accounts.models import Role, UserRole

        user_roles = UserRole.objects.filter(
            user=user,
            business=business,
        ).select_related('role')

        # Business-wide roles can access all branches
        business_wide_roles = {
            Role.RoleCode.BUSINESS_OWNER,
            Role.RoleCode.HR_MANAGER,
            Role.RoleCode.ACCOUNTANT,
            Role.RoleCode.AUDITOR,
        }

        for user_role in user_roles:
            if user_role.role.code in business_wide_roles:
                from apps.branches.models import Branch
                return list(
                    Branch.objects.filter(
                        business=business, is_active=True
                    ).values_list('id', flat=True)
                )

        # Branch-scoped roles
        branch_ids = set()
        for user_role in user_roles:
            if user_role.branch_id:
                branch_ids.add(user_role.branch_id)

        # Also include the employee's own branch
        from apps.employees.models import Employee
        try:
            employee = Employee.objects.get(user=user, business=business)
            if employee.branch_id:
                branch_ids.add(employee.branch_id)
        except Employee.DoesNotExist:
            pass

        return list(branch_ids)


class AuthService:
    """Authentication-related service operations."""

    @staticmethod
    def generate_invitation_token():
        """Generate a secure invitation token."""
        return secrets.token_urlsafe(48)

    @staticmethod
    def hash_token(token):
        """Hash a token for secure storage."""
        return hashlib.sha256(token.encode()).hexdigest()

    @staticmethod
    def generate_verification_code():
        """Generate a 6-digit verification code."""
        return f'{secrets.randbelow(1000000):06d}'

    @classmethod
    def create_session(cls, user, request):
        """Create a user session record."""
        from apps.accounts.models import UserSession

        token = secrets.token_urlsafe(32)
        session = UserSession.objects.create(
            user=user,
            token_hash=cls.hash_token(token),
            ip_address=cls._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            device_info=cls._get_device_info(request),
            expires_at=timezone.now() + timedelta(days=7),
        )
        return session, token

    @staticmethod
    def _get_client_ip(request):
        """Get client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')

    @staticmethod
    def _get_device_info(request):
        """Extract device info from request."""
        return {
            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200],
        }

