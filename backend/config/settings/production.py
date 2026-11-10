"""Production settings."""
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

from .base import *  # noqa: F401,F403

DEBUG = False

# Security
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)  # noqa: F405
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
X_FRAME_OPTIONS = 'DENY'

# Shorter token lifetime in production
SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'] = timedelta(minutes=15)  # noqa: F405
SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'] = timedelta(days=1)  # noqa: F405

# S3 Storage (production)
USE_S3 = config('USE_S3', default=False, cast=bool)  # noqa: F405
if USE_S3:
    AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')  # noqa: F405
    AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY')  # noqa: F405
    AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME')  # noqa: F405
    AWS_S3_ENDPOINT_URL = config('AWS_S3_ENDPOINT_URL', default=None)  # noqa: F405
    AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='us-east-1')  # noqa: F405
    AWS_DEFAULT_ACL = 'private'
    AWS_S3_FILE_OVERWRITE = False
    AWS_QUERYSTRING_AUTH = True
    AWS_QUERYSTRING_EXPIRE = 3600
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

# Sentry
SENTRY_DSN = config('SENTRY_DSN', default='')  # noqa: F405
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
        environment='production',
    )

# Logging
LOGGING['handlers']['file'] = {  # noqa: F405
    'class': 'logging.handlers.RotatingFileHandler',
    'filename': BASE_DIR / 'logs' / 'workpulse.log',  # noqa: F405
    'maxBytes': 10 * 1024 * 1024,  # 10MB
    'backupCount': 5,
    'formatter': 'verbose',
}
LOGGING['root']['handlers'] = ['console', 'file']  # noqa: F405

