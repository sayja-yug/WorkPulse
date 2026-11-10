# Database Schema Specification
## Project: WorkPulse Workforce Management SaaS
**Database Engine:** PostgreSQL 15+ / Neon Serverless Postgres  
**Encoding:** UTF-8  
**Collation:** en_US.UTF-8  

---

## 1. Schema Design Principles

1. **Primary Keys:** Every table uses UUIDv4 (`UUID DEFAULT gen_random_uuid()`) to eliminate predictable sequence enumeration vulnerabilities.
2. **Multi-Tenant Scoping:** All tenant entities contain a non-nullable `business_id UUID REFERENCES businesses(id) ON DELETE CASCADE`.
3. **Audit Timestamps:** All tables include `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
4. **Monetary Values:** All currency values use `NUMERIC(12, 2)` to avoid IEEE-754 binary floating point precision errors.
5. **Geospatial Precision:** Latitude and Longitude use `NUMERIC(10, 7)` which gives ~1.1 centimeter precision at the equator.
6. **Timezones:** All timestamps are strictly stored in `TIMESTAMPTZ` (UTC) and converted to tenant business timezone at presentation.

---

## 2. Table Specifications

### 2.1 Identity & Access Control

#### `users`
Core user identity independent of business memberships.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `email` | VARCHAR(255) | NO | | UNIQUE, normalized lowercase |
| `phone` | VARCHAR(20) | YES | '' | E.164 phone number |
| `password` | VARCHAR(255) | NO | | Argon2 / PBKDF2 hash |
| `first_name` | VARCHAR(150) | NO | | Given name |
| `last_name` | VARCHAR(150) | YES | '' | Family name |
| `avatar` | VARCHAR(255) | YES | NULL | S3 storage key or URL |
| `is_active` | BOOLEAN | NO | TRUE | Account enabled flag |
| `is_staff` | BOOLEAN | NO | FALSE | Staff portal access |
| `is_superuser` | BOOLEAN | NO | FALSE | Global platform superadmin |
| `email_verified`| BOOLEAN | NO | FALSE | Email verification status |
| `phone_verified`| BOOLEAN | NO | FALSE | SMS verification status |
| `active_business_id` | UUID | YES | NULL | FK to `businesses(id)` |
| `date_joined` | TIMESTAMPTZ | NO | NOW() | Account creation time |
| `last_login` | TIMESTAMPTZ | YES | NULL | Last authenticated time |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Audit timestamp |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | Audit timestamp |

*Indexes:*
- `idx_users_email` (UNIQUE)
- `idx_users_phone`
- `idx_users_is_active`

#### `user_sessions`
Active JWT session tracking and device fingerprinting.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `user_id` | UUID | NO | | FK to `users(id)` ON DELETE CASCADE |
| `token_hash` | VARCHAR(64) | NO | | SHA-256 hash of refresh token |
| `ip_address` | INET | YES | NULL | Client IP address |
| `user_agent` | TEXT | YES | '' | Browser User-Agent header |
| `device_info` | JSONB | NO | '{}' | Parsed OS, browser, device details |
| `is_active` | BOOLEAN | NO | TRUE | Session valid flag |
| `expires_at` | TIMESTAMPTZ | NO | | Session expiry boundary |
| `last_activity`| TIMESTAMPTZ| NO | NOW() | Heartbeat timestamp |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Session start timestamp |

#### `roles`
Predefined system roles and customized business roles.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `name` | VARCHAR(100) | NO | | Human-friendly name |
| `code` | VARCHAR(50) | NO | | Unique code identifier |
| `description` | TEXT | YES | '' | Role responsibility description |
| `business_id` | UUID | YES | NULL | FK to `businesses(id)` (NULL for system roles) |
| `is_system` | BOOLEAN | NO | FALSE | TRUE for 11 immutable system roles |
| `is_active` | BOOLEAN | NO | TRUE | Role active status |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | Timestamp |

*Constraints:* `UNIQUE(code, business_id)`

#### `permissions`
Global permission catalog.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `name` | VARCHAR(100) | NO | | Display label |
| `code` | VARCHAR(100) | NO | | UNIQUE (e.g., `employee.create`) |
| `module` | VARCHAR(50) | NO | | Functional domain |
| `description` | TEXT | YES | '' | Capability explanation |
| `scope_type` | VARCHAR(20) | NO | 'BUSINESS' | Scope: GLOBAL, BUSINESS, BRANCH, DEPT, TEAM, OWN |

#### `role_permissions`
Cross-table mapping roles to assigned permissions.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `role_id` | UUID | NO | | FK to `roles(id)` ON DELETE CASCADE |
| `permission_id`| UUID | NO | | FK to `permissions(id)` ON DELETE CASCADE |

*Constraints:* `UNIQUE(role_id, permission_id)`

#### `user_roles`
Assignment of roles to users within specific tenant/branch contexts.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `user_id` | UUID | NO | | FK to `users(id)` ON DELETE CASCADE |
| `role_id` | UUID | NO | | FK to `roles(id)` ON DELETE CASCADE |
| `business_id` | UUID | NO | | FK to `businesses(id)` ON DELETE CASCADE |
| `branch_id` | UUID | YES | NULL | FK to `branches(id)` ON DELETE CASCADE |

*Constraints:* `UNIQUE(user_id, role_id, business_id)`

---

### 2.2 Organization & Branches

#### `businesses`
Multi-tenant root organization entity.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `name` | VARCHAR(255) | NO | | Company legal/trading name |
| `slug` | VARCHAR(255) | NO | | UNIQUE URL identifier |
| `logo` | VARCHAR(255) | YES | NULL | Storage path to logo |
| `address` | TEXT | YES | '' | Registered office address |
| `city` | VARCHAR(100) | YES | '' | City |
| `state` | VARCHAR(100) | YES | '' | State / Province |
| `country` | VARCHAR(100) | NO | 'India' | Country |
| `zip_code` | VARCHAR(20) | YES | '' | Postal code |
| `phone` | VARCHAR(20) | YES | '' | Official business phone |
| `email` | VARCHAR(255) | YES | '' | Official business email |
| `website` | VARCHAR(255) | YES | '' | Website URL |
| `timezone` | VARCHAR(50) | NO | 'Asia/Kolkata' | Default timezone |
| `currency` | VARCHAR(10) | NO | 'INR' | ISO currency symbol |
| `working_days`| JSONB | NO | '["Mon","Tue","Wed","Thu","Fri"]' | Standard work days |
| `settings` | JSONB | NO | '{}' | Custom business rules |
| `is_active` | BOOLEAN | NO | TRUE | Active tenant status |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | Timestamp |

#### `business_memberships`
Join table connecting users to authorized businesses.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `user_id` | UUID | NO | | FK to `users(id)` ON DELETE CASCADE |
| `business_id` | UUID | NO | | FK to `businesses(id)` ON DELETE CASCADE |
| `is_owner` | BOOLEAN | NO | FALSE | Business founder/owner flag |
| `is_active` | BOOLEAN | NO | TRUE | Active membership flag |
| `joined_at` | TIMESTAMPTZ | NO | NOW() | Association timestamp |

*Constraints:* `UNIQUE(user_id, business_id)`

#### `branches`
Physical business locations with geofence definitions.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `business_id` | UUID | NO | | FK to `businesses(id)` ON DELETE CASCADE |
| `name` | VARCHAR(255) | NO | | Branch designation name |
| `code` | VARCHAR(50) | NO | | Branch code (e.g., `BR-01`) |
| `address` | TEXT | YES | '' | Street address |
| `city` | VARCHAR(100) | YES | '' | City |
| `state` | VARCHAR(100) | YES | '' | State |
| `country` | VARCHAR(100) | NO | 'India' | Country |
| `latitude` | NUMERIC(10, 7)| YES | NULL | GPS latitude |
| `longitude` | NUMERIC(10, 7)| YES | NULL | GPS longitude |
| `geofence_radius`| INT | NO | 200 | Radius in meters |
| `is_head_office`| BOOLEAN | NO | FALSE | Headquarter location |
| `is_active` | BOOLEAN | NO | TRUE | Location active status |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | Timestamp |

*Constraints:* `UNIQUE(business_id, code)`

#### `departments`
Business organizational divisions.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `business_id` | UUID | NO | | FK to `businesses(id)` ON DELETE CASCADE |
| `name` | VARCHAR(150) | NO | | Department name |
| `code` | VARCHAR(50) | NO | | Department code |
| `description` | TEXT | YES | '' | Department function |
| `head_id` | UUID | YES | NULL | FK to `users(id)` (Dept Head) |
| `is_active` | BOOLEAN | NO | TRUE | Status |

#### `designations`
Job titles and hierarchical levels.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `business_id` | UUID | NO | | FK to `businesses(id)` ON DELETE CASCADE |
| `name` | VARCHAR(150) | NO | | Job Title |
| `level` | INT | NO | 1 | Hierarchy level (1=Junior, 10=Executive) |
| `description` | TEXT | YES | '' | Job scope |
| `is_active` | BOOLEAN | NO | TRUE | Status |

---

### 2.3 Employees & Documents

#### `employees`
Core employee profile linked to organizational units.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `business_id` | UUID | NO | | FK to `businesses(id)` ON DELETE CASCADE |
| `user_id` | UUID | YES | NULL | FK to `users(id)` (NULL if not yet registered) |
| `employee_code` | VARCHAR(50) | NO | | UNIQUE per business |
| `first_name` | VARCHAR(150) | NO | | First name |
| `last_name` | VARCHAR(150) | YES | '' | Last name |
| `email` | VARCHAR(255) | YES | '' | Professional/Personal email |
| `phone` | VARCHAR(20) | YES | '' | Contact phone |
| `branch_id` | UUID | YES | NULL | FK to `branches(id)` |
| `department_id`| UUID | YES | NULL | FK to `departments(id)` |
| `designation_id`| UUID | YES | NULL | FK to `designations(id)` |
| `employment_type`| VARCHAR(20)| NO | 'FULL_TIME'| FULL_TIME, PART_TIME, CONTRACT, INTERN |
| `salary_type` | VARCHAR(20) | NO | 'MONTHLY' | MONTHLY, WEEKLY, DAILY, HOURLY |
| `joining_date` | DATE | NO | | Date of joining |
| `probation_end_date`| DATE | YES | NULL | Probation end |
| `reporting_manager_id`| UUID | YES | NULL | Self-referencing FK to `employees(id)` |
| `date_of_birth`| DATE | YES | NULL | Birthday |
| `gender` | VARCHAR(20) | YES | 'PREFER_NOT_TO_SAY' | MALE, FEMALE, OTHER |
| `blood_group` | VARCHAR(10) | YES | '' | Blood group |
| `emergency_contact_name`| VARCHAR(150)| YES | '' | Contact name |
| `emergency_contact_phone`| VARCHAR(20)| YES | '' | Contact phone |
| `address` | TEXT | YES | '' | Residential address |
| `bank_name` | VARCHAR(100) | YES | '' | Bank name |
| `bank_account_number` | VARCHAR(50) | YES | '' | Bank account |
| `bank_ifsc_code` | VARCHAR(20) | YES | '' | Bank IFSC/routing |
| `pan_number` | VARCHAR(20) | YES | '' | Tax identifier |
| `aadhaar_number`| VARCHAR(20) | YES | '' | National identity number |
| `is_field_employee`| BOOLEAN | NO | FALSE | Field status |
| `status` | VARCHAR(20) | NO | 'ACTIVE' | ACTIVE, INACTIVE, ON_NOTICE, TERMINATED |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | Timestamp |

*Constraints:* `UNIQUE(business_id, employee_code)`  
*Indexes:* `(business_id, status)`, `(business_id, branch_id)`, `(business_id, department_id)`

---

### 2.4 Attendance, Geofencing & Shifts

#### `shifts`
Shift templates and schedule parameters.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `business_id` | UUID | NO | | FK to `businesses(id)` ON DELETE CASCADE |
| `name` | VARCHAR(100) | NO | | Shift name (e.g., "Morning Shift") |
| `code` | VARCHAR(50) | NO | | Shift code |
| `type` | VARCHAR(20) | NO | 'FIXED' | FIXED, ROTATIONAL, NIGHT, FLEXIBLE |
| `start_time` | TIME | NO | | Scheduled start time |
| `end_time` | TIME | NO | | Scheduled end time |
| `is_overnight` | BOOLEAN | NO | FALSE | Spans midnight indicator |
| `break_duration_minutes` | INT | NO | 0 | Scheduled break time |
| `grace_period_minutes` | INT | NO | 15 | Late arrival grace window |
| `half_day_hours` | NUMERIC(4, 2)| NO | 4.0 | Hours threshold for half-day |
| `full_day_hours` | NUMERIC(4, 2)| NO | 8.0 | Hours threshold for full-day |
| `overtime_threshold_minutes`| INT | NO | 0 | Extra minutes before OT accrues |
| `color` | VARCHAR(7) | NO | '#3B82F6'| Hex color code for UI calendars |
| `is_active` | BOOLEAN | NO | TRUE | Active flag |

#### `shift_assignments`
Mapping employees to shift schedules.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `employee_id` | UUID | NO | | FK to `employees(id)` ON DELETE CASCADE |
| `shift_id` | UUID | NO | | FK to `shifts(id)` ON DELETE CASCADE |
| `effective_from`| DATE | NO | | Start of assignment |
| `effective_to` | DATE | YES | NULL | End of assignment (NULL = current) |
| `assigned_by_id`| UUID | YES | NULL | FK to `users(id)` |

#### `attendance_records`
Daily employee attendance rollup.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `business_id` | UUID | NO | | FK to `businesses(id)` ON DELETE CASCADE |
| `employee_id` | UUID | NO | | FK to `employees(id)` ON DELETE CASCADE |
| `date` | DATE | NO | | Attendance calendar date |
| `shift_id` | UUID | YES | NULL | FK to `shifts(id)` |
| `status` | VARCHAR(20) | NO | 'PRESENT' | PRESENT, ABSENT, HALF_DAY, PAID_LEAVE, ... |
| `check_in` | TIMESTAMPTZ | YES | NULL | First punch in timestamp |
| `check_out` | TIMESTAMPTZ | YES | NULL | Final punch out timestamp |
| `working_hours`| NUMERIC(5, 2)| NO | 0.00 | Net logged hours |
| `overtime_hours`| NUMERIC(5, 2)| NO | 0.00 | Overtime hours |
| `is_late` | BOOLEAN | NO | FALSE | Arrived after grace window |
| `late_minutes` | INT | NO | 0 | Minutes late |
| `is_early_departure`| BOOLEAN | NO | FALSE | Left before shift end |
| `early_departure_minutes`| INT | NO | 0 | Minutes early |
| `notes` | TEXT | YES | '' | Supervisor remarks |
| `source` | VARCHAR(20) | NO | 'SELF' | MANUAL, SELF, GPS, BIOMETRIC, SYSTEM |
| `marked_by_id` | UUID | YES | NULL | FK to `users(id)` |
| `is_locked` | BOOLEAN | NO | FALSE | Payroll locked flag |

*Constraints:* `UNIQUE(employee_id, date)`  
*Indexes:* `(business_id, date)`, `(employee_id, date)`, `(business_id, employee_id, date)`

#### `attendance_punches`
Raw timestamped punch events.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `attendance_id`| UUID | NO | | FK to `attendance_records(id)` ON DELETE CASCADE |
| `punch_type` | VARCHAR(20) | NO | | CHECK_IN, CHECK_OUT, BREAK_START, BREAK_END |
| `timestamp` | TIMESTAMPTZ | NO | NOW() | Punch time |
| `latitude` | NUMERIC(10, 7)| YES | NULL | Punch GPS lat |
| `longitude` | NUMERIC(10, 7)| YES | NULL | Punch GPS long |
| `accuracy` | NUMERIC(8, 2)| YES | NULL | Accuracy radius in meters |
| `selfie` | VARCHAR(255) | YES | NULL | S3 storage key for photo |
| `device_info` | JSONB | NO | '{}' | Device characteristics |
| `ip_address` | INET | YES | NULL | Client IP address |
| `is_valid` | BOOLEAN | NO | TRUE | Geofence validity flag |
| `validation_notes`| TEXT | YES | '' | Geofence verification details |

---

### 2.5 Leaves & Time-Off

#### `leave_types`
Tenant leave policies.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `business_id` | UUID | NO | | FK to `businesses(id)` ON DELETE CASCADE |
| `name` | VARCHAR(100) | NO | | Leave name (Casual, Sick, Earned) |
| `code` | VARCHAR(20) | NO | | Unique code (CL, SL, EL) |
| `is_paid` | BOOLEAN | NO | TRUE | Paid vs Unpaid flag |
| `max_days_per_year`| INT | NO | 12 | Yearly entitlement |
| `is_carry_forward` | BOOLEAN | NO | FALSE | Can roll into next year |
| `max_carry_forward_days`| INT | NO | 0 | Max rollover limit |
| `is_encashable` | BOOLEAN | NO | FALSE | Encashable on termination |
| `requires_approval` | BOOLEAN | NO | TRUE | Approval required |
| `is_active` | BOOLEAN | NO | TRUE | Status |

*Constraints:* `UNIQUE(business_id, code)`

#### `leave_balances`
Per-employee annual leave ledgers.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `employee_id` | UUID | NO | | FK to `employees(id)` ON DELETE CASCADE |
| `leave_type_id`| UUID | NO | | FK to `leave_types(id)` ON DELETE CASCADE |
| `year` | INT | NO | | Calendar or financial year |
| `allocated` | NUMERIC(5, 2)| NO | 0.00 | Days granted |
| `used` | NUMERIC(5, 2)| NO | 0.00 | Days consumed |
| `carried_forward`| NUMERIC(5, 2)| NO | 0.00 | Rolled over from prior year |
| `adjusted` | NUMERIC(5, 2)| NO | 0.00 | Manual HR adjustments |

*Constraints:* `UNIQUE(employee_id, leave_type_id, year)`

#### `leave_requests`
Employee leave applications.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `business_id` | UUID | NO | | FK to `businesses(id)` ON DELETE CASCADE |
| `employee_id` | UUID | NO | | FK to `employees(id)` ON DELETE CASCADE |
| `leave_type_id`| UUID | NO | | FK to `leave_types(id)` ON DELETE CASCADE |
| `start_date` | DATE | NO | | Starting date |
| `end_date` | DATE | NO | | Ending date |
| `days` | NUMERIC(4, 1)| NO | | Total days applied |
| `is_half_day` | BOOLEAN | NO | FALSE | Half-day indicator |
| `reason` | TEXT | NO | | Application justification |
| `status` | VARCHAR(20) | NO | 'PENDING' | PENDING, APPROVED, REJECTED, CANCELLED |
| `applied_at` | TIMESTAMPTZ | NO | NOW() | Timestamp |

---

### 2.6 Payroll, Advances & Loans

#### `salary_components`
Dynamic payroll salary items.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `business_id` | UUID | NO | | FK to `businesses(id)` ON DELETE CASCADE |
| `name` | VARCHAR(100) | NO | | Component title (e.g., Basic, HRA) |
| `code` | VARCHAR(50) | NO | | Unique code (BASIC, HRA, PF) |
| `type` | VARCHAR(20) | NO | | EARNING or DEDUCTION |
| `calculation_type`| VARCHAR(20)| NO | 'FIXED' | FIXED or PERCENTAGE |
| `default_amount`| NUMERIC(12, 2)| NO | 0.00 | Default value |
| `percentage_of`| VARCHAR(50) | YES | '' | Target component code for % |
| `is_taxable` | BOOLEAN | NO | TRUE | Included in taxable gross |
| `is_mandatory` | BOOLEAN | NO | FALSE | Compulsory line item |
| `is_active` | BOOLEAN | NO | TRUE | Active status |

*Constraints:* `UNIQUE(business_id, code)`

#### `payroll_runs`
Monthly/periodic payroll batches.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `business_id` | UUID | NO | | FK to `businesses(id)` ON DELETE CASCADE |
| `name` | VARCHAR(150) | NO | | E.g., "October 2026 Payroll" |
| `period_start` | DATE | NO | | Pay period start date |
| `period_end` | DATE | NO | | Pay period end date |
| `pay_date` | DATE | YES | NULL | Disbursal date |
| `status` | VARCHAR(20) | NO | 'DRAFT' | DRAFT, PROCESSING, REVIEW, APPROVED, LOCKED |
| `total_gross` | NUMERIC(14, 2)| NO | 0.00 | Sum of gross payouts |
| `total_deductions`| NUMERIC(14, 2)| NO | 0.00 | Sum of all deductions |
| `total_net` | NUMERIC(14, 2)| NO | 0.00 | Net payable balance |
| `processed_by_id`| UUID | YES | NULL | FK to `users(id)` |
| `approved_by_id` | UUID | YES | NULL | FK to `users(id)` |
| `locked_at` | TIMESTAMPTZ | YES | NULL | Lock timestamp |
| `notes` | TEXT | YES | '' | Payroll notes |

#### `payroll_items`
Individual employee earnings in a payroll run.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `payroll_run_id`| UUID | NO | | FK to `payroll_runs(id)` ON DELETE CASCADE |
| `employee_id` | UUID | NO | | FK to `employees(id)` ON DELETE CASCADE |
| `working_days` | NUMERIC(4, 1)| NO | | Total business working days |
| `present_days` | NUMERIC(4, 1)| NO | | Days logged present |
| `leave_days` | NUMERIC(4, 1)| NO | 0.0 | Paid leave days |
| `overtime_hours`| NUMERIC(5, 2)| NO | 0.0 | Overtime hours |
| `gross_salary` | NUMERIC(12, 2)| NO | | Gross earned |
| `total_deductions`| NUMERIC(12, 2)| NO | | Total deductions |
| `net_salary` | NUMERIC(12, 2)| NO | | Net payable |
| `advance_deduction`| NUMERIC(12, 2)| NO | 0.00 | Recovered salary advances |
| `loan_deduction` | NUMERIC(12, 2)| NO | 0.00 | Recovered loan EMIs |
| `status` | VARCHAR(20) | NO | 'CALCULATED'| PENDING, CALCULATED, REVIEWED, APPROVED |

#### `payslips`
Digital employee payslip records.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `payroll_item_id`| UUID | NO | | UNIQUE FK to `payroll_items(id)` |
| `employee_id` | UUID | NO | | FK to `employees(id)` |
| `business_id` | UUID | NO | | FK to `businesses(id)` |
| `payslip_number`| VARCHAR(64) | NO | | UNIQUE formatted slip code |
| `period_display`| VARCHAR(50) | NO | | E.g., "October 2026" |
| `file_url` | VARCHAR(255) | YES | NULL | Storage link to generated PDF |
| `generated_at` | TIMESTAMPTZ | NO | NOW() | Slip generation timestamp |
| `sent_at` | TIMESTAMPTZ | YES | NULL | Email dispatch timestamp |

#### `advances`
Salary advance disbursements and monthly recovery.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `business_id` | UUID | NO | | FK to `businesses(id)` ON DELETE CASCADE |
| `employee_id` | UUID | NO | | FK to `employees(id)` ON DELETE CASCADE |
| `amount` | NUMERIC(12, 2)| NO | | Principal advance amount |
| `reason` | TEXT | NO | | Request reason |
| `status` | VARCHAR(20) | NO | 'PENDING' | PENDING, APPROVED, REJECTED, DISBURSED, COMPLETED |
| `requested_at` | TIMESTAMPTZ | NO | NOW() | Request timestamp |
| `approved_by_id`| UUID | YES | NULL | FK to `users(id)` |
| `approved_at` | TIMESTAMPTZ | YES | NULL | Timestamp |
| `paid_at` | TIMESTAMPTZ | YES | NULL | Disbursal timestamp |
| `deduction_start_month`| DATE | YES | NULL | First month of recovery |
| `monthly_deduction`| NUMERIC(12, 2)| YES | NULL | Monthly recovery slice |
| `remaining_balance`| NUMERIC(12, 2)| NO | | Unrecovered balance |

#### `loans`
Structured employee loans with interest and multi-month EMI amortization.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `business_id` | UUID | NO | | FK to `businesses(id)` ON DELETE CASCADE |
| `employee_id` | UUID | NO | | FK to `employees(id)` ON DELETE CASCADE |
| `amount` | NUMERIC(12, 2)| NO | | Loan principal amount |
| `interest_rate`| NUMERIC(5, 2)| NO | 0.00 | Annual interest rate % |
| `tenure_months`| INT | NO | | Loan repayment term |
| `emi_amount` | NUMERIC(12, 2)| NO | | Calculated monthly installment |
| `reason` | TEXT | NO | | Loan purpose |
| `status` | VARCHAR(20) | NO | 'PENDING' | PENDING, APPROVED, ACTIVE, CLOSED |
| `disbursed_at` | TIMESTAMPTZ | YES | NULL | Disbursal timestamp |
| `closed_at` | TIMESTAMPTZ | YES | NULL | Loan closure timestamp |

---

### 2.7 Expenses & Cashbook

#### `expenses`
Business expense tracking and reimbursement claims.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `business_id` | UUID | NO | | FK to `businesses(id)` ON DELETE CASCADE |
| `category_id` | UUID | NO | | FK to `expense_categories(id)` |
| `amount` | NUMERIC(12, 2)| NO | | Expense figure |
| `description` | TEXT | NO | | Expense justification |
| `payment_mode` | VARCHAR(20) | NO | 'CASH' | CASH, BANK_TRANSFER, UPI, CHEQUE, CARD |
| `receipt` | VARCHAR(255) | YES | NULL | Storage path to receipt image/PDF |
| `date` | DATE | NO | | Expense transaction date |
| `vendor_name` | VARCHAR(150) | YES | '' | Vendor/merchant name |
| `created_by_id`| UUID | NO | | FK to `users(id)` |
| `approved_by_id`| UUID | YES | NULL | FK to `users(id)` |
| `status` | VARCHAR(20) | NO | 'PENDING' | PENDING, APPROVED, REJECTED |

#### `cash_transactions`
Petty cash flow registry.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `business_id` | UUID | NO | | FK to `businesses(id)` ON DELETE CASCADE |
| `type` | VARCHAR(20) | NO | | CASH_IN or CASH_OUT |
| `amount` | NUMERIC(12, 2)| NO | | Transaction value |
| `category_id` | UUID | YES | NULL | FK to `expense_categories(id)` |
| `description` | TEXT | NO | | Entry description |
| `payment_mode` | VARCHAR(50) | NO | 'Cash' | Tender type |
| `reference` | VARCHAR(100) | YES | '' | Voucher / Receipt reference |
| `date` | DATE | NO | | Entry date |
| `balance_after`| NUMERIC(14, 2)| NO | 0.00 | Running cash balance snapshot |
| `created_by_id`| UUID | NO | | FK to `users(id)` |

---

### 2.8 Subscriptions, Notifications & Platform Audit

#### `subscription_plans`
SaaS pricing and feature tiers.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `name` | VARCHAR(100) | NO | | Plan label (Basic, Pro, Enterprise) |
| `code` | VARCHAR(50) | NO | | UNIQUE plan key |
| `description` | TEXT | YES | '' | Marketing description |
| `max_employees`| INT | NO | 10 | Employee cap (-1 for unlimited) |
| `max_branches` | INT | NO | 1 | Branch cap (-1 for unlimited) |
| `features` | JSONB | NO | '[]' | Array of enabled feature slugs |
| `monthly_price`| NUMERIC(10, 2)| NO | 0.00 | Cost per month |
| `annual_price` | NUMERIC(10, 2)| NO | 0.00 | Cost per year |
| `is_active` | BOOLEAN | NO | TRUE | Plan active |
| `trial_days` | INT | NO | 14 | Free trial period |

#### `subscriptions`
Active tenant subscriptions.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `business_id` | UUID | NO | | UNIQUE FK to `businesses(id)` |
| `plan_id` | UUID | NO | | FK to `subscription_plans(id)` |
| `status` | VARCHAR(20) | NO | 'TRIAL' | TRIAL, ACTIVE, PAST_DUE, CANCELLED |
| `billing_cycle`| VARCHAR(20) | NO | 'MONTHLY'| MONTHLY, ANNUAL |
| `current_period_start`| DATE | NO | | Billing cycle start |
| `current_period_end` | DATE | NO | | Billing cycle end |
| `trial_end` | DATE | YES | NULL | Trial expiration |
| `cancelled_at` | TIMESTAMPTZ | YES | NULL | Cancellation timestamp |

#### `audit_logs`
Immutable compliance and security ledger.
| Column | Type | Nullable | Default | Description / Constraints |
|---|---|---|---|---|
| `id` | UUID | NO | gen_random_uuid() | Primary Key |
| `user_id` | UUID | YES | NULL | FK to `users(id)` ON DELETE SET NULL |
| `business_id` | UUID | YES | NULL | FK to `businesses(id)` ON DELETE SET NULL |
| `action` | VARCHAR(50) | NO | | E.g., POST, PATCH, PAYROLL_APPROVE |
| `resource_type`| VARCHAR(50) | NO | | Resource module (e.g., "employees") |
| `resource_id` | UUID | YES | NULL | Primary key of affected entity |
| `old_data` | JSONB | YES | NULL | State snapshot prior to mutation |
| `new_data` | JSONB | YES | NULL | State snapshot after mutation |
| `ip_address` | INET | YES | NULL | Client IP address |
| `user_agent` | VARCHAR(500) | YES | '' | Client browser string |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Timestamp |

*Indexes:* `(business_id, created_at)`, `(user_id, created_at)`, `(resource_type, resource_id)`
