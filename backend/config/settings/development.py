"""Development settings."""
from .base import *  # noqa: F401,F403

DEBUG = True

INSTALLED_APPS += ['debug_toolbar']  # noqa: F405

MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')  # noqa: F405

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

# SQLite fallback for quick local testing (use PostgreSQL for proper testing)
import sys
if 'test' in sys.argv and not os.environ.get('DATABASE_URL'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'test_db.sqlite3',
        }
    }

LOGGING['loggers']['apps']['level'] = 'DEBUG'  # noqa: F405

