"""Custom exception handler for consistent error responses."""
import logging

from django.core.exceptions import PermissionDenied, ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """Return consistent error response format.

    Format:
    {
        "success": false,
        "error": {
            "code": "ERROR_CODE",
            "message": "Human-readable message",
            "details": {} or []
        }
    }
    """
    # Convert Django exceptions to DRF exceptions
    if isinstance(exc, DjangoValidationError):
        exc = exceptions.ValidationError(detail=exc.messages)
    elif isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, PermissionDenied):
        exc = exceptions.PermissionDenied()

    response = exception_handler(exc, context)

    if response is None:
        # Unhandled exception
        logger.exception('Unhandled exception', exc_info=exc)
        return Response(
            {
                'success': False,
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': 'An unexpected error occurred. Please try again later.',
                    'details': {},
                },
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Determine error code
    error_code = _get_error_code(exc)
    message = _get_error_message(exc)
    details = _get_error_details(response.data)

    response.data = {
        'success': False,
        'error': {
            'code': error_code,
            'message': message,
            'details': details,
        },
    }

    return response


def _get_error_code(exc):
    """Map exception to error code."""
    code_map = {
        exceptions.AuthenticationFailed: 'AUTHENTICATION_FAILED',
        exceptions.NotAuthenticated: 'NOT_AUTHENTICATED',
        exceptions.PermissionDenied: 'PERMISSION_DENIED',
        exceptions.NotFound: 'NOT_FOUND',
        exceptions.ValidationError: 'VALIDATION_ERROR',
        exceptions.MethodNotAllowed: 'METHOD_NOT_ALLOWED',
        exceptions.Throttled: 'RATE_LIMIT_EXCEEDED',
        exceptions.ParseError: 'PARSE_ERROR',
        exceptions.UnsupportedMediaType: 'UNSUPPORTED_MEDIA_TYPE',
    }
    for exc_class, code in code_map.items():
        if isinstance(exc, exc_class):
            return code
    return 'ERROR'


def _get_error_message(exc):
    """Get human-readable error message."""
    if isinstance(exc, exceptions.ValidationError):
        return 'Validation failed. Please check the details.'
    if isinstance(exc, exceptions.Throttled):
        return f'Request rate limit exceeded. Please try again in {exc.wait} seconds.'
    if hasattr(exc, 'detail'):
        if isinstance(exc.detail, str):
            return exc.detail
        if isinstance(exc.detail, list) and len(exc.detail) > 0:
            return str(exc.detail[0])
    return 'An error occurred.'


def _get_error_details(data):
    """Extract error details from response data."""
    if isinstance(data, dict):
        # Remove non_field_errors and flatten
        details = {}
        for key, value in data.items():
            if key == 'detail':
                continue
            if isinstance(value, list):
                details[key] = [str(v) for v in value]
            else:
                details[key] = str(value)
        return details
    if isinstance(data, list):
        return [str(item) for item in data]
    return {}

