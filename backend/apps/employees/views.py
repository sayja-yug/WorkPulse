from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from common.mixins import TenantViewSetMixin
from common.permissions import HasPermission
from .models import Employee, EmployeeDocument, EmploymentHistory
from .serializers import (
    EmployeeSerializer,
    EmployeeListSerializer,
    EmployeeDocumentSerializer,
    EmploymentHistorySerializer
)
from .services import EmployeeService


class EmployeeViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Employee.objects.select_related('branch', 'department', 'designation', 'user').all()
    filterset_fields = ['branch', 'department', 'designation', 'status', 'employment_type', 'is_field_employee']
    search_fields = ['first_name', 'last_name', 'employee_code', 'email', 'phone']

    def get_serializer_class(self):
        if self.action == 'list':
            return EmployeeListSerializer
        return EmployeeSerializer

    def perform_create(self, serializer):
        business = getattr(self.request, 'business', None)
        if not business:
            business_id = self.request.headers.get('X-Business-ID') or self.request.META.get('HTTP_X_BUSINESS_ID')
            if business_id:
                from apps.businesses.models import Business
                business = Business.objects.filter(id=business_id).first()
            elif getattr(self.request.user, 'active_business', None):
                business = self.request.user.active_business
            elif getattr(self.request.user, 'is_authenticated', False):
                from apps.businesses.models import BusinessMembership
                mem = BusinessMembership.objects.filter(user=self.request.user, is_active=True).first()
                if mem:
                    business = mem.business
        serializer.instance = EmployeeService.create_employee(
            business=business,
            validated_data=serializer.validated_data,
            created_by=self.request.user,
            base_salary=self.request.data.get('base_salary'),
            shift_id=self.request.data.get('shift_id'),
            send_invite=self.request.data.get('send_invite', True),
        )

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        employee = self.get_object()
        employee.status = Employee.Status.ACTIVE
        employee.save(update_fields=['status', 'updated_at'])
        return Response({'success': True, 'data': {'message': 'Employee activated successfully.'}})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        employee = self.get_object()
        employee.status = Employee.Status.INACTIVE
        employee.save(update_fields=['status', 'updated_at'])
        return Response({'success': True, 'data': {'message': 'Employee deactivated successfully.'}})

    @action(detail=True, methods=['post'])
    def transfer(self, request, pk=None):
        employee = self.get_object()
        new_branch_id = request.data.get('branch_id')
        new_dept_id = request.data.get('department_id')
        notes = request.data.get('notes', '')
        EmployeeService.transfer_employee(
            employee=employee,
            new_branch_id=new_branch_id,
            new_dept_id=new_dept_id,
            changed_by=request.user,
            notes=notes
        )
        return Response({'success': True, 'data': EmployeeSerializer(employee).data})

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        employee = self.get_object()
        history = employee.history.all()
        return Response({'success': True, 'data': EmploymentHistorySerializer(history, many=True).data})


class EmployeeDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        business = getattr(self.request, 'business', None)
        return EmployeeDocument.objects.filter(employee__business=business)

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

