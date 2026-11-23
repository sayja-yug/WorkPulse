from common.permissions import HasPermission
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from common.mixins import TenantViewSetMixin
from apps.notifications.services import notify_employee
from apps.attendance.scope import workforce_scope
from django.shortcuts import get_object_or_404
from .models import Shift, ShiftAssignment
from .serializers import ShiftSerializer, ShiftAssignmentSerializer


class ShiftViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    permission_map = {'read': ['shift.view'], 'write': ['shift.create'], 'assign_employee': ['shift.assign'], 'remove_employee': ['shift.assign']}
    queryset = Shift.objects.prefetch_related('assignments', 'assignments__employee').all()
    filterset_fields = ['type', 'is_active', 'is_overnight']
    search_fields = ['name', 'code']

    @action(detail=True, methods=['get'])
    def roster(self, request, pk=None):
        """Get all employees assigned to this shift."""
        shift = self.get_object()
        assignments = (
            ShiftAssignment.objects.filter(shift=shift)
            .select_related('employee', 'employee__branch', 'employee__department')
            .order_by('-effective_from')
        )
        employees, _ = workforce_scope(request, request.business)
        assignments = assignments.filter(employee__in=employees)

        data = [
            {
                'id': str(a.id),
                'employee_id': str(a.employee.id),
                'employee_code': a.employee.employee_code,
                'employee_name': a.employee.full_name,
                'department': a.employee.department.name if a.employee.department else 'General Operations',
                'branch': a.employee.branch.name if a.employee.branch else 'Headquarters',
                'effective_from': a.effective_from,
                'effective_to': a.effective_to,
            }
            for a in assignments
        ]
        return Response({'success': True, 'data': data})

    @action(detail=True, methods=['post'], url_path='assign-employee')
    def assign_employee(self, request, pk=None):
        """Assign an employee to this shift roster."""
        shift = self.get_object()
        employee_id = request.data.get('employee_id')
        if not employee_id:
            return Response(
                {'success': False, 'error': {'message': 'employee_id is required'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        employees, _ = workforce_scope(request, request.business)
        emp = get_object_or_404(employees, pk=employee_id)

        effective_from = request.data.get('effective_from') or timezone.now().date()
        assignment, created = ShiftAssignment.objects.update_or_create(
            employee=emp, effective_from=effective_from,
            defaults={
                'shift': shift,
                'assigned_by': request.user,
            }
        )

        if emp:
            time_str = f"{shift.start_time.strftime('%I:%M %p')} - {shift.end_time.strftime('%I:%M %p')}"
            notify_employee(
                employee=emp,
                title="Shift Assignment Updated",
                message=f"You have been assigned to '{shift.name}' ({time_str}) starting {effective_from}.",
                notif_type='ATTENDANCE',
                data={'shift_id': str(shift.id), 'shift_name': shift.name}
            )

        return Response({
            'success': True,
            'data': {'message': 'Employee assigned to shift successfully.'}
        })

    @action(detail=True, methods=['post'], url_path='remove-employee')
    def remove_employee(self, request, pk=None):
        """Remove an employee assignment from this shift roster."""
        shift = self.get_object()
        employee_id = request.data.get('employee_id')
        employees, _ = workforce_scope(request, request.business)
        employee = get_object_or_404(employees, pk=employee_id)
        ShiftAssignment.objects.filter(shift=shift, employee=employee).delete()
        return Response({
            'success': True,
            'data': {'message': 'Employee unassigned from shift.'}
        })


class ShiftAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    permission_map = {'read': ['shift.view'], 'write': ['shift.assign'], 'assign_employee': ['shift.assign'], 'remove_employee': ['shift.assign']}

    def get_queryset(self):
        employees, _ = workforce_scope(self.request, self.request.business)
        return ShiftAssignment.objects.filter(employee__in=employees, shift__business=self.request.business).select_related('employee', 'shift')

    filterset_fields = ['employee', 'shift']

    def get_serializer(self, *args, **kwargs):
        serializer = super().get_serializer(*args, **kwargs)
        if not kwargs.get('many', False):
            employees, _ = workforce_scope(self.request, self.request.business)
            serializer.fields['employee'].queryset = employees
            serializer.fields['shift'].queryset = Shift.objects.filter(business=self.request.business)
        return serializer

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)

