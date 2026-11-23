from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Permission, User
from apps.attendance.models import AttendanceRecord
from apps.attendance.scope import business_zone
from apps.businesses.models import Business, BusinessMembership
from apps.employees.models import Employee


@pytest.mark.django_db
def test_personal_overview_uses_account_company_and_grants():
    company = Business.objects.create(name='Company')
    other = Business.objects.create(name='Other', slug='other')
    user = User.objects.create_user(email='personal@example.test', first_name='Employee')
    Permission.objects.get_or_create(code='attendance.view', defaults={'name': 'View attendance', 'module': 'attendance'})
    membership = BusinessMembership.objects.create(business=company, user=user, granted_permissions=['attendance.view'])
    today = timezone.localdate(timezone=business_zone(company))
    mine = Employee.objects.create(business=company, user=user, employee_code='SELF', first_name='Me', joining_date=today)
    colleague = Employee.objects.create(business=company, employee_code='OTHER', first_name='Another', joining_date=today)
    AttendanceRecord.objects.create(employee=colleague, business=company, date=today)
    client = APIClient()
    client.force_authenticate(user)
    url = '/api/v1/reports/me/'
    headers = {'HTTP_X_BUSINESS_ID': str(company.pk)}
    empty = client.get(url, {'employee': colleague.pk}, **headers).data['data']
    assert empty['attendance'] == {'current': None, 'recent': []}
    assert {'payslip', 'leave', 'shift'}.isdisjoint(empty)
    for days in (2, 1):
        record = AttendanceRecord.objects.create(employee=mine, business=company, date=today - timedelta(days=days), check_in=timezone.now() - timedelta(days=days))
        current = client.get(url, **headers).data['data']['attendance']['current']
        if days == 2:
            assert current is None
        else:
            assert current['date'] == record.date
    assert client.get(url, HTTP_X_BUSINESS_ID=str(other.pk)).status_code == 403
    membership.granted_permissions = []
    membership.save()
    assert 'attendance' not in client.get(url, **headers).data['data']
    mine.user = None
    mine.save()
    assert client.get(url, **headers).data['data']['linked'] is False
