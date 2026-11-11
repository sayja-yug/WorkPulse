from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, EmployeeDocumentViewSet

router = DefaultRouter()
router.register(r'documents', EmployeeDocumentViewSet, basename='employee-document')
router.register(r'', EmployeeViewSet, basename='employee')

urlpatterns = [
    path('', include(router.urls)),
]

