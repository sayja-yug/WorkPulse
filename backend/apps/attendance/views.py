from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, permissions, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from common.mixins import TenantViewSetMixin
from common.permissions import HasPermission, resolve_business
from .scope import workforce_scope, business_zone
from apps.employees.models import Employee
from .models import AttendanceRecord, AttendanceCorrection, Holiday, OvertimeRecord
from .serializers import (
    AttendanceRecordSerializer,
    CheckInPunchSerializer,
    AttendanceCorrectionSerializer,
    HolidaySerializer,
    OvertimeRecordSerializer
)
from .services import AttendanceService


def get_or_link_employee(user, business):
    employees = Employee.objects.filter(business=business)
    employee = employees.filter(user=user).first()
    if not employee and user.email:
        employee = employees.filter(email__iexact=user.email, user__isnull=True).first()
        if employee:
            employee.user = user
            employee.save(update_fields=['user', 'updated_at'])
    return employee


class AttendanceViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    permission_map = {
        'read': ['attendance.view'], 'write': ['attendance.mark'], 'daily_summary': ['attendance.view_reports'],
    }
    queryset = AttendanceRecord.objects.select_related('employee', 'shift').prefetch_related('punches').all().order_by('-date', '-check_in')
    filterset_fields = ['employee', 'date', 'status', 'is_late', 'source']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_code']

    def get_queryset(self):
        employees, _ = workforce_scope(self.request, self.request.business)
        if self.request.query_params.get('own') == 'true':
            employees = employees.filter(user=self.request.user)
        return super().get_queryset().filter(employee__in=employees).order_by('-date', '-check_in', 'pk')

    def _selected_employee(self, request):
        employees, _ = workforce_scope(request, request.business)
        employee_id = serializers.UUIDField().run_validation(request.data.get('employee_id'))
        return get_object_or_404(employees, pk=employee_id)

    def get_serializer(self, *args, **kwargs):
        serializer = super().get_serializer(*args, **kwargs)
        if not kwargs.get('many') and self.request.method not in permissions.SAFE_METHODS:
            employees, _ = workforce_scope(self.request, self.request.business)
            serializer.fields['employee'].queryset = employees
            serializer.fields['shift'].queryset = serializer.fields['shift'].queryset.filter(business=self.request.business)
        return serializer

    @action(detail=False, methods=['post'], url_path='mark-manual')
    def mark_manual(self, request):
        business = request.business
        employee = self._selected_employee(request)
        date_val = request.data.get('date', timezone.localdate(timezone=business_zone(business)))
        date_obj = serializers.DateField().run_validation(date_val)
        att_status = serializers.ChoiceField(choices=AttendanceRecord.Status.choices).run_validation(
            request.data.get('status', AttendanceRecord.Status.PRESENT)
        )
        if employee.deactivated_on and date_obj >= employee.deactivated_on:
            raise ValidationError('This employee has been deactivated.')
        notes = request.data.get('notes', '')

        record, _ = AttendanceRecord.objects.update_or_create(
            employee=employee,
            date=date_obj,
            defaults={
                'business': business,
                'status': att_status,
                'notes': notes,
                'source': AttendanceRecord.Source.MANUAL,
                'marked_by': request.user
            }
        )
        return Response({'success': True, 'data': AttendanceRecordSerializer(record).data})

    @action(detail=False, methods=['post'], url_path='punch-employee')
    def punch_employee(self, request):
        """Allows HR/Manager to punch in (IN) or punch out (OUT) for any employee."""
        employee = self._selected_employee(request)
        punch_action = serializers.ChoiceField(choices=['IN', 'OUT']).run_validation(
            str(request.data.get('action', 'IN')).upper()
        )
        if punch_action == 'OUT':
            record = AttendanceService.check_out(
                employee=employee,
                ip_address=request.META.get('REMOTE_ADDR'),
            )
        else:
            record = AttendanceService.check_in(
                employee=employee,
                ip_address=request.META.get('REMOTE_ADDR'),
            )
        return Response({'success': True, 'data': AttendanceRecordSerializer(record).data})

    @action(detail=False, methods=['get'], url_path='daily')
    def daily_summary(self, request):
        date_val = serializers.DateField().run_validation(request.query_params.get(
            'date', timezone.localdate(timezone=business_zone(request.business))
        ))
        records = self.get_queryset().filter(date=date_val)
        summary = {
            'date': date_val, 'present': records.filter(status='PRESENT').count(),
            'absent': records.filter(status='ABSENT').count(), 'half_day': records.filter(status='HALF_DAY').count(),
            'leave': records.filter(status__in=['PAID_LEAVE', 'UNPAID_LEAVE']).count(), 'total_marked': records.count(),
        }
        return Response({'success': True, 'data': summary})


class CheckInView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    required_permissions = ['attendance.mark_own']

    def post(self, request):
        serializer = CheckInPunchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        business = resolve_business(request)
        employee = get_or_link_employee(request.user, business)
        if not employee:
            return Response(
                {'success': False, 'error': {'code': 'NOT_FOUND', 'message': 'No employee profile linked to user.'}},
                status=status.HTTP_404_NOT_FOUND
            )

        record = AttendanceService.check_in(
            employee=employee,
            latitude=serializer.validated_data.get('latitude'),
            longitude=serializer.validated_data.get('longitude'),
            accuracy=serializer.validated_data.get('accuracy'),
            selfie=serializer.validated_data.get('selfie'),
            device_info=serializer.validated_data.get('device_info'),
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({'success': True, 'data': AttendanceRecordSerializer(record).data}, status=status.HTTP_201_CREATED)


class CheckOutView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    required_permissions = ['attendance.mark_own']

    def post(self, request):
        serializer = CheckInPunchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        business = resolve_business(request)
        employee = get_or_link_employee(request.user, business)
        if not employee:
            return Response(
                {'success': False, 'error': {'code': 'NOT_FOUND', 'message': 'No employee profile linked to user.'}},
                status=status.HTTP_404_NOT_FOUND
            )

        record = AttendanceService.check_out(
            employee=employee,
            latitude=serializer.validated_data.get('latitude'),
            longitude=serializer.validated_data.get('longitude'),
            accuracy=serializer.validated_data.get('accuracy'),
            selfie=serializer.validated_data.get('selfie'),
            device_info=serializer.validated_data.get('device_info'),
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({'success': True, 'data': AttendanceRecordSerializer(record).data}, status=status.HTTP_200_OK)


class AttendanceCorrectionViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceCorrectionSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    permission_map = {
        'read': ['attendance.view'], 'create': ['attendance.correct'], 'approve': ['attendance.approve'],
        'write': ['attendance.approve'],
    }

    def get_queryset(self):
        employees, _ = workforce_scope(self.request, self.request.business)
        return AttendanceCorrection.objects.filter(attendance__business=self.request.business, attendance__employee__in=employees)

    def get_serializer(self, *args, **kwargs):
        serializer = super().get_serializer(*args, **kwargs)
        if not kwargs.get('many') and self.request.method not in permissions.SAFE_METHODS:
            employees, _ = workforce_scope(self.request, self.request.business)
            serializer.fields['attendance'].queryset = AttendanceRecord.objects.filter(business=self.request.business, employee__in=employees)
        return serializer

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        corr = self.get_object()
        corr.status = AttendanceCorrection.Status.APPROVED
        corr.reviewed_by = request.user
        corr.reviewed_at = timezone.now()
        corr.save()

        # Update attendance
        att = corr.attendance
        att.status = corr.corrected_status
        if corr.corrected_check_in:
            att.check_in = corr.corrected_check_in
        if corr.corrected_check_out:
            att.check_out = corr.corrected_check_out
        att.save()

        return Response({'success': True, 'data': AttendanceCorrectionSerializer(corr).data})


class HolidayViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = HolidaySerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    permission_map = {'read': ['attendance.view'], 'write': ['attendance.mark']}
    queryset = Holiday.objects.all()
    filterset_fields = ['is_active', 'type']


class OvertimeRecordViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = OvertimeRecordSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    permission_map = {'read': ['attendance.view'], 'write': ['attendance.approve']}
    queryset = OvertimeRecord.objects.all()
    filterset_fields = ['status']

