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
    filterset_fields = ['employee', 'leave_type', 'status']

    def get_queryset(self):
        user = self.request.user
        business = getattr(self.request, 'business', None) or getattr(user, 'active_business', None)
        qs = LeaveRequest.objects.select_related('employee', 'leave_type').prefetch_related('approvals')
        if business:
            qs = qs.filter(business=business)

        is_admin_or_owner = user.is_superuser or user.user_roles.filter(
            role__code__in=['BUSINESS_OWNER', 'HR_MANAGER', 'SUPER_ADMIN']
        ).exists()
        if not is_admin_or_owner:
            qs = qs.filter(employee__user=user)

        return qs.order_by('-applied_at')

    def create(self, request, *args, **kwargs):
        business = getattr(request, 'business', None) or getattr(request.user, 'active_business', None)
        if not business:
            return Response(
                {'success': False, 'error': {'message': 'No active business context selected.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.employees.models import Employee
        # Find employee
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

        leave_type_input = request.data.get('leave_type', 'CASUAL')
        leave_type = None
        if isinstance(leave_type_input, str) and '-' in leave_type_input:
            leave_type = LeaveType.objects.filter(business=business, id=leave_type_input).first()
        if not leave_type:
            leave_type = LeaveType.objects.filter(business=business, code__iexact=str(leave_type_input)).first()
        if not leave_type:
            leave_type = LeaveType.objects.filter(business=business).first()
        if not leave_type:
            leave_type = LeaveType.objects.create(
                business=business,
                name='Casual Leave',
                code='CASUAL',
                is_paid=True,
                max_days_per_year=12
            )

        from datetime import datetime
        start_date_str = request.data.get('start_date')
        end_date_str = request.data.get('end_date')
        if not start_date_str or not end_date_str:
            return Response(
                {'success': False, 'error': {'message': 'Start date and end date are required.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            start_date = datetime.strptime(str(start_date_str)[:10], '%Y-%m-%d').date()
            end_date = datetime.strptime(str(end_date_str)[:10], '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'success': False, 'error': {'message': 'Invalid date format. Expected YYYY-MM-DD.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        days = max(1, (end_date - start_date).days + 1)
        reason = request.data.get('reason', '')
        emergency_contact = request.data.get('emergency_contact', '')
        is_half_day = bool(request.data.get('is_half_day', False))
        if is_half_day:
            days = 0.5

        leave_req = LeaveService.apply_leave(
            employee=employee,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            days=days,
            reason=reason,
            is_half_day=is_half_day,
            emergency_contact=emergency_contact
        )

        return Response({
            'success': True,
            'data': LeaveRequestSerializer(leave_req).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch', 'post'])
    def approve(self, request, pk=None):
        req = self.get_object()
        comments = request.data.get('comments', '')
        LeaveService.approve_leave(req, approver=request.user, comments=comments)
        return Response({'success': True, 'data': LeaveRequestSerializer(req).data})

    @action(detail=True, methods=['patch', 'post'])
    def reject(self, request, pk=None):
        req = self.get_object()
        comments = request.data.get('comments', request.data.get('rejection_reason', ''))
        LeaveService.reject_leave(req, approver=request.user, comments=comments)
        return Response({'success': True, 'data': LeaveRequestSerializer(req).data})


class LeaveTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LeaveTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        business = getattr(self.request, 'business', None)
        return LeaveTransaction.objects.filter(employee__business=business)
