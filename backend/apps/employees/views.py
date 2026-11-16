import io
import csv
from datetime import datetime
from django.http import HttpResponse
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from common.mixins import TenantViewSetMixin
from common.permissions import HasPermission
from .models import Employee, EmployeeDocument, EmploymentHistory
from .serializers import (
    EmployeeSerializer,
    EmployeeListSerializer,
    EmployeeDocumentSerializer,
    EmploymentHistorySerializer
)
from .services import EmployeeService


class EmployeeViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Employee.objects.select_related('branch', 'department', 'designation', 'user').all()
    filterset_fields = ['branch', 'department', 'designation', 'status', 'employment_type', 'is_field_employee']
    search_fields = ['first_name', 'last_name', 'employee_code', 'email', 'phone']

    def get_serializer_class(self):
        if self.action == 'list':
            return EmployeeListSerializer
        return EmployeeSerializer

    def perform_create(self, serializer):
        business = getattr(self.request, 'business', None)
        if not business:
            business_id = self.request.headers.get('X-Business-ID') or self.request.META.get('HTTP_X_BUSINESS_ID')
            if business_id:
                from apps.businesses.models import Business
                business = Business.objects.filter(id=business_id).first()
            elif getattr(self.request.user, 'active_business', None):
                business = self.request.user.active_business
            elif getattr(self.request.user, 'is_authenticated', False):
                from apps.businesses.models import BusinessMembership
                mem = BusinessMembership.objects.filter(user=self.request.user, is_active=True).first()
                if mem:
                    business = mem.business
        serializer.instance = EmployeeService.create_employee(
            business=business,
            validated_data=serializer.validated_data,
            created_by=self.request.user,
            base_salary=self.request.data.get('base_salary'),
            shift_id=self.request.data.get('shift_id'),
            send_invite=self.request.data.get('send_invite', True),
        )

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        employee = self.get_object()
        employee.status = Employee.Status.ACTIVE
        employee.save(update_fields=['status', 'updated_at'])
        return Response({'success': True, 'data': {'message': 'Employee activated successfully.'}})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        employee = self.get_object()
        employee.status = Employee.Status.INACTIVE
        employee.save(update_fields=['status', 'updated_at'])
        return Response({'success': True, 'data': {'message': 'Employee deactivated successfully.'}})

    @action(detail=True, methods=['post'])
    def transfer(self, request, pk=None):
        employee = self.get_object()
        new_branch_id = request.data.get('branch_id')
        new_dept_id = request.data.get('department_id')
        notes = request.data.get('notes', '')
        EmployeeService.transfer_employee(
            employee=employee,
            new_branch_id=new_branch_id,
            new_dept_id=new_dept_id,
            changed_by=request.user,
            notes=notes
        )
        return Response({'success': True, 'data': EmployeeSerializer(employee).data})

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        employee = self.get_object()
        history = employee.history.all()
        return Response({'success': True, 'data': EmploymentHistorySerializer(history, many=True).data})

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
        """Export employees to a styled Excel (.xlsx) file respecting active filters."""
        queryset = self.filter_queryset(self.get_queryset())
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Employees"

        headers = [
            "Employee ID", "First Name", "Last Name", "Email", "Phone",
            "Branch", "Department", "Designation", "Employment Type",
            "Salary Type", "Joining Date", "Status"
        ]
        ws.append(headers)

        header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        center_align = Alignment(horizontal="center", vertical="center")

        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center_align

        for emp in queryset:
            ws.append([
                emp.employee_code or '',
                emp.first_name or '',
                emp.last_name or '',
                emp.email or '',
                emp.phone or '',
                emp.branch.name if emp.branch else '',
                emp.department.name if emp.department else '',
                emp.designation.name if emp.designation else '',
                emp.get_employment_type_display() if hasattr(emp, 'get_employment_type_display') else emp.employment_type,
                emp.get_salary_type_display() if hasattr(emp, 'get_salary_type_display') else emp.salary_type,
                str(emp.joining_date) if emp.joining_date else '',
                emp.get_status_display() if hasattr(emp, 'get_status_display') else emp.status
            ])

        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)

        filename = f"employees_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        response = HttpResponse(
            stream.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response

    @action(detail=False, methods=['get'], url_path='sample-template')
    def sample_template(self, request):
        """Download a sample Excel template for employee batch import."""
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Employee Template"

        headers = [
            "First Name", "Last Name", "Email", "Phone",
            "Branch", "Department", "Designation", "Joining Date", "Base Salary"
        ]
        ws.append(headers)

        header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        center_align = Alignment(horizontal="center", vertical="center")

        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center_align

        ws.append(["Rahul", "Sharma", "rahul.sharma@example.com", "+91 9876543210", "Corporate Campus (HQ)", "Engineering & Technology", "Full-Stack Engineer", "2026-01-15", 75000])
        ws.append(["Pooja", "Mehta", "pooja.mehta@example.com", "+91 9876543211", "Corporate Campus (HQ)", "Human Resources", "HR Generalist", "2026-02-01", 60000])

        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 15)

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)

        response = HttpResponse(
            stream.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response['Content-Disposition'] = 'attachment; filename="workpulse_employee_template.xlsx"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response

    @action(detail=False, methods=['post'], url_path='import-excel')
    def import_excel(self, request):
        """Batch import employees from Excel (.xlsx/.xls) or CSV file."""
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'success': False, 'error': {'message': 'No file uploaded.'}}, status=status.HTTP_400_BAD_REQUEST)

        filename = uploaded_file.name.lower()
        rows_data = []

        if filename.endswith('.xlsx') or filename.endswith('.xls'):
            try:
                wb = openpyxl.load_workbook(uploaded_file, data_only=True)
                ws = wb.active
                raw_rows = list(ws.iter_rows(values_only=True))
                if not raw_rows:
                    return Response({'success': False, 'error': {'message': 'The uploaded Excel file is empty.'}}, status=status.HTTP_400_BAD_REQUEST)
                header = [str(c).strip().lower() if c else '' for c in raw_rows[0]]
                for r in raw_rows[1:]:
                    if any(r):
                        row_dict = {header[i]: (r[i] if i < len(r) else None) for i in range(len(header)) if header[i]}
                        rows_data.append(row_dict)
            except Exception as e:
                return Response({'success': False, 'error': {'message': f'Failed to parse Excel file: {str(e)}'}}, status=status.HTTP_400_BAD_REQUEST)
        elif filename.endswith('.csv'):
            try:
                decoded = uploaded_file.read().decode('utf-8-sig', errors='replace').splitlines()
                reader = csv.DictReader(decoded)
                for r in reader:
                    normalized = {k.strip().lower(): v.strip() for k, v in r.items() if k}
                    rows_data.append(normalized)
            except Exception as e:
                return Response({'success': False, 'error': {'message': f'Failed to parse CSV file: {str(e)}'}}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'success': False, 'error': {'message': 'Unsupported file type. Please upload an .xlsx, .xls, or .csv file.'}}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve Business
        business = getattr(request, 'business', None)
        if not business:
            business_id = request.headers.get('X-Business-ID') or request.META.get('HTTP_X_BUSINESS_ID')
            if business_id:
                from apps.businesses.models import Business
                business = Business.objects.filter(id=business_id).first()
            elif getattr(request.user, 'active_business', None):
                business = request.user.active_business

        if not business:
            return Response({'success': False, 'error': {'message': 'Active business organization not identified.'}}, status=status.HTTP_400_BAD_REQUEST)

        from apps.branches.models import Branch, Department, Designation
        branches_map = {b.name.lower(): b for b in Branch.objects.filter(business=business)}
        depts_map = {d.name.lower(): d for d in Department.objects.filter(business=business)}
        desigs_map = {g.name.lower(): g for g in Designation.objects.filter(business=business)}
        default_branch = Branch.objects.filter(business=business).first()

        created_count = 0
        skipped_errors = []

        for idx, row in enumerate(rows_data, start=2):
            first_name = row.get('first name') or row.get('first_name') or row.get('name') or row.get('firstname') or ''
            last_name = row.get('last name') or row.get('last_name') or row.get('lastname') or ''
            email = row.get('email') or row.get('email address') or row.get('email_address') or ''
            phone = str(row.get('phone') or row.get('contact') or row.get('mobile') or '').strip()

            if not first_name:
                continue

            if not email:
                email = f"{str(first_name).lower().replace(' ', '')}.{idx}@workpulse.local"

            branch_name = str(row.get('branch') or row.get('branch name') or '').strip().lower()
            dept_name = str(row.get('department') or row.get('department name') or '').strip().lower()
            desig_name = str(row.get('designation') or row.get('designation name') or row.get('role') or '').strip().lower()

            branch_obj = branches_map.get(branch_name, default_branch)
            dept_obj = depts_map.get(dept_name)
            desig_obj = desigs_map.get(desig_name)

            joining_val = row.get('joining date') or row.get('joining_date') or row.get('joining') or row.get('doj')
            if hasattr(joining_val, 'date'):
                joining_date = joining_val.date()
            elif isinstance(joining_val, str) and joining_val.strip():
                try:
                    joining_date = datetime.strptime(joining_val.strip(), '%Y-%m-%d').date()
                except ValueError:
                    joining_date = datetime.now().date()
            else:
                joining_date = datetime.now().date()

            validated_data = {
                'first_name': str(first_name).strip(),
                'last_name': str(last_name).strip(),
                'email': str(email).strip(),
                'phone': phone,
                'branch': branch_obj,
                'department': dept_obj,
                'designation': desig_obj,
                'joining_date': joining_date,
                'status': Employee.Status.ACTIVE,
            }

            base_sal = row.get('base salary') or row.get('base_salary') or row.get('salary')

            try:
                EmployeeService.create_employee(
                    business=business,
                    validated_data=validated_data,
                    created_by=request.user,
                    base_salary=base_sal,
                    send_invite=True,
                )
                created_count += 1
            except Exception as err:
                skipped_errors.append(f"Row {idx} ({first_name}): {str(err)}")

        return Response({
            'success': True,
            'data': {
                'imported': created_count,
                'errors': skipped_errors,
                'message': f'Successfully imported {created_count} employee(s).' + (f' Skipped {len(skipped_errors)} rows.' if skipped_errors else '')
            }
        })


class EmployeeDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        business = getattr(self.request, 'business', None)
        return EmployeeDocument.objects.filter(employee__business=business)

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

