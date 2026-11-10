from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from apps.attendance.models import AttendanceRecord
from .models import LeaveBalance, LeaveRequest, LeaveApproval, LeaveTransaction


class LeaveService:
    @classmethod
    @transaction.atomic
    def apply_leave(cls, employee, leave_type, start_date, end_date, days, reason, is_half_day=False, emergency_contact=''):
        business = employee.business
        req = LeaveRequest.objects.create(
            business=business,
            employee=employee,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            days=Decimal(str(days)),
            is_half_day=is_half_day,
            reason=reason,
            emergency_contact=emergency_contact,
            status=LeaveRequest.Status.PENDING
        )
        return req

    @classmethod
    @transaction.atomic
    def approve_leave(cls, leave_request, approver, comments=''):
        leave_request.status = LeaveRequest.Status.APPROVED
        leave_request.save(update_fields=['status'])

        LeaveApproval.objects.create(
            request=leave_request,
            approver=approver,
            action=LeaveApproval.Action.APPROVED,
            comments=comments
        )

        # Update Leave Balance
        year = leave_request.start_date.year
        bal, _ = LeaveBalance.objects.get_or_create(
            employee=leave_request.employee,
            leave_type=leave_request.leave_type,
            year=year,
            defaults={'allocated': Decimal('12.0')}
        )
        bal.used += leave_request.days
        bal.save(update_fields=['used', 'updated_at'])

        # Record Transaction
        LeaveTransaction.objects.create(
            employee=leave_request.employee,
            leave_type=leave_request.leave_type,
            transaction_type=LeaveTransaction.TxType.USED,
            days=leave_request.days,
            balance_after=bal.available,
            reference_id=leave_request.id,
            notes='Leave request approved'
        )

        # Sync with Attendance Records
        cur_date = leave_request.start_date
        while cur_date <= leave_request.end_date:
            att_status = (
                AttendanceRecord.Status.PAID_LEAVE
                if leave_request.leave_type.is_paid
                else AttendanceRecord.Status.UNPAID_LEAVE
            )
            AttendanceRecord.objects.update_or_create(
                employee=leave_request.employee,
                date=cur_date,
                defaults={
                    'business': leave_request.business,
                    'status': att_status,
                    'notes': f'Leave: {leave_request.leave_type.name}'
                }
            )
            cur_date += timezone.timedelta(days=1)

        return leave_request

    @classmethod
    @transaction.atomic
    def reject_leave(cls, leave_request, approver, comments=''):
        leave_request.status = LeaveRequest.Status.REJECTED
        leave_request.save(update_fields=['status'])

        LeaveApproval.objects.create(
            request=leave_request,
            approver=approver,
            action=LeaveApproval.Action.REJECTED,
            comments=comments
        )
        return leave_request
