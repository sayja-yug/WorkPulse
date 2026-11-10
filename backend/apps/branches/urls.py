from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BranchViewSet, DepartmentViewSet, DesignationViewSet

router = DefaultRouter()
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'designations', DesignationViewSet, basename='designation')
router.register(r'', BranchViewSet, basename='branch')

urlpatterns = [
    path('', include(router.urls)),
]
