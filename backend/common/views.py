"""Health check view."""
from django.conf import settings
from django.db import connection
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    """System health check endpoint."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        db_status = self._check_database()
        db_conf = settings.DATABASES.get('default', {})
        engine = db_conf.get('ENGINE', '')
        engine_name = 'PostgreSQL' if 'postgresql' in engine else ('SQLite' if 'sqlite' in engine else 'Unknown')

        health = {
            'status': 'healthy' if db_status == 'connected' else 'degraded',
            'database': db_status,
            'database_engine': engine_name,
            'database_name': db_conf.get('NAME', 'workpulse'),
            'database_host': db_conf.get('HOST', 'localhost'),
            'version': '1.0.0',
        }

        if health['database'] != 'connected':
            return Response(health, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(health, status=status.HTTP_200_OK)

    @staticmethod
    def _check_database():
        try:
            connection.ensure_connection()
            return 'connected'
        except Exception:
            return 'disconnected'

