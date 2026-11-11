"""WorkPulse URL Configuration."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from common.views import HealthCheckView

urlpatterns = [
    # Root health check endpoint for platform monitoring (Render, Pingdom, UptimeRobot)
    path('', HealthCheckView.as_view(), name='root-index'),

    # Admin
    path('admin/', admin.site.urls),

    # Health check (both root api and v1)
    path('health/', HealthCheckView.as_view(), name='root-health'),
    path('api/health/', HealthCheckView.as_view(), name='health-check'),
    path('api/v1/health/', HealthCheckView.as_view(), name='health-check-v1'),

    # Direct auth fallback for requests without /api/v1 prefix
    path('auth/', include('apps.accounts.urls')),

    # API v1
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/businesses/', include('apps.businesses.urls')),
    path('api/v1/branches/', include('apps.branches.urls')),
    path('api/v1/employees/', include('apps.employees.urls')),
    path('api/v1/attendance/', include('apps.attendance.urls')),
    path('api/v1/shifts/', include('apps.shifts.urls')),
    path('api/v1/leaves/', include('apps.leaves.urls')),
    path('api/v1/payroll/', include('apps.payroll.urls')),
    path('api/v1/advances/', include('apps.advances.urls')),
    path('api/v1/expenses/', include('apps.expenses.urls')),
    path('api/v1/reports/', include('apps.reports.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/subscriptions/', include('apps.subscriptions.urls')),
    path('api/v1/audit-logs/', include('apps.audit_logs.urls')),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    try:
        import debug_toolbar
        urlpatterns += [path('__debug__/', include(debug_toolbar.urls))]
    except ImportError:
        pass

