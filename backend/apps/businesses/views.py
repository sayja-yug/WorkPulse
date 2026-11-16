from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from common.permissions import HasPermission, IsBusinessOwner, IsBusinessMember
from .models import Business, BusinessMembership
from .serializers import (
    BusinessSerializer,
    BusinessListSerializer,
    BusinessCreateSerializer,
    BusinessMembershipSerializer
)
from .services import BusinessService


class BusinessViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.is_staff or user.user_roles.filter(
            role__code__in=['SUPER_ADMIN', 'SUPPORT_ADMIN', 'BILLING_ADMIN']
        ).exists():
            return Business.objects.all().select_related('subscription__plan').prefetch_related('employees', 'memberships__user').order_by('-created_at')
        return Business.objects.filter(memberships__user=user, memberships__is_active=True).distinct().select_related('subscription__plan').order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return BusinessListSerializer
        if self.action == 'create':
            return BusinessCreateSerializer
        return BusinessSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        business = BusinessService.create_business_with_owner(
            user=request.user,
            validated_data=serializer.validated_data
        )
        return Response(
            {'success': True, 'data': BusinessSerializer(business).data},
            status=status.HTTP_201_CREATED
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return Response({'success': True, 'data': BusinessSerializer(instance).data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = BusinessSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'success': True, 'data': serializer.data})

    @action(detail=True, methods=['get', 'patch'], permission_classes=[permissions.IsAuthenticated, IsBusinessOwner])
    def settings(self, request, pk=None):
        business = self.get_object()
        if request.method == 'GET':
            return Response({'success': True, 'data': business.settings})
        business.settings = request.data
        business.save(update_fields=['settings'])
        return Response({'success': True, 'data': business.settings})

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated, IsBusinessMember])
    def stats(self, request, pk=None):
        business = self.get_object()
        stats = {
            'branches_count': business.branches.count(),
            'departments_count': business.departments.count(),
            'employees_count': business.employees.filter(status='ACTIVE').count(),
            'total_employees': business.employees.count()
        }
        return Response({'success': True, 'data': stats})

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        if not (request.user.is_superuser or request.user.user_roles.filter(role__code='SUPER_ADMIN').exists()):
            return Response({'success': False, 'error': {'message': 'Only Super Admin can suspend or activate tenants.'}}, status=status.HTTP_403_FORBIDDEN)
        business = self.get_object()
        business.is_active = not business.is_active
        business.save(update_fields=['is_active', 'updated_at'])
        return Response({'success': True, 'data': BusinessSerializer(business).data})

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny], url_path='public-list')
    def public_list(self, request):
        """Returns list of active registered companies for login company selector dropdown."""
        businesses = Business.objects.filter(is_active=True).values('id', 'name', 'slug', 'city').order_by('name')
        return Response({'success': True, 'data': list(businesses)})

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny], url_path='lookup-by-email')
    def lookup_by_email(self, request):
        """Finds the registered company for a given employee/user work email."""
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'success': True, 'data': None})

        from apps.accounts.models import User
        from apps.employees.models import Employee

        # Check existing user account
        user = User.objects.filter(email__iexact=email).first()
        if user:
            # 1. Check memberships
            membership = user.business_memberships.filter(is_active=True, business__is_active=True).select_related('business').first()
            if membership:
                return Response({
                    'success': True,
                    'data': {
                        'id': str(membership.business.id),
                        'name': membership.business.name,
                        'slug': membership.business.slug,
                        'city': membership.business.city
                    }
                })
            # 2. Check employee profiles
            emp = user.employee_profiles.filter(status='ACTIVE', business__is_active=True).select_related('business').first()
            if emp:
                return Response({
                    'success': True,
                    'data': {
                        'id': str(emp.business.id),
                        'name': emp.business.name,
                        'slug': emp.business.slug,
                        'city': emp.business.city
                    }
                })

        # Check Employee table by email directly
        emp = Employee.objects.filter(email__iexact=email, status='ACTIVE', business__is_active=True).select_related('business').first()
        if emp:
            return Response({
                'success': True,
                'data': {
                    'id': str(emp.business.id),
                    'name': emp.business.name,
                    'slug': emp.business.slug,
                    'city': emp.business.city
                }
            })

        return Response({'success': True, 'data': None})

