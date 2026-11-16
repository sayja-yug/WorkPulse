from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, permissions, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification, NotificationPreference
from .serializers import NotificationSerializer, NotificationPreferenceSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        business = getattr(self.request, 'business', None) or getattr(user, 'active_business', None)
        qs = Notification.objects.filter(user=user)
        if business:
            qs = qs.filter(Q(business=business) | Q(business__isnull=True))
        return qs.order_by('-created_at')

    @action(detail=True, methods=['patch', 'post'])
    def read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.read_at = timezone.now()
        notif.save(update_fields=['is_read', 'read_at', 'updated_at'])
        return Response({'success': True, 'data': NotificationSerializer(notif).data})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        user = self.request.user
        business = getattr(self.request, 'business', None) or getattr(user, 'active_business', None)
        qs = Notification.objects.filter(user=user, is_read=False)
        if business:
            qs = qs.filter(Q(business=business) | Q(business__isnull=True))
        updated = qs.update(is_read=True, read_at=timezone.now())
        return Response({'success': True, 'data': {'marked_read_count': updated}})


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return NotificationPreference.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        business = getattr(self.request, 'business', None)
        serializer.save(user=self.request.user, business=business)

