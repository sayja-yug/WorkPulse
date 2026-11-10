# WorkPulse Testing Plan & Quality Assurance Strategy

## 1. Testing Strategy Overview
The testing framework guarantees strict multi-tenant boundary isolation, mathematical payroll precision, bulletproof RBAC enforcement, and robust clock-in validation.

```
+-------------------------------------------------------+
|              End-to-End Integration Tests             |
|       Full Lifecycle User Journeys & State Machines   |
+-------------------------------------------------------+
                           |
+-------------------------------------------------------+
|             Multi-Tenant Isolation Verification       |
|    Cross-Tenant Querying & IDOR Injection Vectors     |
+-------------------------------------------------------+
                           |
+-------------------------------------------------------+
|                 RBAC Permission Matrices              |
|        11 Built-in Roles Tested Against All Endpoints |
+-------------------------------------------------------+
                           |
+-------------------------------------------------------+
|              Unit Tests & Service Logic               |
|      Payroll Math, Geofence Radius, Shift Calculation |
+-------------------------------------------------------+
```

## 2. Test Suites & Test Cases

### 2.1 Multi-Tenant Isolation Tests (`backend/tests/test_tenant_isolation.py`)
- **TC-TEN-01**: Business A user cannot read Business B employees via list or retrieve endpoints.
- **TC-TEN-02**: Passing another business's UUID in `X-Business-ID` returns HTTP 403 or falls back to unauthorized.
- **TC-TEN-03**: Direct IDOR test: querying `GET /api/v1/employees/<Business B UUID>/` with Business A token returns HTTP 404 (object does not exist in tenant queryset).
- **TC-TEN-04**: Payroll runs executed in Business A only read attendance records and salary structures belonging to Business A.

### 2.2 RBAC Permission Matrix Tests (`backend/tests/test_rbac.py`)
- **TC-RBAC-01**: `BUSINESS_OWNER` can access all endpoints across their business.
- **TC-RBAC-02**: `HR_MANAGER` can create and edit employees, approve leaves, but cannot approve final payroll runs.
- **TC-RBAC-03**: `ACCOUNTANT` can calculate payroll and manage expenses, but cannot approve their own salary structure or add new branches.
- **TC-RBAC-04**: `BRANCH_MANAGER` restricted to their branch's employees and attendance records.
- **TC-RBAC-05**: `EMPLOYEE` can view own payslips and mark own attendance, but forbidden from accessing other employee records.
- **TC-RBAC-06**: `AUDITOR` has strictly read-only (`GET`) access and cannot mutate (`POST/PUT/PATCH/DELETE`) any records.

### 2.3 Attendance & Geofencing Tests (`backend/tests/test_attendance.py`)
- **TC-ATT-01**: Clock-in inside 200m radius succeeds with `is_valid=True`.
- **TC-ATT-02**: Clock-in outside geofence radius flags record with `is_valid=False` and notes validation distance.
- **TC-ATT-03**: Consecutive check-in without check-out handled gracefully without crashing.
- **TC-ATT-04**: Overnight shift spanning midnight properly records working hours without rollover truncation.

### 2.4 Payroll Arithmetic & Financial Integrity Tests (`backend/tests/test_payroll.py`)
- **TC-PAY-01**: Gross pay equals sum of all active earning components.
- **TC-PAY-02**: Deductions calculate properly (fixed and percentage of basic).
- **TC-PAY-03**: Unpaid leave days deducted as Loss of Pay (LOP) based on configured monthly denominator.
- **TC-PAY-04**: Salary advances amortized and deducted from net payable, updating remaining advance balance.
- **TC-PAY-05**: Approving payroll locks records; modifying attendance afterwards throws HTTP 400.

## 3. Running Automated Tests
```bash
cd backend
python -m pytest tests/ -v --cov=apps --cov-report=term-missing
```
