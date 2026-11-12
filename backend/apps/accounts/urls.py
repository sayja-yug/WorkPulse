"""URL configuration for the accounts app."""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

app_name = 'accounts'

urlpatterns = [
    # Authentication
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('password/forgot/', views.ForgotPasswordView.as_view(), name='forgot-password'),
    path('password/reset/', views.ResetPasswordView.as_view(), name='reset-password'),
    path('password/change/', views.ChangePasswordView.as_view(), name='change-password'),

    # Profile
    path('me/', views.ProfileView.as_view(), name='profile'),
    path('me/verify/', views.VerifyAccountView.as_view(), name='verify-account'),
    path('me/avatar/', views.ProfileAvatarView.as_view(), name='profile-avatar'),
    path('me/businesses/', views.UserBusinessesView.as_view(), name='user-businesses'),
    path('me/switch-business/', views.SwitchBusinessView.as_view(), name='switch-business'),
    path('me/permissions/', views.UserPermissionsView.as_view(), name='user-permissions'),

    # Roles & Permissions
    path('roles/', views.RoleListView.as_view(), name='role-list'),
    path('roles/create/', views.RoleCreateView.as_view(), name='role-create'),
    path('roles/<uuid:pk>/', views.RoleDetailView.as_view(), name='role-detail'),
    path('roles/assign/', views.UserRoleAssignView.as_view(), name='role-assign'),
    path('permissions/', views.PermissionListView.as_view(), name='permission-list'),

    # Invitations
    path('invitations/', views.InvitationListView.as_view(), name='invitation-list'),
    path('invitations/create/', views.InvitationCreateView.as_view(), name='invitation-create'),
    path('invitations/accept/', views.InvitationAcceptView.as_view(), name='invitation-accept'),
]

