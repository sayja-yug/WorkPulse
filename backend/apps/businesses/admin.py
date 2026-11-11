from django.contrib import admin
from .models import Business, BusinessMembership


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'city', 'country', 'is_active', 'created_at']
    search_fields = ['name', 'slug', 'city']
    list_filter = ['is_active', 'country']


@admin.register(BusinessMembership)
class BusinessMembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'business', 'is_owner', 'is_active', 'joined_at']
    search_fields = ['user__email', 'business__name']
    list_filter = ['is_owner', 'is_active']

