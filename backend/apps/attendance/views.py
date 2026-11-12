import datetime
from decimal import Decimal
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
            mem = BusinessMembership.objects.filter(user=request.user, is_active=True).first()
            if mem:
                business = mem.business
    return business


def get_or_link_employee(user, business):
    """Guarantees employee profile exists and is properly linked to the user and business."""
    if not user or not user.is_authenticated:
        return None
    emp = None
    if business:
        emp = Employee.objects.filter(user=user, business=business).first()
    if not emp:
        emp = Employee.objects.filter(user=user).first()
    if not emp and user.email:
        emp = Employee.objects.filter(email__iexact=user.email).first()
        if emp:
            emp.user = user
            if business and not emp.business:
                emp.business = business
            emp.save(update_fields=['user', 'business', 'updated_at'])
    if not emp and business:
        from apps.branches.models import Branch, Department, Designation
        branch = Branch.objects.filter(business=business).first()
        dept = Department.objects.filter(business=business).first()
        desig = Designation.objects.filter(business=business).first()
        emp = Employee.objects.create(
            user=user,
            business=business,
            employee_code=f'EMP-{user.id.hex[:6].upper()}',
            first_name=user.first_name or 'Staff',
            last_name=user.last_name or '',
            email=user.email,
            branch=branch,
            department=dept,
            designation=desig,
            joining_date=timezone.now().date(),
            status=Employee.Status.ACTIVE
        )
    return emp


class AttendanceViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = AttendanceRecord.objects.select_related('employee', 'shift').prefetch_related('punches').all().order_by('-date', '-check_in')
    filterset_fields = ['employee', 'date', 'status', 'is_late', 'source']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_code']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        business = get_business_context(self.request)
        if not user.is_superuser:
            from apps.accounts.services import PermissionService
            roles = PermissionService.get_user_roles(user, business) if business else []
            manager_roles = {'BUSINESS_OWNER', 'HR_MANAGER', 'BRANCH_MANAGER', 'SUPERVISOR', 'AUDITOR', 'SUPER_ADMIN'}
            if not any(r in manager_roles for r in roles) and not self.request.query_params.get('employee'):
                qs = qs.filter(employee__user=user)
        return qs.order_by('-date', '-check_in')

    @action(detail=False, methods=['post'], url_path='mark-manual')
    def mark_manual(self, request):
        employee_id = request.data.get('employee_id')
        date_val = request.data.get('date', timezone.now().date())
        att_status = request.data.get('status', AttendanceRecord.Status.PRESENT)
        notes = request.data.get('notes', '')

        business = get_business_context(request)
        try:
            if business:
                employee = Employee.objects.get(id=employee_id, business=business)
            else:
                employee = Employee.objects.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response({'success': False, 'error': {'message': 'Employee not found.'}}, status=status.HTTP_404_NOT_FOUND)

        if not business:
            business = employee.business

        if isinstance(date_val, str):
            try:
                date_obj = datetime.date.fromisoformat(date_val)
            except ValueError:
                date_obj = timezone.now().date()
        else:
            date_obj = date_val

        check_in = None
        check_out = None
        working_hours = Decimal('0.00')

        if att_status == AttendanceRecord.Status.PRESENT:
            check_in = timezone.make_aware(datetime.datetime.combine(date_obj, datetime.time(9, 30)))
            check_out = timezone.make_aware(datetime.datetime.combine(date_obj, datetime.time(18, 30)))
            working_hours = Decimal('8.50')
        elif att_status == AttendanceRecord.Status.HALF_DAY:
            check_in = timezone.make_aware(datetime.datetime.combine(date_obj, datetime.time(9, 30)))
            working_hours = Decimal('4.00')

        record, _ = AttendanceRecord.objects.update_or_create(
            employee=employee,
            date=date_obj,
            defaults={
                'business': business,
                'status': att_status,
                'check_in': check_in,
                'check_out': check_out,
                'working_hours': working_hours,
                'notes': notes,
                'source': AttendanceRecord.Source.MANUAL,
                'marked_by': request.user
            }
        )
        return Response({'success': True, 'data': AttendanceRecordSerializer(record).data})

    @action(detail=False, methods=['post'], url_path='punch-employee')
    def punch_employee(self, request):
        """Allows HR/Manager to punch in (IN) or punch out (OUT) for any employee."""
        employee_id = request.data.get('employee_id')
        punch_action = str(request.data.get('action', 'IN')).upper()
        business = get_business_context(request)

        try:
            if business:
                employee = Employee.objects.get(id=employee_id, business=business)
            else:
                employee = Employee.objects.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response({'success': False, 'error': {'message': 'Employee not found.'}}, status=status.HTTP_404_NOT_FOUND)

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
        business = get_business_context(request)
        date_str = request.query_params.get('date', str(timezone.now().date()))
        summary = AttendanceService.get_daily_summary(business, date_str)
        return Response({'success': True, 'data': summary})


class CheckInView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CheckInPunchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        business = get_business_context(request)
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
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CheckInPunchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        business = get_business_context(request)
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

