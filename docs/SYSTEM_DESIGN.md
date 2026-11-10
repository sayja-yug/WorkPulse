# WorkPulse — System Design Document

> **Version:** 1.0
> **Last Updated:** 2025-07-14
> **Status:** Living Document
> **Audience:** Engineering Team, DevOps, Security, Architecture Review

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack Justification](#2-technology-stack-justification)
3. [System Layers](#3-system-layers)
4. [Multi-Tenant Architecture](#4-multi-tenant-architecture)
5. [Authentication Flow](#5-authentication-flow)
6. [RBAC Architecture](#6-rbac-architecture)
7. [Data Flow Diagrams](#7-data-flow-diagrams)
8. [Security Architecture](#8-security-architecture)
9. [Scalability Considerations](#9-scalability-considerations)
10. [Error Handling Strategy](#10-error-handling-strategy)

---

## 1. Architecture Overview

WorkPulse follows a **modular monolith** architecture — a single deployable unit with clear internal module boundaries and layer separation. This approach balances simplicity of deployment with maintainability and a clear path to future service extraction if scaling demands it.

### Core Design Principles

| Principle | Description |
|---|---|
| **Modular Monolith** | Single deployment unit with well-defined module boundaries per Django app |
| **Layered Architecture** | Strict separation of concerns across presentation, API, business logic, and data layers |
| **Tenant Isolation** | Every data query is scoped to a `business_id`; no cross-tenant data leakage is possible |
| **Convention over Configuration** | Consistent patterns across all modules reduce cognitive load |
| **Fail-Safe Defaults** | Deny by default for permissions; require explicit grants |
| **API-First** | All functionality is exposed via versioned REST APIs; the frontend is a pure SPA consumer |

### High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Client Layer"]
        ReactApp["React SPA<br/>(TypeScript + Vite)"]
        MobileApp["Mobile Browser /<br/>PWA"]
    end

    subgraph Edge["Edge Layer"]
        CDN["CDN<br/>(Static Assets)"]
        APIGateway["API Gateway /<br/>Reverse Proxy (Nginx)"]
    end

    subgraph Application["Django Application Server"]
        direction TB
        DRF["Django REST Framework<br/>API Router + Versioning"]

        subgraph Middleware["Middleware Stack"]
            AuthLayer["Authentication Layer<br/>(JWT Verification)"]
            RBACLayer["RBAC Layer<br/>(Permission Check)"]
            TenantLayer["Tenant Isolation Layer<br/>(business_id Scoping)"]
        end

        subgraph Core["Core Application"]
            BusinessLogic["Business Logic<br/>(Service Classes)"]
            ServiceLayer["Service Layer<br/>(Cross-Module Orchestration)"]
            Validators["Validation Layer<br/>(Serializers + Validators)"]
        end
    end

    subgraph DataStores["Data & Storage"]
        PostgreSQL["PostgreSQL 15+<br/>(Primary Database)"]
        Redis["Redis 7+<br/>(Cache + Broker)"]
        ObjectStorage["S3-Compatible<br/>Object Storage"]
    end

    subgraph Workers["Background Processing"]
        CeleryWorker["Celery Workers<br/>(Task Execution)"]
        CeleryBeat["Celery Beat<br/>(Periodic Tasks)"]
    end

    subgraph Observability["Observability"]
        Sentry["Sentry<br/>(Error Tracking)"]
        AuditLog["Audit Log<br/>(Database)"]
        Logging["Structured Logging<br/>(JSON)"]
    end

    ReactApp -->|HTTPS| CDN
    MobileApp -->|HTTPS| CDN
    CDN -->|API Requests| APIGateway
    APIGateway -->|Proxy Pass| DRF
    DRF --> AuthLayer
    AuthLayer --> RBACLayer
    RBACLayer --> TenantLayer
    TenantLayer --> BusinessLogic
    BusinessLogic --> ServiceLayer
    ServiceLayer --> Validators
    Validators --> PostgreSQL
    BusinessLogic --> Redis
    BusinessLogic --> ObjectStorage
    BusinessLogic -->|Dispatch| CeleryWorker
    CeleryBeat -->|Schedule| CeleryWorker
    CeleryWorker --> PostgreSQL
    CeleryWorker --> Redis
    DRF --> Sentry
    BusinessLogic --> AuditLog
    DRF --> Logging
```

### Module Boundaries

Each Django app represents a bounded context with clear responsibilities:

| Django App | Responsibility | Key Models |
|---|---|---|
| `accounts` | User management, authentication, profile | `User`, `UserProfile` |
| `businesses` | Business (tenant) management, onboarding | `Business`, `BusinessSettings` |
| `employees` | Employee lifecycle, documents, records | `Employee`, `EmployeeDocument` |
| `attendance` | Check-in/out, GPS, selfie, shifts | `Attendance`, `Shift`, `AttendancePhoto` |
| `leave` | Leave types, balances, requests, approvals | `LeaveType`, `LeaveBalance`, `LeaveRequest` |
| `payroll` | Salary, advances, payslips, calculations | `SalaryConfig`, `PayrollRun`, `PaySlip` |
| `expenses` | Expense categories, claims, approvals | `ExpenseCategory`, `Expense`, `ExpenseAttachment` |
| `notifications` | In-app, push, email, SMS notifications | `Notification`, `NotificationPreference` |
| `reports` | Analytics, data export, dashboards | `ReportConfig`, `ScheduledReport` |
| `audit` | Audit trails, activity logs | `AuditLog` |
| `common` | Shared utilities, base models, mixins | `BaseModel`, `TimeStampedModel` |

---

## 2. Technology Stack Justification

### Backend

| Technology | Version | Justification |
|---|---|---|
| **Python** | 3.11+ | Strong ecosystem for business applications; type hints for maintainability; excellent library support for payroll/financial calculations |
| **Django** | 4.2 LTS | Batteries-included framework with mature ORM, admin interface, migration system, and security features; LTS guarantees stability |
| **Django REST Framework** | 3.14+ | Industry-standard REST API toolkit for Django; serialization, authentication, throttling, and browsable API out of the box |
| **PostgreSQL** | 15+ | Advanced relational features (JSON fields, partial indexes, CTEs, window functions); row-level security capability; excellent Django ORM integration |
| **Redis** | 7+ | Sub-millisecond latency for caching, Celery message broker, session storage, and rate limiting; single dependency for multiple infrastructure needs |
| **Celery** | 5.3+ | Mature distributed task queue; retry logic, task chaining, periodic scheduling (Beat); handles payroll calculations, notification dispatch, report generation |
| **Gunicorn** | 21+ | Production-grade WSGI server; pre-fork worker model for concurrent request handling |
| **Nginx** | 1.24+ | Reverse proxy, static file serving, SSL termination, request buffering |

### Frontend

| Technology | Version | Justification |
|---|---|---|
| **React** | 18+ | Component-based architecture; large ecosystem; concurrent rendering for complex dashboard UIs |
| **TypeScript** | 5+ | Type safety catches errors at compile time; excellent IDE support; self-documenting code |
| **Vite** | 5+ | Lightning-fast HMR; optimized production builds with Rollup; native ES modules for development |
| **React Query (TanStack)** | 5+ | Server state management with automatic caching, background refetching, optimistic updates, and stale-while-revalidate patterns |
| **React Router** | 6+ | Declarative routing with nested layouts; role-based route guards |
| **Tailwind CSS** | 3+ | Utility-first CSS; design consistency; small production bundle via PurgeCSS |
| **Zod** | 3+ | Runtime schema validation on the frontend; pairs with TypeScript for end-to-end type safety |
| **React Hook Form** | 7+ | Performant form management; minimal re-renders; native integration with Zod for validation |

### Infrastructure & DevOps

| Technology | Justification |
|---|---|
| **Docker** | Consistent development and production environments; easy scaling |
| **Docker Compose** | Local development orchestration of all services |
| **GitHub Actions** | CI/CD pipelines for testing, linting, building, and deployment |
| **Sentry** | Real-time error tracking with full stack traces and context |
| **S3-Compatible Storage** | Scalable object storage for employee photos, documents, attachments |

---

## 3. System Layers

### 3.1 Presentation Layer

**Technologies:** React 18, TypeScript 5, Vite 5, Tailwind CSS 3

The presentation layer is a fully decoupled Single Page Application (SPA) that communicates exclusively via REST APIs. It has zero server-side rendering dependency.

**Architecture Patterns:**

```
src/
├── api/                  # API client, endpoint definitions, interceptors
│   ├── client.ts         # Axios instance with auth interceptor
│   ├── endpoints/        # Per-module API functions
│   └── types/            # API response/request TypeScript types
├── components/           # Reusable UI components
│   ├── ui/               # Primitive components (Button, Input, Modal)
│   ├── forms/            # Form components with validation
│   └── layout/           # Layout shells (Sidebar, Header, PageWrapper)
├── features/             # Feature modules (mirrors Django apps)
│   ├── attendance/
│   ├── employees/
│   ├── leave/
│   ├── payroll/
│   └── expenses/
├── hooks/                # Custom React hooks
├── contexts/             # React context providers (Auth, Theme, Tenant)
├── guards/               # Route guards (AuthGuard, RoleGuard)
├── utils/                # Utility functions
├── schemas/              # Zod validation schemas
└── stores/               # Client-side state (minimal; server state via React Query)
```

**Key Design Decisions:**

- **Server state via React Query:** All API data is managed through React Query, eliminating the need for Redux or other global state libraries for server-derived data.
- **Optimistic updates:** Mutations update the UI immediately and roll back on failure.
- **Code splitting:** Each feature module is lazy-loaded via `React.lazy()` and `Suspense`.
- **Role-aware rendering:** Components conditionally render based on the user's permissions fetched at login.

### 3.2 API Layer

**Technologies:** Django REST Framework 3.14+, drf-spectacular (OpenAPI)

The API layer provides versioned, self-documenting REST endpoints with consistent request/response formatting.

**Versioning Strategy:**

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.URLPathVersioning',
    'DEFAULT_VERSION': 'v1',
    'ALLOWED_VERSIONS': ['v1'],
    'VERSION_PARAM': 'version',
}

# URL configuration
# /api/v1/employees/
# /api/v1/attendance/
# /api/v2/employees/   (future)
```

**URL Namespace Convention:**

```
/api/v1/auth/login/
/api/v1/auth/refresh/
/api/v1/auth/logout/
/api/v1/businesses/{id}/
/api/v1/employees/
/api/v1/employees/{id}/
/api/v1/attendance/check-in/
/api/v1/attendance/check-out/
/api/v1/leave/requests/
/api/v1/leave/requests/{id}/approve/
/api/v1/payroll/runs/
/api/v1/payroll/runs/{id}/calculate/
/api/v1/expenses/
/api/v1/expenses/{id}/approve/
```

**Standard Response Envelope:**

```json
{
    "status": "success",
    "message": "Employees retrieved successfully",
    "data": { ... },
    "meta": {
        "page": 1,
        "page_size": 20,
        "total_count": 142,
        "total_pages": 8
    }
}
```

**Error Response Envelope:**

```json
{
    "status": "error",
    "message": "Validation failed",
    "errors": {
        "email": ["This email is already registered."],
        "phone": ["Phone number must be 10 digits."]
    },
    "error_code": "VALIDATION_ERROR"
}
```

**Content Negotiation:**

All endpoints accept and return `application/json`. File uploads use `multipart/form-data`. CSV/PDF exports return appropriate content types with `Content-Disposition` headers.

### 3.3 Authentication Layer

**Technologies:** djangorestframework-simplejwt, bcrypt

The authentication layer implements JWT-based stateless authentication with secure refresh token rotation.

**Token Configuration:**

| Parameter | Value | Rationale |
|---|---|---|
| Access Token Lifetime | 30 minutes | Short-lived to limit exposure window |
| Refresh Token Lifetime | 7 days | Convenience for mobile/browser users |
| Token Algorithm | HS256 | Symmetric signing; single-service architecture |
| Refresh Rotation | Enabled | New refresh token issued on each refresh |
| Blacklist on Rotation | Enabled | Old refresh tokens are immediately invalidated |

**Token Payload (Access Token):**

```json
{
    "token_type": "access",
    "exp": 1700000000,
    "iat": 1699998200,
    "jti": "unique-token-id",
    "user_id": 42,
    "business_id": 7,
    "role": "manager",
    "permissions": ["employee.view", "employee.create", "attendance.view"]
}
```

**Password Security:**

- Hashing: `bcrypt` with cost factor 12 (via Django's `BCryptSHA256PasswordHasher`)
- Minimum length: 8 characters
- Complexity: At least 1 uppercase, 1 lowercase, 1 digit, 1 special character
- Breach checking: Passwords checked against common breach lists (optional, via `CommonPasswordValidator`)
- History: Last 5 password hashes stored; re-use is blocked

### 3.4 Authorization Layer (Dynamic RBAC)

**Technologies:** Custom middleware + DRF permission classes

WorkPulse implements a dynamic, database-driven Role-Based Access Control system. Permissions are not hardcoded; they are configurable per business.

**RBAC Data Model:**

```
Role
├── id
├── business_id (FK → Business)
├── name (e.g., "Manager", "HR Admin", "Accountant")
├── is_system_role (True for built-in roles)
└── permissions (M2M → Permission)

Permission
├── id
├── codename (e.g., "employee.create", "payroll.approve")
├── module (e.g., "employee", "payroll")
├── action (e.g., "create", "view", "approve")
└── description

UserRole
├── user_id (FK → User)
├── role_id (FK → Role)
└── business_id (FK → Business)
```

**Built-in Roles:**

| Role | Description | Typical Permissions |
|---|---|---|
| `business_owner` | Full access to everything in their business | All permissions |
| `hr_admin` | Human resources management | Employee CRUD, leave management, attendance management |
| `manager` | Team management, approvals | View team, approve leave/expenses, view attendance |
| `accountant` | Financial operations | Payroll processing, expense management, salary configuration |
| `employee` | Self-service only | View own profile, mark attendance, apply leave, submit expenses |

**Permission Check Flow:**

```python
# Custom permission class
class HasModulePermission(BasePermission):
    def has_permission(self, request, view):
        required_permission = getattr(view, 'required_permission', None)
        if not required_permission:
            return False

        user = request.user
        business_id = request.business_id  # Set by TenantMiddleware

        return user.has_business_permission(business_id, required_permission)

# Usage in views
class EmployeeViewSet(viewsets.ModelViewSet):
    required_permission = 'employee.view'
    permission_classes = [IsAuthenticated, HasModulePermission]

    def get_permissions(self):
        if self.action == 'create':
            self.required_permission = 'employee.create'
        elif self.action in ['update', 'partial_update']:
            self.required_permission = 'employee.edit'
        elif self.action == 'destroy':
            self.required_permission = 'employee.delete'
        return super().get_permissions()
```

### 3.5 Tenant Isolation Layer

**Technologies:** Custom Django middleware, model managers, queryset mixins

Every piece of data in WorkPulse belongs to a specific business (tenant). The tenant isolation layer guarantees that no user can ever access data belonging to another business.

**Middleware Implementation:**

```python
class TenantMiddleware:
    """
    Extracts business_id from the authenticated user's JWT token
    and attaches it to the request object. All downstream queries
    are automatically scoped to this business_id.
    """
    def __call__(self, request):
        if request.user.is_authenticated:
            request.business_id = request.user.active_business_id

            if not request.business_id:
                return JsonResponse(
                    {"status": "error", "message": "No active business"},
                    status=403
                )
        return self.get_response(request)
```

**Model Manager Scoping:**

```python
class TenantManager(models.Manager):
    """All queries are automatically filtered by business_id."""
    def get_queryset(self):
        return super().get_queryset()

    def for_business(self, business_id):
        return self.get_queryset().filter(business_id=business_id)

class TenantMixin(models.Model):
    """Mixin for all tenant-scoped models."""
    business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE,
        related_name='%(class)s_set',
        db_index=True,
    )

    objects = TenantManager()

    class Meta:
        abstract = True
```

**View-Level Enforcement:**

```python
class TenantViewMixin:
    """Mixin that scopes all querysets to the current tenant."""
    def get_queryset(self):
        return super().get_queryset().filter(
            business_id=self.request.business_id
        )

    def perform_create(self, serializer):
        serializer.save(business_id=self.request.business_id)
```

> [!IMPORTANT]
> The combination of middleware-level `business_id` injection, model manager scoping, and view mixin enforcement creates **three independent layers** of tenant isolation. Even if one layer is accidentally bypassed, the others prevent cross-tenant data leakage.

### 3.6 Business Logic Layer

**Technologies:** Plain Python service classes, Django transactions

All complex business logic lives in **service classes**, not in views or serializers. Views are thin controllers; serializers handle only validation and data transformation.

**Service Class Pattern:**

```python
# services/payroll_service.py
from django.db import transaction
from django.utils import timezone

class PayrollService:
    """
    Encapsulates all payroll calculation business logic.
    Views call service methods; services call the ORM.
    """

    @staticmethod
    @transaction.atomic
    def calculate_payroll(business_id: int, month: int, year: int) -> PayrollRun:
        """
        Calculate payroll for all employees in a business for a given month.

        Steps:
        1. Fetch all active employees
        2. Calculate working days from attendance records
        3. Apply salary configuration (basic, allowances, deductions)
        4. Deduct advances and loans
        5. Calculate statutory deductions (PF, ESI, TDS)
        6. Generate individual payslips
        7. Create payroll run record
        """
        employees = Employee.objects.filter(
            business_id=business_id,
            status='active'
        ).select_related('salary_config')

        payroll_run = PayrollRun.objects.create(
            business_id=business_id,
            month=month,
            year=year,
            status='calculating',
            initiated_by=...,
        )

        for employee in employees:
            payslip = PayrollService._calculate_employee_payslip(
                employee=employee,
                month=month,
                year=year,
                payroll_run=payroll_run,
            )

        payroll_run.status = 'pending_approval'
        payroll_run.calculated_at = timezone.now()
        payroll_run.save()

        return payroll_run

    @staticmethod
    def _calculate_employee_payslip(employee, month, year, payroll_run):
        attendance = AttendanceService.get_monthly_summary(
            employee_id=employee.id, month=month, year=year
        )
        salary = employee.salary_config
        working_days = attendance['present_days'] + attendance['half_days'] * 0.5
        # ... detailed calculation logic
```

**Key Service Classes:**

| Service | Responsibilities |
|---|---|
| `AuthService` | Login, token management, password reset |
| `EmployeeService` | Employee CRUD, onboarding, offboarding workflows |
| `AttendanceService` | Check-in/out processing, GPS validation, photo storage |
| `LeaveService` | Leave application, approval workflows, balance calculations |
| `PayrollService` | Salary calculation, payslip generation, statutory compliance |
| `ExpenseService` | Expense submission, approval workflows, reimbursement tracking |
| `NotificationService` | Multi-channel notification dispatch |
| `ReportService` | Report generation, scheduling, export |
| `AuditService` | Activity logging, audit trail creation |

### 3.7 Data Layer

**Technologies:** PostgreSQL 15+, Django ORM, django-postgres-extra

**Base Model Convention:**

All models inherit from a `BaseModel` that provides standard fields:

```python
class BaseModel(models.Model):
    """Abstract base for all WorkPulse models."""
    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']

class TenantBaseModel(BaseModel, TenantMixin):
    """Abstract base for all tenant-scoped models."""
    class Meta:
        abstract = True
```

**Simplified Entity Relationship Diagram:**

```mermaid
erDiagram
    Business ||--o{ User : employs
    Business ||--o{ Employee : manages
    Business ||--o{ Role : defines
    Business ||--o{ LeaveType : configures
    Business ||--o{ ExpenseCategory : configures

    User ||--o{ UserRole : has
    Role ||--o{ UserRole : assigned_to
    Role }o--o{ Permission : grants

    Employee ||--o{ Attendance : records
    Employee ||--o{ LeaveBalance : has
    Employee ||--o{ LeaveRequest : submits
    Employee ||--o{ SalaryConfig : has
    Employee ||--o{ PaySlip : receives
    Employee ||--o{ Expense : submits

    Attendance ||--o| AttendancePhoto : has

    LeaveType ||--o{ LeaveBalance : defines
    LeaveType ||--o{ LeaveRequest : categorizes

    PayrollRun ||--o{ PaySlip : contains

    Business {
        bigint id PK
        string name
        string industry
        jsonb settings
        boolean is_active
    }

    User {
        bigint id PK
        string email
        string phone
        string password_hash
        bigint business_id FK
    }

    Employee {
        bigint id PK
        bigint business_id FK
        bigint user_id FK
        string employee_code
        string name
        date joining_date
        string department
        string designation
        string status
    }

    Attendance {
        bigint id PK
        bigint employee_id FK
        bigint business_id FK
        date date
        datetime check_in
        datetime check_out
        point check_in_location
        string status
    }

    LeaveRequest {
        bigint id PK
        bigint employee_id FK
        bigint business_id FK
        bigint leave_type_id FK
        date start_date
        date end_date
        string status
        bigint approved_by FK
    }

    PayrollRun {
        bigint id PK
        bigint business_id FK
        int month
        int year
        string status
        decimal total_amount
    }

    Expense {
        bigint id PK
        bigint employee_id FK
        bigint business_id FK
        bigint category_id FK
        decimal amount
        string status
        date expense_date
    }
```

**Database Indexing Strategy:**

```python
class Attendance(TenantBaseModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    date = models.DateField()
    check_in = models.DateTimeField(null=True)
    check_out = models.DateTimeField(null=True)
    status = models.CharField(max_length=20)

    class Meta:
        # Composite indexes for common query patterns
        indexes = [
            models.Index(fields=['business_id', 'date']),
            models.Index(fields=['employee_id', 'date']),
            models.Index(fields=['business_id', 'employee_id', 'date']),
            models.Index(fields=['business_id', 'status', 'date']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['employee_id', 'date'],
                name='unique_attendance_per_day'
            ),
        ]
```

### 3.8 Background Processing Layer

**Technologies:** Celery 5.3+, Redis (as broker), Celery Beat

Background tasks handle long-running operations, scheduled jobs, and asynchronous workflows that should not block API responses.

**Task Categories:**

| Category | Examples | Priority | Retry Policy |
|---|---|---|---|
| **Notifications** | Email, SMS, push notifications | Medium | 3 retries, exponential backoff |
| **Payroll** | Salary calculations, payslip PDF generation | High | 2 retries, 60s delay |
| **Reports** | Scheduled reports, CSV/PDF exports | Low | 3 retries, 120s delay |
| **Maintenance** | Stale session cleanup, log rotation | Low | 1 retry |
| **Data Processing** | Bulk employee imports, attendance reconciliation | Medium | 3 retries, 30s delay |

**Celery Configuration:**

```python
# celery_app.py
from celery import Celery
from celery.schedules import crontab

app = Celery('workpulse')
app.config_from_object('django.conf:settings', namespace='CELERY')

# Task routing by queue
app.conf.task_routes = {
    'notifications.*': {'queue': 'notifications'},
    'payroll.*': {'queue': 'payroll'},
    'reports.*': {'queue': 'reports'},
    'maintenance.*': {'queue': 'maintenance'},
}

# Periodic tasks via Celery Beat
app.conf.beat_schedule = {
    'auto-checkout-missing': {
        'task': 'attendance.tasks.auto_checkout_missing',
        'schedule': crontab(hour=23, minute=30),  # 11:30 PM daily
    },
    'generate-daily-attendance-summary': {
        'task': 'attendance.tasks.generate_daily_summary',
        'schedule': crontab(hour=0, minute=15),  # 12:15 AM daily
    },
    'leave-balance-monthly-accrual': {
        'task': 'leave.tasks.monthly_leave_accrual',
        'schedule': crontab(day_of_month=1, hour=1, minute=0),  # 1st of every month
    },
    'cleanup-expired-tokens': {
        'task': 'accounts.tasks.cleanup_expired_tokens',
        'schedule': crontab(hour=3, minute=0),  # 3 AM daily
    },
}
```

**Task Example:**

```python
from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
    reject_on_worker_lost=True,
)
def generate_payslip_pdf(self, payslip_id: int):
    """Generate a PDF payslip and store it in object storage."""
    try:
        payslip = PaySlip.objects.select_related(
            'employee', 'payroll_run'
        ).get(id=payslip_id)

        pdf_content = PayslipPDFGenerator.generate(payslip)
        storage_path = f"payslips/{payslip.business_id}/{payslip.payroll_run.year}/{payslip.payroll_run.month}/{payslip.employee.employee_code}.pdf"

        default_storage.save(storage_path, ContentFile(pdf_content))

        payslip.pdf_path = storage_path
        payslip.save(update_fields=['pdf_path'])

        logger.info(f"Generated payslip PDF for payslip_id={payslip_id}")
    except PaySlip.DoesNotExist:
        logger.error(f"PaySlip {payslip_id} not found")
    except Exception as exc:
        logger.exception(f"Failed to generate payslip PDF: {exc}")
        raise self.retry(exc=exc)
```

### 3.9 Cache Layer

**Technologies:** Redis 7+, django-redis

Caching is applied at multiple levels to minimize database load and improve response times.

**Cache Strategy by Data Type:**

| Data | Cache Key Pattern | TTL | Invalidation |
|---|---|---|---|
| User permissions | `perms:{user_id}:{business_id}` | 15 minutes | On role/permission change |
| Business settings | `biz_settings:{business_id}` | 1 hour | On settings update |
| Employee list (page) | `emp_list:{business_id}:{page}:{filters_hash}` | 5 minutes | On employee CRUD |
| Dashboard aggregates | `dashboard:{business_id}:{date}` | 10 minutes | On attendance/leave changes |
| Leave balances | `leave_bal:{employee_id}:{leave_type_id}` | 30 minutes | On leave request status change |
| Rate limit counters | `rl:{ip}:{endpoint}` | Per-window | Automatic expiry |

**Implementation:**

```python
from django.core.cache import cache

class PermissionCache:
    @staticmethod
    def get_permissions(user_id: int, business_id: int) -> list[str]:
        cache_key = f"perms:{user_id}:{business_id}"
        permissions = cache.get(cache_key)

        if permissions is None:
            permissions = list(
                UserRole.objects.filter(
                    user_id=user_id,
                    role__business_id=business_id,
                ).values_list(
                    'role__permissions__codename', flat=True
                )
            )
            cache.set(cache_key, permissions, timeout=900)  # 15 min

        return permissions

    @staticmethod
    def invalidate(user_id: int, business_id: int):
        cache.delete(f"perms:{user_id}:{business_id}")
```

### 3.10 File Storage Layer

**Technologies:** django-storages, S3-compatible object storage (AWS S3 / MinIO)

**Storage Categories:**

| Category | Path Convention | Max Size | Allowed Types |
|---|---|---|---|
| Attendance selfies | `attendance/{business_id}/{date}/{employee_id}.jpg` | 5 MB | JPEG, PNG |
| Employee documents | `documents/{business_id}/{employee_id}/{doc_type}/{filename}` | 10 MB | PDF, JPEG, PNG |
| Payslip PDFs | `payslips/{business_id}/{year}/{month}/{employee_code}.pdf` | 2 MB | PDF (generated) |
| Expense receipts | `expenses/{business_id}/{expense_id}/{filename}` | 5 MB | JPEG, PNG, PDF |
| Business logos | `logos/{business_id}/logo.{ext}` | 2 MB | JPEG, PNG, SVG |

**Security Controls:**

- All uploads are validated for MIME type, file extension, and magic bytes (file header inspection).
- File names are sanitized and replaced with UUIDs to prevent path traversal.
- Pre-signed URLs are used for direct browser access with short expiry (15 minutes).
- No executable file types are permitted.
- Uploaded files are stored outside the web root and served only through the application.

```python
# storage configuration
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = 'private'
AWS_S3_SIGNATURE_VERSION = 's3v4'
AWS_S3_REGION_NAME = 'ap-south-1'
AWS_QUERYSTRING_EXPIRE = 900  # 15-minute pre-signed URLs
```

### 3.11 Monitoring & Observability Layer

**Technologies:** Sentry, structured logging (structlog), Django audit trail

**Error Tracking (Sentry):**

```python
# settings.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.redis import RedisIntegration

sentry_sdk.init(
    dsn=env('SENTRY_DSN'),
    integrations=[
        DjangoIntegration(),
        CeleryIntegration(),
        RedisIntegration(),
    ],
    traces_sample_rate=0.1,  # 10% of transactions for performance monitoring
    profiles_sample_rate=0.1,
    send_default_pii=False,  # Do not send PII to Sentry
    environment=env('ENVIRONMENT'),
)
```

**Structured Logging:**

```python
import structlog

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
)

logger = structlog.get_logger()

# Usage
logger.info(
    "attendance.check_in",
    employee_id=employee.id,
    business_id=business.id,
    latitude=lat,
    longitude=lng,
    method="gps_selfie",
)
```

**Audit Logging:**

```python
class AuditLog(BaseModel):
    """Immutable audit trail for all state-changing operations."""
    business = models.ForeignKey('businesses.Business', on_delete=models.CASCADE)
    user = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50)  # CREATE, UPDATE, DELETE, APPROVE, REJECT
    resource_type = models.CharField(max_length=50)  # employee, leave_request, payroll_run
    resource_id = models.BigIntegerField()
    changes = models.JSONField(default=dict)  # {field: {old: X, new: Y}}
    ip_address = models.GenericIPAddressField(null=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['business_id', 'timestamp']),
            models.Index(fields=['business_id', 'resource_type', 'resource_id']),
            models.Index(fields=['user_id', 'timestamp']),
        ]
```

---

## 4. Multi-Tenant Architecture

### Strategy: Shared Database, Row-Level Isolation

WorkPulse uses a **shared database** architecture where all tenants' data lives in the same PostgreSQL database, isolated by a `business_id` foreign key on every tenant-scoped table.

**Why Shared Database Over Schema-per-Tenant or DB-per-Tenant:**

| Criterion | Shared DB (Chosen) | Schema-per-Tenant | DB-per-Tenant |
|---|---|---|---|
| Setup complexity | Low | Medium | High |
| Operational cost | Low (1 DB) | Medium | High (N DBs) |
| Migration simplicity | Single migration run | N schema migrations | N DB migrations |
| Cross-tenant queries | Easy (admin/reports) | Possible but complex | Very complex |
| Tenant count scaling | 10,000+ tenants easily | ~1,000 tenants practical | ~100 tenants practical |
| Data isolation strength | Application-enforced | DB-schema enforced | Full DB isolation |
| Suitable for WorkPulse | ✅ Yes | ❌ Overkill | ❌ Overkill |

### Isolation Enforcement Points

```mermaid
flowchart LR
    subgraph Layer1["Layer 1: Middleware"]
        M1["TenantMiddleware<br/>Extracts business_id<br/>from JWT token"]
    end

    subgraph Layer2["Layer 2: View"]
        V1["TenantViewMixin<br/>Filters queryset by<br/>business_id"]
        V2["perform_create()<br/>Injects business_id<br/>on save"]
    end

    subgraph Layer3["Layer 3: Model Manager"]
        MM1["TenantManager<br/>for_business() method<br/>scoped queries"]
    end

    subgraph Layer4["Layer 4: Database"]
        DB1["Foreign Key Constraint<br/>business_id NOT NULL"]
        DB2["Composite Indexes<br/>(business_id, ...)"]
    end

    M1 --> V1
    V1 --> V2
    V2 --> MM1
    MM1 --> DB1
    DB1 --> DB2
```

### Admin/Superuser Access

Platform administrators (WorkPulse staff, not business owners) can access data across tenants for support purposes. This access is:
- Restricted to a separate admin interface (Django Admin)
- Protected by additional 2FA requirements
- Fully audited with every access logged
- Limited to read-only by default; write access requires explicit escalation

---

## 5. Authentication Flow

### 5.1 Login Flow

```mermaid
sequenceDiagram
    participant C as React Client
    participant A as API Gateway
    participant D as Django Auth Service
    participant DB as PostgreSQL
    participant R as Redis Cache

    C->>A: POST /api/v1/auth/login/<br/>{email, password}
    A->>D: Forward request
    D->>DB: Lookup user by email
    DB-->>D: User record (hashed password)

    alt Invalid credentials
        D-->>A: 401 Unauthorized
        A-->>C: {"status": "error", "message": "Invalid credentials"}
    end

    D->>D: Verify password<br/>(bcrypt compare)
    D->>D: Check account status<br/>(active, not locked)
    D->>DB: Fetch user roles & permissions
    DB-->>D: Roles, permissions list
    D->>R: Cache permissions<br/>key: perms:{user_id}:{business_id}
    D->>D: Generate JWT access token<br/>(30 min expiry)
    D->>D: Generate JWT refresh token<br/>(7 day expiry)
    D->>DB: Store refresh token hash<br/>(OutstandingToken table)
    D-->>A: 200 OK<br/>{access, refresh, user, permissions}
    A-->>C: Tokens + user data

    C->>C: Store access token in memory<br/>Store refresh token in httpOnly cookie
```

### 5.2 Token Refresh Flow

```mermaid
sequenceDiagram
    participant C as React Client
    participant A as API Gateway
    participant D as Django Auth Service
    participant DB as PostgreSQL

    C->>C: Access token expired<br/>(detected by interceptor)
    C->>A: POST /api/v1/auth/refresh/<br/>{refresh: token}
    A->>D: Forward request
    D->>DB: Lookup refresh token in<br/>OutstandingToken table

    alt Token blacklisted or expired
        D-->>A: 401 Unauthorized
        A-->>C: {"status": "error", "message": "Token invalid"}
        C->>C: Redirect to login
    end

    D->>DB: Blacklist old refresh token<br/>(insert into BlacklistedToken)
    D->>D: Generate new access token
    D->>D: Generate new refresh token<br/>(rotation)
    D->>DB: Store new refresh token hash
    D-->>A: 200 OK {access, refresh}
    A-->>C: New token pair

    C->>C: Update stored tokens
    C->>A: Retry original failed request<br/>with new access token
```

### 5.3 Logout Flow

```mermaid
sequenceDiagram
    participant C as React Client
    participant A as API Gateway
    participant D as Django Auth Service
    participant DB as PostgreSQL
    participant R as Redis Cache

    C->>A: POST /api/v1/auth/logout/<br/>{refresh: token}
    A->>D: Forward request
    D->>DB: Blacklist refresh token
    D->>R: Delete cached permissions<br/>key: perms:{user_id}:{business_id}
    D-->>A: 200 OK
    A-->>C: {"status": "success"}

    C->>C: Clear access token from memory
    C->>C: Clear refresh cookie
    C->>C: Redirect to login page
```

### 5.4 Frontend Token Management

```typescript
// api/client.ts — Axios interceptor for automatic token refresh
import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1' });

let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post('/api/v1/auth/refresh/', {
          refresh: getRefreshToken(),
        });
        setAccessToken(data.data.access);
        setRefreshToken(data.data.refresh);

        // Replay queued requests
        failedQueue.forEach(({ resolve }) => resolve(data.data.access));
        failedQueue = [];

        originalRequest.headers['Authorization'] = `Bearer ${data.data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        failedQueue.forEach(({ reject }) => reject(refreshError));
        failedQueue = [];
        logout(); // Clear tokens and redirect to login
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 6. RBAC Architecture

### Permission Resolution Flow

```mermaid
flowchart TD
    Request["Incoming API Request"]
    AuthMW["Authentication Middleware<br/>(Verify JWT Token)"]
    TenantMW["Tenant Middleware<br/>(Extract business_id)"]
    PermClass["DRF Permission Class<br/>(HasModulePermission)"]
    CacheCheck{"Permissions<br/>cached in Redis?"}
    FetchDB["Fetch from DB<br/>(UserRole → Role → Permission)"]
    CacheStore["Cache in Redis<br/>(15 min TTL)"]
    PermCheck{"User has<br/>required permission?"}
    ObjectPerm{"Object-level<br/>permission check?"}
    ViewLogic["Execute View Logic"]
    Deny403["403 Forbidden"]

    Request --> AuthMW
    AuthMW --> TenantMW
    TenantMW --> PermClass
    PermClass --> CacheCheck
    CacheCheck -->|Yes| PermCheck
    CacheCheck -->|No| FetchDB
    FetchDB --> CacheStore
    CacheStore --> PermCheck
    PermCheck -->|No| Deny403
    PermCheck -->|Yes| ObjectPerm
    ObjectPerm -->|"Pass (or N/A)"| ViewLogic
    ObjectPerm -->|Fail| Deny403
```

### Permission Codename Convention

Permissions follow a `{module}.{action}` naming convention:

```
employee.view          employee.create        employee.edit          employee.delete
attendance.view        attendance.mark        attendance.edit        attendance.admin
leave.view             leave.apply            leave.approve          leave.admin
payroll.view           payroll.calculate      payroll.approve        payroll.admin
expense.view           expense.submit         expense.approve        expense.admin
report.view            report.create          report.export          report.admin
settings.view          settings.edit
```

### Object-Level Permissions

Beyond module-level permissions, certain operations require **object-level** permission checks:

```python
class IsOwnerOrManager(BasePermission):
    """
    Object-level permission:
    - Employees can only view/edit their own records
    - Managers can view/edit their team members' records
    - HR admins can view/edit all records in their business
    """
    def has_object_permission(self, request, view, obj):
        user = request.user

        # HR admins have full access within their business
        if user.has_business_permission(request.business_id, f'{view.module}.admin'):
            return True

        # Managers can access their team members
        if user.has_business_permission(request.business_id, f'{view.module}.view'):
            if hasattr(obj, 'employee'):
                return obj.employee.manager_id == user.employee_id
            if hasattr(obj, 'manager'):
                return obj.manager_id == user.employee_id

        # Employees can only access their own records
        if hasattr(obj, 'employee_id'):
            return obj.employee_id == user.employee_id

        return False
```

### Dynamic Role Management

Business owners can create custom roles and assign permissions:

```python
# API: POST /api/v1/roles/
{
    "name": "Team Lead",
    "permissions": [
        "employee.view",
        "attendance.view",
        "attendance.mark",
        "leave.view",
        "leave.approve"
    ]
}
```

System roles (`business_owner`, `employee`) cannot be deleted or have their core permissions removed. Custom roles can be freely created, modified, and deleted by users with `settings.edit` permission.

---

## 7. Data Flow Diagrams

### 7.1 Employee Check-In with GPS/Selfie

```mermaid
flowchart TD
    Start["Employee opens app"]
    GPS["Capture GPS coordinates<br/>(Browser Geolocation API)"]
    Selfie["Capture selfie photo<br/>(Camera API)"]
    Validate["Frontend validation<br/>(GPS accuracy, photo size)"]

    Submit["POST /api/v1/attendance/check-in/<br/>{latitude, longitude, photo}"]

    AuthCheck["JWT Authentication"]
    TenantCheck["Tenant Isolation"]
    PermCheck["Permission Check<br/>(attendance.mark)"]

    GPSValidate["Validate GPS coordinates<br/>(within office radius?)"]
    TimeValidate["Validate check-in time<br/>(within shift window?)"]
    DuplicateCheck["Check for existing<br/>check-in today"]

    SavePhoto["Upload selfie to<br/>S3 Object Storage"]
    CreateRecord["Create Attendance record<br/>(status: present)"]
    AuditLog["Log to audit trail"]
    Notify["Notify manager<br/>(if late check-in)"]

    Response["200 OK<br/>{attendance_id, check_in_time, status}"]
    Error["400/403 Error<br/>{reason}"]

    Start --> GPS
    GPS --> Selfie
    Selfie --> Validate
    Validate --> Submit
    Submit --> AuthCheck
    AuthCheck --> TenantCheck
    TenantCheck --> PermCheck
    PermCheck --> GPSValidate

    GPSValidate -->|Outside radius| Error
    GPSValidate -->|Within radius| TimeValidate
    TimeValidate --> DuplicateCheck
    DuplicateCheck -->|Already checked in| Error
    DuplicateCheck -->|No record| SavePhoto
    SavePhoto --> CreateRecord
    CreateRecord --> AuditLog
    AuditLog --> Notify
    Notify --> Response
```

### 7.2 Leave Application and Approval

```mermaid
flowchart TD
    Apply["Employee submits leave request<br/>POST /api/v1/leave/requests/<br/>{leave_type, start_date, end_date, reason}"]
    ValidateInput["Validate input<br/>(dates, leave type exists)"]
    CheckBalance["Check leave balance<br/>(sufficient days?)"]
    CheckOverlap["Check for overlapping<br/>approved leaves"]
    CheckBlackout["Check blackout dates<br/>(business configuration)"]

    Create["Create LeaveRequest<br/>(status: pending)"]
    NotifyMgr["Send notification to<br/>reporting manager"]
    NotifyHR["Send notification to<br/>HR admin"]

    MgrDecision{"Manager reviews<br/>and decides"}
    Approve["PUT /api/v1/leave/requests/{id}/approve/"]
    Reject["PUT /api/v1/leave/requests/{id}/reject/<br/>{rejection_reason}"]

    DeductBalance["Deduct leave balance"]
    UpdateStatus["Update status: approved"]
    NotifyEmployee["Notify employee<br/>(approved)"]
    AuditApprove["Audit log: leave approved"]

    UpdateReject["Update status: rejected"]
    NotifyReject["Notify employee<br/>(rejected with reason)"]
    AuditReject["Audit log: leave rejected"]

    Error["400 Error<br/>(insufficient balance /<br/>overlap / blackout)"]

    Apply --> ValidateInput
    ValidateInput --> CheckBalance
    CheckBalance -->|Insufficient| Error
    CheckBalance -->|Sufficient| CheckOverlap
    CheckOverlap -->|Overlap exists| Error
    CheckOverlap -->|No overlap| CheckBlackout
    CheckBlackout -->|Blackout period| Error
    CheckBlackout -->|OK| Create
    Create --> NotifyMgr
    Create --> NotifyHR
    NotifyMgr --> MgrDecision
    MgrDecision -->|Approve| Approve
    MgrDecision -->|Reject| Reject
    Approve --> DeductBalance
    DeductBalance --> UpdateStatus
    UpdateStatus --> NotifyEmployee
    NotifyEmployee --> AuditApprove
    Reject --> UpdateReject
    UpdateReject --> NotifyReject
    NotifyReject --> AuditReject
```

### 7.3 Payroll Calculation and Approval

```mermaid
flowchart TD
    Initiate["HR/Accountant initiates payroll<br/>POST /api/v1/payroll/runs/calculate/<br/>{month, year}"]
    PermCheck["Check permission:<br/>payroll.calculate"]
    CreateRun["Create PayrollRun<br/>(status: calculating)"]
    DispatchTask["Dispatch Celery task<br/>(async calculation)"]
    Immediate["Return 202 Accepted<br/>{payroll_run_id, status: calculating}"]

    subgraph CeleryWorker["Celery Worker (Background)"]
        FetchEmployees["Fetch all active<br/>employees"]
        ForEach["For each employee:"]
        CalcAttendance["Calculate working days<br/>from attendance records"]
        CalcSalary["Apply salary structure<br/>(basic + allowances)"]
        CalcDeductions["Calculate deductions<br/>(PF, ESI, TDS, advances)"]
        CalcNet["Calculate net salary"]
        GenPayslip["Generate PaySlip record"]
        GenPDF["Generate payslip PDF<br/>(async sub-task)"]
    end

    UpdateRun["Update PayrollRun<br/>(status: pending_approval,<br/>total_amount, summary)"]
    NotifyApprover["Notify business owner /<br/>authorized approver"]

    ApproverReview{"Approver reviews<br/>payroll summary"}
    ApprovePayroll["PUT /api/v1/payroll/runs/{id}/approve/"]
    RejectPayroll["PUT /api/v1/payroll/runs/{id}/reject/<br/>{notes}"]

    MarkApproved["Update status: approved<br/>Lock payslips"]
    AuditApprove["Audit log: payroll approved"]
    NotifyAll["Notify all employees<br/>(payslip ready)"]

    MarkRejected["Update status: rejected"]
    AuditReject["Audit log: payroll rejected"]

    Initiate --> PermCheck
    PermCheck --> CreateRun
    CreateRun --> DispatchTask
    DispatchTask --> Immediate

    DispatchTask -.->|Async| FetchEmployees
    FetchEmployees --> ForEach
    ForEach --> CalcAttendance
    CalcAttendance --> CalcSalary
    CalcSalary --> CalcDeductions
    CalcDeductions --> CalcNet
    CalcNet --> GenPayslip
    GenPayslip --> GenPDF

    GenPayslip --> UpdateRun
    UpdateRun --> NotifyApprover
    NotifyApprover --> ApproverReview
    ApproverReview -->|Approve| ApprovePayroll
    ApproverReview -->|Reject| RejectPayroll
    ApprovePayroll --> MarkApproved
    MarkApproved --> AuditApprove
    AuditApprove --> NotifyAll
    RejectPayroll --> MarkRejected
    MarkRejected --> AuditReject
```

### 7.4 Expense Submission and Approval

```mermaid
flowchart TD
    Submit["Employee submits expense<br/>POST /api/v1/expenses/<br/>{category, amount, date,<br/>description, receipt_photo}"]
    ValidateInput["Validate input<br/>(amount > 0, valid category,<br/>date not future)"]
    ValidateFile["Validate receipt file<br/>(type, size, magic bytes)"]
    CheckPolicy["Check expense policy<br/>(within category limits?)"]
    UploadReceipt["Upload receipt to<br/>S3 Object Storage"]
    CreateExpense["Create Expense record<br/>(status: pending)"]
    AutoApprove{"Amount within<br/>auto-approve<br/>threshold?"}

    NotifyMgr["Notify reporting manager"]
    MgrDecision{"Manager reviews"}

    ApproveExpense["PUT /api/v1/expenses/{id}/approve/"]
    RejectExpense["PUT /api/v1/expenses/{id}/reject/<br/>{reason}"]

    CheckBudget["Check department<br/>monthly budget"]
    MarkApproved["Update status: approved"]
    MarkReimbursable["Add to reimbursement<br/>queue"]
    AuditApprove["Audit log"]
    NotifyApproved["Notify employee"]

    MarkRejected["Update status: rejected"]
    AuditReject["Audit log"]
    NotifyRejected["Notify employee"]

    Error["400 Error"]

    Submit --> ValidateInput
    ValidateInput -->|Invalid| Error
    ValidateInput -->|Valid| ValidateFile
    ValidateFile -->|Invalid file| Error
    ValidateFile -->|Valid| CheckPolicy
    CheckPolicy -->|Over limit| Error
    CheckPolicy -->|Within limit| UploadReceipt
    UploadReceipt --> CreateExpense
    CreateExpense --> AutoApprove
    AutoApprove -->|Yes| MarkApproved
    AutoApprove -->|No| NotifyMgr
    NotifyMgr --> MgrDecision
    MgrDecision -->|Approve| ApproveExpense
    MgrDecision -->|Reject| RejectExpense
    ApproveExpense --> CheckBudget
    CheckBudget --> MarkApproved
    MarkApproved --> MarkReimbursable
    MarkReimbursable --> AuditApprove
    AuditApprove --> NotifyApproved
    RejectExpense --> MarkRejected
    MarkRejected --> AuditReject
    AuditReject --> NotifyRejected
```

---

## 8. Security Architecture

### Defense in Depth

WorkPulse implements security at every layer of the stack, following the principle that no single security control should be solely relied upon.

```mermaid
flowchart TD
    subgraph L1["Layer 1: Network"]
        HTTPS["HTTPS / TLS 1.3"]
        CORS["CORS Policy"]
        RateLimit["Rate Limiting"]
        WAF["Web Application Firewall<br/>(optional)"]
    end

    subgraph L2["Layer 2: Authentication"]
        JWT["JWT Token Verification"]
        PasswordPolicy["Password Policy Enforcement"]
        TokenRotation["Refresh Token Rotation"]
        Blacklisting["Token Blacklisting"]
    end

    subgraph L3["Layer 3: Authorization"]
        RBAC["Role-Based Access Control"]
        ObjectPerms["Object-Level Permissions"]
        TenantIso["Tenant Isolation"]
    end

    subgraph L4["Layer 4: Input Validation"]
        DRFValidation["DRF Serializer Validation"]
        DjangoValidators["Django Model Validators"]
        SQLInjection["ORM Parameterized Queries"]
        XSSProtection["Auto-escaped Templates<br/>+ DRF JSON Responses"]
    end

    subgraph L5["Layer 5: Data Protection"]
        Encryption["Encryption at Rest<br/>(PostgreSQL + S3)"]
        Transit["Encryption in Transit<br/>(TLS everywhere)"]
        PIIMasking["PII Masking in Logs"]
        Hashing["Password Hashing<br/>(bcrypt)"]
    end

    subgraph L6["Layer 6: Monitoring"]
        AuditTrail["Audit Trail"]
        ErrorTracking["Sentry Error Tracking"]
        AccessLogs["Access Logging"]
        Alerting["Security Alerting"]
    end

    L1 --> L2
    L2 --> L3
    L3 --> L4
    L4 --> L5
    L5 --> L6
```

### Security Controls Summary

| Attack Vector | Mitigation |
|---|---|
| **SQL Injection** | Django ORM parameterized queries; no raw SQL without explicit parameterization |
| **XSS** | JSON API responses (no HTML rendering); Content-Type headers enforced; CSP headers |
| **CSRF** | SameSite cookies; CSRF tokens for session-based operations (admin) |
| **Broken Authentication** | JWT with short expiry; refresh rotation; password complexity; account lockout |
| **Broken Access Control** | RBAC at middleware level; tenant isolation; object-level permissions |
| **Data Exposure** | Field-level serialization; no stack traces in production; PII masking |
| **Rate Limiting** | Per-IP and per-user rate limits on auth endpoints and sensitive operations |
| **File Upload Attacks** | MIME type validation; magic byte inspection; size limits; no execution |
| **Dependency Vulnerabilities** | `pip-audit` and `npm audit` in CI/CD; Dependabot alerts |

---

## 9. Scalability Considerations

### 9.1 Database Performance

**Indexing Strategy:**

```python
# High-cardinality queries get composite indexes
class Meta:
    indexes = [
        # Attendance lookups: "all attendance for a business on a date"
        models.Index(fields=['business_id', 'date']),
        # Employee attendance history: "all attendance for an employee"
        models.Index(fields=['employee_id', 'date']),
        # Status-filtered queries: "all pending leave requests"
        models.Index(fields=['business_id', 'status', 'created_at']),
        # Partial indexes for active records
        models.Index(
            fields=['business_id', 'status'],
            condition=Q(is_active=True),
            name='idx_active_%(class)s_status',
        ),
    ]
```

**Query Optimization Practices:**

| Practice | Implementation |
|---|---|
| **Select related** | `select_related()` for FK joins; `prefetch_related()` for M2M and reverse FK |
| **Deferred fields** | `only()` / `defer()` for large text/JSON fields not needed in list views |
| **Pagination** | Cursor-based pagination for large datasets; offset-based for small ones |
| **Aggregation** | Database-level `COUNT()`, `SUM()`, `AVG()` via Django ORM aggregates |
| **Bulk operations** | `bulk_create()`, `bulk_update()` for batch operations (payroll, imports) |
| **Query count monitoring** | `django-debug-toolbar` in dev; `nplusone` detection; query count assertions in tests |

**N+1 Query Prevention:**

```python
# BAD: N+1 query
employees = Employee.objects.filter(business_id=bid)
for emp in employees:
    print(emp.department.name)  # Hits DB for each employee

# GOOD: Single query with JOIN
employees = Employee.objects.filter(
    business_id=bid
).select_related('department')
for emp in employees:
    print(emp.department.name)  # No additional query
```

### 9.2 Caching Strategy

**Cache Hierarchy:**

```
┌─────────────────────────────────────────────┐
│  Browser Cache (static assets, 1 year)       │
├─────────────────────────────────────────────┤
│  CDN Cache (static assets, images)           │
├─────────────────────────────────────────────┤
│  Application Cache (Redis)                   │
│  ├─ User permissions     (15 min TTL)        │
│  ├─ Business settings    (1 hour TTL)        │
│  ├─ Dashboard aggregates (10 min TTL)        │
│  └─ API response cache   (5 min TTL)        │
├─────────────────────────────────────────────┤
│  Database Query Cache (PostgreSQL)           │
│  └─ Shared buffers, effective_cache_size     │
└─────────────────────────────────────────────┘
```

**Cache Invalidation Approach:**

- **Time-based:** Most caches use TTL-based expiry. Acceptable for dashboards and aggregates.
- **Event-based:** Permission and settings caches are explicitly invalidated on mutation.
- **Tag-based:** Related caches are grouped by tags (e.g., `business:{id}`) for bulk invalidation.

### 9.3 Horizontal Scaling Path

The modular monolith is designed with a clear path to horizontal scaling:

1. **Phase 1 (Current):** Single Gunicorn instance with multiple workers behind Nginx
2. **Phase 2:** Multiple Gunicorn instances behind a load balancer (stateless JWT enables this immediately)
3. **Phase 3:** Read replicas for PostgreSQL; route read-heavy queries (reports, dashboards) to replicas
4. **Phase 4:** Extract high-throughput modules (attendance, notifications) into independent services if needed

### 9.4 Database Connection Pooling

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 600,  # Persistent connections (10 min)
        'CONN_HEALTH_CHECKS': True,  # Verify before reuse
        'OPTIONS': {
            'connect_timeout': 5,
        },
    }
}

# For production with PgBouncer:
# PgBouncer sits between Django and PostgreSQL
# Mode: transaction pooling
# Default pool size: 20
# Max client connections: 100
```

---

## 10. Error Handling Strategy

### Consistent Error Response Format

All errors follow a standardized JSON envelope, regardless of the error type:

```python
class StandardErrorResponse:
    """
    Every error response from WorkPulse APIs follows this structure.
    """
    status: str = "error"           # Always "error"
    message: str                    # Human-readable error message
    error_code: str                 # Machine-readable error code
    errors: dict | None = None     # Field-level validation errors (optional)
    request_id: str                 # Unique request ID for support/debugging
```

### Error Code Registry

| Error Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request data failed validation |
| `INVALID_CREDENTIALS` | 401 | Login credentials are incorrect |
| `TOKEN_EXPIRED` | 401 | JWT access token has expired |
| `TOKEN_INVALID` | 401 | JWT token is malformed or tampered |
| `PERMISSION_DENIED` | 403 | User lacks required permission |
| `TENANT_MISMATCH` | 403 | Attempting to access another tenant's data |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `DUPLICATE_ENTRY` | 409 | Resource already exists (e.g., duplicate attendance) |
| `BUSINESS_RULE_VIOLATION` | 422 | Business logic constraint failed |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Custom Exception Handler

```python
# common/exception_handler.py
from rest_framework.views import exception_handler
from rest_framework.exceptions import (
    ValidationError, AuthenticationFailed, NotAuthenticated,
    PermissionDenied, NotFound, Throttled,
)
import uuid
import structlog

logger = structlog.get_logger()

ERROR_CODE_MAP = {
    ValidationError: 'VALIDATION_ERROR',
    AuthenticationFailed: 'INVALID_CREDENTIALS',
    NotAuthenticated: 'TOKEN_INVALID',
    PermissionDenied: 'PERMISSION_DENIED',
    NotFound: 'NOT_FOUND',
    Throttled: 'RATE_LIMITED',
}

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    request_id = str(uuid.uuid4())[:8]

    if response is not None:
        error_code = ERROR_CODE_MAP.get(type(exc), 'INTERNAL_ERROR')

        custom_data = {
            'status': 'error',
            'message': _get_error_message(exc),
            'error_code': error_code,
            'request_id': request_id,
        }

        if isinstance(exc, ValidationError):
            custom_data['errors'] = response.data

        response.data = custom_data

    else:
        # Unhandled exception — log and return generic 500
        logger.exception(
            "unhandled_exception",
            request_id=request_id,
            exc_type=type(exc).__name__,
            exc_message=str(exc),
            view=context.get('view'),
        )
        response = Response(
            {
                'status': 'error',
                'message': 'An unexpected error occurred. Please try again later.',
                'error_code': 'INTERNAL_ERROR',
                'request_id': request_id,
            },
            status=500,
        )

    return response
```

### Business Rule Exception

```python
# common/exceptions.py
from rest_framework.exceptions import APIException
from rest_framework import status

class BusinessRuleViolation(APIException):
    """Raised when a business logic constraint is violated."""
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = 'Business rule violation.'
    default_code = 'BUSINESS_RULE_VIOLATION'

# Usage in services
class LeaveService:
    @staticmethod
    def apply_leave(employee, leave_type, start_date, end_date, reason):
        balance = LeaveBalance.objects.get(
            employee=employee,
            leave_type=leave_type,
        )
        requested_days = (end_date - start_date).days + 1

        if balance.remaining < requested_days:
            raise BusinessRuleViolation(
                detail=f"Insufficient leave balance. "
                       f"Available: {balance.remaining} days, "
                       f"Requested: {requested_days} days.",
            )
        # ... continue with leave application
```

### Frontend Error Handling

```typescript
// hooks/useApiError.ts
import { AxiosError } from 'axios';
import { toast } from 'react-hot-toast';

interface ApiErrorResponse {
  status: 'error';
  message: string;
  error_code: string;
  errors?: Record<string, string[]>;
  request_id: string;
}

export function handleApiError(error: AxiosError<ApiErrorResponse>) {
  const data = error.response?.data;

  if (!data) {
    toast.error('Network error. Please check your connection.');
    return;
  }

  switch (data.error_code) {
    case 'VALIDATION_ERROR':
      // Field errors are handled by form components
      break;
    case 'TOKEN_EXPIRED':
    case 'TOKEN_INVALID':
      // Handled by axios interceptor (auto-refresh)
      break;
    case 'PERMISSION_DENIED':
      toast.error('You do not have permission to perform this action.');
      break;
    case 'RATE_LIMITED':
      toast.error('Too many requests. Please wait a moment.');
      break;
    case 'BUSINESS_RULE_VIOLATION':
      toast.error(data.message);
      break;
    default:
      toast.error(data.message || 'Something went wrong. Please try again.');
      console.error(`[${data.request_id}] ${data.error_code}: ${data.message}`);
  }
}
```

---

## Appendices

### A. Environment Variables

All configuration is managed through environment variables (never hardcoded):

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/workpulse` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `SECRET_KEY` | Django secret key (256-bit) | (auto-generated) |
| `JWT_SIGNING_KEY` | JWT token signing key | (auto-generated) |
| `AWS_S3_BUCKET` | S3 bucket for file storage | `workpulse-uploads` |
| `AWS_ACCESS_KEY_ID` | S3 access key | (from IAM) |
| `AWS_SECRET_ACCESS_KEY` | S3 secret key | (from IAM) |
| `SENTRY_DSN` | Sentry error tracking DSN | `https://...@sentry.io/...` |
| `ENVIRONMENT` | Deployment environment | `production`, `staging`, `development` |
| `ALLOWED_HOSTS` | Django allowed hosts | `workpulse.com,api.workpulse.com` |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | `https://app.workpulse.com` |

### B. API Rate Limits

| Endpoint Group | Rate Limit | Window |
|---|---|---|
| Authentication (`/auth/login/`) | 5 requests | Per minute per IP |
| Password reset | 3 requests | Per hour per email |
| General API (authenticated) | 100 requests | Per minute per user |
| File uploads | 10 requests | Per minute per user |
| Report generation | 5 requests | Per hour per user |
| Bulk operations | 2 requests | Per minute per user |

### C. Deployment Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Load Balancer / CDN                       │
│                    (SSL Termination)                          │
└─────────────────────────┬────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
    ┌─────────▼─────────┐   ┌────────▼──────────┐
    │    Nginx (Web)     │   │   Nginx (API)      │
    │  Static files      │   │  Proxy → Gunicorn  │
    └───────────────────┘   └────────┬──────────┘
                                      │
                            ┌─────────▼─────────┐
                            │   Gunicorn         │
                            │   (4 workers)      │
                            │   Django WSGI      │
                            └────────┬──────────┘
                                     │
              ┌──────────┬───────────┼───────────┐
              │          │           │           │
    ┌─────────▼──┐ ┌─────▼────┐ ┌───▼─────┐ ┌──▼──────────┐
    │ PostgreSQL │ │  Redis   │ │ Celery  │ │ S3 Object   │
    │ (Primary)  │ │ (Cache   │ │ Workers │ │ Storage     │
    │            │ │  + Broker)│ │ + Beat  │ │             │
    └────────────┘ └──────────┘ └─────────┘ └─────────────┘
```

---

> [!NOTE]
> This document is maintained alongside the codebase. All architectural decisions should be reflected here. For security-specific details, see [SECURITY_DESIGN.md](./SECURITY_DESIGN.md).
