from django.contrib import admin
from .models import Advance, Loan, LoanRepayment, Reimbursement


@admin.register(Advance)
class AdvanceAdmin(admin.ModelAdmin):
    list_display = ['employee', 'amount', 'remaining_balance', 'status', 'requested_at']
    list_filter = ['status']


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ['employee', 'amount', 'tenure_months', 'emi_amount', 'status']
    list_filter = ['status']


@admin.register(LoanRepayment)
class LoanRepaymentAdmin(admin.ModelAdmin):
    list_display = ['loan', 'amount', 'payment_date', 'remaining_balance']


@admin.register(Reimbursement)
class ReimbursementAdmin(admin.ModelAdmin):
    list_display = ['employee', 'amount', 'category', 'status', 'submitted_at']
    list_filter = ['status']
