from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from common.mixins import TenantViewSetMixin
from .models import Advance, Loan, LoanRepayment, Reimbursement
from .serializers import (
    AdvanceSerializer,
    LoanSerializer,
    LoanRepaymentSerializer,
    ReimbursementSerializer
)


class AdvanceViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = AdvanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Advance.objects.select_related('employee').all()
    filterset_fields = ['employee', 'status']

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        adv = self.get_object()
        adv.status = Advance.Status.APPROVED
        adv.approved_by = request.user
        adv.approved_at = timezone.now()
        adv.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])
        return Response({'success': True, 'data': AdvanceSerializer(adv).data})

    @action(detail=True, methods=['patch'])
    def disburse(self, request, pk=None):
        adv = self.get_object()
        adv.status = Advance.Status.DISBURSED
        adv.paid_at = timezone.now()
        adv.save(update_fields=['status', 'paid_at', 'updated_at'])
        return Response({'success': True, 'data': AdvanceSerializer(adv).data})


class LoanViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = LoanSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Loan.objects.prefetch_related('repayments').all()
    filterset_fields = ['employee', 'status']

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        loan = self.get_object()
        loan.status = Loan.Status.ACTIVE
        loan.approved_by = request.user
        loan.disbursed_at = timezone.now()
        loan.save(update_fields=['status', 'approved_by', 'disbursed_at', 'updated_at'])
        return Response({'success': True, 'data': LoanSerializer(loan).data})


class ReimbursementViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ReimbursementSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Reimbursement.objects.all()
    filterset_fields = ['employee', 'status']

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        rb = self.get_object()
        rb.status = Reimbursement.Status.APPROVED
        rb.approved_by = request.user
        rb.save(update_fields=['status', 'approved_by', 'updated_at'])
        return Response({'success': True, 'data': ReimbursementSerializer(rb).data})
