from rest_framework import viewsets, permissions
from common.mixins import TenantViewSetMixin
from common.permissions import HasPermission
from .models import Branch, Department, Designation
from .serializers import BranchSerializer, DepartmentSerializer, DesignationSerializer


class BranchViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Branch.objects.all()
    filterset_fields = ['is_active', 'is_head_office', 'city']
    search_fields = ['name', 'code', 'city']


class DepartmentViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Department.objects.all()
    filterset_fields = ['is_active']
    search_fields = ['name', 'code']


class DesignationViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = DesignationSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Designation.objects.all()
    filterset_fields = ['is_active', 'level']
    search_fields = ['name']

