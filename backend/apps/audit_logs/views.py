from rest_framework import viewsets, permissions
from common.permissions import IsSuperAdmin
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        business = getattr(self.request, 'business', None)

        if user.is_superuser:
            qs = AuditLog.objects.all()
        elif business:
            qs = AuditLog.objects.filter(business=business)
        else:
            qs = AuditLog.objects.filter(user=user)

        return qs.select_related('user', 'business')
