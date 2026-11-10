from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShiftViewSet, ShiftAssignmentViewSet

router = DefaultRouter()
router.register(r'assignments', ShiftAssignmentViewSet, basename='shift-assignment')
router.register(r'', ShiftViewSet, basename='shift')

urlpatterns = [
    path('', include(router.urls)),
]
