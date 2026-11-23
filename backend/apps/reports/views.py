import csv
from datetime import timedelta

from django.db.models import Count, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, serializers, views
from rest_framework.response import Response

from apps.accounts.services import PermissionService
from apps.attendance.models import AttendanceRecord
from apps.attendance.scope import business_zone, workforce_scope
from apps.employees.models import Employee
from apps.expenses.models import Expense
from apps.payroll.models import PayrollRun
from common.pagination import SmallResultsSetPagination
from common.permissions import HasPermission, IsBusinessMember, resolve_business


PRESENT = [AttendanceRecord.Status.PRESENT, AttendanceRecord.Status.HALF_DAY]
LEAVE = [AttendanceRecord.Status.PAID_LEAVE, AttendanceRecord.Status.UNPAID_LEAVE]


class ReportFilters(serializers.Serializer):
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)

    def validate(self, attrs):
        if attrs.get('date_from') and attrs.get('date_to') and attrs['date_from'] > attrs['date_to']:
            raise serializers.ValidationError('The start date must be on or before the end date.')
        return attrs


def date_filter(request, records, defaults=None):
    params = dict(defaults or {})
    for key in ('date_from', 'date_to'):
        if request.query_params.get(key):
            params[key] = request.query_params[key]
    filters = ReportFilters(data=params)
    filters.is_valid(raise_exception=True)
    period = filters.validated_data
    if 'date_from' in period:
        records = records.filter(date__gte=period['date_from'])
    if 'date_to' in period:
        records = records.filter(date__lte=period['date_to'])
    return records, period


def today_groups(employees, records, today):
    active = employees.filter(status=Employee.Status.ACTIVE)
    marked = records.filter(date=today)
    present = marked.filter(status__in=PRESENT).values('employee_id')
    leave = marked.filter(status__in=LEAVE).values('employee_id')
    return {
        'active': active, 'present': active.filter(pk__in=present),
        'absent': active.exclude(pk__in=present).exclude(pk__in=leave),
        'on_leave': active.filter(pk__in=leave),
    }


def csv_download(filename, columns, rows):
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}.csv"'
    response['Cache-Control'] = 'private, no-store'
    writer = csv.writer(response)
    writer.writerow(columns)
    for row in rows:
        # Employee-entered text must stay text when opened in a spreadsheet.
        writer.writerow(["'" + value if isinstance(value, str) and value.startswith(('=', '+', '-', '@', '\t', '\r', '\n')) else value for value in row])
    return response


class ReportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsBusinessMember, HasPermission]


class PunchReportView(ReportView):
    required_permissions = ['attendance.view_reports']

    def get(self, request):
        business = resolve_business(request)
        employees, branches = workforce_scope(request, business)
        all_records = AttendanceRecord.objects.filter(business=business, employee__in=employees)
        records, _ = date_filter(request, all_records)
        records = records.select_related('employee').order_by('-date', 'employee__first_name', 'employee__last_name', 'id')
        zone = business_zone(business)

        def row(record):
            def clock(stamp):
                return timezone.localtime(stamp, zone).strftime('%H:%M') if stamp else None
            return {
                'id': record.pk, 'employee': record.employee.full_name,
                'employee_code': record.employee.employee_code, 'date': record.date,
                'check_in': clock(record.check_in), 'check_out': clock(record.check_out),
            }

        if request.query_params.get('download') == 'csv':
            return csv_download('punch-report', ['Employee', 'Employee code', 'Attendance date', 'Punch in', 'Punch out'], (
                (item['employee'], item['employee_code'], item['date'], item['check_in'] or 'Missing punch', item['check_out'] or 'Missing punch')
                for item in map(row, records.iterator())
            ))

        today = timezone.localdate(timezone=zone)
        groups = today_groups(employees, all_records, today)
        trend_start = today - timedelta(days=6)
        daily_counts = dict(all_records.filter(date__range=(trend_start, today), status__in=PRESENT).values('date').annotate(total=Count('pk')).values_list('date', 'total'))
        trend = [{'date': day, 'present': daily_counts.get(day, 0)} for day in (trend_start + timedelta(days=i) for i in range(7))]
        paginator = SmallResultsSetPagination()
        page = paginator.paginate_queryset(records, request)
        return Response({'data': {
            'results': [row(record) for record in page], 'count': paginator.page.paginator.count,
            'branches': list(branches.values('id', 'name')), 'today': today, 'timezone': str(zone),
            'totals': {key: group.count() for key, group in groups.items()}, 'trend': trend,
        }})


class WorkforceReportView(ReportView):
    required_permissions = ['attendance.view_reports']

    def get(self, request):
        business = resolve_business(request)
        employees, _ = workforce_scope(request, business)
        records = AttendanceRecord.objects.filter(business=business, employee__in=employees)
        groups = today_groups(employees, records, timezone.localdate(timezone=business_zone(business)))
        group = serializers.ChoiceField(choices=list(groups)).run_validation(request.query_params.get('group', 'active'))
        employees = groups[group].select_related('branch').order_by('first_name', 'last_name', 'pk')
        paginator = SmallResultsSetPagination()
        page = paginator.paginate_queryset(employees, request)
        return paginator.get_paginated_response([
            {'id': e.pk, 'employee': e.full_name, 'employee_code': e.employee_code, 'branch': e.branch.name if e.branch else ''}
            for e in page
        ])


class BankDetailsReportView(ReportView):
    required_permissions = ['employee.view_bank']

    def get(self, request):
        business = resolve_business(request)
        employees, branches = workforce_scope(request, business)
        if request.query_params.get('branches_only') == 'true':
            return Response({'branches': list(branches.values('id', 'name'))})
        employees = employees.order_by('first_name', 'last_name', 'pk')
        paginator = SmallResultsSetPagination()
        page = paginator.paginate_queryset(employees, request)
        response = paginator.get_paginated_response([{
            'id': e.pk, 'employee': e.full_name, 'employee_code': e.employee_code, 'bank_name': e.bank_name,
            'bank_account_number': e.bank_account_number, 'bank_ifsc_code': e.bank_ifsc_code,
        } for e in page])
        response['Cache-Control'] = 'private, no-store'
        return response


class BusinessOverviewView(ReportView):
    required_permissions = ['report.view']

    def get(self, request):
        business = resolve_business(request)
        employees, branches = workforce_scope(request, business)
        today = timezone.localdate(timezone=business_zone(business))
        records = AttendanceRecord.objects.filter(business=business, employee__in=employees)
        data = {
            'branches_count': branches.count(),
            'departments_count': employees.exclude(department_id=None).values('department_id').distinct().count(),
            'total_employees': employees.count(), 'active_employees': employees.filter(status=Employee.Status.ACTIVE).count(),
        }
        if PermissionService.has_permissions(request.user, business, ['attendance.view_reports']):
            groups = today_groups(employees, records, today)
            data['attendance_today'] = {k: groups[k].count() for k in ('present', 'absent', 'on_leave')}
        # Company finance aggregates are only meaningful for company-wide scope.
        company_wide = request.user.is_superuser or PermissionService.get_user_scope(request.user, business) == 'BUSINESS'
        financials = {}
        if company_wide and not request.query_params.get('branch'):
            if PermissionService.has_permissions(request.user, business, ['payroll.view']):
                latest = PayrollRun.objects.filter(business=business).order_by('-period_start').first()
                financials['monthly_payroll_total'] = latest.total_net if latest else 0
            if PermissionService.has_permissions(request.user, business, ['expense.view']):
                financials['monthly_expenses_total'] = Expense.objects.filter(
                    business=business, date__range=(today.replace(day=1), today),
                ).aggregate(total=Sum('amount'))['total'] or 0
        data['financials'] = financials
        return Response({'success': True, 'data': data})


class AttendanceReportView(ReportView):
    required_permissions = ['attendance.view_reports']

    def get(self, request):
        business = resolve_business(request)
        employees, _ = workforce_scope(request, business)
        today = timezone.localdate(timezone=business_zone(business))
        records, period = date_filter(request, AttendanceRecord.objects.filter(business=business, employee__in=employees), {
            'date_from': today.replace(day=1), 'date_to': today,
        })
        return Response({'success': True, 'data': {
            'period': {'from': period['date_from'], 'to': period['date_to']},
            'summary': list(records.values('status').annotate(count=Count('pk'))),
            'timeline': list(records.values('date', 'status').annotate(count=Count('pk')).order_by('date')),
        }})


class PayrollReportView(ReportView):
    required_permissions = ['payroll.view', 'report.view']

    def get(self, request):
        business = resolve_business(request)
        employees, _ = workforce_scope(request, business)
        runs = PayrollRun.objects.filter(business=business)
        scoped = bool(request.query_params.get('branch')) or (not request.user.is_superuser and PermissionService.get_user_scope(request.user, business) != 'BUSINESS')
        if scoped:
            runs = runs.filter(items__employee__in=employees)
        runs = runs.annotate(headcount=Count('items'), gross=Sum('items__gross_salary'), deductions=Sum('items__total_deductions'), net=Sum('items__net_salary'))
        return Response({'success': True, 'data': [{
            'id': str(run.id), 'name': run.name, 'period_start': run.period_start, 'period_end': run.period_end,
            'status': run.status, 'employee_count': run.headcount,
            'gross': run.gross if scoped else run.total_gross, 'deductions': run.deductions if scoped else run.total_deductions,
            'net': run.net if scoped else run.total_net,
        } for run in runs.order_by('-period_start')[:12]]})
