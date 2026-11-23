const pagePermissions = {
  '/employees': ['employee.view'],
  '/organization': ['business.view'],
  '/attendance': ['attendance.view', 'attendance.mark_own'],
  '/shifts': ['shift.view'],
  '/leaves': ['leave.view', 'leave.apply'],
  '/payroll': ['payroll.view', 'payroll.view_own'],
  '/advances': ['advance.view', 'advance.request'],
  '/cashbook': ['expense.view'],
  '/field-management': ['attendance.view'],
  '/reports': ['report.view', 'attendance.view_reports', 'employee.view_bank'],
  '/roles': ['role.view', 'role.assign'],
  '/settings': ['business.update'],
  '/subscription': ['subscription.view'],
};

export function canOpenPage(path, { user, hasPermission, hasRole }) {
  if (user?.is_superuser) return true;
  if (path === '/platform/tenants') return hasRole(['SUPER_ADMIN', 'SUPPORT_ADMIN', 'BILLING_ADMIN']);
  if (path === '/platform/billing') return hasRole(['SUPER_ADMIN', 'BILLING_ADMIN']);
  if (path === '/testing-panel') return hasRole('BUSINESS_OWNER') && hasPermission('business.update');
  if (path.startsWith('/employees/')) return hasPermission('employee.view') || hasRole(['EMPLOYEE', 'FIELD_EMPLOYEE']);
  return pagePermissions[path] ? hasPermission(pagePermissions[path]) : true;
}
