from common.permissions import HasPermission
from decimal import Decimal
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from common.mixins import TenantViewSetMixin
from apps.notifications.services import notify_employee, notify_business_managers
from .models import Advance, Loan, LoanRepayment, Reimbursement
from .serializers import (
    AdvanceSerializer,
    LoanSerializer,
    LoanRepaymentSerializer,
    ReimbursementSerializer
)


class AdvanceViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = AdvanceSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    permission_map = {'read': ['advance.view'], 'write': ['advance.approve'], 'create': ['advance.request'], 'request_advance': ['advance.request']}
    filterset_fields = ['employee', 'status']

    def get_queryset(self):
        user = self.request.user
        business = getattr(self.request, 'business', None) or getattr(user, 'active_business', None)
        qs = Advance.objects.select_related('employee').all()
        if business:
            qs = qs.filter(business=business)

        if not user.is_superuser:
            from apps.accounts.services import PermissionService
            if PermissionService.is_branch_scoped(user, business):
                branch_ids = PermissionService.get_accessible_branch_ids(user, business)
                qs = qs.filter(employee__branch_id__in=branch_ids)
            else:
                is_admin_or_owner = user.user_roles.filter(
                    role__code__in=['BUSINESS_OWNER', 'HR_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN']
                ).exists()
                if not is_admin_or_owner:
                    qs = qs.filter(employee__user=user)

        return qs.order_by('-requested_at')

    def create(self, request, *args, **kwargs):
        return self._create_advance(request)

    @action(detail=False, methods=['post'], url_path='request')
    def request_advance(self, request):
        return self._create_advance(request)

    def _create_advance(self, request):
        business = getattr(request, 'business', None) or getattr(request.user, 'active_business', None)
        if not business:
            return Response(
                {'success': False, 'error': {'message': 'No active business context selected.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.employees.models import Employee
        # Check if an explicit employee is passed by Owner / Admin
        employee_id = request.data.get('employee')
        is_manager = request.user.is_superuser or request.user.user_roles.filter(
            role__code__in=['BUSINESS_OWNER', 'HR_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN']
        ).exists()

        if employee_id and is_manager:
            employee = Employee.objects.filter(business=business, id=employee_id).first()
            if not employee:
                return Response(
                    {'success': False, 'error': {'message': 'Selected employee was not found.'}},
                    status=status.HTTP_404_NOT_FOUND
                )
            initial_status = request.data.get('status', Advance.Status.APPROVED)
        else:
            # Employee self-request
            employee = Employee.objects.filter(business=business, user=request.user).first()
            if not employee:
                employee = Employee.objects.filter(business=business, email__iexact=request.user.email).first()
                if not employee:
                    import uuid
                    employee = Employee.objects.create(
                        business=business,
                        user=request.user,
                        employee_code=f"EMP-{uuid.uuid4().hex[:4].upper()}",
                        first_name=request.user.first_name or 'Employee',
                        last_name=request.user.last_name or '',
                        email=request.user.email,
                        status=Employee.Status.ACTIVE
                    )
            initial_status = Advance.Status.PENDING

        amount_raw = request.data.get('amount')
        if not amount_raw:
            return Response(
                {'success': False, 'error': {'message': 'Advance amount is required.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            amount = Decimal(str(amount_raw))
            if amount <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response(
                {'success': False, 'error': {'message': 'Invalid advance amount.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', '')
        repayment_months = int(request.data.get('repayment_months', 1) or 1)
        monthly_deduction = amount / max(1, repayment_months)

        adv = Advance.objects.create(
            business=business,
            employee=employee,
            amount=amount,
            remaining_balance=amount,
            monthly_deduction=monthly_deduction,
            reason=reason,
            status=initial_status,
            approved_by=request.user if initial_status != Advance.Status.PENDING else None,
            approved_at=timezone.now() if initial_status != Advance.Status.PENDING else None
        )

        # Send Notifications
        if employee_id and is_manager:
            status_verb = "approved and recorded" if adv.status == Advance.Status.APPROVED else "entered"
            notify_employee(
                employee=employee,
                title="Salary Advance Granted",
                message=f"A salary advance of ₹{amount:,.2f} has been {status_verb} for you by management.",
                notif_type='PAYROLL',
                data={'advance_id': str(adv.id), 'amount': str(adv.amount), 'status': adv.status}
            )
        else:
            notify_business_managers(
                business=business,
                title="New Advance Request",
                message=f"{employee.full_name} has requested a salary advance of ₹{amount:,.2f}.",
                notif_type='PAYROLL',
                exclude_user=request.user,
                data={'advance_id': str(adv.id), 'employee_id': str(employee.id), 'amount': str(adv.amount)}
            )
            notify_employee(
                employee=employee,
                title="Advance Request Submitted",
                message=f"Your advance request for ₹{amount:,.2f} has been submitted to management for review.",
                notif_type='PAYROLL',
                data={'advance_id': str(adv.id), 'amount': str(adv.amount), 'status': adv.status}
            )

        return Response({
            'success': True,
            'data': AdvanceSerializer(adv).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch', 'post'])
    def approve(self, request, pk=None):
        adv = self.get_object()
        adv.status = Advance.Status.APPROVED
        adv.approved_by = request.user
        adv.approved_at = timezone.now()
        adv.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])

        notify_employee(
            employee=adv.employee,
            title="Salary Advance Approved",
            message=f"Your salary advance request of ₹{adv.amount:,.2f} has been approved by management.",
            notif_type='PAYROLL',
            data={'advance_id': str(adv.id), 'amount': str(adv.amount), 'status': adv.status}
        )

        return Response({'success': True, 'data': AdvanceSerializer(adv).data})

    @action(detail=True, methods=['patch', 'post'])
    def reject(self, request, pk=None):
        adv = self.get_object()
        adv.status = Advance.Status.REJECTED
        adv.save(update_fields=['status', 'updated_at'])

        notify_employee(
            employee=adv.employee,
            title="Salary Advance Declined",
            message=f"Your salary advance request of ₹{adv.amount:,.2f} was declined by management.",
            notif_type='PAYROLL',
            data={'advance_id': str(adv.id), 'amount': str(adv.amount), 'status': adv.status}
        )

        return Response({'success': True, 'data': AdvanceSerializer(adv).data})

    @action(detail=True, methods=['patch', 'post'])
    def disburse(self, request, pk=None):
        adv = self.get_object()
        adv.status = Advance.Status.DISBURSED
        adv.paid_at = timezone.now()
        adv.save(update_fields=['status', 'paid_at', 'updated_at'])

        notify_employee(
            employee=adv.employee,
            title="Salary Advance Disbursed",
            message=f"Your salary advance of ₹{adv.amount:,.2f} has been paid and disbursed to your account.",
            notif_type='PAYROLL',
            data={'advance_id': str(adv.id), 'amount': str(adv.amount), 'status': adv.status}
        )

        return Response({'success': True, 'data': AdvanceSerializer(adv).data})


class LoanViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = LoanSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    permission_map = {'read': ['advance.view'], 'write': ['advance.approve'], 'create': ['advance.request'], 'request_advance': ['advance.request']}
    queryset = Loan.objects.prefetch_related('repayments').all()
    filterset_fields = ['employee', 'status']

    @action(detail=True, methods=['patch', 'post'])
    def approve(self, request, pk=None):
        loan = self.get_object()
        loan.status = Loan.Status.ACTIVE
        loan.approved_by = request.user
        loan.disbursed_at = timezone.now()
        loan.save(update_fields=['status', 'approved_by', 'disbursed_at', 'updated_at'])
        return Response({'success': True, 'data': LoanSerializer(loan).data})


class ReimbursementViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ReimbursementSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    permission_map = {'read': ['advance.view'], 'write': ['advance.approve'], 'create': ['advance.request'], 'request_advance': ['advance.request']}
    queryset = Reimbursement.objects.all()
    filterset_fields = ['employee', 'status']

    @action(detail=True, methods=['patch', 'post'])
    def approve(self, request, pk=None):
        rb = self.get_object()
        rb.status = Reimbursement.Status.APPROVED
        rb.approved_by = request.user
        rb.save(update_fields=['status', 'approved_by', 'updated_at'])
        return Response({'success': True, 'data': ReimbursementSerializer(rb).data})
