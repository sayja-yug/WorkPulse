from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from common.mixins import TenantViewSetMixin
from .models import LeaveType, LeaveBalance, LeaveRequest, LeaveTransaction
from .serializers import (
    LeaveTypeSerializer,
    LeaveBalanceSerializer,
    LeaveRequestSerializer,
    LeaveTransactionSerializer
)
from .services import LeaveService


class LeaveTypeViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = LeaveTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = LeaveType.objects.all()
    filterset_fields = ['is_active', 'is_paid']


class LeaveBalanceViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveBalanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        business = getattr(self.request, 'business', None)
        return LeaveBalance.objects.filter(employee__business=business).select_related('employee', 'leave_type')


class LeaveRequestViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = LeaveRequest.objects.select_related('employee', 'leave_type').prefetch_related('approvals').all()
    filterset_fields = ['employee', 'leave_type', 'status']

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        req = self.get_object()
        comments = request.data.get('comments', '')
        LeaveService.approve_leave(req, approver=request.user, comments=comments)
        return Response({'success': True, 'data': LeaveRequestSerializer(req).data})

    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        req = self.get_object()
        comments = request.data.get('comments', '')
        LeaveService.reject_leave(req, approver=request.user, comments=comments)
        return Response({'success': True, 'data': LeaveRequestSerializer(req).data})


class LeaveTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LeaveTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        business = getattr(self.request, 'business', None)
        return LeaveTransaction.objects.filter(employee__business=business)

