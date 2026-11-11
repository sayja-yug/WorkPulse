from rest_framework import viewsets, permissions
from common.mixins import TenantViewSetMixin
from .models import Shift, ShiftAssignment
from .serializers import ShiftSerializer, ShiftAssignmentSerializer


class ShiftViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Shift.objects.all()
    filterset_fields = ['type', 'is_active', 'is_overnight']
    search_fields = ['name', 'code']


class ShiftAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        business = getattr(self.request, 'business', None)
        return ShiftAssignment.objects.filter(employee__business=business).select_related('employee', 'shift')

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)

