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


def get_business_context(request):
    """Safely resolve active business from request, headers, or authenticated user."""
    business = getattr(request, 'business', None)
    if not business:
        business_id = request.headers.get('X-Business-ID') or request.META.get('HTTP_X_BUSINESS_ID')
        if business_id:
            from apps.businesses.models import Business
            business = Business.objects.filter(id=business_id).first()
        elif getattr(request.user, 'active_business', None):
            business = request.user.active_business
        elif getattr(request.user, 'is_authenticated', False):
            from apps.businesses.models import BusinessMembership
            membership = BusinessMembership.objects.filter(user=request.user, is_active=True).first()
            if membership:
                business = membership.business
    return business


class BusinessOverviewView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        business = get_business_context(request)
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
        late_count = today_att.filter(is_late=True).count()

        # Employment type breakdown
        emp_types_qs = Employee.objects.filter(business=business, status=Employee.Status.ACTIVE).values('employment_type').annotate(count=Count('id'))
        employment_types = {item['employment_type']: item['count'] for item in emp_types_qs}

        # Leave distribution
        leave_dist_qs = LeaveRequest.objects.filter(business=business).values('leave_type__name').annotate(count=Count('id'))
        leave_distribution = [{'name': item['leave_type__name'] or 'Leave', 'count': item['count']} for item in leave_dist_qs]

        # Branch statistics
        branches_qs = Branch.objects.filter(business=business, is_active=True).annotate(
            employee_count=Count('employees')
        )
        branch_stats = [
            {'id': str(b.id), 'name': b.name, 'city': b.city, 'employee_count': b.employee_count}
            for b in branches_qs
        ]

        # Recent activity feed
        recent_activity = []
        for lr in LeaveRequest.objects.filter(business=business).select_related('employee', 'leave_type').order_by('-created_at')[:3]:
            recent_activity.append({
                'id': f'leave-{lr.id}',
                'title': f'Leave Request: {lr.employee.full_name}',
                'subtitle': f'{lr.leave_type.name if lr.leave_type else "Leave"} ({lr.status})',
                'link': '/leaves',
                'date': str(lr.start_date),
            })
        for exp in Expense.objects.filter(business=business).order_by('-created_at')[:2]:
            recent_activity.append({
                'id': f'exp-{exp.id}',
                'title': f'Expense: {exp.description}',
                'subtitle': f'₹{exp.amount} ({exp.status})',
                'link': '/expenses',
                'date': str(exp.date),
            })
        for att in AttendanceRecord.objects.filter(business=business).select_related('employee').order_by('-updated_at')[:3]:
            recent_activity.append({
                'id': f'att-{att.id}',
                'title': f'Punch: {att.employee.full_name}',
                'subtitle': f'{att.date} • {att.working_hours or 0} hrs',
                'link': '/attendance',
                'date': str(att.date),
            })

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
                'branches_count': branches_qs.count(),
                'departments_count': Department.objects.filter(business=business, is_active=True).count(),
                'attendance_today': {
                    'present': present_count,
                    'absent': absent_count,
                    'half_day': half_day_count,
                    'on_leave': leave_count,
                    'late': late_count,
                    'attendance_percentage': f'{(present_count / active_employees * 100):.1f}%' if active_employees > 0 else '0%'
                },
                'employment_types': employment_types,
                'leave_distribution': leave_distribution,
                'branch_stats': branch_stats,
                'recent_activity': recent_activity[:6],
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
        business = get_business_context(request)
        if not business:
            return Response({'success': False, 'error': {'message': 'No business context selected.'}}, status=status.HTTP_400_BAD_REQUEST)
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
        business = get_business_context(request)
        if not business:
            return Response({'success': False, 'error': {'message': 'No business context selected.'}}, status=status.HTTP_400_BAD_REQUEST)
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

