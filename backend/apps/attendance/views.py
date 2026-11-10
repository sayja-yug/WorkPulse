from django.utils import timezone
from rest_framework import viewsets, permissions, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from common.mixins import TenantViewSetMixin
from apps.employees.models import Employee
from .models import AttendanceRecord, AttendancePunch, AttendanceCorrection, Holiday, OvertimeRecord
from .serializers import (
    AttendanceRecordSerializer,
    CheckInPunchSerializer,
    AttendanceCorrectionSerializer,
    HolidaySerializer,
    OvertimeRecordSerializer
)
from .services import AttendanceService


class AttendanceViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = AttendanceRecord.objects.select_related('employee', 'shift').prefetch_related('punches').all()
    filterset_fields = ['employee', 'date', 'status', 'is_late', 'source']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_code']

    @action(detail=False, methods=['post'], url_path='mark-manual')
    def mark_manual(self, request):
        employee_id = request.data.get('employee_id')
        date_val = request.data.get('date', timezone.now().date())
        att_status = request.data.get('status', AttendanceRecord.Status.PRESENT)
        notes = request.data.get('notes', '')

        business = getattr(request, 'business', None)
        try:
            employee = Employee.objects.get(id=employee_id, business=business)
        except Employee.DoesNotExist:
            return Response({'success': False, 'error': {'message': 'Employee not found.'}}, status=status.HTTP_404_NOT_FOUND)

        record, _ = AttendanceRecord.objects.update_or_create(
            employee=employee,
            date=date_val,
            defaults={
                'business': business,
                'status': att_status,
                'notes': notes,
                'source': AttendanceRecord.Source.MANUAL,
                'marked_by': request.user
            }
        )
        return Response({'success': True, 'data': AttendanceRecordSerializer(record).data})

    @action(detail=False, methods=['get'], url_path='daily')
    def daily_summary(self, request):
        business = getattr(request, 'business', None)
        date_str = request.query_params.get('date', str(timezone.now().date()))
        summary = AttendanceService.get_daily_summary(business, date_str)
        return Response({'success': True, 'data': summary})


class CheckInView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CheckInPunchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        business = getattr(request, 'business', None)
        employee = Employee.objects.filter(user=request.user, business=business).first()
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
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CheckInPunchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        business = getattr(request, 'business', None)
        employee = Employee.objects.filter(user=request.user, business=business).first()
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
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        business = getattr(self.request, 'business', None)
        return AttendanceCorrection.objects.filter(attendance__business=business)

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
    permission_classes = [permissions.IsAuthenticated]
    queryset = Holiday.objects.all()
    filterset_fields = ['is_active', 'type']


class OvertimeRecordViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = OvertimeRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = OvertimeRecord.objects.all()
    filterset_fields = ['status']
