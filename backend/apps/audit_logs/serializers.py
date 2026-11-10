from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email', 'user_name', 'business',
            'action', 'resource_type', 'resource_id', 'old_data',
            'new_data', 'ip_address', 'user_agent', 'metadata', 'created_at'
        ]
        read_only_fields = fields
