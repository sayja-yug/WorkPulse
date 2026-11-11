"""Tenant and Audit middleware for WorkPulse."""
import logging
import threading

from django.utils import timezone

logger = logging.getLogger(__name__)

# Thread-local storage for current business context
_thread_locals = threading.local()


def get_current_business():
    """Get the current business from thread-local storage."""
    return getattr(_thread_locals, 'business', None)


def get_current_user():
    """Get the current user from thread-local storage."""
    return getattr(_thread_locals, 'user', None)


class TenantMiddleware:
    """Middleware that extracts business context from the request.

    Sets the active business in thread-local storage based on the
    X-Business-ID header or the user's active business.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.business = None
        _thread_locals.user = None

        if hasattr(request, 'user') and request.user.is_authenticated:
            _thread_locals.user = request.user
            business_id = request.headers.get('X-Business-ID')
            from apps.businesses.models import BusinessMembership
            if business_id:
                try:
                    membership = BusinessMembership.objects.select_related('business').get(
                        user=request.user,
                        business_id=business_id,
                        is_active=True,
                    )
                    _thread_locals.business = membership.business
                    request.business = membership.business
                    request.business_membership = membership
                except BusinessMembership.DoesNotExist:
                    pass
            elif getattr(request.user, 'active_business', None):
                _thread_locals.business = request.user.active_business
                request.business = request.user.active_business

        response = self.get_response(request)

        # Clean up
        _thread_locals.business = None
        _thread_locals.user = None

        return response


class AuditMiddleware:
    """Middleware that logs API requests for audit purposes."""

    AUDITED_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if (
            request.method in self.AUDITED_METHODS
            and hasattr(request, 'user')
            and request.user.is_authenticated
            and response.status_code < 400
            and request.path.startswith('/api/')
        ):
            self._create_audit_log(request, response)

        return response

    def _create_audit_log(self, request, response):
        """Create an audit log entry asynchronously."""
        try:
            from apps.audit_logs.models import AuditLog
            AuditLog.objects.create(
                user=request.user,
                business=getattr(request, 'business', None),
                action=request.method,
                resource_type=self._get_resource_type(request.path),
                resource_id=self._get_resource_id(request.path),
                ip_address=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            )
        except Exception:
            logger.exception('Failed to create audit log')

    @staticmethod
    def _get_resource_type(path):
        """Extract resource type from URL path."""
        parts = path.strip('/').split('/')
        # /api/v1/{resource}/...
        if len(parts) >= 3:
            return parts[2]
        return 'unknown'

    @staticmethod
    def _get_resource_id(path):
        """Extract resource ID from URL path."""
        parts = path.strip('/').split('/')
        if len(parts) >= 4:
            resource_id = parts[3]
            # Basic UUID validation
            if len(resource_id) == 36 and resource_id.count('-') == 4:
                return resource_id
        return None

    @staticmethod
    def _get_client_ip(request):
        """Get the client IP address from the request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')

