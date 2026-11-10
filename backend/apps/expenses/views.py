from rest_framework import viewsets, permissions, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from common.mixins import TenantViewSetMixin
from .models import ExpenseCategory, Expense, CashTransaction
from .serializers import (
    ExpenseCategorySerializer,
    ExpenseSerializer,
    CashTransactionSerializer
)
from .services import CashbookService


class ExpenseCategoryViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ExpenseCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ExpenseCategory.objects.all()
    filterset_fields = ['type', 'is_active']


class ExpenseViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Expense.objects.select_related('category', 'created_by').all()
    filterset_fields = ['category', 'status', 'payment_mode', 'date']

    def perform_create(self, serializer):
        business = getattr(self.request, 'business', None)
        serializer.save(business=business, created_by=self.request.user)

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        expense = self.get_object()
        expense.status = Expense.Status.APPROVED
        expense.approved_by = request.user
        expense.save(update_fields=['status', 'approved_by', 'updated_at'])
        return Response({'success': True, 'data': ExpenseSerializer(expense).data})


class CashTransactionViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = CashTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = CashTransaction.objects.select_related('category', 'created_by').all()
    filterset_fields = ['type', 'category', 'date']

    def perform_create(self, serializer):
        business = getattr(self.request, 'business', None)
        CashbookService.record_transaction(
            business=business,
            tx_type=serializer.validated_data.get('type'),
            amount=serializer.validated_data.get('amount'),
            description=serializer.validated_data.get('description'),
            date=serializer.validated_data.get('date'),
            created_by=self.request.user,
            category=serializer.validated_data.get('category'),
            payment_mode=serializer.validated_data.get('payment_mode', 'Cash'),
            reference=serializer.validated_data.get('reference', '')
        )


class CashbookBalanceView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        business = getattr(request, 'business', None)
        balance = CashbookService.get_current_balance(business)
        return Response({'success': True, 'data': {'current_balance': str(balance)}})
