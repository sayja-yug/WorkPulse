"""Custom pagination classes."""
from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """Standard pagination for list endpoints."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'count': {'type': 'integer'},
                'next': {'type': 'string', 'nullable': True},
                'previous': {'type': 'string', 'nullable': True},
                'results': schema,
            },
        }


class SmallResultsSetPagination(PageNumberPagination):
    """Smaller page size for lightweight lists."""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class LargeResultsSetPagination(PageNumberPagination):
    """Larger page size for reporting views."""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200

