from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubscriptionPlanViewSet,
    CurrentSubscriptionView,
    InvoiceViewSet,
    PlatformSubscriptionOverview
)

router = DefaultRouter()
router.register(r'plans', SubscriptionPlanViewSet, basename='subscription-plan')
router.register(r'invoices', InvoiceViewSet, basename='invoice')

urlpatterns = [
    path('current/', CurrentSubscriptionView.as_view(), name='subscription-current'),
    path('platform-overview/', PlatformSubscriptionOverview.as_view(), name='platform-subscription-overview'),
    path('', include(router.urls)),
]

