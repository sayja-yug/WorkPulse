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

