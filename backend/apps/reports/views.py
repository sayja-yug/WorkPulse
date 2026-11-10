from decimal import Decimal
from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework import views, permissions, status
from rest_framework.response import Response
from apps.employees.models import Employee
from apps.branches.models import Branch, Department
from apps.attendance.models import AttendanceRecord
from apps.leaves.models import LeaveRequest
from apps.payroll.models import PayrollRun
from apps.expenses.models import Expense
from apps.expenses.services import CashbookService


class BusinessOverviewView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        business = getattr(request, 'business', None)
        if not business:
            return Response({'success': False, 'error': {'message': 'No business context selected.'}}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.now().date()

        # Employee counts
        total_employees = Employee.objects.filter(business=business).count()
        active_employees = Employee.objects.filter(business=business, status=Employee.Status.ACTIVE).count()

        # Today's attendance
        today_att = AttendanceRecord.objects.filter(business=business, date=today)
        present_count = today_att.filter(status=AttendanceRecord.Status.PRESENT).count()
        absent_count = today_att.filter(status=AttendanceRecord.Status.ABSENT).count()
        half_day_count = today_att.filter(status=AttendanceRecord.Status.HALF_DAY).count()
        leave_count = today_att.filter(status__in=[AttendanceRecord.Status.PAID_LEAVE, AttendanceRecord.Status.UNPAID_LEAVE]).count()

        # Pending approvals
        pending_leaves = LeaveRequest.objects.filter(business=business, status=LeaveRequest.Status.PENDING).count()

        # Financial overview (Current Month)
        cur_month_start = today.replace(day=1)
        latest_payroll = PayrollRun.objects.filter(business=business).order_by('-period_start').first()
        monthly_payroll_total = str(latest_payroll.total_net) if latest_payroll else '0.00'

        monthly_expenses = Expense.objects.filter(
            business=business,
            date__gte=cur_month_start
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        cash_balance = CashbookService.get_current_balance(business)

        return Response({
            'success': True,
            'data': {
                'total_employees': total_employees,
                'active_employees': active_employees,
                'branches_count': Branch.objects.filter(business=business, is_active=True).count(),
                'departments_count': Department.objects.filter(business=business, is_active=True).count(),
                'attendance_today': {
                    'present': present_count,
                    'absent': absent_count,
                    'half_day': half_day_count,
                    'on_leave': leave_count,
                    'attendance_percentage': f'{(present_count / active_employees * 100):.1f}%' if active_employees > 0 else '0%'
                },
                'pending_leaves_count': pending_leaves,
                'financials': {
                    'monthly_payroll_total': monthly_payroll_total,
                    'monthly_expenses_total': str(monthly_expenses),
                    'cash_balance': str(cash_balance)
                }
            }
        })


class AttendanceReportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        business = getattr(request, 'business', None)
        date_from = request.query_params.get('date_from', str(timezone.now().date().replace(day=1)))
        date_to = request.query_params.get('date_to', str(timezone.now().date()))

        records = AttendanceRecord.objects.filter(
            business=business,
            date__gte=date_from,
            date__lte=date_to
        ).values('status').annotate(count=Count('id'))

        by_date = AttendanceRecord.objects.filter(
            business=business,
            date__gte=date_from,
            date__lte=date_to
        ).values('date', 'status').annotate(count=Count('id')).order_by('date')

        return Response({
            'success': True,
            'data': {
                'period': {'from': date_from, 'to': date_to},
                'summary': list(records),
                'timeline': list(by_date)
            }
        })


class PayrollReportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        business = getattr(request, 'business', None)
        runs = PayrollRun.objects.filter(business=business).order_by('-period_start')[:12]
        data = [
            {
                'id': str(run.id),
                'name': run.name,
                'period_start': str(run.period_start),
                'period_end': str(run.period_end),
                'status': run.status,
                'gross': str(run.total_gross),
                'deductions': str(run.total_deductions),
                'net': str(run.total_net),
                'employee_count': run.items.count()
            }
            for run in runs
        ]
        return Response({'success': True, 'data': data})
