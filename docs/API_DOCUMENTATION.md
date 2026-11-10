# WorkPulse API Specification
## Base URL: `/api/v1/`

### 1. Overview & Standards
All API endpoints follow RESTful conventions.
Standard Response Format:
```json
{
  "success": true,
  "data": { ... }
}
```
Standard Error Format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable explanation",
    "details": { ... }
  }
}
```

Authentication Header:
```http
Authorization: Bearer <access_token>
X-Business-ID: <business_uuid>
```

---

### 2. Core Endpoints Table

| Method | Endpoint | Description | Permissions Required |
|---|---|---|---|
| **POST** | `/api/v1/auth/register/` | Register new user + business owner | Public |
| **POST** | `/api/v1/auth/login/` | Obtain JWT access + refresh tokens | Public |
| **POST** | `/api/v1/auth/logout/` | Blacklist refresh token | Authenticated |
| **POST** | `/api/v1/auth/token/refresh/` | Rotate access token | Public |
| **GET** | `/api/v1/auth/me/` | Current user profile | Authenticated |
| **PATCH** | `/api/v1/auth/me/` | Update profile information | Authenticated |
| **GET** | `/api/v1/auth/me/businesses/` | List accessible businesses & roles | Authenticated |
| **POST** | `/api/v1/auth/me/switch-business/` | Switch active business context | Authenticated |
| **GET** | `/api/v1/auth/roles/` | List roles in current business | IsBusinessMember |
| **POST** | `/api/v1/auth/roles/create/` | Create custom role | `role.create` |
| **POST** | `/api/v1/auth/roles/assign/` | Assign role to user | `role.assign` |
| **GET** | `/api/v1/businesses/` | List or get active business details | IsBusinessMember |
| **PATCH** | `/api/v1/businesses/{id}/` | Update business profile | `business.update` |
| **GET** | `/api/v1/branches/` | List branches for active business | IsBusinessMember |
| **POST** | `/api/v1/branches/` | Create branch with geofence | `business.manage_branches` |
| **GET** | `/api/v1/branches/departments/` | List business departments | IsBusinessMember |
| **POST** | `/api/v1/branches/departments/` | Create department | `business.manage_departments` |
| **GET** | `/api/v1/branches/designations/` | List designations | IsBusinessMember |
| **POST** | `/api/v1/branches/designations/` | Create designation | `business.manage_departments` |
| **GET** | `/api/v1/employees/` | Filter/paginate employees list | `employee.view` |
| **POST** | `/api/v1/employees/` | Add employee with code generation | `employee.create` |
| **GET** | `/api/v1/employees/{id}/` | Retrieve full employee record | `employee.view` |
| **PATCH** | `/api/v1/employees/{id}/` | Update employee profile | `employee.update` |
| **POST** | `/api/v1/employees/{id}/deactivate/` | Deactivate employee | `employee.deactivate` |
| **POST** | `/api/v1/employees/{id}/transfer/` | Transfer branch/dept | `employee.transfer` |
| **POST** | `/api/v1/attendance/check-in/` | Clock-in with GPS coords & selfie | `attendance.mark_own` |
| **POST** | `/api/v1/attendance/check-out/` | Clock-out with auto-hours tally | `attendance.mark_own` |
| **POST** | `/api/v1/attendance/mark/` | Admin/manager manual attendance | `attendance.mark` |
| **GET** | `/api/v1/attendance/` | Date-filtered attendance records | `attendance.view` |
| **GET** | `/api/v1/attendance/daily/` | Daily aggregate summary | `attendance.view_reports` |
| **POST** | `/api/v1/attendance/corrections/` | Request attendance regularization | `attendance.correct` |
| **PATCH** | `/api/v1/attendance/corrections/{id}/approve/` | Approve regularization | `attendance.approve` |
| **GET** | `/api/v1/shifts/` | List shift patterns & rosters | `shift.view` |
| **POST** | `/api/v1/shifts/` | Create shift template | `shift.create` |
| **POST** | `/api/v1/shifts/assignments/` | Assign employee to shift | `shift.assign` |
| **GET** | `/api/v1/leaves/types/` | List active leave policies | `leave.view` |
| **POST** | `/api/v1/leaves/requests/` | Submit leave application | `leave.apply` |
| **GET** | `/api/v1/leaves/requests/` | List leave applications | `leave.view` |
| **PATCH** | `/api/v1/leaves/requests/{id}/approve/` | Approve leave application | `leave.approve` |
| **PATCH** | `/api/v1/leaves/requests/{id}/reject/` | Reject leave application | `leave.reject` |
| **GET** | `/api/v1/payroll/components/` | List salary components (allowance/deductions) | `payroll.view` |
| **GET** | `/api/v1/payroll/runs/` | List payroll cycles | `payroll.view` |
| **POST** | `/api/v1/payroll/runs/` | Create draft payroll cycle | `payroll.calculate` |
| **POST** | `/api/v1/payroll/runs/{id}/calculate/` | Trigger dynamic payroll math | `payroll.calculate` |
| **POST** | `/api/v1/payroll/runs/{id}/approve/` | Approve & lock payroll run | `payroll.approve` |
| **GET** | `/api/v1/payroll/payslips/{id}/download/` | Generate & download PDF payslip | `payroll.view_own` |
| **GET** | `/api/v1/advances/` | List advance requests & ledger | `advance.view` |
| **POST** | `/api/v1/advances/` | Request salary advance | `advance.request` |
| **PATCH** | `/api/v1/advances/{id}/approve/` | Approve advance disbursement | `advance.approve` |
| **GET** | `/api/v1/expenses/` | List categorized business expenses | `expense.view` |
| **POST** | `/api/v1/expenses/` | Submit expense with receipt | `expense.create` |
| **GET** | `/api/v1/expenses/cashbook/` | Petty cash transactions & balance | `expense.view` |
| **POST** | `/api/v1/expenses/cashbook/` | Record CASH_IN or CASH_OUT | `expense.create` |
| **GET** | `/api/v1/reports/overview/` | Real-time business KPI metrics | `report.view` |
| **GET** | `/api/v1/reports/attendance/` | Detailed attendance rollup export | `report.view` |
| **GET** | `/api/v1/reports/payroll/` | Comprehensive payroll ledger report | `report.view` |
| **GET** | `/api/v1/notifications/` | List user in-app notifications | Authenticated |
| **PATCH** | `/api/v1/notifications/{id}/read/` | Mark notification as read | Authenticated |
| **GET** | `/api/v1/subscriptions/current/` | Active plan tier & quota limits | `subscription.view` |
