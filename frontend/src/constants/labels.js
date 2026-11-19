/**
 * WorkPulse Plain Language UI Labels & Terminology
 * Single source of truth for all human-friendly labels, actions, and headings.
 */

export const UI_LABELS = {
  // Core Actions
  START_WORK: 'Start Work',
  END_WORK: 'End Work',
  PUNCH_IN: 'Start Work',
  PUNCH_OUT: 'End Work',
  PUNCH_IN_SHORT: 'Start',
  PUNCH_OUT_SHORT: 'End',

  // Navigation Items (Plain English)
  NAV_DASHBOARD: 'Dashboard',
  NAV_ORGANIZATION: 'Organization',
  NAV_EMPLOYEES: 'Employees',
  NAV_ATTENDANCE: 'Attendance',
  NAV_WORK_SCHEDULE: 'Work Schedule', // Replaces 'Shifts & Roster'
  NAV_LEAVES: 'Leave Management',
  NAV_MY_LEAVES: 'My Leaves',
  NAV_PAYROLL: 'Payroll',
  NAV_MY_PAYSLIPS: 'My Payslips',
  NAV_ADVANCES_LOANS: 'Advances & Loans',
  NAV_CASHBOOK_EXPENSES: 'Cashbook & Expenses',
  NAV_FIELD_WORK: 'Field Work', // Replaces 'Field Management'
  NAV_REPORTS: 'Reports',
  NAV_SUBSCRIPTION: 'Subscription',
  NAV_SETTINGS: 'Settings',
  NAV_SYSTEM_CHECK: 'System Check', // Replaces 'Diagnostics' (Owner only)

  // Navigation Headings (5 Clear Groups)
  GROUP_PEOPLE: 'People',
  GROUP_TIME: 'Time',
  GROUP_MONEY: 'Money',
  GROUP_REPORTS: 'Reports',
  GROUP_SETTINGS: 'Settings',

  // Alerts & Plain Messages
  INACTIVITY_ALERT: (count) => `${count} employees have not come to work for 3+ days`,
  VIEW_INACTIVE_EMPLOYEES: 'View these employees', // Replaces 'Review in HR Directory'
  ATTENTION_TITLE: 'What needs your attention',

  // Payroll Calculation Terms (Consistent & Standard)
  PAYROLL_TITLE: 'Payroll',
  EXPENSES_TITLE: 'Expenses',
  CASHBOOK_TITLE: 'Cashbook',

  // Payroll Workflow Steps
  PAYROLL_STEP_1: 'Check Attendance',
  PAYROLL_STEP_2: 'Check Leaves & Advances',
  PAYROLL_STEP_3: 'Review Salary',
  PAYROLL_STEP_4: 'Approve',
  PAYROLL_STEP_5: 'Pay',

  // Number Definitions / Tooltips
  TOOLTIP_TOTAL_EMPLOYEES: 'Total number of people employed in your company or branch.',
  TOOLTIP_ACTIVE_EMPLOYEES: 'Employees currently on active payroll who can log attendance.',
  TOOLTIP_INACTIVE_EMPLOYEES: 'Employees who have not marked attendance for 3 or more working days.',
  TOOLTIP_PRESENT_TODAY: 'Employees who have started work today.',
  TOOLTIP_ABSENT_TODAY: 'Active employees who have not clocked in or submitted leave today.',
  TOOLTIP_ON_LEAVE_TODAY: 'Employees with an approved leave request for today.',

  // Role Welcome Messages
  WELCOME_OWNER: "Welcome back! Here is today's attendance, pending approvals, and money summary.",
  WELCOME_HR: "Welcome back! Here are your people, attendance, and leave requests.",
  WELCOME_BRANCH_MANAGER: "Welcome back! Here is your branch's people, attendance, and leaves.",
  WELCOME_ACCOUNTANT: "Welcome back! Here is your payroll status, expenses, and cashbook.",
  WELCOME_SUPERVISOR: "Welcome back! Here is your team today.",
  WELCOME_EMPLOYEE: "Hello! Ready to start your workday?",

  // Friendly Empty States
  EMPTY_EMPLOYEES: 'No employees added yet.',
  EMPTY_EMPLOYEES_SUB: 'Click "Add Employee" to onboard your first team member.',
  EMPTY_ATTENDANCE: 'No attendance records found for this date.',
  EMPTY_LEAVES: 'No leave requests pending your review.',
  EMPTY_ADVANCES: 'No advance requests in the queue.',
  EMPTY_EXPENSES: 'No expenses recorded yet.',
  EMPTY_PAYROLL: 'No payroll runs created yet. Click "Process Payroll" to start.',
};

export default UI_LABELS;

