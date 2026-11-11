from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExpenseCategoryViewSet, ExpenseViewSet, CashTransactionViewSet, CashbookBalanceView

router = DefaultRouter()
router.register(r'categories', ExpenseCategoryViewSet, basename='expense-category')
router.register(r'transactions', CashTransactionViewSet, basename='cash-transaction')
router.register(r'', ExpenseViewSet, basename='expense')

urlpatterns = [
    path('balance/', CashbookBalanceView.as_view(), name='cashbook-balance'),
    path('', include(router.urls)),
]

