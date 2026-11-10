from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from common.mixins import TenantViewSetMixin
from .models import (
    SalaryComponent,
    SalaryTemplate,
    EmployeeSalaryStructure,
    PayrollRun,
    PayrollItem,
    Payslip,
    SalaryPayment
)
from .serializers import (
    SalaryComponentSerializer,
    SalaryTemplateSerializer,
    EmployeeSalaryStructureSerializer,
    PayrollRunSerializer,
    PayrollItemSerializer,
    PayslipSerializer,
    SalaryPaymentSerializer
)
from .services import PayrollService


class SalaryComponentViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = SalaryComponentSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = SalaryComponent.objects.all()
    filterset_fields = ['type', 'is_active']


class SalaryTemplateViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = SalaryTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = SalaryTemplate.objects.all()


class EmployeeSalaryStructureViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSalaryStructureSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        business = getattr(self.request, 'business', None)
        return EmployeeSalaryStructure.objects.filter(employee__business=business)

    def perform_create(self, serializer):
        business = getattr(self.request, 'business', None)
        serializer.save(business=business, created_by=self.request.user)


class PayrollRunViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = PayrollRunSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = PayrollRun.objects.prefetch_related('items__components', 'items__employee').all()
    filterset_fields = ['status']

    @action(detail=True, methods=['post'])
    def calculate(self, request, pk=None):
        payroll_run = self.get_object()
        if payroll_run.status == PayrollRun.Status.APPROVED or payroll_run.status == PayrollRun.Status.LOCKED:
            return Response(
                {'success': False, 'error': {'message': 'Cannot recalculate locked or approved payroll.'}},
                status=status.HTTP_400_BAD_REQUEST
            )
        PayrollService.calculate_payroll_run(payroll_run)
        return Response({'success': True, 'data': PayrollRunSerializer(payroll_run).data})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        payroll_run = self.get_object()
        PayrollService.approve_and_lock(payroll_run, approved_by=request.user)
        return Response({'success': True, 'data': PayrollRunSerializer(payroll_run).data})


class PayslipViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PayslipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        business = getattr(self.request, 'business', None)
        user = self.request.user
        qs = Payslip.objects.filter(business=business)
        # Non-manager users can only view their own payslips
        if not user.is_staff and not user.is_superuser:
            qs = qs.filter(employee__user=user)
        return qs.select_related('employee', 'payroll_item')


class SalaryPaymentViewSet(viewsets.ModelViewSet):
    serializer_class = SalaryPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        business = getattr(self.request, 'business', None)
        return SalaryPayment.objects.filter(payroll_item__payroll_run__business=business)

    def perform_create(self, serializer):
        serializer.save(paid_by=self.request.user)
