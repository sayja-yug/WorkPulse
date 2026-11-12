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
  const isBranchManager = hasRole(ROLES.BRANCH_MANAGER) || isOwner;
  const isSupervisor = hasRole(ROLES.SUPERVISOR) || isHR || isOwner;
  const isAuditor = hasRole(ROLES.AUDITOR);
  const isEmployee = activeRole === ROLES.EMPLOYEE || activeRole === ROLES.FIELD_EMPLOYEE;
  const isFieldEmployee = activeRole === ROLES.FIELD_EMPLOYEE;

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
    isBranchManager,
    isSupervisor,
    isAuditor,
    isEmployee,
    isFieldEmployee,
    canManageEmployees: isHR || isBranchManager || isOwner,
    canCreateEmployee: hasPermission('employee.create') || isOwner,
    canManagePayroll: isAccountant || isOwner,
    canApprovePayroll: hasPermission('payroll.approve') || isOwner,
    canManageExpenses: isAccountant || isOwner,
    canApproveLeaves: hasPermission('leave.approve') || isHR || isBranchManager || isSupervisor || isOwner,
    canApproveAdvances: hasPermission('advance.approve') || isAccountant || isOwner,
    canManageShifts: hasPermission('shift.create') || isHR || isBranchManager || isOwner,
    canManageSettings: isOwner || isSuperAdmin,
  };
};

