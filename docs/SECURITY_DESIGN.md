# WorkPulse — Security Design Document

> **Version:** 1.0
> **Last Updated:** 2025-07-14
> **Status:** Living Document
> **Classification:** Internal — Engineering & Security Teams
> **Related:** [System Design](./SYSTEM_DESIGN.md)

---

## Table of Contents

1. [Security Philosophy](#1-security-philosophy)
2. [Authentication Security](#2-authentication-security)
3. [Authorization Security](#3-authorization-security)
4. [Data Protection](#4-data-protection)
5. [Input Validation](#5-input-validation)
6. [API Security](#6-api-security)
7. [File Upload Security](#7-file-upload-security)
8. [Audit Logging Strategy](#8-audit-logging-strategy)
9. [Dependency Security](#9-dependency-security)
10. [Environment Variable Management](#10-environment-variable-management)
11. [Incident Response Considerations](#11-incident-response-considerations)

---

## 1. Security Philosophy

WorkPulse handles sensitive workforce data — personal employee information, salary details, attendance records, and financial data. Our security posture is built on these foundational principles:

| Principle | Description |
|---|---|
| **Defense in Depth** | Multiple independent security controls at every layer; no single point of failure |
| **Least Privilege** | Users, services, and processes are granted only the minimum permissions required |
| **Fail-Safe Defaults** | Access is denied by default; every resource requires explicit permission grants |
| **Zero Trust Internal** | Internal service calls are authenticated; no implicit trust between components |
| **Separation of Duties** | Payroll calculation and payroll approval require different users/roles |
| **Complete Mediation** | Every access request passes through authentication, authorization, and tenant isolation |
| **Auditability** | All state-changing operations are logged with actor, action, timestamp, and context |
| **Data Minimization** | Collect and retain only the data necessary for business operations |

### Threat Model Overview

```mermaid
flowchart TD
    subgraph External["External Threats"]
        BruteForce["Brute Force /<br/>Credential Stuffing"]
        Injection["SQL / NoSQL<br/>Injection"]
        XSS["Cross-Site Scripting"]
        CSRF["Cross-Site Request<br/>Forgery"]
        DataExfil["Data Exfiltration"]
        FileAttack["Malicious File<br/>Upload"]
        DDoS["DDoS / Rate<br/>Abuse"]
    end

    subgraph Internal["Internal Threats"]
        TenantLeak["Cross-Tenant<br/>Data Leakage"]
        PrivEsc["Privilege<br/>Escalation"]
        InsiderThreat["Insider Access<br/>Abuse"]
        DataLeak["Accidental Data<br/>Exposure in Logs"]
    end

    subgraph Controls["Security Controls"]
        Auth["Authentication Layer"]
        RBAC["RBAC + Tenant Isolation"]
        Validation["Input Validation"]
        Encryption["Encryption"]
        Audit["Audit Logging"]
        RateLimit["Rate Limiting"]
        FileVal["File Validation"]
    end

    BruteForce --> Auth
    Injection --> Validation
    XSS --> Validation
    CSRF --> Auth
    DataExfil --> Encryption
    FileAttack --> FileVal
    DDoS --> RateLimit
    TenantLeak --> RBAC
    PrivEsc --> RBAC
    InsiderThreat --> Audit
    DataLeak --> Encryption
```

---

## 2. Authentication Security

### 2.1 JWT Implementation

WorkPulse uses JWT (JSON Web Tokens) for stateless API authentication via `djangorestframework-simplejwt`.

**Token Architecture:**

| Token Type | Storage Location | Lifetime | Purpose |
|---|---|---|---|
| **Access Token** | In-memory (JavaScript variable) | 30 minutes | API authentication |
| **Refresh Token** | HttpOnly, Secure, SameSite=Strict cookie | 7 days | Access token renewal |

> [!IMPORTANT]
> Access tokens are **never** stored in `localStorage` or `sessionStorage`. They exist only in JavaScript memory and are lost on page refresh (triggering a silent refresh via the refresh token cookie). This eliminates XSS-based token theft from persistent storage.

**Token Configuration:**

```python
# settings.py
from datetime import timedelta

SIMPLE_JWT = {
    # Token lifetimes
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),

    # Rotation & blacklisting
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,

    # Signing
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': env('JWT_SIGNING_KEY'),  # Separate from Django SECRET_KEY
    'VERIFYING_KEY': None,

    # Claims
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',

    # Headers
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',

    # Customization
    'TOKEN_OBTAIN_SERIALIZER': 'accounts.serializers.CustomTokenObtainPairSerializer',
}
```

**Custom Token Claims:**

```python
# accounts/serializers.py
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims (non-sensitive only)
        token['business_id'] = user.active_business_id
        token['role'] = user.get_primary_role_name()

        # NEVER include in token:
        # - Full permissions list (fetch on login, cache in Redis)
        # - Email, phone, or any PII
        # - Password hashes or secrets

        return token
```

**Token Security Measures:**

| Measure | Implementation |
|---|---|
| **Short-lived access tokens** | 30-minute expiry limits the window if a token is compromised |
| **Refresh token rotation** | Each refresh issues a new refresh token; old one is immediately blacklisted |
| **Token blacklisting** | Blacklisted tokens are stored in the database; checked on every refresh attempt |
| **Separate signing key** | `JWT_SIGNING_KEY` is distinct from `SECRET_KEY` — key compromise is contained |
| **JTI claim** | Every token has a unique identifier for blacklisting and audit purposes |
| **No PII in tokens** | Tokens contain only `user_id`, `business_id`, and `role` — no sensitive data |

### 2.2 Password Security

**Hashing Configuration:**

```python
# settings.py
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',  # Primary
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',        # Fallback (migration)
]
```

`BCryptSHA256PasswordHasher` applies SHA-256 to the password before bcrypt hashing, which avoids bcrypt's 72-byte input limitation while maintaining bcrypt's adaptive cost factor.

**Password Policy:**

```python
# settings.py
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
        'OPTIONS': {
            'user_attributes': ('email', 'first_name', 'last_name', 'phone'),
            'max_similarity': 0.7,
        },
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
    {
        'NAME': 'accounts.validators.ComplexityValidator',
    },
]
```

**Custom Complexity Validator:**

```python
# accounts/validators.py
import re
from django.core.exceptions import ValidationError

class ComplexityValidator:
    """Enforce password complexity requirements."""

    def validate(self, password, user=None):
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                'Password must contain at least one uppercase letter.',
                code='password_no_upper',
            )
        if not re.search(r'[a-z]', password):
            raise ValidationError(
                'Password must contain at least one lowercase letter.',
                code='password_no_lower',
            )
        if not re.search(r'[0-9]', password):
            raise ValidationError(
                'Password must contain at least one digit.',
                code='password_no_digit',
            )
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise ValidationError(
                'Password must contain at least one special character.',
                code='password_no_special',
            )

    def get_help_text(self):
        return (
            'Password must contain at least one uppercase letter, '
            'one lowercase letter, one digit, and one special character.'
        )
```

**Password History (Re-use Prevention):**

```python
class PasswordHistory(models.Model):
    """Stores hashed previous passwords to prevent re-use."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_history')
    password_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @classmethod
    def check_reuse(cls, user, new_password, history_depth=5):
        """Check if the new password matches any of the last N passwords."""
        recent_hashes = cls.objects.filter(
            user=user
        ).order_by('-created_at')[:history_depth]

        for entry in recent_hashes:
            if check_password(new_password, entry.password_hash):
                raise ValidationError(
                    f'Cannot reuse any of your last {history_depth} passwords.',
                    code='password_reuse',
                )
```

### 2.3 Account Lockout

```python
# accounts/services.py
from django.core.cache import cache

class AccountLockoutService:
    MAX_FAILED_ATTEMPTS = 5
    LOCKOUT_DURATION = 900  # 15 minutes
    ATTEMPT_WINDOW = 300    # 5 minutes

    @classmethod
    def record_failed_attempt(cls, email: str, ip_address: str):
        """Record a failed login attempt and lock account if threshold exceeded."""
        key = f"login_attempts:{email}"
        attempts = cache.get(key, 0) + 1
        cache.set(key, attempts, timeout=cls.ATTEMPT_WINDOW)

        if attempts >= cls.MAX_FAILED_ATTEMPTS:
            cache.set(f"locked:{email}", True, timeout=cls.LOCKOUT_DURATION)
            logger.warning(
                "account_locked",
                email=email,
                ip_address=ip_address,
                attempts=attempts,
            )
            return True  # Account is now locked
        return False

    @classmethod
    def is_locked(cls, email: str) -> bool:
        return cache.get(f"locked:{email}", False)

    @classmethod
    def clear_attempts(cls, email: str):
        """Called on successful login."""
        cache.delete(f"login_attempts:{email}")
        cache.delete(f"locked:{email}")
```

### 2.4 Session Management

Although WorkPulse primarily uses JWT for API authentication, the Django Admin interface uses session-based authentication with additional hardening:

```python
# settings.py

# Session security
SESSION_COOKIE_SECURE = True          # HTTPS only
SESSION_COOKIE_HTTPONLY = True         # Not accessible via JavaScript
SESSION_COOKIE_SAMESITE = 'Strict'    # No cross-site sending
SESSION_COOKIE_AGE = 3600             # 1-hour session for admin
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'  # Redis-backed

# CSRF security
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Strict'
CSRF_TRUSTED_ORIGINS = [
    'https://app.workpulse.com',
    'https://admin.workpulse.com',
]
```

---

## 3. Authorization Security

### 3.1 Role-Based Access Control (RBAC)

WorkPulse implements a dynamic, database-driven RBAC system with three layers of permission checking.

**Permission Resolution Order:**

```
1. Authentication  → Is the user authenticated? (JWT valid?)
2. Module Permission → Does the user's role grant the required permission?
3. Object Permission → Does the user have access to this specific record?
4. Tenant Isolation → Does the record belong to the user's business?
```

> [!CAUTION]
> All four checks must pass. If any one fails, the request is denied with a `403 Forbidden` response. There are no bypass mechanisms.

**Permission Enforcement in Views:**

```python
from rest_framework.permissions import IsAuthenticated
from common.permissions import HasModulePermission, IsTenantMember

class LeaveRequestViewSet(TenantViewMixin, viewsets.ModelViewSet):
    """
    Leave request management with layered permission checks.
    """
    permission_classes = [IsAuthenticated, IsTenantMember, HasModulePermission]
    required_permission = 'leave.view'

    def get_permissions(self):
        """Map actions to required permissions."""
        permission_map = {
            'create': 'leave.apply',
            'update': 'leave.edit',
            'partial_update': 'leave.edit',
            'destroy': 'leave.delete',
            'approve': 'leave.approve',
            'reject': 'leave.approve',
        }
        action = self.action
        if action in permission_map:
            self.required_permission = permission_map[action]
        return super().get_permissions()

    def get_queryset(self):
        """
        Employees see only their own requests.
        Managers see their team's requests.
        HR admins see all requests.
        """
        qs = super().get_queryset()  # Already tenant-filtered
        user = self.request.user

        if user.has_permission('leave.admin'):
            return qs  # HR admin sees all
        elif user.has_permission('leave.approve'):
            return qs.filter(
                Q(employee__manager=user.employee) |
                Q(employee=user.employee)
            )
        else:
            return qs.filter(employee=user.employee)
```

### 3.2 Object-Level Permissions

Module-level permissions control whether a user can perform an action type. Object-level permissions additionally verify whether the user can act on a **specific** record.

**Examples of object-level checks:**

| Scenario | Check |
|---|---|
| Employee viewing their own profile | `employee.user_id == request.user.id` |
| Manager approving a leave request | `leave_request.employee.manager_id == request.user.employee_id` |
| Employee editing their own expense | `expense.employee_id == request.user.employee_id AND expense.status == 'draft'` |
| Business owner accessing settings | `user.role == 'business_owner' AND business.id == request.business_id` |

```python
class IsOwnerOrManager(BasePermission):
    """
    Object-level: users can access their own records.
    Managers can access their direct reports' records.
    Admins can access all records within the tenant.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user

        # Admin override within tenant
        if user.has_permission(f'{view.module}.admin'):
            return True

        # Owner check
        if hasattr(obj, 'employee_id') and obj.employee_id == user.employee_id:
            return True

        # Manager check
        if hasattr(obj, 'employee'):
            if obj.employee.manager_id == user.employee_id:
                return True

        return False
```

### 3.3 Tenant Isolation

Tenant isolation is the most critical security boundary in WorkPulse. It prevents users in one business from accessing data belonging to another business.

**Three-Layer Enforcement:**

```python
# Layer 1: Middleware — extracts and validates business_id
class TenantMiddleware:
    def __call__(self, request):
        if request.user.is_authenticated:
            business_id = request.user.active_business_id
            if not business_id:
                return JsonResponse(
                    {'status': 'error', 'message': 'No active business'},
                    status=403,
                )
            request.business_id = business_id
        return self.get_response(request)

# Layer 2: View mixin — filters all querysets
class TenantViewMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(business_id=self.request.business_id)

    def perform_create(self, serializer):
        serializer.save(business_id=self.request.business_id)

# Layer 3: Database constraint — NOT NULL foreign key
class TenantBaseModel(BaseModel):
    business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE,
        db_index=True,
    )  # NOT NULL by default — every record MUST belong to a business
```

**Tenant Isolation Testing:**

```python
# tests/test_tenant_isolation.py
class TenantIsolationTest(APITestCase):
    """Verify that users cannot access data from other tenants."""

    def setUp(self):
        self.business_a = BusinessFactory()
        self.business_b = BusinessFactory()
        self.user_a = UserFactory(business=self.business_a)
        self.user_b = UserFactory(business=self.business_b)
        self.employee_b = EmployeeFactory(business=self.business_b)

    def test_user_cannot_list_other_tenant_employees(self):
        self.client.force_authenticate(self.user_a)
        response = self.client.get('/api/v1/employees/')
        employee_ids = [e['id'] for e in response.data['data']]
        self.assertNotIn(self.employee_b.id, employee_ids)

    def test_user_cannot_retrieve_other_tenant_employee(self):
        self.client.force_authenticate(self.user_a)
        response = self.client.get(f'/api/v1/employees/{self.employee_b.id}/')
        self.assertEqual(response.status_code, 404)  # Not 403 — don't reveal existence

    def test_user_cannot_update_other_tenant_employee(self):
        self.client.force_authenticate(self.user_a)
        response = self.client.patch(
            f'/api/v1/employees/{self.employee_b.id}/',
            {'name': 'Hacked'},
        )
        self.assertEqual(response.status_code, 404)
```

> [!IMPORTANT]
> When a user attempts to access a resource from another tenant, the response is `404 Not Found`, not `403 Forbidden`. This prevents information leakage about the existence of resources in other tenants (IDOR protection).

### 3.4 Separation of Duties

Certain sensitive operations require different users to initiate and approve:

| Operation | Initiator | Approver | Constraint |
|---|---|---|---|
| Payroll calculation | HR Admin / Accountant | Business Owner | Initiator ≠ approver |
| Leave approval | Employee (applicant) | Manager / HR | Applicant ≠ approver |
| Expense approval | Employee (submitter) | Manager / Finance | Submitter ≠ approver |
| Salary modification | HR Admin | Business Owner | Modifier ≠ approver |
| User role assignment | HR Admin | Business Owner | For sensitive roles |

```python
# Enforcement example
class PayrollApprovalView(APIView):
    permission_classes = [IsAuthenticated, HasModulePermission]
    required_permission = 'payroll.approve'

    def post(self, request, payroll_run_id):
        payroll_run = get_object_or_404(
            PayrollRun, id=payroll_run_id, business_id=request.business_id
        )

        # Separation of duties check
        if payroll_run.initiated_by_id == request.user.id:
            raise PermissionDenied(
                'The person who initiated payroll cannot approve it. '
                'A different authorized user must approve.'
            )

        PayrollService.approve_payroll(payroll_run, approved_by=request.user)
        return Response({'status': 'success', 'message': 'Payroll approved'})
```

---

## 4. Data Protection

### 4.1 Encryption at Rest

| Data Store | Encryption Method |
|---|---|
| **PostgreSQL** | Transparent Data Encryption (TDE) via cloud provider or `pgcrypto` for sensitive columns |
| **Redis** | Encrypted storage in production (cloud-managed Redis with encryption enabled) |
| **S3 Object Storage** | Server-Side Encryption (SSE-S3 or SSE-KMS) |
| **Backups** | Encrypted with AES-256 before storage |

**Sensitive Column Encryption:**

For highly sensitive fields (e.g., Aadhaar numbers, bank account numbers), application-level encryption is applied using `django-encrypted-model-fields` or a custom implementation:

```python
from django.db import models
from common.fields import EncryptedCharField

class EmployeeBankDetails(TenantBaseModel):
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE)
    bank_name = models.CharField(max_length=100)
    account_number = EncryptedCharField(max_length=255)   # Encrypted at rest
    ifsc_code = models.CharField(max_length=11)
    pan_number = EncryptedCharField(max_length=255)       # Encrypted at rest
    aadhaar_number = EncryptedCharField(max_length=255)   # Encrypted at rest
```

**Custom Encrypted Field:**

```python
# common/fields.py
from cryptography.fernet import Fernet
from django.conf import settings
from django.db import models

class EncryptedCharField(models.CharField):
    """
    Transparently encrypts/decrypts values using Fernet (AES-128-CBC).
    Values are stored encrypted in the database.
    The encryption key is derived from settings.FIELD_ENCRYPTION_KEY.
    """
    def __init__(self, *args, **kwargs):
        kwargs['max_length'] = kwargs.get('max_length', 255)
        super().__init__(*args, **kwargs)
        self.fernet = Fernet(settings.FIELD_ENCRYPTION_KEY)

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        try:
            return self.fernet.decrypt(value.encode()).decode()
        except Exception:
            return value  # Return raw if decryption fails (migration period)

    def get_prep_value(self, value):
        if value is None:
            return value
        return self.fernet.encrypt(value.encode()).decode()
```

### 4.2 Encryption in Transit

```python
# settings.py (production)

# Force HTTPS
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# HSTS (HTTP Strict Transport Security)
SECURE_HSTS_SECONDS = 31536000        # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Secure cookies
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

**TLS Configuration (Nginx):**

```nginx
server {
    listen 443 ssl http2;
    server_name api.workpulse.com;

    ssl_certificate /etc/ssl/certs/workpulse.crt;
    ssl_certificate_key /etc/ssl/private/workpulse.key;

    # Modern TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "0" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.workpulse.com; frame-ancestors 'none';" always;
    add_header Permissions-Policy "camera=(self), geolocation=(self), microphone=()" always;
}
```

### 4.3 PII Handling

**PII Inventory:**

| Data Field | Classification | Storage | Access | Retention |
|---|---|---|---|---|
| Employee name | Personal | Plain text | Authorized users | Employment + 7 years |
| Email address | Personal | Plain text | Authorized users | Employment + 7 years |
| Phone number | Personal | Plain text | Authorized users | Employment + 7 years |
| Aadhaar number | Sensitive PII | Encrypted | HR Admin + Owner only | Employment + 7 years |
| PAN number | Sensitive PII | Encrypted | Accountant + Owner only | Employment + 7 years |
| Bank account | Sensitive PII | Encrypted | Accountant + Owner only | Employment + 7 years |
| Salary details | Confidential | Plain text (tenant-isolated) | Payroll roles only | Employment + 7 years |
| GPS coordinates | Location | Plain text | Attendance roles only | 1 year |
| Selfie photos | Biometric | Object storage | Attendance roles only | 90 days |
| Password | Credential | bcrypt hash | System only (never readable) | Current only |

**PII Masking in Logs:**

```python
# common/logging.py
import re
import structlog

SENSITIVE_PATTERNS = [
    (re.compile(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b'), '****-****-****'),        # Aadhaar
    (re.compile(r'\b[A-Z]{5}\d{4}[A-Z]\b'), '***PAN***'),                         # PAN
    (re.compile(r'\b\d{9,18}\b'), '***ACCT***'),                                   # Bank account
    (re.compile(r'password["\s:=]+["\']?[^\s"\']+'), 'password=***REDACTED***'),   # Passwords
    (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), '***@***.***'),  # Email
]

def sanitize_log_data(data: str) -> str:
    """Remove sensitive data from log messages."""
    for pattern, replacement in SENSITIVE_PATTERNS:
        data = pattern.sub(replacement, data)
    return data

# Configure structlog processor
def pii_sanitizer(logger, method_name, event_dict):
    """Structlog processor that sanitizes PII from all log fields."""
    for key, value in event_dict.items():
        if isinstance(value, str):
            event_dict[key] = sanitize_log_data(value)
    return event_dict

structlog.configure(
    processors=[
        pii_sanitizer,  # Applied before JSON rendering
        structlog.processors.JSONRenderer(),
    ],
)
```

**PII in API Responses:**

Sensitive fields are conditionally serialized based on the requesting user's permissions:

```python
class EmployeeDetailSerializer(serializers.ModelSerializer):
    aadhaar_number = serializers.SerializerMethodField()
    pan_number = serializers.SerializerMethodField()
    bank_account = serializers.SerializerMethodField()

    def get_aadhaar_number(self, obj):
        user = self.context['request'].user
        if user.has_permission('employee.view_sensitive'):
            return obj.bank_details.aadhaar_number  # Full value
        return mask_aadhaar(obj.bank_details.aadhaar_number)  # "XXXX-XXXX-1234"

    def get_pan_number(self, obj):
        user = self.context['request'].user
        if user.has_permission('employee.view_sensitive'):
            return obj.bank_details.pan_number
        return None  # Hidden entirely
```

### 4.4 Data Retention and Deletion

```python
# Data retention policies enforced via Celery periodic tasks

@shared_task
def enforce_data_retention():
    """Run monthly to enforce data retention policies."""
    now = timezone.now()

    # Delete GPS coordinates older than 1 year
    Attendance.objects.filter(
        date__lt=now - timedelta(days=365)
    ).update(
        check_in_latitude=None,
        check_in_longitude=None,
        check_out_latitude=None,
        check_out_longitude=None,
    )

    # Delete attendance selfies older than 90 days
    old_photos = AttendancePhoto.objects.filter(
        created_at__lt=now - timedelta(days=90)
    )
    for photo in old_photos:
        default_storage.delete(photo.file_path)
    old_photos.delete()

    # Delete expired audit logs (configurable per business)
    # Default: 3 years for financial records, 1 year for general
```

---

## 5. Input Validation

WorkPulse implements input validation at **three independent layers**: frontend (Zod), API serializer (DRF), and database (Django model validators + constraints).

### 5.1 Validation Architecture

```mermaid
flowchart LR
    subgraph Frontend["Layer 1: Frontend (Zod)"]
        ZodSchema["Zod Schema<br/>Validation"]
        FormError["Inline Form<br/>Error Display"]
    end

    subgraph API["Layer 2: API (DRF Serializer)"]
        FieldVal["Field-level<br/>Validation"]
        ObjectVal["Object-level<br/>validate()"]
        CustomVal["Custom<br/>Validators"]
    end

    subgraph DB["Layer 3: Database (Django)"]
        ModelVal["Model clean()<br/>Validation"]
        DBConstraint["Database<br/>Constraints"]
    end

    ZodSchema -->|Valid data| API
    ZodSchema -->|Invalid| FormError
    FieldVal --> ObjectVal
    ObjectVal --> CustomVal
    CustomVal -->|Valid| ModelVal
    ModelVal --> DBConstraint
```

> [!WARNING]
> Frontend validation is purely for UX convenience. It is **never** trusted as a security boundary. All validation is re-executed server-side. An attacker can bypass the frontend entirely.

### 5.2 Frontend Validation (Zod)

```typescript
// schemas/employee.ts
import { z } from 'zod';

export const createEmployeeSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Name contains invalid characters'),

  email: z
    .string()
    .email('Invalid email address')
    .max(254, 'Email must not exceed 254 characters'),

  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),

  employee_code: z
    .string()
    .min(1, 'Employee code is required')
    .max(20, 'Employee code must not exceed 20 characters')
    .regex(/^[A-Z0-9-]+$/, 'Employee code must be alphanumeric uppercase'),

  joining_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date')
    .refine(
      (val) => new Date(val) <= new Date(),
      'Joining date cannot be in the future'
    ),

  department: z.string().min(1, 'Department is required'),

  designation: z
    .string()
    .min(1, 'Designation is required')
    .max(100, 'Designation must not exceed 100 characters'),

  salary: z
    .number()
    .positive('Salary must be positive')
    .max(10_000_000, 'Salary exceeds maximum limit'),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
```

### 5.3 API Serializer Validation (DRF)

```python
# employees/serializers.py
from rest_framework import serializers
from django.core.validators import RegexValidator

class EmployeeCreateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(
        min_length=2,
        max_length=100,
        validators=[
            RegexValidator(
                regex=r'^[a-zA-Z\s.\'-]+$',
                message='Name contains invalid characters.',
            ),
        ],
    )
    email = serializers.EmailField(max_length=254)
    phone = serializers.CharField(
        validators=[
            RegexValidator(
                regex=r'^[6-9]\d{9}$',
                message='Invalid Indian mobile number.',
            ),
        ],
    )
    employee_code = serializers.CharField(
        min_length=1,
        max_length=20,
        validators=[
            RegexValidator(
                regex=r'^[A-Z0-9-]+$',
                message='Employee code must be alphanumeric uppercase.',
            ),
        ],
    )
    joining_date = serializers.DateField()
    salary = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=0,
        max_value=10_000_000,
    )

    class Meta:
        model = Employee
        fields = [
            'name', 'email', 'phone', 'employee_code',
            'joining_date', 'department', 'designation', 'salary',
        ]

    def validate_email(self, value):
        """Check email uniqueness within the business."""
        business_id = self.context['request'].business_id
        if Employee.objects.filter(
            business_id=business_id, email=value
        ).exists():
            raise serializers.ValidationError(
                'An employee with this email already exists in your business.'
            )
        return value.lower()

    def validate_employee_code(self, value):
        """Check employee code uniqueness within the business."""
        business_id = self.context['request'].business_id
        if Employee.objects.filter(
            business_id=business_id, employee_code=value
        ).exists():
            raise serializers.ValidationError(
                'This employee code is already in use.'
            )
        return value

    def validate_joining_date(self, value):
        """Joining date cannot be in the future."""
        from django.utils import timezone
        if value > timezone.now().date():
            raise serializers.ValidationError(
                'Joining date cannot be in the future.'
            )
        return value

    def validate(self, data):
        """Cross-field validation."""
        # Example: Ensure the salary matches the department's pay band
        # (business rule validation beyond simple type checking)
        return data
```

### 5.4 Model-Level Validation (Django)

```python
# employees/models.py
from django.core.exceptions import ValidationError

class Employee(TenantBaseModel):
    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=254)
    phone = models.CharField(max_length=15)
    employee_code = models.CharField(max_length=20)
    joining_date = models.DateField()
    department = models.CharField(max_length=100)
    designation = models.CharField(max_length=100)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['business', 'email'],
                name='unique_employee_email_per_business',
            ),
            models.UniqueConstraint(
                fields=['business', 'employee_code'],
                name='unique_employee_code_per_business',
            ),
            models.CheckConstraint(
                check=models.Q(joining_date__lte=models.functions.Now()),
                name='joining_date_not_future',
            ),
        ]

    def clean(self):
        """Model-level validation (called before save)."""
        super().clean()
        if self.email:
            self.email = self.email.lower()
```

### 5.5 SQL Injection Prevention

Django ORM uses **parameterized queries** by default, making SQL injection virtually impossible in normal usage:

```python
# SAFE — ORM generates parameterized query
employees = Employee.objects.filter(name__icontains=user_input)

# SAFE — Explicit parameterization for raw SQL
Employee.objects.raw(
    'SELECT * FROM employees_employee WHERE name = %s',
    [user_input]
)

# NEVER DO THIS — String interpolation in raw SQL
# Employee.objects.raw(f'SELECT * FROM employees WHERE name = {user_input}')  # ❌ VULNERABLE
```

> [!CAUTION]
> Raw SQL queries are only permitted when the ORM cannot express a complex query. All raw SQL must use parameterized queries (`%s` placeholders) and undergo code review. String formatting or f-strings in SQL are strictly forbidden.

---

## 6. API Security

### 6.1 Rate Limiting

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/minute',
        'user': '100/minute',
        'login': '5/minute',
        'password_reset': '3/hour',
        'file_upload': '10/minute',
        'bulk_operation': '2/minute',
        'report_export': '5/hour',
    },
}
```

**Custom Per-Endpoint Throttling:**

```python
from rest_framework.throttling import SimpleRateThrottle

class LoginRateThrottle(SimpleRateThrottle):
    """Strict rate limiting on login endpoint to prevent brute force."""
    scope = 'login'

    def get_cache_key(self, request, view):
        # Rate limit by IP AND by email to prevent both per-IP and per-account attacks
        email = request.data.get('email', '')
        ident = f"{self.get_ident(request)}:{email}"
        return self.cache_format % {'scope': self.scope, 'ident': ident}

class FileUploadThrottle(SimpleRateThrottle):
    scope = 'file_upload'

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return self.cache_format % {
                'scope': self.scope,
                'ident': request.user.pk,
            }
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }
```

### 6.2 CORS Configuration

```python
# settings.py
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])
# Production: ['https://app.workpulse.com']
# Development: ['http://localhost:5173']

CORS_ALLOW_CREDENTIALS = True  # Required for httpOnly cookie refresh tokens

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'authorization',
    'content-type',
    'x-requested-with',
    'x-request-id',
]

# Explicitly deny all origins not in the whitelist
CORS_ORIGIN_ALLOW_ALL = False  # ❌ NEVER set to True in production
```

### 6.3 CSRF Protection

For the JWT-based API (SPA frontend), CSRF protection is handled by the SameSite cookie policy and the fact that access tokens are sent via the `Authorization` header (not cookies).

For the Django Admin interface (session-based), full CSRF protection is active:

```python
# settings.py
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Strict'
CSRF_USE_SESSIONS = False  # Cookie-based (for admin)
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[])
```

### 6.4 Content Type Validation

```python
# common/middleware.py
class ContentTypeValidationMiddleware:
    """
    Reject requests with unexpected Content-Type headers.
    API endpoints only accept application/json or multipart/form-data.
    """
    ALLOWED_CONTENT_TYPES = {
        'application/json',
        'multipart/form-data',
        'application/x-www-form-urlencoded',  # Only for auth endpoints
    }

    def __call__(self, request):
        if request.method in ('POST', 'PUT', 'PATCH'):
            content_type = request.content_type.split(';')[0].strip().lower()

            if content_type and content_type not in self.ALLOWED_CONTENT_TYPES:
                return JsonResponse(
                    {
                        'status': 'error',
                        'message': f'Unsupported Content-Type: {content_type}',
                        'error_code': 'UNSUPPORTED_CONTENT_TYPE',
                    },
                    status=415,
                )

        return self.get_response(request)
```

### 6.5 Security Headers

```python
# settings.py

# Prevent MIME type sniffing
SECURE_CONTENT_TYPE_NOSNIFF = True

# Prevent clickjacking
X_FRAME_OPTIONS = 'DENY'

# Disable browser XSS filter (modern CSP is preferred)
SECURE_BROWSER_XSS_FILTER = False

# Referrer policy
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Cross-origin policies
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'
```

### 6.6 Request Size Limits

```python
# settings.py
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024     # 10 MB max request body
DATA_UPLOAD_MAX_NUMBER_FIELDS = 100                  # Max form fields
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024       # 5 MB in-memory file threshold
```

```nginx
# Nginx configuration
client_max_body_size 15m;           # Max upload size
client_body_timeout 30s;            # Body read timeout
client_header_timeout 15s;          # Header read timeout
large_client_header_buffers 4 16k;  # Max header size
```

---

## 7. File Upload Security

### 7.1 Validation Pipeline

Every file upload passes through a multi-stage validation pipeline before being accepted:

```mermaid
flowchart TD
    Upload["File Upload<br/>Request"]
    SizeCheck{"File size<br/>within limit?"}
    ExtCheck{"Extension in<br/>allowlist?"}
    MIMECheck{"MIME type<br/>matches extension?"}
    MagicCheck{"Magic bytes match<br/>declared type?"}
    ContentScan["Content safety<br/>scan (optional)"]
    Sanitize["Sanitize filename<br/>(UUID replacement)"]
    Store["Store in S3<br/>(private bucket)"]
    Reject["400 Bad Request"]

    Upload --> SizeCheck
    SizeCheck -->|No| Reject
    SizeCheck -->|Yes| ExtCheck
    ExtCheck -->|No| Reject
    ExtCheck -->|Yes| MIMECheck
    MIMECheck -->|No| Reject
    MIMECheck -->|Yes| MagicCheck
    MagicCheck -->|No| Reject
    MagicCheck -->|Yes| ContentScan
    ContentScan --> Sanitize
    Sanitize --> Store
```

### 7.2 File Validation Implementation

```python
# common/validators.py
import magic
import os
import uuid
from django.core.exceptions import ValidationError

# Allowlisted file types with their magic bytes
ALLOWED_FILE_TYPES = {
    'image/jpeg': {
        'extensions': ['.jpg', '.jpeg'],
        'magic_bytes': [b'\xff\xd8\xff'],
        'max_size_mb': 5,
    },
    'image/png': {
        'extensions': ['.png'],
        'magic_bytes': [b'\x89PNG\r\n\x1a\n'],
        'max_size_mb': 5,
    },
    'application/pdf': {
        'extensions': ['.pdf'],
        'magic_bytes': [b'%PDF'],
        'max_size_mb': 10,
    },
}

# Explicitly blocked extensions (defense in depth)
BLOCKED_EXTENSIONS = {
    '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
    '.vbs', '.js', '.ws', '.wsf', '.wsh', '.ps1', '.psm1',
    '.sh', '.bash', '.csh', '.ksh', '.php', '.py', '.rb',
    '.pl', '.jar', '.class', '.dll', '.so', '.dylib',
    '.html', '.htm', '.svg',  # Can contain embedded scripts
}


class FileValidator:
    """Multi-stage file upload validator."""

    def __init__(self, allowed_types=None, max_size_mb=None):
        self.allowed_types = allowed_types or ALLOWED_FILE_TYPES
        self.max_size_mb = max_size_mb

    def validate(self, uploaded_file):
        """Run all validation checks on an uploaded file."""
        self._validate_size(uploaded_file)
        self._validate_extension(uploaded_file)
        self._validate_mime_type(uploaded_file)
        self._validate_magic_bytes(uploaded_file)
        return True

    def _validate_size(self, uploaded_file):
        max_bytes = (self.max_size_mb or 10) * 1024 * 1024
        if uploaded_file.size > max_bytes:
            raise ValidationError(
                f'File size ({uploaded_file.size / 1024 / 1024:.1f} MB) '
                f'exceeds the maximum allowed size ({self.max_size_mb} MB).'
            )

    def _validate_extension(self, uploaded_file):
        ext = os.path.splitext(uploaded_file.name)[1].lower()

        if ext in BLOCKED_EXTENSIONS:
            raise ValidationError(
                f'File type "{ext}" is not permitted.'
            )

        allowed_extensions = set()
        for type_config in self.allowed_types.values():
            allowed_extensions.update(type_config['extensions'])

        if ext not in allowed_extensions:
            raise ValidationError(
                f'File extension "{ext}" is not allowed. '
                f'Accepted: {", ".join(sorted(allowed_extensions))}'
            )

    def _validate_mime_type(self, uploaded_file):
        """Verify the Content-Type header matches an allowed type."""
        content_type = uploaded_file.content_type
        if content_type not in self.allowed_types:
            raise ValidationError(
                f'File MIME type "{content_type}" is not allowed.'
            )

    def _validate_magic_bytes(self, uploaded_file):
        """
        Read the first bytes of the file to verify its actual type
        matches the declared Content-Type. Prevents extension spoofing.
        """
        uploaded_file.seek(0)
        file_header = uploaded_file.read(16)
        uploaded_file.seek(0)  # Reset for downstream processing

        content_type = uploaded_file.content_type
        type_config = self.allowed_types.get(content_type)

        if type_config:
            matches = any(
                file_header.startswith(magic_bytes)
                for magic_bytes in type_config['magic_bytes']
            )
            if not matches:
                raise ValidationError(
                    'File content does not match its declared type. '
                    'The file may be corrupted or spoofed.'
                )

    @staticmethod
    def sanitize_filename(original_filename: str) -> str:
        """Replace the filename with a UUID to prevent path traversal."""
        ext = os.path.splitext(original_filename)[1].lower()
        return f"{uuid.uuid4().hex}{ext}"
```

### 7.3 Upload Size Limits by Category

| Upload Type | Max Size | Allowed Formats | Max Files |
|---|---|---|---|
| Attendance selfie | 5 MB | JPEG, PNG | 1 per check-in |
| Employee document | 10 MB | PDF, JPEG, PNG | 10 per employee |
| Expense receipt | 5 MB | JPEG, PNG, PDF | 3 per expense |
| Business logo | 2 MB | JPEG, PNG, SVG | 1 per business |
| Bulk import (CSV) | 5 MB | CSV | 1 per import |

### 7.4 Virus Scanning Consideration

For production deployments handling sensitive documents, integrate ClamAV or a cloud-based scanning service:

```python
# common/antivirus.py (optional integration)
import clamd

class AntivirusScanner:
    """Optional virus scanning for uploaded files."""

    def __init__(self):
        self.scanner = clamd.ClamdUnixSocket()  # or ClamdNetworkSocket

    def scan(self, uploaded_file) -> bool:
        """Returns True if the file is clean, raises if infected."""
        uploaded_file.seek(0)
        result = self.scanner.instream(uploaded_file)
        uploaded_file.seek(0)

        status, message = result.get('stream', ('ERROR', 'Unknown'))
        if status != 'OK':
            raise ValidationError(
                f'File failed security scan: {message}'
            )
        return True
```

### 7.5 File Serving Security

Files are **never** served directly from the application server. All file access goes through pre-signed URLs with short expiry:

```python
# common/storage.py
from django.core.files.storage import default_storage
from botocore.config import Config

def generate_presigned_url(file_path: str, expiry_seconds: int = 900) -> str:
    """
    Generate a pre-signed URL for accessing a private S3 object.
    Default expiry: 15 minutes.
    """
    url = default_storage.url(file_path, parameters={
        'ResponseContentDisposition': 'inline',
    })
    return url
```

---

## 8. Audit Logging Strategy

### 8.1 What Gets Logged

| Event Category | Examples | Log Level |
|---|---|---|
| **Authentication** | Login success/failure, token refresh, logout, password change | INFO / WARNING |
| **Authorization** | Permission denied, role change, tenant access attempt | WARNING |
| **Data Mutation** | Create, update, delete of any business data | INFO |
| **Approval Actions** | Leave approved/rejected, payroll approved, expense approved | INFO |
| **Admin Actions** | User role changes, business settings changes | INFO |
| **Security Events** | Account lockout, suspicious IP, rate limiting triggered | WARNING |
| **System Events** | Background task failures, integration errors | ERROR |

### 8.2 Audit Log Schema

```python
class AuditLog(models.Model):
    """
    Immutable audit trail. Records are never updated or deleted.
    Designed for compliance, security investigation, and operational visibility.
    """
    # Who
    user = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    business = models.ForeignKey(
        'businesses.Business', on_delete=models.CASCADE,
        null=True, blank=True,
    )
    ip_address = models.GenericIPAddressField(null=True)
    user_agent = models.TextField(blank=True, default='')

    # What
    action = models.CharField(max_length=50, db_index=True)
    # Actions: CREATE, UPDATE, DELETE, APPROVE, REJECT, LOGIN,
    #          LOGIN_FAILED, LOGOUT, PASSWORD_CHANGE, ROLE_CHANGE,
    #          EXPORT, BULK_IMPORT, SETTINGS_CHANGE

    resource_type = models.CharField(max_length=50, db_index=True)
    # Resources: employee, attendance, leave_request, payroll_run,
    #            expense, user, role, business_settings

    resource_id = models.BigIntegerField(null=True)
    resource_repr = models.CharField(max_length=255, blank=True, default='')
    # Human-readable representation: "Employee: John Doe (EMP-001)"

    # Details
    changes = models.JSONField(default=dict, blank=True)
    # For UPDATE: {"name": {"old": "John", "new": "Jonathan"}}
    # For CREATE: {"name": "John", "email": "john@example.com"}
    # For DELETE: snapshot of deleted record

    metadata = models.JSONField(default=dict, blank=True)
    # Additional context: {"reason": "Annual review", "bulk_operation_id": "abc123"}

    # When
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['business_id', 'timestamp']),
            models.Index(fields=['business_id', 'resource_type', 'timestamp']),
            models.Index(fields=['business_id', 'action', 'timestamp']),
            models.Index(fields=['user_id', 'timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]

    def __str__(self):
        return f"[{self.timestamp}] {self.user} → {self.action} {self.resource_type}:{self.resource_id}"
```

### 8.3 Audit Service Implementation

```python
# audit/services.py
from django.db import transaction
import structlog

logger = structlog.get_logger()

class AuditService:
    """Centralized audit logging service."""

    @staticmethod
    def log(
        action: str,
        resource_type: str,
        resource_id: int | None = None,
        resource_repr: str = '',
        changes: dict = None,
        metadata: dict = None,
        user=None,
        business_id: int = None,
        request=None,
    ):
        """
        Create an immutable audit log entry.

        This method is designed to never raise exceptions — audit failures
        should not break business operations. Errors are logged to the
        application logger for investigation.
        """
        try:
            ip_address = None
            user_agent = ''

            if request:
                ip_address = AuditService._get_client_ip(request)
                user_agent = request.META.get('HTTP_USER_AGENT', '')
                user = user or getattr(request, 'user', None)
                business_id = business_id or getattr(request, 'business_id', None)

            if user and not user.is_authenticated:
                user = None

            AuditLog.objects.create(
                user=user,
                business_id=business_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                resource_repr=resource_repr,
                changes=changes or {},
                metadata=metadata or {},
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception as e:
            # Audit logging failures must never break business logic
            logger.error(
                "audit_log_failed",
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                error=str(e),
            )

    @staticmethod
    def log_changes(instance, old_values: dict, new_values: dict, **kwargs):
        """
        Compare old and new values and log only the changed fields.
        """
        changes = {}
        for field, old_val in old_values.items():
            new_val = new_values.get(field)
            if old_val != new_val:
                changes[field] = {
                    'old': str(old_val) if old_val is not None else None,
                    'new': str(new_val) if new_val is not None else None,
                }

        if changes:
            AuditService.log(
                action='UPDATE',
                resource_type=instance._meta.model_name,
                resource_id=instance.pk,
                resource_repr=str(instance),
                changes=changes,
                **kwargs,
            )

    @staticmethod
    def _get_client_ip(request) -> str:
        """Extract real client IP, accounting for reverse proxies."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')
```

### 8.4 Automatic Audit via Signals

```python
# audit/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

AUDITED_MODELS = [
    'employees.Employee',
    'attendance.Attendance',
    'leave.LeaveRequest',
    'payroll.PayrollRun',
    'payroll.PaySlip',
    'expenses.Expense',
]

@receiver(post_save)
def audit_model_save(sender, instance, created, **kwargs):
    model_label = f"{sender._meta.app_label}.{sender.__name__}"
    if model_label not in AUDITED_MODELS:
        return

    action = 'CREATE' if created else 'UPDATE'
    AuditService.log(
        action=action,
        resource_type=sender._meta.model_name,
        resource_id=instance.pk,
        resource_repr=str(instance),
        business_id=getattr(instance, 'business_id', None),
    )

@receiver(post_delete)
def audit_model_delete(sender, instance, **kwargs):
    model_label = f"{sender._meta.app_label}.{sender.__name__}"
    if model_label not in AUDITED_MODELS:
        return

    AuditService.log(
        action='DELETE',
        resource_type=sender._meta.model_name,
        resource_id=instance.pk,
        resource_repr=str(instance),
        business_id=getattr(instance, 'business_id', None),
        changes=_serialize_instance(instance),  # Snapshot for recovery
    )
```

### 8.5 Audit Log Retention

| Category | Retention Period | Reason |
|---|---|---|
| Financial records (payroll, salary changes) | 7 years | Tax and labor compliance |
| Employee lifecycle (onboarding, offboarding) | 7 years | Legal compliance |
| Authentication events | 1 year | Security investigation |
| General data changes | 3 years | Business operations |
| Security events (lockouts, permission denials) | 2 years | Security review |

---

## 9. Dependency Security

### 9.1 Python Dependencies

**Pinning Strategy:**

```
# requirements/base.txt — exact versions for reproducibility
Django==4.2.11
djangorestframework==3.14.0
djangorestframework-simplejwt==5.3.1
django-cors-headers==4.3.1
django-redis==5.4.0
celery==5.3.6
redis==5.0.1
psycopg2-binary==2.9.9
gunicorn==21.2.0
sentry-sdk==1.40.0
Pillow==10.2.0
boto3==1.34.25
cryptography==41.0.7
structlog==24.1.0
```

**Automated Vulnerability Scanning:**

```yaml
# .github/workflows/security.yml
name: Dependency Security Scan

on:
  push:
    branches: [main, develop]
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday 6 AM

jobs:
  python-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install pip-audit
      - run: pip-audit -r requirements/production.txt --strict

  npm-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: cd frontend && npm audit --audit-level=high

  dependabot:
    # Dependabot is configured via .github/dependabot.yml
    # Automatically creates PRs for vulnerable dependencies
```

**Dependabot Configuration:**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: pip
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "security"

  - package-ecosystem: npm
    directory: "/frontend"
    schedule:
      interval: weekly
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "security"

  - package-ecosystem: docker
    directory: "/"
    schedule:
      interval: weekly
```

### 9.2 Frontend Dependencies

```json
// package.json — lock file (package-lock.json) is committed
{
  "scripts": {
    "audit": "npm audit --audit-level=high",
    "audit:fix": "npm audit fix",
    "lint:security": "eslint --config .eslintrc.security.js src/"
  }
}
```

### 9.3 Docker Base Image Security

```dockerfile
# Use official slim images to minimize attack surface
FROM python:3.11-slim-bookworm AS base

# Run as non-root user
RUN groupadd -r workpulse && useradd -r -g workpulse workpulse

# Install security updates
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Set restrictive permissions
WORKDIR /app
COPY --chown=workpulse:workpulse . .

USER workpulse

# No shell access in production
SHELL ["/bin/false"]
```

### 9.4 Supply Chain Security Checklist

| Check | Tool | Frequency |
|---|---|---|
| Python vulnerability scan | `pip-audit` | Every CI run + weekly |
| NPM vulnerability scan | `npm audit` | Every CI run + weekly |
| Container image scan | Trivy or Snyk | Every build |
| License compliance | `pip-licenses` | Monthly |
| Dependency freshness | Dependabot | Weekly |
| SBOM generation | `syft` (optional) | Per release |

---

## 10. Environment Variable Management

### 10.1 Configuration Strategy

All secrets and environment-specific configuration are managed through environment variables, **never hardcoded** in source code.

**Environment Variable Categories:**

| Category | Variables | Sensitivity |
|---|---|---|
| **Secrets** | `SECRET_KEY`, `JWT_SIGNING_KEY`, `DATABASE_URL`, `AWS_SECRET_ACCESS_KEY`, `FIELD_ENCRYPTION_KEY` | 🔴 Critical |
| **Service Config** | `REDIS_URL`, `SENTRY_DSN`, `AWS_S3_BUCKET`, `CELERY_BROKER_URL` | 🟡 High |
| **App Config** | `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `ENVIRONMENT`, `DEBUG` | 🟢 Medium |
| **Feature Flags** | `ENABLE_SMS_NOTIFICATIONS`, `ENABLE_VIRUS_SCANNING` | 🟢 Low |

### 10.2 Secret Management

```python
# settings.py
import environ

env = environ.Env()

# NEVER set defaults for secrets — fail loudly if missing
SECRET_KEY = env('SECRET_KEY')  # No default — raises ImproperlyConfigured
JWT_SIGNING_KEY = env('JWT_SIGNING_KEY')
DATABASE_URL = env('DATABASE_URL')
FIELD_ENCRYPTION_KEY = env('FIELD_ENCRYPTION_KEY')

# Non-secret config can have defaults
DEBUG = env.bool('DEBUG', default=False)
ENVIRONMENT = env('ENVIRONMENT', default='development')
LOG_LEVEL = env('LOG_LEVEL', default='INFO')
```

**Secret Rotation:**

| Secret | Rotation Frequency | Procedure |
|---|---|---|
| `SECRET_KEY` | Annually or on compromise | Update env var; existing sessions invalidated |
| `JWT_SIGNING_KEY` | Annually or on compromise | Update env var; existing tokens invalidated (users must re-login) |
| `DATABASE_URL` | On compromise | Rotate DB credentials; update env var; restart services |
| `FIELD_ENCRYPTION_KEY` | Only on compromise | Requires data re-encryption migration |
| `AWS_SECRET_ACCESS_KEY` | 90 days | Rotate IAM keys; update env var |

### 10.3 Environment File Security

```bash
# .env file (development ONLY — never committed to git)
SECRET_KEY=dev-only-secret-key-not-for-production
JWT_SIGNING_KEY=dev-only-jwt-key-not-for-production
DATABASE_URL=postgres://workpulse:devpassword@localhost:5432/workpulse
REDIS_URL=redis://localhost:6379/0
FIELD_ENCRYPTION_KEY=dev-only-encryption-key-32-bytes=
DEBUG=True
ENVIRONMENT=development
```

```gitignore
# .gitignore — ensure secrets are never committed
.env
.env.local
.env.production
*.pem
*.key
```

### 10.4 Production Secret Management

For production deployments, secrets should be injected via the deployment platform's secret management:

| Platform | Secret Management |
|---|---|
| **AWS** | AWS Secrets Manager, Parameter Store (SSM) |
| **Docker Swarm** | Docker Secrets |
| **Kubernetes** | K8s Secrets (encrypted at rest via etcd encryption) |
| **Heroku** | Config Vars |
| **DigitalOcean App Platform** | App-level environment variables (encrypted) |

> [!CAUTION]
> Never store production secrets in:
> - Source code (even in private repos)
> - Docker images (build args or ENV in Dockerfile)
> - CI/CD logs (mask all secret variables)
> - `.env` files committed to version control
> - Unencrypted configuration files

---

## 11. Incident Response Considerations

### 11.1 Incident Classification

| Severity | Description | Response Time | Examples |
|---|---|---|---|
| **P0 — Critical** | Active data breach, system-wide outage | Immediate (< 15 min) | SQL injection confirmed, database exposed, credentials leaked |
| **P1 — High** | Security vulnerability exploitable in production | < 1 hour | Auth bypass discovered, cross-tenant data access possible |
| **P2 — Medium** | Vulnerability with limited impact | < 4 hours | Rate limiting bypassed, PII in logs, dependency CVE (high severity) |
| **P3 — Low** | Security improvement needed | < 1 week | Dependency CVE (medium), missing security header, code hardening |

### 11.2 Incident Response Playbook

```mermaid
flowchart TD
    Detect["Incident Detected<br/>(Sentry alert, user report,<br/>audit log anomaly, scan result)"]
    Classify["Classify Severity<br/>(P0–P3)"]
    Contain["Containment<br/>(Stop the bleeding)"]
    Investigate["Investigation<br/>(Root cause analysis)"]
    Remediate["Remediation<br/>(Fix the vulnerability)"]
    Recover["Recovery<br/>(Restore normal operations)"]
    PostMortem["Post-Mortem<br/>(Document lessons learned)"]
    Improve["Improvement<br/>(Prevent recurrence)"]

    Detect --> Classify
    Classify --> Contain
    Contain --> Investigate
    Investigate --> Remediate
    Remediate --> Recover
    Recover --> PostMortem
    PostMortem --> Improve
```

### 11.3 Containment Actions by Incident Type

| Incident Type | Immediate Containment |
|---|---|
| **Credential compromise** | Rotate affected secrets; invalidate all sessions/tokens; force password reset |
| **Cross-tenant data leak** | Disable affected API endpoints; audit access logs; notify affected businesses |
| **SQL injection** | Block attack source IP; deploy WAF rule; disable affected endpoint |
| **Malicious file upload** | Quarantine uploaded files; scan storage bucket; disable uploads temporarily |
| **Dependency vulnerability** | Assess exploitability; patch or pin to safe version; deploy hotfix |
| **Account takeover** | Lock affected accounts; reset passwords; review audit logs |

### 11.4 Forensic Data Sources

| Source | Data Available | Retention |
|---|---|---|
| **Audit logs** | All state-changing operations with actor, IP, timestamp | 1–7 years |
| **Sentry** | Error stack traces, request context, user context | 90 days |
| **Application logs** | Structured JSON logs (nginx, gunicorn, Django, Celery) | 30 days |
| **Nginx access logs** | All HTTP requests with IP, method, path, status, timing | 30 days |
| **PostgreSQL logs** | Slow queries, connection events, errors | 14 days |
| **Redis logs** | Connection events, slow commands | 7 days |

### 11.5 Communication Plan

| Audience | Channel | When | Responsible |
|---|---|---|---|
| Engineering team | Slack / Teams #incidents | Immediately on P0/P1 | On-call engineer |
| Management | Direct message + email | Within 1 hour for P0/P1 | Engineering lead |
| Affected customers | Email + in-app notification | Within 24 hours if data affected | Product + legal |
| All customers | Status page update | As needed | DevOps |

### 11.6 Security Contact

All security vulnerabilities should be reported to the security team:

- **Email:** security@workpulse.com
- **Internal:** #security Slack channel
- **On-call escalation:** PagerDuty security rotation

### 11.7 Regular Security Activities

| Activity | Frequency | Owner |
|---|---|---|
| Dependency vulnerability scan | Every CI run + weekly | Automated (CI) |
| Penetration testing | Annually | External security firm |
| Code security review | Every PR (for sensitive modules) | Senior engineers |
| Access review (who has what) | Quarterly | Engineering lead |
| Secret rotation | Per schedule (see §10.2) | DevOps |
| Incident response drill | Semi-annually | Security team |
| Security awareness training | Annually | All engineering staff |
| Backup restoration test | Quarterly | DevOps |

---

## Appendix A: Security Checklist for Code Reviews

Every pull request touching security-sensitive code should verify:

- [ ] **Authentication:** Are all endpoints behind `IsAuthenticated`?
- [ ] **Authorization:** Is `HasModulePermission` applied with correct permission codename?
- [ ] **Tenant isolation:** Is `TenantViewMixin` used? Is `get_queryset()` filtered by `business_id`?
- [ ] **Input validation:** Are all inputs validated in the serializer? No raw user input in queries?
- [ ] **SQL safety:** No raw SQL with string interpolation? ORM or parameterized queries only?
- [ ] **File uploads:** Are files validated (type, size, magic bytes)? Filenames sanitized?
- [ ] **PII handling:** Are sensitive fields excluded from logs? Masked in API responses?
- [ ] **Error handling:** Are error responses generic in production? No stack traces or internal details?
- [ ] **Audit logging:** Are state-changing operations audit-logged?
- [ ] **Secrets:** No hardcoded credentials, API keys, or tokens in the code?
- [ ] **Dependencies:** Any new dependencies audited for vulnerabilities and license compliance?

## Appendix B: Django Security Settings Checklist

```python
# Production security settings — all must be configured

# HTTPS
SECURE_SSL_REDIRECT = True                          # ✅ Force HTTPS
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')  # ✅ Behind proxy

# HSTS
SECURE_HSTS_SECONDS = 31536000                      # ✅ 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True                # ✅ All subdomains
SECURE_HSTS_PRELOAD = True                           # ✅ Browser preload list

# Cookies
SESSION_COOKIE_SECURE = True                         # ✅ HTTPS only
SESSION_COOKIE_HTTPONLY = True                        # ✅ No JavaScript access
SESSION_COOKIE_SAMESITE = 'Strict'                   # ✅ No cross-site sending
CSRF_COOKIE_SECURE = True                            # ✅ HTTPS only
CSRF_COOKIE_HTTPONLY = True                           # ✅ No JavaScript access

# Headers
SECURE_CONTENT_TYPE_NOSNIFF = True                   # ✅ Prevent MIME sniffing
X_FRAME_OPTIONS = 'DENY'                             # ✅ Prevent clickjacking
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'  # ✅ Limit referrer info

# Debug
DEBUG = False                                         # ✅ NEVER True in production
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')             # ✅ Explicit host list

# Admin
ADMIN_URL = env('ADMIN_URL', default='admin/')        # ✅ Non-default admin URL path
```

---

> [!NOTE]
> This security design document should be reviewed and updated quarterly, or immediately after any security incident. All team members should be familiar with the security controls described here.
