from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AttendanceViewSet,
    CheckInView,
    CheckOutView,
    AttendanceCorrectionViewSet,
    HolidayViewSet,
    OvertimeRecordViewSet
)

router = DefaultRouter()
router.register(r'corrections', AttendanceCorrectionViewSet, basename='attendance-correction')
router.register(r'holidays', HolidayViewSet, basename='holiday')
router.register(r'overtime', OvertimeRecordViewSet, basename='overtime')
router.register(r'', AttendanceViewSet, basename='attendance')

urlpatterns = [
    path('check-in/', CheckInView.as_view(), name='attendance-check-in'),
    path('check-out/', CheckOutView.as_view(), name='attendance-check-out'),
    path('', include(router.urls)),
]

