from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdvanceViewSet, LoanViewSet, ReimbursementViewSet

router = DefaultRouter()
router.register(r'loans', LoanViewSet, basename='loan')
router.register(r'reimbursements', ReimbursementViewSet, basename='reimbursement')
router.register(r'', AdvanceViewSet, basename='advance')

urlpatterns = [
    path('request/', AdvanceViewSet.as_view({'post': 'request_advance'}), name='advance-request'),
    path('<uuid:pk>/approve/', AdvanceViewSet.as_view({'post': 'approve', 'patch': 'approve'}), name='advance-approve'),
    path('<uuid:pk>/reject/', AdvanceViewSet.as_view({'post': 'reject', 'patch': 'reject'}), name='advance-reject'),
    path('<uuid:pk>/disburse/', AdvanceViewSet.as_view({'post': 'disburse', 'patch': 'disburse'}), name='advance-disburse'),
    path('', include(router.urls)),
]
