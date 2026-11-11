import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.accounts.models import User, Role, UserRole
from apps.businesses.models import Business, BusinessMembership
from apps.employees.models import Employee


@pytest.mark.django_db
class TestTenantIsolation:
    def setup_method(self):
        self.client = APIClient()

        # Business A & Owner
        self.user_a = User.objects.create_user(
            email='owner_a@businessa.com',
            password='TestPassword123!',
            first_name='Owner',
            last_name='A'
        )
        self.biz_a = Business.objects.create(name='Business A', slug='biz-a')
        BusinessMembership.objects.create(user=self.user_a, business=self.biz_a, is_owner=True)
        self.emp_a = Employee.objects.create(
            business=self.biz_a,
            employee_code='WP-0001',
            first_name='John',
            last_name='Doe',
            joining_date='2025-01-01'
        )

        # Business B & Owner
        self.user_b = User.objects.create_user(
            email='owner_b@businessb.com',
            password='TestPassword123!',
            first_name='Owner',
            last_name='B'
        )
        self.biz_b = Business.objects.create(name='Business B', slug='biz-b')
        BusinessMembership.objects.create(user=self.user_b, business=self.biz_b, is_owner=True)
        self.emp_b = Employee.objects.create(
            business=self.biz_b,
            employee_code='WP-0002',
            first_name='Jane',
            last_name='Smith',
            joining_date='2025-01-01'
        )

    def test_business_a_cannot_view_business_b_employees(self):
        """Verify that user in Business A only sees Business A employees."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(
            '/api/v1/employees/',
            HTTP_X_BUSINESS_ID=str(self.biz_a.id)
        )
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        if isinstance(results, dict) and 'data' in results:
            results = results['data']
        # If paginated:
        if isinstance(results, dict) and 'results' in results:
            results = results['results']

        emp_codes = [e['employee_code'] for e in results]
        assert 'WP-0001' in emp_codes
        assert 'WP-0002' not in emp_codes

    def test_cross_tenant_idor_lookup_fails(self):
        """User A querying Employee B via direct ID must return 404 Not Found."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(
            f'/api/v1/employees/{self.emp_b.id}/',
            HTTP_X_BUSINESS_ID=str(self.biz_a.id)
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

