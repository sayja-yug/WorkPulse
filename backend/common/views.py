"""Health check view."""
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
        health = {
            'status': 'healthy',
            'database': self._check_database(),
            'version': '1.0.0',
        }

        if health['database'] != 'connected':
            health['status'] = 'degraded'
            return Response(health, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(health, status=status.HTTP_200_OK)

    @staticmethod
    def _check_database():
        try:
            connection.ensure_connection()
            return 'connected'
        except Exception:
            return 'disconnected'

