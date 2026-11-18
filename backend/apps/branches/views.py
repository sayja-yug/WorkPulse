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

    def perform_create(self, serializer):
        user = self.request.user
        business = getattr(self.request, 'business', None)
        from apps.accounts.services import PermissionService
        if business and not user.is_superuser and PermissionService.is_branch_scoped(user, business):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Branch managers cannot create new branches.")
        manager_id = serializer.validated_data.pop('manager_id', None)
        super().perform_create(serializer)
        if manager_id and business:
            self._assign_branch_manager(serializer.instance, manager_id, business)

    def perform_update(self, serializer):
        business = getattr(self.request, 'business', None)
        manager_id = serializer.validated_data.pop('manager_id', None)
        super().perform_update(serializer)
        if manager_id is not None and business:
            self._assign_branch_manager(serializer.instance, manager_id, business)

    def _assign_branch_manager(self, branch, manager_id, business):
        from apps.accounts.models import User, Role, UserRole
        from apps.employees.models import Employee
        bm_role = Role.objects.filter(code='BRANCH_MANAGER', is_system=True).first()
        if not bm_role:
            return

        if not manager_id:
            UserRole.objects.filter(branch=branch, role=bm_role).delete()
            return

        mgr_user = User.objects.filter(id=manager_id).first()
        if not mgr_user:
            emp = Employee.objects.filter(id=manager_id, business=business).first()
            if emp and emp.user:
                mgr_user = emp.user

        if mgr_user:
            UserRole.objects.filter(branch=branch, role=bm_role).exclude(user=mgr_user).delete()
            UserRole.objects.update_or_create(
                user=mgr_user,
                business=business,
                role=bm_role,
                defaults={'branch': branch}
            )
            Employee.objects.filter(user=mgr_user, business=business).update(branch=branch)

    def perform_destroy(self, instance):
        user = self.request.user
        business = getattr(self.request, 'business', None)
        from apps.accounts.services import PermissionService
        if business and not user.is_superuser and PermissionService.is_branch_scoped(user, business):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Branch managers cannot delete branches.")
        super().perform_destroy(instance)


class DepartmentViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]
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


class DesignationViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = DesignationSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Designation.objects.all()
    filterset_fields = ['is_active', 'level']
    search_fields = ['name']

