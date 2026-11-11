from rest_framework import serializers
from .models import Advance, Loan, LoanRepayment, Reimbursement


class AdvanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)

    class Meta:
        model = Advance
        fields = '__all__'
        read_only_fields = ['id', 'business', 'requested_at', 'approved_by', 'approved_at', 'paid_at', 'created_at', 'updated_at']


class LoanRepaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanRepayment
        fields = '__all__'


class LoanSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    repayments = LoanRepaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Loan
        fields = '__all__'
        read_only_fields = ['id', 'business', 'approved_by', 'disbursed_at', 'closed_at', 'created_at', 'updated_at']


class ReimbursementSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = Reimbursement
        fields = '__all__'
        read_only_fields = ['id', 'business', 'submitted_at', 'approved_by', 'paid_at', 'created_at', 'updated_at']

