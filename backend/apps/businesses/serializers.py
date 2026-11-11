from rest_framework import serializers
from .models import Business, BusinessMembership


class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = [
            'id', 'name', 'slug', 'logo', 'address', 'city', 'state',
            'country', 'zip_code', 'phone', 'email', 'website',
            'timezone', 'currency', 'working_days', 'settings',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']


class BusinessListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = ['id', 'name', 'slug', 'logo', 'city', 'country', 'is_active']


class BusinessCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = [
            'name', 'address', 'city', 'state', 'country', 'zip_code',
            'phone', 'email', 'website', 'timezone', 'currency', 'working_days'
        ]


class BusinessMembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = BusinessMembership
        fields = ['id', 'user', 'user_email', 'user_name', 'business', 'is_owner', 'is_active', 'joined_at']
        read_only_fields = ['id', 'joined_at']

