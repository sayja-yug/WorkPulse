export type UserRoleType =
  | 'SUPER_ADMIN'
  | 'SUPPORT_ADMIN'
  | 'BILLING_ADMIN'
  | 'BUSINESS_OWNER'
  | 'HR_MANAGER'
  | 'BRANCH_MANAGER'
  | 'ACCOUNTANT'
  | 'SUPERVISOR'
  | 'EMPLOYEE'
  | 'FIELD_EMPLOYEE'
  | 'AUDITOR';

export interface User {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar?: string | null;
  is_superuser: boolean;
  active_business?: string | null;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  city?: string;
  country?: string;
  currency?: string;
  timezone?: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  geofence_radius: number;
  is_head_office: boolean;
}

export interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  branch_name?: string;
  department_name?: string;
  designation_name?: string;
  employment_type: string;
  salary_type: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_NOTICE' | 'TERMINATED';
  joining_date: string;
}

export interface AttendanceRecord {
  id: string;
  employee: string;
  employee_name: string;
  employee_code: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'PAID_LEAVE' | 'UNPAID_LEAVE' | 'HOLIDAY';
  check_in?: string | null;
  check_out?: string | null;
  working_hours: string;
  is_late: boolean;
  source: string;
}

export interface LeaveRequest {
  id: string;
  employee_name: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  days: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  applied_at: string;
}

export interface PayrollRun {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  status: 'DRAFT' | 'PROCESSING' | 'REVIEW' | 'APPROVED' | 'LOCKED';
  total_gross: string;
  total_deductions: string;
  total_net: string;
  items_count?: number;
}

export interface CashTransaction {
  id: string;
  type: 'CASH_IN' | 'CASH_OUT';
  amount: string;
  description: string;
  date: string;
  balance_after: string;
  payment_mode: string;
}

