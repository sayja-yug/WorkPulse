from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LeaveTypeViewSet,
    LeaveBalanceViewSet,
    LeaveRequestViewSet,
    LeaveTransactionViewSet
)

router = DefaultRouter()
router.register(r'types', LeaveTypeViewSet, basename='leave-type')
router.register(r'balances', LeaveBalanceViewSet, basename='leave-balance')
router.register(r'requests', LeaveRequestViewSet, basename='leave-request')
router.register(r'transactions', LeaveTransactionViewSet, basename='leave-transaction')

urlpatterns = [
    path('apply/', LeaveRequestViewSet.as_view({'post': 'create'}), name='leave-apply'),
    path('<uuid:pk>/approve/', LeaveRequestViewSet.as_view({'post': 'approve', 'patch': 'approve'}), name='leave-approve'),
    path('<uuid:pk>/reject/', LeaveRequestViewSet.as_view({'post': 'reject', 'patch': 'reject'}), name='leave-reject'),
    path('', LeaveRequestViewSet.as_view({'get': 'list', 'post': 'create'}), name='leave-root'),
    path('', include(router.urls)),
]
