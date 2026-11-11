"""Development settings."""
from .base import *  # noqa: F401,F403

DEBUG = True

try:
    import debug_toolbar  # noqa: F401
    INSTALLED_APPS += ['debug_toolbar']  # noqa: F405
    MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')  # noqa: F405
except ImportError:
    pass

INTERNAL_IPS = ['127.0.0.1', 'localhost']

# Use console email backend in development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# More permissive throttle rates for development
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {  # noqa: F405
    'anon': '1000/minute',
    'user': '5000/minute',
}

# Enable browsable API in development
REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = (  # noqa: F405
    'rest_framework.renderers.JSONRenderer',
    'rest_framework.renderers.BrowsableAPIRenderer',
)

# Allow all origins in development
CORS_ALLOW_ALL_ORIGINS = True

# Cache - use in-memory cache for local development
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'workpulse-local-dev-cache',
    }
}

# SQLite fallback for seamless local development without requiring local PostgreSQL daemon
USE_SQLITE = config('USE_SQLITE', default=True, cast=bool)
if USE_SQLITE:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


LOGGING['loggers']['apps']['level'] = 'DEBUG'  # noqa: F405

