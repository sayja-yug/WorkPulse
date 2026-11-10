from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdvanceViewSet, LoanViewSet, ReimbursementViewSet

router = DefaultRouter()
router.register(r'loans', LoanViewSet, basename='loan')
router.register(r'reimbursements', ReimbursementViewSet, basename='reimbursement')
router.register(r'', AdvanceViewSet, basename='advance')

urlpatterns = [
    path('', include(router.urls)),
]
