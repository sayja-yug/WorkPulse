"""Views for the accounts app."""
import logging
from datetime import timedelta

from django.contrib.auth import update_session_auth_hash
from django.db import models, transaction
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status, views
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from common.permissions import HasPermission, IsBusinessMember, IsBusinessOwner, resolve_business

from .models import Invitation, Permission, Role, User, UserRole
from .serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    ForgotPasswordSerializer,
    InvitationAcceptSerializer,
    InvitationCreateSerializer,
    InvitationSerializer,
    PermissionSerializer,
    ResetPasswordSerializer,
    RoleListSerializer,
    RoleSerializer,
    SwitchBusinessSerializer,
    UserCreateSerializer,
    UserRoleAssignSerializer,
    UserRoleSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from .services import AuthService, PermissionService

logger = logging.getLogger(__name__)


# ─── Authentication Views ───────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    """Register a new user account."""
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'success': True,
                'data': {
                    'user': UserSerializer(user).data,
                    'tokens': {
                        'access': str(refresh.access_token),
                        'refresh': str(refresh),
                    },
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """Login with email and password, returns JWT tokens."""
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            # Create session record
            user = User.objects.get(email=request.data.get('email'))
            AuthService.create_session(user, request)
            response.data = {
                'success': True,
                'data': response.data,
            }
        return response


class LogoutView(views.APIView):
    """Logout by blacklisting the refresh token."""

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response(
                {'success': True, 'data': {'message': 'Logged out successfully.'}},
                status=status.HTTP_200_OK,
            )
        except Exception:
            return Response(
                {'success': True, 'data': {'message': 'Logged out.'}},
                status=status.HTTP_200_OK,
            )


class TokenRefreshView(TokenRefreshView):
    """Refresh access token using refresh token."""
    pass


class ForgotPasswordView(views.APIView):
    """Request a password reset email."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        # Always return success to prevent email enumeration
        try:
            user = User.objects.get(email=email, is_active=True)
            # TODO: Send password reset email via Celery task
            logger.info(f'Password reset requested for {email}')
        except User.DoesNotExist:
            pass

        return Response(
            {
                'success': True,
                'data': {'message': 'If the email exists, a reset link has been sent.'},
            },
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(views.APIView):
    """Reset password using a reset token."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # TODO: Validate reset token and update password
        return Response(
            {'success': True, 'data': {'message': 'Password has been reset.'}},
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(views.APIView):
    """Change password for the authenticated user."""

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        update_session_auth_hash(request, user)
        return Response(
            {'success': True, 'data': {'message': 'Password changed successfully.'}},
            status=status.HTTP_200_OK,
        )


# ─── Profile Views ──────────────────────────────────────────────────────

class ProfileView(views.APIView):
    """Get or update the current user's profile."""

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response({'success': True, 'data': serializer.data})


class VerifyAccountView(views.APIView):
    """Verify the authenticated user's email/phone during onboarding."""

    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'success': True, 'data': UserSerializer(request.user).data})


class ProfileAvatarView(views.APIView):
    """Upload user avatar."""
    parser_classes = [MultiPartParser]

    def post(self, request):
        if 'avatar' not in request.FILES:
            return Response(
                {'success': False, 'error': {'code': 'VALIDATION_ERROR', 'message': 'No avatar file provided.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.avatar = request.FILES['avatar']
        request.user.save(update_fields=['avatar'])
        return Response({'success': True, 'data': UserSerializer(request.user).data})


class UserBusinessesView(views.APIView):
    """List businesses the current user belongs to."""

    def get(self, request):
        from apps.businesses.models import BusinessMembership
        from apps.businesses.serializers import BusinessListSerializer

        memberships = BusinessMembership.objects.filter(
            user=request.user, is_active=True
        ).select_related('business')

        businesses = [m.business for m in memberships]
        serializer = BusinessListSerializer(businesses, many=True)

        data = serializer.data
        # Annotate with user's roles in each business
        for i, membership in enumerate(memberships):
            roles = UserRole.objects.filter(
                user=request.user, business=membership.business
            ).select_related('role')
            data[i]['roles'] = [
                {'id': str(ur.role.id), 'name': ur.role.name, 'code': ur.role.code}
                for ur in roles
            ]
            data[i]['is_owner'] = membership.is_owner

        return Response({'success': True, 'data': data})


class SwitchBusinessView(views.APIView):
    """Switch the user's active business."""

    def post(self, request):
        serializer = SwitchBusinessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        business_id = serializer.validated_data['business_id']

        from apps.businesses.models import BusinessMembership
        try:
            membership = BusinessMembership.objects.get(
                user=request.user,
                business_id=business_id,
                is_active=True,
            )
        except BusinessMembership.DoesNotExist:
            return Response(
                {
                    'success': False,
                    'error': {'code': 'NOT_FOUND', 'message': 'Business not found or not a member.'},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        request.user.active_business_id = business_id
        request.user.save(update_fields=['active_business_id'])

        # Get user roles and permissions for this business
        roles = PermissionService.get_user_roles(request.user, membership.business)
        permissions_list = list(PermissionService.get_user_permissions(request.user, membership.business))

        return Response({
            'success': True,
            'data': {
                'business_id': str(business_id),
                'business_name': membership.business.name,
                'roles': roles,
                'permissions': permissions_list,
            },
        })


# ─── Role & Permission Views ────────────────────────────────────────────

class RoleListView(generics.ListAPIView):
    """List roles available in the business."""
    serializer_class = RoleListSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    required_permissions = ['role.view']

    def get_queryset(self):
        business = getattr(self.request, 'business', None)
        if business:
            return Role.objects.filter(
                models.Q(is_system=True) | models.Q(business=business),
                is_active=True,
            )
        return Role.objects.filter(is_system=True, is_active=True)


class RoleDetailView(generics.RetrieveAPIView):
    """Get role details with permissions."""
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    required_permissions = ['role.view']

    def get_queryset(self):
        return Role.objects.filter(models.Q(is_system=True) | models.Q(business=self.request.business), is_active=True)


class RoleCreateView(generics.CreateAPIView):
    """Create a custom role for the business."""
    serializer_class = RoleSerializer
    required_permissions = ['role.create']
    permission_classes = [permissions.IsAuthenticated, HasPermission, IsBusinessOwner]

    @transaction.atomic
    def perform_create(self, serializer):
        business = self.request.business
        codes = {code for code, _ in Role.RoleCode.choices}
        code = serializer.validated_data['code'].upper()
        if code in codes or Role.objects.filter(business=business, code__iexact=code).exists():
            raise serializers.ValidationError({'code': 'Choose a distinct custom role code.'})
        requested = set(serializer.validated_data.pop('permission_ids', []))
        allowed = PermissionService.tenant_permissions().filter(
            code__in=PermissionService.get_user_permissions(self.request.user, business), id__in=requested
        )
        if allowed.count() != len(requested):
            raise PermissionDenied('Only permissions held in this company can be delegated.')
        role = serializer.save(business=business, is_system=False, code=code)
        role.permissions.set(allowed)


def validate_assignment(user, business, role, branch_id):
    from apps.branches.models import Branch
    if not PermissionService.can_delegate_role(user, business, role):
        raise PermissionDenied('This role exceeds your delegation permissions.')
    if branch_id and not Branch.objects.filter(business=business, id=branch_id, is_active=True).exists():
        raise serializers.ValidationError({'branch_id': 'Choose a branch in this company.'})
    if not user.is_superuser and PermissionService.get_user_scope(user, business) != 'BUSINESS':
        if not branch_id or branch_id not in PermissionService.get_accessible_branch_ids(user, business):
            raise PermissionDenied('Choose an assigned branch.')
        if role.is_system and role.code not in ['BRANCH_MANAGER', 'EMPLOYEE', 'FIELD_EMPLOYEE']:
            raise PermissionDenied('Choose a role scoped to this branch.')


class MemberGrantsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, HasPermission, IsBusinessOwner]
    required_permissions = ['role.assign']

    def members(self, request):
        from apps.businesses.models import BusinessMembership
        return BusinessMembership.objects.filter(
            business=request.business, is_active=True, is_owner=False,
            user__is_superuser=False,
        ).exclude(user=request.user).exclude(user__user_roles__role__code__in=[
            'SUPER_ADMIN', 'SUPPORT_ADMIN', 'BILLING_ADMIN', 'BUSINESS_OWNER',
        ]).select_related('user').order_by('user__first_name', 'user__email').distinct()

    def get(self, request):
        allowed = PermissionService.get_user_permissions(request.user, request.business)
        return Response({'data': [{
            'id': str(member.user_id), 'name': member.user.full_name or member.user.email,
            'email': member.user.email,
            'permissions': sorted(PermissionService.get_user_permissions(member.user, request.business) & allowed),
        } for member in self.members(request)]})

    @transaction.atomic
    def patch(self, request):
        from django.shortcuts import get_object_or_404
        member = get_object_or_404(self.members(request).select_for_update(), user_id=request.data.get('user_id'))
        codes = request.data.get('permissions')
        if not isinstance(codes, list) or not all(isinstance(code, str) for code in codes):
            raise serializers.ValidationError({'permissions': 'Provide a list of permission codes.'})
        allowed = set(PermissionService.tenant_permissions().filter(
            code__in=PermissionService.get_user_permissions(request.user, request.business)
        ).values_list('code', flat=True))
        if not set(codes) <= allowed:
            raise PermissionDenied('Only permissions held in this company can be delegated.')
        existing = PermissionService.get_user_permissions(member.user, request.business)
        member.granted_permissions = sorted((existing - allowed) | set(codes))
        member.save(update_fields=['granted_permissions', 'updated_at'])
        return Response({'data': {'permissions': sorted(set(codes))}})


class UserRoleAssignView(views.APIView):
    """Assign a role to a user in the current business."""
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    required_permissions = ['role.assign']

    def post(self, request):
        serializer = UserRoleAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        business = getattr(request, 'business', None)
        if not business:
            return Response(
                {'success': False, 'error': {'code': 'VALIDATION_ERROR', 'message': 'No business context.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_id = serializer.validated_data['user_id']
        role_id = serializer.validated_data['role_id']
        branch_id = serializer.validated_data.get('branch_id')

        # Validate role exists and is accessible
        try:
            from django.db.models import Q
            role = Role.objects.get(
                Q(is_system=True) | Q(business=business),
                id=role_id,
                is_active=True,
            )
        except Role.DoesNotExist:
            return Response(
                {'success': False, 'error': {'code': 'NOT_FOUND', 'message': 'Role not found.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        validate_assignment(request.user, business, role, branch_id)

        # Validate user is a member of the business
        from apps.businesses.models import BusinessMembership
        if not BusinessMembership.objects.filter(user_id=user_id, business=business, is_active=True).exists():
            return Response(
                {'success': False, 'error': {'code': 'VALIDATION_ERROR', 'message': 'User is not a member of this business.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create or update role assignment
        user_role, created = UserRole.objects.update_or_create(
            user_id=user_id,
            role=role,
            business=business,
            defaults={'branch_id': branch_id},
        )

        # Invalidate permission cache
        PermissionService.invalidate_cache(user_id, business.id)

        return Response(
            {
                'success': True,
                'data': UserRoleSerializer(user_role).data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class PermissionListView(generics.ListAPIView):
    """List all available permissions."""
    serializer_class = PermissionSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    required_permissions = ['role.view']

    def get_queryset(self):
        return PermissionService.tenant_permissions().filter(
            code__in=PermissionService.get_user_permissions(self.request.user, self.request.business)
        )
    filterset_fields = ['module']
    search_fields = ['name', 'code']


class UserPermissionsView(views.APIView):
    """Get the current user's permissions for the active business."""

    def get(self, request):
        business = resolve_business(request)
        if not business:
            return Response({'success': True, 'data': {'roles': [], 'permissions': []}})

        roles = PermissionService.get_user_roles(request.user, business)
        permissions_list = list(PermissionService.get_user_permissions(request.user, business))
        scope = PermissionService.get_user_scope(request.user, business)
        is_branch_scoped = PermissionService.is_branch_scoped(request.user, business)
        accessible_branch_ids = [str(bid) for bid in PermissionService.get_accessible_branch_ids(request.user, business)]

        assigned_branch = None
        from apps.accounts.models import UserRole
        ur = UserRole.objects.filter(user=request.user, business=business, branch__isnull=False).select_related('branch').first()
        if ur and ur.branch:
            assigned_branch = {'id': str(ur.branch.id), 'name': ur.branch.name, 'city': ur.branch.city}
        else:
            from apps.employees.models import Employee
            emp = Employee.objects.filter(user=request.user, business=business, branch__isnull=False).select_related('branch').first()
            if emp and emp.branch:
                assigned_branch = {'id': str(emp.branch.id), 'name': emp.branch.name, 'city': emp.branch.city}

        return Response({
            'success': True,
            'data': {
                'roles': roles,
                'permissions': permissions_list,
                'scope': scope,
                'is_branch_scoped': is_branch_scoped,
                'accessible_branch_ids': accessible_branch_ids,
                'assigned_branch': assigned_branch,
            },
        })


# ─── Invitation Views ───────────────────────────────────────────────────

class InvitationCreateView(views.APIView):
    """Create and send a business invitation."""
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    required_permissions = ['employee.create', 'role.assign']

    def post(self, request):
        serializer = InvitationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        business = getattr(request, 'business', None)
        if not business:
            return Response(
                {'success': False, 'error': {'code': 'VALIDATION_ERROR', 'message': 'No business context.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check for existing pending invitation
        existing = Invitation.objects.filter(
            business=business,
            email=serializer.validated_data['email'],
            status=Invitation.Status.PENDING,
        ).first()
        if existing:
            return Response(
                {'success': False, 'error': {'code': 'VALIDATION_ERROR', 'message': 'An invitation is already pending for this email.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate role
        try:
            role = Role.objects.get(
                id=serializer.validated_data['role_id'],
                is_active=True,
            )
        except Role.DoesNotExist:
            return Response(
                {'success': False, 'error': {'code': 'NOT_FOUND', 'message': 'Role not found.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        validate_assignment(request.user, business, role, serializer.validated_data.get('branch_id'))
        department_id = serializer.validated_data.get('department_id')
        if department_id and not business.departments.filter(id=department_id).exists():
            raise serializers.ValidationError({'department_id': 'Choose a department in this company.'})

        token = AuthService.generate_invitation_token()
        invitation = Invitation.objects.create(
            business=business,
            email=serializer.validated_data['email'],
            phone=serializer.validated_data.get('phone', ''),
            first_name=serializer.validated_data.get('first_name', ''),
            last_name=serializer.validated_data.get('last_name', ''),
            role=role,
            branch_id=serializer.validated_data.get('branch_id'),
            department_id=serializer.validated_data.get('department_id'),
            invited_by=request.user,
            token=token,
            expires_at=timezone.now() + timedelta(days=7),
            message=serializer.validated_data.get('message', ''),
        )

        # TODO: Send invitation email via Celery

        return Response(
            {'success': True, 'data': InvitationSerializer(invitation).data},
            status=status.HTTP_201_CREATED,
        )


class InvitationListView(generics.ListAPIView):
    """List invitations for the current business."""
    serializer_class = InvitationSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    required_permissions = ['role.assign']

    def get_queryset(self):
        business = getattr(self.request, 'business', None)
        if business:
            return Invitation.objects.filter(business=business).select_related(
                'invited_by', 'role', 'business'
            )
        return Invitation.objects.none()


class InvitationAcceptView(views.APIView):
    """Accept an invitation and join the business."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    @transaction.atomic
    def post(self, request):
        serializer = InvitationAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data['token']

        try:
            invitation = Invitation.objects.select_for_update().select_related('business', 'role').get(
                token=token,
                status=Invitation.Status.PENDING,
            )
        except Invitation.DoesNotExist:
            return Response(
                {'success': False, 'error': {'code': 'NOT_FOUND', 'message': 'Invalid or expired invitation.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if invitation.is_expired:
            invitation.status = Invitation.Status.EXPIRED
            invitation.save(update_fields=['status'])
            return Response(
                {'success': False, 'error': {'code': 'EXPIRED', 'message': 'This invitation has expired.'}},
                status=status.HTTP_410_GONE,
            )

        if not invitation.invited_by or not PermissionService.has_permissions(
            invitation.invited_by, invitation.business, ['role.assign', 'employee.create']
        ):
            raise PermissionDenied('The inviter no longer has permission to assign this role.')
        validate_assignment(invitation.invited_by, invitation.business, invitation.role, invitation.branch_id)

        # Create or get user
        user, created = User.objects.get_or_create(
            email=invitation.email,
            defaults={
                'first_name': serializer.validated_data.get('first_name', invitation.first_name),
                'last_name': serializer.validated_data.get('last_name', invitation.last_name),
                'phone': invitation.phone,
            },
        )

        if not created and not user.check_password(serializer.validated_data['password']):
            raise PermissionDenied('Use your existing account password to accept the invitation.')
        if created:
            user.set_password(serializer.validated_data['password'])
            user.save()

        # Create business membership
        from apps.businesses.models import BusinessMembership
        BusinessMembership.objects.get_or_create(
            user=user,
            business=invitation.business,
            defaults={'is_owner': False},
        )

        # Assign role
        UserRole.objects.get_or_create(
            user=user,
            role=invitation.role,
            business=invitation.business,
            defaults={'branch_id': invitation.branch_id},
        )

        # Set active business
        user.active_business = invitation.business
        user.save(update_fields=['active_business'])

        # Update invitation status
        invitation.status = Invitation.Status.ACCEPTED
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=['status', 'accepted_at'])

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                'success': True,
                'data': {
                    'user': UserSerializer(user).data,
                    'tokens': {
                        'access': str(refresh.access_token),
                        'refresh': str(refresh),
                    },
                    'business': {
                        'id': str(invitation.business.id),
                        'name': invitation.business.name,
                    },
                },
            },
            status=status.HTTP_200_OK,
        )
