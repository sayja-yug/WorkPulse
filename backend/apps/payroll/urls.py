from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SalaryComponentViewSet,
    SalaryTemplateViewSet,
    EmployeeSalaryStructureViewSet,
    PayrollRunViewSet,
    PayslipViewSet,
    SalaryPaymentViewSet
)

router = DefaultRouter()
router.register(r'components', SalaryComponentViewSet, basename='salary-component')
router.register(r'templates', SalaryTemplateViewSet, basename='salary-template')
router.register(r'structures', EmployeeSalaryStructureViewSet, basename='salary-structure')
router.register(r'runs', PayrollRunViewSet, basename='payroll-run')
router.register(r'payslips', PayslipViewSet, basename='payslip')
router.register(r'payments', SalaryPaymentViewSet, basename='salary-payment')

urlpatterns = [
    path('', include(router.urls)),
]

