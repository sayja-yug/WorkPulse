from django.urls import path
from .personal import PersonalOverviewView
from .views import (
    AttendanceReportView, BankDetailsReportView, BusinessOverviewView,
    PayrollReportView, PunchReportView, WorkforceReportView,
)

urlpatterns = [
    path('me/', PersonalOverviewView.as_view(), name='personal-overview'),
    path('overview/', BusinessOverviewView.as_view(), name='report-overview'),
    path('attendance/', AttendanceReportView.as_view(), name='report-attendance'),
    path('punches/', PunchReportView.as_view(), name='report-punches'),
    path('workforce/', WorkforceReportView.as_view(), name='report-workforce'),
    path('bank-details/', BankDetailsReportView.as_view(), name='report-bank-details'),
    path('payroll/', PayrollReportView.as_view(), name='report-payroll'),
]
