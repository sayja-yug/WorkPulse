"""Employee and branch boundaries used by attendance registers and reports."""
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from apps.accounts.services import PermissionService
from apps.branches.models import Branch
from apps.employees.models import Employee


def business_zone(business):
    try:
        return ZoneInfo(business.timezone)
    except (KeyError, ValueError, ZoneInfoNotFoundError):
        return timezone.get_default_timezone()


def workforce_scope(request, business):
    employees = Employee.objects.filter(business=business)
    branches = Branch.objects.filter(business=business)
    if not request.user.is_superuser:
        scope = PermissionService.get_user_scope(request.user, business)
        if scope == 'BRANCH':
            branch_ids = PermissionService.get_accessible_branch_ids(request.user, business)
            employees = employees.filter(branch_id__in=branch_ids)
            branches = branches.filter(pk__in=branch_ids)
        elif scope in ('TEAM', 'OWN', 'DEPARTMENT'):
            own = Q(user=request.user)
            employees = employees.filter(own | Q(reporting_manager__user=request.user)) if scope == 'TEAM' else employees.filter(own)
            branches = branches.filter(pk__in=employees.values('branch_id'))

    selected = request.query_params.get('branch')
    if selected:
        branch_id = serializers.UUIDField().run_validation(selected)
        if not branches.filter(pk=branch_id).exists():
            raise PermissionDenied('This branch is unavailable in your workspace.')
        employees = employees.filter(branch_id=branch_id)
    return employees, branches.order_by('name', 'pk')
