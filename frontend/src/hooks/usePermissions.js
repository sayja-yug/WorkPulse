import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';

export const usePermissions = () => {
  const { user, activeRole, roles, permissions, hasPermission, hasRole } = useAuth();

  const isOwner = hasRole(ROLES.BUSINESS_OWNER) || user?.is_superuser;
  const isSuperAdmin = activeRole === ROLES.SUPER_ADMIN || user?.is_superuser;
  const isSupportAdmin = activeRole === ROLES.SUPPORT_ADMIN;
  const isBillingAdmin = activeRole === ROLES.BILLING_ADMIN;
  const isPlatformAdmin = isSuperAdmin || isSupportAdmin || isBillingAdmin;
  const isHR = hasRole(ROLES.HR_MANAGER) || isOwner;
  const isAccountant = hasRole(ROLES.ACCOUNTANT) || isOwner;
  const isAccountantStrict = activeRole === ROLES.ACCOUNTANT || (!isOwner && !isSuperAdmin && !isHR && roles.includes(ROLES.ACCOUNTANT));
  const isBranchManager = hasRole(ROLES.BRANCH_MANAGER) || isOwner;
  const isBranchManagerStrict = activeRole === ROLES.BRANCH_MANAGER || (!isOwner && !isSuperAdmin && !isHR && roles.includes(ROLES.BRANCH_MANAGER));
  const isSupervisor = hasRole(ROLES.SUPERVISOR) || isHR || isOwner;
  const isAuditor = hasRole(ROLES.AUDITOR);
  const isEmployee = activeRole === ROLES.EMPLOYEE || activeRole === ROLES.FIELD_EMPLOYEE;
  const isFieldEmployee = activeRole === ROLES.FIELD_EMPLOYEE;
  const isSelfAttendanceOnly = isEmployee || isAccountantStrict;

  return {
    user,
    activeRole,
    roles,
    permissions,
    hasPermission,
    hasRole,
    isOwner,
    isSuperAdmin,
    isSupportAdmin,
    isBillingAdmin,
    isPlatformAdmin,
    isHR,
    isAccountant,
    isAccountantStrict,
    isBranchManager,
    isBranchManagerStrict,
    isSupervisor,
    isAuditor,
    isEmployee,
    isFieldEmployee,
    isSelfAttendanceOnly,
    canManageEmployees: hasPermission('employee.update'),
    canCreateEmployee: hasPermission('employee.create'),
    canManageBranches: hasPermission('business.update') && !isBranchManagerStrict,
    canManagePayroll: hasPermission('payroll.calculate'),
    canApprovePayroll: hasPermission('payroll.approve'),
    canManageExpenses: hasPermission('expense.create'),
    canApproveLeaves: hasPermission('leave.approve'),
    canApproveAdvances: hasPermission('advance.approve'),
    canManageShifts: hasPermission('shift.create'),
    canManageSettings: hasPermission('business.update'),
  };
};

