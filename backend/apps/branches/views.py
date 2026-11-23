from django.db import transaction
from rest_framework import viewsets, permissions, serializers
from rest_framework.exceptions import PermissionDenied
from apps.accounts.services import PermissionService
from common.mixins import TenantViewSetMixin
from common.permissions import HasPermission
from .models import Branch, Department, Designation
from .serializers import BranchSerializer, DepartmentSerializer, DesignationSerializer


class OrganizationViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    permission_map = {'read': [], 'write': ['business.update']}

    @property
    def any_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return ('business.view', 'business.update', 'employee.view', 'employee.create',
                    'employee.update', 'attendance.view', 'attendance.mark', 'shift.view', 'shift.assign')
        return ()


class BranchViewSet(OrganizationViewSet):
    serializer_class = BranchSerializer
    queryset = Branch.objects.all()
    filterset_fields = ['is_active', 'is_head_office', 'city']
    search_fields = ['name', 'code', 'city']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        business = getattr(self.request, 'business', None)
        if business and not user.is_superuser:
            from apps.accounts.services import PermissionService
            if PermissionService.is_branch_scoped(user, business):
                branch_ids = PermissionService.get_accessible_branch_ids(user, business)
                qs = qs.filter(id__in=branch_ids)
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        business = self.request.business
        if PermissionService.is_branch_scoped(self.request.user, business):
            raise PermissionDenied('Your scope is limited to existing assigned branches.')
        manager_id = serializer.validated_data.pop('manager_id', None)
        super().perform_create(serializer)
        if manager_id:
            self._assign_branch_manager(serializer.instance, manager_id)

    @transaction.atomic
    def perform_update(self, serializer):
        branch = Branch.objects.select_for_update().get(pk=serializer.instance.pk)
        serializer.instance = branch
        if 'manager_id' in serializer.validated_data:
            self._assign_branch_manager(branch, serializer.validated_data.pop('manager_id'))
        super().perform_update(serializer)

    def _assign_branch_manager(self, branch, manager_id):
        from apps.accounts.models import Role, UserRole
        from apps.businesses.models import BusinessMembership
        from apps.employees.models import Employee

        business = self.request.business
        actor = self.request.user
        role = Role.objects.filter(code='BRANCH_MANAGER', is_system=True, is_active=True).first()
        if not role or not PermissionService.has_permissions(actor, business, ['role.assign']) or not PermissionService.can_delegate_role(actor, business, role):
            raise PermissionDenied('Assigning a branch manager requires delegation of the branch manager role.')
        assignments = UserRole.objects.filter(branch=branch, role=role, business=business)
        if not manager_id:
            assignments.delete()
            return
        eligible = BusinessMembership.objects.filter(business=business, is_active=True, is_owner=False,
                                                    user__is_active=True, user__is_superuser=False)
        member = eligible.filter(user_id=manager_id).first()
        if not member:
            employee = Employee.objects.filter(pk=manager_id, business=business).first()
            member = eligible.filter(user_id=employee.user_id).first() if employee and employee.user_id else None
        if not member:
            raise serializers.ValidationError({'manager_id': 'Select an active company member with a linked account.'})
        assignments.exclude(user_id=member.user_id).delete()
        UserRole.objects.update_or_create(user_id=member.user_id, business=business, role=role,
                                          defaults={'branch': branch})
        Employee.objects.filter(user_id=member.user_id, business=business).update(branch=branch)

    def perform_destroy(self, instance):
        user = self.request.user
        business = getattr(self.request, 'business', None)
        from apps.accounts.services import PermissionService
        if business and not user.is_superuser and PermissionService.is_branch_scoped(user, business):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Branch managers cannot delete branches.")
        super().perform_destroy(instance)


class DepartmentViewSet(OrganizationViewSet):
    serializer_class = DepartmentSerializer
    queryset = Department.objects.all()
    filterset_fields = ['is_active']
    search_fields = ['name', 'code']

    def create(self, request, *args, **kwargs):
        code = str(request.data.get('code', '')).strip().upper()
        business = getattr(request, 'business', None)
        if not business:
            business_id = request.headers.get('X-Business-ID') or request.META.get('HTTP_X_BUSINESS_ID')
            if business_id:
                from apps.businesses.models import Business
                business = Business.objects.filter(id=business_id).first()
            elif getattr(request.user, 'active_business', None):
                business = request.user.active_business
        if business and code:
            existing = Department.objects.filter(business=business, code__iexact=code).first()
            if existing:
                from rest_framework.response import Response
                from rest_framework import status
                return Response(
                    {'error': {'message': f"Department code '{code}' is already used by '{existing.name}'. Please choose a distinct code."}},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return super().create(request, *args, **kwargs)


class DesignationViewSet(OrganizationViewSet):
    serializer_class = DesignationSerializer
    queryset = Designation.objects.all()
    filterset_fields = ['is_active', 'level']
    search_fields = ['name']

