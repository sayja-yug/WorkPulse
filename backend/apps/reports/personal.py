"""Personal dashboard data for the signed-in employee in the selected company."""
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.services import PermissionService
from apps.attendance.models import AttendanceRecord
from apps.attendance.scope import business_zone
from apps.employees.models import Employee
from common.permissions import IsBusinessMember


class PersonalOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsBusinessMember]

    def get(self, request):
        business = request.business
        employee = Employee.objects.filter(business=business, user=request.user).select_related('branch').first()
        zone = business_zone(business)
        today = timezone.localdate(timezone=zone)
        data = {'linked': bool(employee), 'today': today, 'timezone': str(zone)}
        if employee:
            grants = PermissionService.get_user_permissions(request.user, business)
            data['branch'] = employee.branch.name if employee.branch else ''
            data['can_punch'] = 'attendance.mark_own' in grants and not employee.deactivated_on
            if grants & {'attendance.view', 'attendance.mark_own'}:
                records = AttendanceRecord.objects.filter(employee=employee, business=business, date__lte=today)
                recent = list(records.order_by('-date')[:6])
                latest = recent[0] if recent else None
                current = None
                if latest and (latest.date == today or (
                    latest.date == today - timedelta(days=1) and latest.check_in and not latest.check_out
                )):
                    current = latest

                def punch_row(record):
                    return {
                        'date': record.date, 'status': record.get_status_display(),
                        'in': record.check_in, 'out': record.check_out,
                        'hours': record.working_hours if record.check_in and record.check_out else None,
                    }

                data['attendance'] = {
                    'current': punch_row(current) if current else None,
                    'recent': [punch_row(record) for record in recent],
                }
            if 'shift.view' in grants:
                assignment = employee.shift_assignments.filter(
                    shift__business=business, shift__is_active=True, effective_from__lte=today,
                ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=today)).select_related('shift').order_by('-effective_from', '-created_at').first()
                shift = assignment.shift if assignment else None
                data['shift'] = {
                    'name': shift.name, 'start': shift.start_time, 'end': shift.end_time,
                    'overnight': shift.is_overnight, 'type': shift.get_type_display(),
                } if shift else None
            if 'leave.view' in grants:
                balances = employee.leave_balances.filter(year=today.year, leave_type__business=business).select_related('leave_type').order_by('leave_type__name')
                data['leave'] = [{'name': item.leave_type.name, 'available': item.available} for item in balances]
            if grants & {'payroll.view_own', 'payroll.view'}:
                slip = employee.payslips.filter(business=business).order_by('-generated_at').first()
                data['payslip'] = {'period': slip.period_display, 'number': slip.payslip_number} if slip else None
        return Response({'data': data}, headers={'Cache-Control': 'private, no-store'})
