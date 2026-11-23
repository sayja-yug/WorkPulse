import csv
from datetime import timedelta
from io import StringIO

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, User, UserRole
from apps.attendance.models import AttendanceRecord
from apps.attendance.scope import business_zone
from apps.attendance.services import AttendanceService
from apps.branches.models import Branch
from apps.businesses.models import Business, BusinessMembership
from apps.employees.models import Employee


@pytest.fixture
def workspace(db):
    company = Business.objects.create(name='Report test company')
    owner = User.objects.create_user(email='owner@reports.test', first_name='Owner')
    grants = ['attendance.view_reports', 'employee.view_bank', 'attendance.view', 'attendance.mark']
    for code in grants:
        Permission.objects.get_or_create(code=code, defaults={'name': code, 'module': code.split('.')[0]})
    membership = BusinessMembership.objects.create(user=owner, business=company, is_owner=True, granted_permissions=grants)
    role, _ = Role.objects.get_or_create(code='BUSINESS_OWNER', is_system=True, defaults={'name': 'Owner'})
    UserRole.objects.create(user=owner, business=company, role=role)
    client = APIClient()
    client.force_authenticate(owner)
    client.credentials(HTTP_X_BUSINESS_ID=str(company.pk))
    north, south, empty = [Branch.objects.create(business=company, name=name, code=name) for name in ('North', 'South', 'Empty')]
    today = timezone.localdate(timezone=business_zone(company))
    staff = []
    for code, branch in [('A', north), ('B', north), ('C', south), ('D', south)]:
        staff.append(Employee.objects.create(business=company, employee_code=code, branch=branch, first_name=code, joining_date=today))
    a, b, c, d = staff
    for days in range(12):
        AttendanceRecord.objects.create(business=company, employee=a, date=today - timedelta(days=days), check_in=timezone.now() - timedelta(days=days))
    AttendanceRecord.objects.create(business=company, employee=c, date=today, status='HALF_DAY')
    AttendanceRecord.objects.create(business=company, employee=d, date=today, status='PAID_LEAVE')
    return client, company, membership, north, south, empty, a, today


@pytest.mark.django_db
def test_scoped_rows_totals_and_export(workspace):
    client, company, membership, north, south, empty, employee, today = workspace
    url = '/api/v1/reports/punches/'
    query = {'branch': north.pk, 'page_size': 3}
    page = client.get(url, query).data['data']
    assert len(page['results']) == 3 and page['count'] == 12
    assert page['totals'] == {'active': 2, 'present': 1, 'absent': 1, 'on_leave': 0}
    assert all(row['check_out'] is None for row in page['results'])
    assert client.get('/api/v1/reports/workforce/', {'branch': north.pk, 'group': 'absent'}).data['results'][0]['employee'] == 'B'
    csv_response = client.get(url, {**query, 'download': 'csv', 'page': 3})
    rows = list(csv.DictReader(StringIO(csv_response.content.decode())))
    assert len(rows) == 12 and {r['Employee code'] for r in rows} == {'A'}
    assert all(row['Punch out'] == 'Missing punch' for row in rows)
    pages = [client.get(url, {**query, 'page': n}).data['data']['results'] for n in range(1, 5)]
    assert [(r['Attendance date'], r['Punch in']) for r in rows] == [(str(r['date']), r['check_in']) for page in pages for r in page]
    filtered = {**query, 'date_from': str(today), 'date_to': str(today)}
    assert client.get(url, filtered).data['data']['count'] == 1
    assert len(list(csv.DictReader(StringIO(client.get(url, {**filtered, 'download': 'csv'}).content.decode())))) == 1
    south_page = client.get(url, {'branch': south.pk}).data['data']
    assert south_page['count'] == 2
    assert south_page['totals'] == {'active': 2, 'present': 1, 'absent': 0, 'on_leave': 1}
    assert client.get(url, {'branch': empty.pk}).data['data']['count'] == 0
    assert len(client.get(url, {'branch': empty.pk, 'download': 'csv'}).content.decode().splitlines()) == 1
    employee.status = 'INACTIVE'
    employee.save()
    after = client.get(url, query).data['data']
    assert after['count'] == 12 and after['totals']['active'] == 1 and after['totals']['present'] == 0


@pytest.mark.django_db
def test_direct_bank_report_and_punch_permissions(workspace):
    client, company, membership, north, south, empty, employee, today = workspace
    bank_url = '/api/v1/reports/bank-details/'
    punch_url = '/api/v1/reports/punches/'
    assert client.get(bank_url, {'branch': north.pk}).data['count'] == 2
    hr = User.objects.create_user(email='hr@reports.test', first_name='HR')
    member = BusinessMembership.objects.create(user=hr, business=company, granted_permissions=['attendance.view_reports'])
    role, _ = Role.objects.get_or_create(code='HR_MANAGER', is_system=True, defaults={'name': 'HR'})
    UserRole.objects.create(user=hr, business=company, role=role)
    client.force_authenticate(hr)
    assert client.get(punch_url).status_code == 200
    assert client.get(bank_url).status_code == 403
    assert client.post('/api/v1/attendance/punch-employee/', {'employee_id': employee.pk}).status_code == 403
    foreign = Business.objects.create(name='Second company')
    foreign_branch = Branch.objects.create(business=foreign, name='Outside', code='OUT')
    assert client.get(punch_url, {'branch': foreign_branch.pk}).status_code == 403
    client.credentials(HTTP_X_BUSINESS_ID=str(foreign.pk))
    assert client.get(punch_url, {'download': 'csv'}).status_code == 403
    client.credentials(HTTP_X_BUSINESS_ID=str(company.pk))
    member.granted_permissions = []
    member.save()
    assert client.get(punch_url, {'download': 'csv'}).status_code == 403


@pytest.mark.django_db
def test_missing_punch_and_employment_status(workspace):
    client, company, membership, north, south, empty, employee, today = workspace
    emp = Employee.objects.get(business=company, employee_code='B')
    record = AttendanceService.check_out(emp)
    assert record.check_in is None and record.check_out
    emp.refresh_from_db()
    assert emp.status == 'ACTIVE'
    emp.status = 'INACTIVE'
    emp.deactivated_on = today
    emp.save()
    response = client.post('/api/v1/attendance/punch-employee/', {'employee_id': emp.pk, 'action': 'IN'})
    assert response.status_code == 400
    assert AttendanceRecord.objects.get(pk=record.pk).check_in is None
