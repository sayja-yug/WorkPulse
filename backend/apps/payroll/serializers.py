from rest_framework import serializers
from .models import (
    SalaryComponent,
    SalaryTemplate,
    EmployeeSalaryStructure,
    PayrollRun,
    PayrollItem,
    PayrollItemComponent,
    Payslip,
    SalaryPayment
)


class SalaryComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryComponent
        fields = '__all__'
        read_only_fields = ['id', 'business', 'created_at', 'updated_at']


class SalaryTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryTemplate
        fields = '__all__'
        read_only_fields = ['id', 'business', 'created_at', 'updated_at']


class EmployeeSalaryStructureSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = EmployeeSalaryStructure
        fields = '__all__'
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class PayrollItemComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollItemComponent
        fields = '__all__'


class PayrollItemSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    components = PayrollItemComponentSerializer(many=True, read_only=True)

    class Meta:
        model = PayrollItem
        fields = '__all__'


class PayrollRunSerializer(serializers.ModelSerializer):
    items = PayrollItemSerializer(many=True, read_only=True)
    items_count = serializers.IntegerField(source='items.count', read_only=True)

    class Meta:
        model = PayrollRun
        fields = [
            'id', 'business', 'name', 'period_start', 'period_end', 'pay_date',
            'status', 'total_gross', 'total_deductions', 'total_net',
            'processed_by', 'approved_by', 'locked_at', 'notes',
            'items_count', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'business', 'created_at', 'updated_at']


class PayslipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    gross_salary = serializers.DecimalField(source='payroll_item.gross_salary', max_digits=12, decimal_places=2, read_only=True)
    total_deductions = serializers.DecimalField(source='payroll_item.total_deductions', max_digits=12, decimal_places=2, read_only=True)
    net_salary = serializers.DecimalField(source='payroll_item.net_salary', max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Payslip
        fields = '__all__'
        read_only_fields = ['id', 'business', 'generated_at', 'created_at', 'updated_at']


class SalaryPaymentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = SalaryPayment
        fields = '__all__'
        read_only_fields = ['id', 'paid_by', 'created_at', 'updated_at']
