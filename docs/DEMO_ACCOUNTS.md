# WorkPulse Demo Accounts & Testing Credentials

Run the following command to populate the database with realistic demonstration data:
```bash
python manage.py seed_demo_data
```

All demo accounts share the following password:
**`Demo@12345`**

---

## 1. Platform & Business Owner Accounts

| Role | Email Address | Access Level & Scope |
|---|---|---|
| **Super Admin** | `superadmin@workpulse.com` | Global SaaS platform administrator; manages tenants, system health, and global audit logs. |
| **Business Owner** | `owner@apexglobal.com` | Managing Director of Apex Global Enterprises; full read/write access to all business modules, branches, payroll, and subscriptions. |

---

## 2. Management & Functional Roles

| Role | Email Address | Access Level & Scope |
|---|---|---|
| **HR Manager** | `hr@apexglobal.com` | People Operations head; employee profiles, onboarding, shifts, leave policies, and attendance approvals. |
| **Branch Manager** | `branchmanager@apexglobal.com` | Manager of Bengaluru R&D Center (`BR-TECH`); scoped to Bengaluru branch staff and rosters. |
| **Accountant** | `accountant@apexglobal.com` | Financial controller; runs monthly payroll calculations, records salary advances, loans, and cashbook expenses. |
| **Supervisor** | `supervisor@apexglobal.com` | Operations supervisor at Mumbai Logistics Hub (`BR-LOG`); reviews team punch corrections and attendance regularizations. |
| **Auditor** | `auditor@apexglobal.com` | External compliance reviewer; read-only access to payroll history, financial transactions, and audit records. |

---

## 3. Employee Self-Service (ESS) Accounts

| Role | Email Address | Description |
|---|---|---|
| **Employee** | `employee@apexglobal.com` | Senior Engineer; self-service check-in/out, personal payslips, leave applications, and advance requests. |
| **Field Employee** | `field@apexglobal.com` | Field Sales Associate; mobile GPS clock-in, geofence validation, and visit tasks. |

---

## 4. Demo Business Details
- **Organization Name:** Apex Global Enterprises
- **Slug:** `apex-global`
- **Branches:**
  1. `BR-HQ`: Corporate Headquarters (Gurugram) - Geofence 300m
  2. `BR-TECH`: Bengaluru R&D Center (Bengaluru) - Geofence 250m
  3. `BR-LOG`: Mumbai Logistics Hub (Bhiwandi) - Geofence 500m
- **Departments:** Engineering, Human Resources, Finance & Accounting, Operations, Sales & Marketing

