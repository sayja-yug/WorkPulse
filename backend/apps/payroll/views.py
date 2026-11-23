from common.permissions import HasPermission
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from common.mixins import TenantViewSetMixin
from apps.notifications.services import notify_employee
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
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    permission_map = {'read': ['payroll.view'], 'write': ['payroll.calculate'], 'approve': ['payroll.approve'], 'disburse': ['payroll.approve']}
    queryset = SalaryComponent.objects.all()
    filterset_fields = ['type', 'is_active']


class SalaryTemplateViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = SalaryTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    permission_map = {'read': ['payroll.view'], 'write': ['payroll.calculate'], 'approve': ['payroll.approve'], 'disburse': ['payroll.approve']}
    queryset = SalaryTemplate.objects.all()


class EmployeeSalaryStructureViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSalaryStructureSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    permission_map = {'read': ['payroll.view'], 'write': ['payroll.calculate'], 'approve': ['payroll.approve'], 'disburse': ['payroll.approve']}

    def get_queryset(self):
        business = getattr(self.request, 'business', None)
        return EmployeeSalaryStructure.objects.filter(employee__business=business)

    def perform_create(self, serializer):
        business = getattr(self.request, 'business', None)
        serializer.save(business=business, created_by=self.request.user)


class PayrollRunViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = PayrollRunSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    permission_map = {'read': ['payroll.view'], 'write': ['payroll.calculate'], 'approve': ['payroll.approve'], 'disburse': ['payroll.approve']}
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
        if payroll_run.status == PayrollRun.Status.LOCKED:
            return Response(
                {'success': False, 'error': {'message': 'This payroll run is already locked.'}},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            PayrollService.approve_and_lock(payroll_run, approved_by=request.user)
            return Response({'success': True, 'data': PayrollRunSerializer(payroll_run).data})
        except Exception as e:
            return Response(
                {'success': False, 'error': {'message': f'Approval failed: {str(e)}'}},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def disburse(self, request, pk=None):
        """Execute salary disbursement for an approved or locked payroll run."""
        payroll_run = self.get_object()
        if payroll_run.status not in [PayrollRun.Status.APPROVED, PayrollRun.Status.LOCKED]:
            return Response(
                {'success': False, 'error': {'message': 'Payroll run must be APPROVED before disbursement.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment_mode = request.data.get('payment_mode', SalaryPayment.Mode.BANK_TRANSFER)
        payment_date = request.data.get('payment_date') or timezone.now().date()
        reference_number = request.data.get('reference_number', '')

        created_payments = []
        for item in payroll_run.items.all():
            payment, _ = SalaryPayment.objects.get_or_create(
                payroll_item=item,
                defaults={
                    'employee': item.employee,
                    'amount': item.net_salary,
                    'payment_mode': payment_mode,
                    'payment_date': payment_date,
                    'reference_number': reference_number,
                    'status': SalaryPayment.Status.COMPLETED,
                    'paid_by': request.user
                }
            )
            created_payments.append(payment)

        payroll_run.pay_date = payment_date
        payroll_run.status = PayrollRun.Status.LOCKED
        payroll_run.save(update_fields=['pay_date', 'status', 'updated_at'])

        # Notify all employees whose salary was disbursed
        for item in payroll_run.items.select_related('employee'):
            notify_employee(
                employee=item.employee,
                title="Salary Disbursed",
                message=f"Your salary for {payroll_run.name} (Net: ₹{item.net_salary:,.2f}) has been disbursed via {payment_mode}.",
                notif_type='PAYROLL',
                data={'payroll_run_id': str(payroll_run.id), 'net_salary': str(item.net_salary)}
            )

        return Response({
            'success': True,
            'data': {
                'payroll_run': PayrollRunSerializer(payroll_run).data,
                'disbursed_count': len(created_payments),
                'total_disbursed': str(payroll_run.total_net),
                'message': f'Successfully disbursed {len(created_payments)} employee salaries via {payment_mode}.'
            }
        })

    @action(detail=False, methods=['get', 'post'], url_path='policy')
    def policy(self, request):
        """Retrieve or update company payroll, work hours, overtime and deduction rules."""
        business = getattr(request, 'business', None)
        if not business:
            business_id = request.headers.get('X-Business-ID') or request.META.get('HTTP_X_BUSINESS_ID')
            if business_id:
                from apps.businesses.models import Business
                business = Business.objects.filter(id=business_id).first()
            elif getattr(request.user, 'active_business', None):
                business = request.user.active_business

        if not business:
            membership = request.user.business_memberships.first()
            if membership:
                business = membership.business

        if not business:
            return Response(
                {'success': False, 'error': {'message': 'No active business context found.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        settings = business.settings or {}
        policy_data = {
            'standard_daily_hours': 8.0,
            'standard_weekly_hours': 40.0,
            'enable_overtime': True,
            'overtime_multiplier': 1.5,
            'enable_shortfall_deduction': True,
            'enable_unpaid_leave_deduction': True,
        }
        if isinstance(settings.get('payroll_policy'), dict):
            policy_data.update(settings['payroll_policy'])

        if request.method == 'POST':
            data = request.data
            try:
                policy_data['standard_daily_hours'] = float(data.get('standard_daily_hours', policy_data['standard_daily_hours']))
                policy_data['standard_weekly_hours'] = float(data.get('standard_weekly_hours', policy_data['standard_weekly_hours']))
                policy_data['enable_overtime'] = bool(data.get('enable_overtime', policy_data['enable_overtime']))
                policy_data['overtime_multiplier'] = float(data.get('overtime_multiplier', policy_data['overtime_multiplier']))
                policy_data['enable_shortfall_deduction'] = bool(data.get('enable_shortfall_deduction', policy_data['enable_shortfall_deduction']))
                policy_data['enable_unpaid_leave_deduction'] = bool(data.get('enable_unpaid_leave_deduction', policy_data['enable_unpaid_leave_deduction']))

                settings['payroll_policy'] = policy_data
                business.settings = settings
                business.save(update_fields=['settings', 'updated_at'])
                return Response({
                    'success': True,
                    'data': policy_data,
                    'message': 'Company payroll & overtime policy saved successfully.'
                })
            except (ValueError, TypeError) as e:
                return Response(
                    {'success': False, 'error': {'message': f'Invalid policy configuration: {str(e)}'}},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response({'success': True, 'data': policy_data})


class PayslipViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PayslipSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    permission_map = {'read': []}
    any_permissions = ['payroll.view', 'payroll.view_own']
    filterset_fields = ['employee']

    def get_queryset(self):
        business = getattr(self.request, 'business', None) or getattr(self.request.user, 'active_business', None)
        user = self.request.user
        qs = Payslip.objects.all()
        if business:
            qs = qs.filter(business=business)

        # Managers (Owner, HR, Accountant, Auditor, Admin) can view all company payslips
        from apps.accounts.services import PermissionService
        is_manager = PermissionService.has_permissions(user, business, ['payroll.view'])

        if not is_manager:
            qs = qs.filter(employee__user=user)

        return qs.select_related('employee', 'payroll_item')


class SalaryPaymentViewSet(viewsets.ModelViewSet):
    serializer_class = SalaryPaymentSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    permission_map = {'read': ['payroll.view'], 'write': ['payroll.approve'], 'approve': ['payroll.approve'], 'disburse': ['payroll.approve']}

    def get_queryset(self):
        business = getattr(self.request, 'business', None)
        return SalaryPayment.objects.filter(payroll_item__payroll_run__business=business)

    def perform_create(self, serializer):
        serializer.save(paid_by=self.request.user)

