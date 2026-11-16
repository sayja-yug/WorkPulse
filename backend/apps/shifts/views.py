from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from common.mixins import TenantViewSetMixin
from .models import Shift, ShiftAssignment
from .serializers import ShiftSerializer, ShiftAssignmentSerializer


class ShiftViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated]
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
        effective_from = request.data.get('effective_from') or timezone.now().date()
        assignment, created = ShiftAssignment.objects.update_or_create(
            employee_id=employee_id,
            defaults={
                'shift': shift,
                'effective_from': effective_from,
                'assigned_by': request.user,
            }
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
        ShiftAssignment.objects.filter(shift=shift, employee_id=employee_id).delete()
        return Response({
            'success': True,
            'data': {'message': 'Employee unassigned from shift.'}
        })


class ShiftAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        business = getattr(self.request, 'business', None)
        return ShiftAssignment.objects.filter(employee__business=business).select_related('employee', 'shift')

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)

