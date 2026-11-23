from datetime import date

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, User, UserRole
from apps.attendance.models import AttendanceRecord
from apps.businesses.models import Business, BusinessMembership
from apps.employees.models import Employee, EmploymentHistory
from apps.employees.services import business_today, completed_tenure
from apps.payroll.models import PayrollItem, PayrollRun


@pytest.mark.parametrize(('joined', 'as_of', 'tenure'), [
    (date(2025, 1, 31), date(2025, 2, 27), '0 months'),
    (date(2025, 1, 31), date(2025, 2, 28), '1 month'),
    (date(2024, 2, 29), date(2025, 2, 28), '1 year'),
    (date(2024, 6, 20), date(2025, 11, 20), '1 year 5 months'),
    (date(2024, 6, 20), date(2025, 11, 19), '1 year 4 months'),
])
def test_completed_calendar_tenure(joined, as_of, tenure):
    assert completed_tenure(joined, as_of) == tenure


@pytest.mark.django_db
def test_edit_deactivate_and_retain_employment_history():
    business = Business.objects.create(name='Lifecycle test')
    owner = User.objects.create_user(email='owner@example.test', first_name='Sonal', last_name='Singh')
    grants = ['employee.view', 'employee.update', 'employee.deactivate']
    for code in grants:
        Permission.objects.get_or_create(code=code, defaults={'name': code, 'module': 'employees'})
    BusinessMembership.objects.create(business=business, user=owner, is_owner=True, granted_permissions=grants)
    role, _ = Role.objects.get_or_create(code='BUSINESS_OWNER', is_system=True, defaults={'name': 'Owner'})
    UserRole.objects.create(business=business, user=owner, role=role)
    current = Employee.objects.create(business=business, first_name='Current', employee_code='1', joining_date=date(2025, 1, 1))
    employee = Employee.objects.create(business=business, first_name='Before', employee_code='2', joining_date=date(2025, 1, 1))
    attendance = AttendanceRecord.objects.create(business=business, employee=employee, date=date(2025, 2, 1), status='PRESENT')
    payroll = PayrollRun.objects.create(business=business, name='February', period_start=date(2025, 2, 1), period_end=date(2025, 2, 28))
    item = PayrollItem.objects.create(payroll_run=payroll, employee=employee)

    client = APIClient()
    client.force_authenticate(user=owner)
    client.credentials(HTTP_X_BUSINESS_ID=str(business.pk))
    url = f'/api/v1/employees/{employee.pk}/'
    assert client.patch(url, {'first_name': 'After'}, format='json').status_code == 200
    assert client.get(url).json()['first_name'] == 'After'
    assert client.delete(url).status_code == 405
    assert client.post(url + 'deactivate/').status_code == 200
    assert client.post(url + 'deactivate/').status_code == 200
    assert client.get('/api/v1/employees/?page_size=1').json()['results'][0]['id'] == str(current.pk)
    last = client.get('/api/v1/employees/?page_size=1&page=2').json()['results'][0]
    assert (last['id'], last['deactivated_by_name'], last['deactivated_on']) == (
        str(employee.pk), 'Sonal Singh', business_today(business).isoformat(),
    )
    assert Employee.objects.filter(business=business, status='ACTIVE').count() == 1
    assert attendance.employee_id == AttendanceRecord.objects.get(pk=attendance.pk).employee_id
    assert PayrollItem.objects.get(pk=item.pk).employee_id == employee.pk
    event = employee.history.get(change_type=EmploymentHistory.ChangeType.STATUS_CHANGED)
    assert event.changed_by_id == owner.pk
    assert event.from_value['status'] == 'ACTIVE'
    assert event.to_value['status'] == 'INACTIVE'
    assert client.post(url + 'activate/').status_code == 200
    employee.refresh_from_db()
    assert employee.status == 'ACTIVE' and employee.deactivated_on is None
    assert employee.history.count() == 2
