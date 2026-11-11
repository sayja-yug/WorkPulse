from django.urls import path
from .views import BusinessOverviewView, AttendanceReportView, PayrollReportView

urlpatterns = [
    path('overview/', BusinessOverviewView.as_view(), name='report-overview'),
    path('attendance/', AttendanceReportView.as_view(), name='report-attendance'),
    path('payroll/', PayrollReportView.as_view(), name='report-payroll'),
]

