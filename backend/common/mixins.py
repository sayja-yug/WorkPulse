"""Reusable mixins for tenant-scoped views."""
from rest_framework import status
from rest_framework.response import Response

from common.permissions import IsBusinessMember, TenantAccessPermission


class TenantQuerySetMixin:
    """Automatically filter querysets by the current business.

    All tenant-scoped viewsets should use this mixin.
    """

    def get_queryset(self):
        qs = super().get_queryset()
        business = getattr(self.request, 'business', None)
        if not business:
            business_id = self.request.headers.get('X-Business-ID') or self.request.META.get('HTTP_X_BUSINESS_ID')
            if business_id:
                from apps.businesses.models import Business
                business = Business.objects.filter(id=business_id).first()
                if business:
                    self.request.business = business
            elif getattr(self.request.user, 'active_business', None):
                business = self.request.user.active_business
                self.request.business = business

        if business and not self.request.user.is_superuser:
            qs = qs.filter(business=business)
        return qs


class TenantCreateMixin:
    """Automatically set business on creation for tenant-scoped objects."""

    def perform_create(self, serializer):
        business = getattr(self.request, 'business', None)
        if not business:
            business_id = self.request.headers.get('X-Business-ID') or self.request.META.get('HTTP_X_BUSINESS_ID')
            if business_id:
                from apps.businesses.models import Business
                business = Business.objects.filter(id=business_id).first()
            elif getattr(self.request.user, 'active_business', None):
                business = self.request.user.active_business
        if business:
            serializer.save(business=business)
        else:
            serializer.save()


class TenantViewSetMixin(TenantQuerySetMixin, TenantCreateMixin):
    """Combined tenant mixin for standard viewsets."""

    def get_permissions(self):
        permissions = super().get_permissions()
        permissions.append(IsBusinessMember())
        permissions.append(TenantAccessPermission())
        return permissions


class SuccessResponseMixin:
    """Wrap successful responses in a consistent format."""

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        if (
            hasattr(response, 'data')
            and response.status_code < 400
            and not isinstance(response.data, dict)
            or (isinstance(response.data, dict) and 'success' not in response.data)
        ):
            if response.status_code == status.HTTP_204_NO_CONTENT:
                return response
            response.data = {
                'success': True,
                'data': response.data,
            }
        return response

