# Software Requirements Specification (SRS)
## Project: WorkPulse - Workforce Management SaaS Platform
**Document Version:** 1.0.0  
**Status:** Approved  
**Classification:** Confidential / Commercial  

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for **WorkPulse**, an independent, multi-tenant enterprise Workforce Management, Attendance, Payroll, and Business Management SaaS platform inspired by the functional categories of PagarBook. It details functional, non-functional, interface, security, and architectural requirements for desktop, tablet, and mobile platforms.

### 1.2 Scope
WorkPulse automates end-to-end workforce lifecycle operations for Small and Medium Businesses (SMBs) and mid-market enterprises across multiple branches. The product delivers:
1. **Multi-Tenant Organization Management**: Company profiles, multi-branch hierarchies, departments, designations.
2. **Employee Lifecycle**: Digital onboarding, dynamic ID generation, KYC document repository, service records, transfers.
3. **Smart Attendance Tracking**: Multi-mode punches (Manual, Self-Service, Geofenced GPS with accuracy circle, Selfie validation), overnight shifts, break tracking, regularization workflows.
4. **Shift & Roster Planning**: Fixed, rotational, split, and flexible shifts, automated overnight shift rollover, weekly/monthly roster builders.
5. **Leave & Time-Off Engine**: Tiered leave types, policy accrual rules, prorated balances, encashment, carry-forward automation.
6. **Statutory & Flexible Payroll**: Decimal-accurate salary structures, earnings/deductions component engine, automated run calculation, one-click payslip generation.
7. **Credit & Cash Management**: Salary advances, loans with monthly EMI amortization, cashbook income/expense tracking, digital receipt archives.
8. **Employee Self-Service (ESS)**: Mobile-optimized portal for attendance check-ins, slip downloads, advance requests, leave applications.
9. **Executive Analytics**: Real-time operational dashboards, cross-branch workforce metrics, Excel/PDF exports.
10. **Fine-Grained Dynamic RBAC**: 11 standard roles, custom role definition, resource scoping (GLOBAL, BUSINESS, BRANCH, DEPARTMENT, TEAM, OWN).

### 1.3 Definitions, Acronyms, and Abbreviations
- **SaaS**: Software as a Service
- **RBAC**: Role-Based Access Control
- **IDOR**: Insecure Direct Object Reference
- **ESS**: Employee Self-Service
- **Geofence**: Virtual geographic perimeter defined by GPS coordinates and radius in meters
- **KYC**: Know Your Customer (identity verification documents)
- **EMI**: Equated Monthly Installment
- **Tenant**: An isolated business customer organization within the shared infrastructure

---

## 2. Overall Description

### 2.1 Product Perspective
WorkPulse operates as a cloud-native modular monolith built with a decoupled React/TypeScript Single Page Application (SPA) frontend and a Python/Django REST Framework backend, supported by PostgreSQL for relational state, Redis for caching/sessions, and Celery for asynchronous background jobs.

```
+-----------------------------------------------------------------------+
|                         Presentation Layer                            |
|             React 18 + Vite + TypeScript + Tailwind CSS               |
|            (Desktop Responsive, Tablet Drawer, Mobile App)            |
+-----------------------------------+-----------------------------------+
                                    | HTTPS / JSON / JWT
                                    v
+-----------------------------------------------------------------------+
|                             API Gateway                               |
|              Reverse Proxy, SSL Termination, Rate Limiting            |
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
|                    Django REST Framework Core API                     |
|  +-------------------+  +-------------------+  +--------------------+ |
|  | Tenant Middleware |  | JWT Authentication|  | Dynamic RBAC Engine| |
|  +-------------------+  +-------------------+  +--------------------+ |
|  +------------------------------------------------------------------+ |
|  |                         Service Layer                            | |
|  |  AttendanceService  |  PayrollService  |  LeaveService  | ...    | |
|  +------------------------------------------------------------------+ |
|  +------------------------------------------------------------------+ |
|  |                           ORM Models                             | |
|  +------------------------------------------------------------------+ |
+------------------+-------------------+--------------------+-----------+
                   |                   |                    |
                   v                   v                    v
      +--------------------+  +-----------------+  +--------------------+
      | PostgreSQL (Neon)  |  | Redis (Broker)  |  | S3 Object Storage  |
      | Tenant Scoped Data |  | Cache & Queues  |  | Documents/Photos   |
      +--------------------+  +--------+--------+  +--------------------+
                                       |
                                       v
                              +-----------------+
                              | Celery Workers  |
                              | Payroll & Email |
                              +-----------------+
```

### 2.2 User Classes and Predefined Roles
The system enforces 11 built-in roles plus custom enterprise-defined roles:
1. **SUPER_ADMIN**: Global platform overseer; manages platform tenants, billing plans, audit logs.
2. **SUPPORT_ADMIN**: Platform support representative; read-only diagnostics across permitted tenant entities.
3. **BILLING_ADMIN**: Manages platform pricing tiers, manual enterprise subscription overrides, invoicing.
4. **BUSINESS_OWNER**: Supreme business authority; full read/write/delete access across all business modules.
5. **HR_MANAGER**: Human resources leader; oversees employee profiles, shift rosters, leave policies, onboarding.
6. **BRANCH_MANAGER**: Site supervisor restricted to assigned branch entities, local employee shifts, and leaves.
7. **ACCOUNTANT**: Financial controller; manages salary components, runs monthly payroll, advances, cashbook.
8. **SUPERVISOR**: Team lead managing direct reports, attendance regularizations, shift change approvals.
9. **EMPLOYEE**: Standard staff member; logs daily attendance, views payslips, submits leave and advance requests.
10. **FIELD_EMPLOYEE**: Mobile field agent; GPS/Selfie check-in with geofence tolerance, visit logs.
11. **AUDITOR**: Read-only compliance reviewer; inspects financial records, attendance logs, and audit trails.

---

## 3. Specific System Features & Requirements

### 3.1 Module 1: Authentication & Identity Management
- **REQ-AUTH-01**: Registration must create user credentials, business entity, business membership, and automatically grant the `BUSINESS_OWNER` role in an atomic transaction.
- **REQ-AUTH-02**: Authentication must use industry-standard JSON Web Tokens (JWT) with HMAC-SHA256 signing. Access tokens must expire in 30 minutes (15 min in production); refresh tokens rotate on every issue with token blacklisting on logout.
- **REQ-AUTH-03**: Password policies must enforce minimum 8 characters, at least one uppercase letter, one numeric digit, and one special symbol. Passwords must be hashed using Argon2 or PBKDF2 with SHA-256 (minimum 320,000 iterations).
- **REQ-AUTH-04**: Multi-Tenant Business Switching: A single authenticated user belonging to multiple businesses can switch active context via `POST /api/v1/auth/me/switch-business/` without re-logging in.
- **REQ-AUTH-05**: User sessions must track client IP address, User-Agent, last active timestamp, and token hashes. Users can invalidate individual sessions or revoke all active sessions.

### 3.2 Module 2: Business & Multi-Branch Architecture
- **REQ-BIZ-01**: Every business is uniquely identified by an immutable UUIDv4 and human-readable URL slug.
- **REQ-BIZ-02**: Businesses can configure localized settings: primary time zone (IANA format, e.g., `Asia/Kolkata`), ISO currency code (`INR`, `USD`), business operating days array (`['Mon', 'Tue', 'Wed', 'Thu', 'Fri']`), and company logo.
- **REQ-BIZ-03**: Branch Management: Businesses can configure unlimited branches. Each branch contains physical street address, geographic coordinate pair (`latitude`, `longitude`), and customizable `geofence_radius` (in meters, default 200m). Exactly one branch per business may be designated `is_head_office=True`.
- **REQ-BIZ-04**: Organizational hierarchy must support arbitrary Departments (e.g., Engineering, Sales, Operations) and Designations with seniorities.

### 3.3 Module 3: Employee Lifecycle Management
- **REQ-EMP-01**: System must generate sequential, formatted employee codes (e.g., `WP-0001`) with configurable prefixes per business.
- **REQ-EMP-02**: Employee records must capture personal info, employment classification (`FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERN`, `TEMPORARY`), wage structure type (`MONTHLY`, `WEEKLY`, `DAILY`, `HOURLY`), joining date, probation end date, and direct reporting manager.
- **REQ-EMP-03**: Digital KYC Vault: Encrypted file upload support for Aadhaar, PAN, Passport, Driving License, Offer Letters. Sensitive identity numbers (PAN, Aadhaar) must only display masked values (last 4 digits) to non-authorized staff.
- **REQ-EMP-04**: Internal Transfers: Authorized HR/Owners can transfer employees across branches or departments with mandatory effective dates and audit trail logging.
- **REQ-EMP-05**: Bulk Import: Excel/CSV parsing engine for bulk onboarding with validation pre-checks and row-by-row error reporting.

### 3.4 Module 4: Intelligent Attendance Tracking
- **REQ-ATT-01**: Multi-Modal Clocking: Support for manual HR entries, ESS web punches, mobile GPS punches, and photographic selfie verification.
- **REQ-ATT-02**: Attendance status machine: `PRESENT`, `ABSENT`, `HALF_DAY`, `PAID_LEAVE`, `UNPAID_LEAVE`, `WEEKLY_OFF`, `HOLIDAY`, `ON_DUTY`, `COMPENSATORY_OFF`.
- **REQ-ATT-03**: Punch Lifecycle: Multiple punches per day must be aggregated into total working hours, net break durations, late-arrival minutes (measured against shift start + grace period), and early departure minutes.
- **REQ-ATT-04**: Attendance Regularization: Employees can request attendance corrections for missing punches or missed check-ins with justification reasons. Managers/HR can review, approve, or reject.
- **REQ-ATT-05**: Attendance Locking: Completed payroll periods automatically trigger attendance locks preventing any retroactive punch alterations.

### 3.5 Module 5: Geofencing & Selfie Verification
- **REQ-GEO-01**: When an employee clocks in via mobile or web GPS, client submits `latitude`, `longitude`, and `accuracy` (in meters).
- **REQ-GEO-02**: System calculates Haversine distance from assigned branch coordinates. If distance exceeds `geofence_radius + accuracy`, punch is flagged as `OUT_OF_GEOFENCE` or rejected based on business policy.
- **REQ-GEO-03**: Selfie punches must be securely stored in private cloud object storage with signed URL access, preventing unauthorized public URL scraping.

### 3.6 Module 6: Shifts & Roster Planning
- **REQ-SHF-01**: Support shift archetypes: Fixed (e.g., 09:00 - 18:00), Rotational, Night (spans midnight, e.g., 21:00 - 06:00), Flexible.
- **REQ-SHF-02**: Overnight Shift Logic: Automatically links morning check-outs back to the prior calendar day's shift instance, avoiding duplicate attendance entries on the following morning.
- **REQ-SHF-03**: Grace Periods & Thresholds: Configurable arrival grace period (e.g., 15 minutes), half-day duration threshold (e.g., 4.0 hours), full-day minimum (e.g., 8.0 hours), and overtime threshold.

### 3.7 Module 7: Leave & Time-Off Management
- **REQ-LEV-01**: Leave Types: Customizable leave policies (Casual, Sick, Earned/Privilege, Unpaid, Maternity, Paternity).
- **REQ-LEV-02**: Accrual & Carry Forward: Configurable yearly quotas, carry-forward maximum caps, and encashment flags.
- **REQ-LEV-03**: Application Workflow: Multi-level approval chain (Supervisor -> HR). Automatic validation against current leave balances; prevents negative balances for unpaid-restricted policies.
- **REQ-LEV-04**: Dynamic Balance Sync: Approved leaves automatically reflect as `PAID_LEAVE` or `UNPAID_LEAVE` on attendance registers for corresponding calendar dates.

### 3.8 Module 8: Payroll & Payslip Engine
- **REQ-PAY-01**: Component Architecture: Dynamic Earnings (Basic, HRA, Conveyance, Special Allowance) and Deductions (Provident Fund, ESI, Professional Tax, TDS).
- **REQ-PAY-02**: Calculation Precision: All monetary operations performed strictly using Python `Decimal` and PostgreSQL `NUMERIC(12, 2)` to eliminate floating-point rounding errors.
- **REQ-PAY-03**: Attendance & Loss of Pay (LOP) Integration: Salary calculations dynamically factor present days, paid leaves, and compute per-day wage deductions for unpaid absences based on monthly calendar days or fixed working days.
- **REQ-PAY-04**: Loan & Advance Amortization: Automatically deducts active loan monthly installments and approved salary advance balances before calculating net pay.
- **REQ-PAY-05**: Payroll State Transitions: `DRAFT` -> `PROCESSING` -> `REVIEW` -> `APPROVED` -> `LOCKED`. Locked runs cannot be edited; any corrections require supplementary adjustment runs.
- **REQ-PAY-06**: Payslip Generation: Printable, professional PDF payslips with business branding, breakdown of gross pay, deductions, tax summaries, and net payable.

### 3.9 Module 9: Salary Advances & Employee Loans
- **REQ-ADV-01**: Advance Requests: Employees can request up to policy-defined maximum advance amounts. Approver approves amount and sets scheduled deduction payroll period.
- **REQ-ADV-02**: Employee Loan Management: Multi-month loans with configurable principal, interest rates, and tenure months. Auto-calculates monthly EMI and tracks remaining loan balance after each payroll run.

### 3.10 Module 10: Cashbook & Business Expenses
- **REQ-EXP-01**: Daily Petty Cash / Cashbook: Record cash inflows (`CASH_IN`) and outflows (`CASH_OUT`) with real-time running balance calculation.
- **REQ-EXP-02**: Business Expense Reimbursements: Employees/staff submit categorized expense claims with digital receipts for manager approval and payout reconciliation.

### 3.11 Module 11: Reports & Business Intelligence
- **REQ-REP-01**: Attendance Summary: Real-time presenteeism, absenteeism, late-arrival trends, branch comparisons.
- **REQ-REP-02**: Payroll Register: Comprehensive gross-to-net breakdown across all employees with component-level columns.
- **REQ-REP-03**: Export Formats: Instant CSV, Excel (`.xlsx`), and PDF download capabilities for all operational tables.

---

## 4. Non-Functional Requirements

### 4.1 Security & Multi-Tenant Isolation
- **NFR-SEC-01**: Tenant Data Partitioning: Every database query touching tenant-scoped entities must explicitly filter by `business_id`. Direct URL manipulation (IDOR) must return HTTP 404 or HTTP 403.
- **NFR-SEC-02**: Defense-in-Depth Authorization: API views must combine JWT authentication, Tenant membership verification, and atomic RBAC permission checking.
- **NFR-SEC-03**: Cryptographic Secrets: Zero secrets stored in version control; all environment credentials injected via secure 12-factor configuration.

### 4.2 Performance & Responsiveness
- **NFR-PERF-01**: 95% of read API endpoints must respond in < 150ms under normal load.
- **NFR-PERF-02**: Complex payroll run calculations for up to 500 employees must complete within 10 seconds.
- **NFR-PERF-03**: Frontend first contentful paint (FCP) under 1.2s; lightweight bundle chunking via Vite code splitting.

### 4.3 Reliability & Auditability
- **NFR-REL-01**: Full audit logging: All state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) logged with timestamp, user ID, business ID, IP address, user agent, and resource target.
- **NFR-REL-02**: Automated database migrations with rollback capability; schema constraints protecting data integrity.
