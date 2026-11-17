/**
 * Utility to compute employee inactivity based on consecutive unpunched days.
 *
 * Enterprise Rule:
 * In mid and large companies, punch-out does NOT make an employee inactive.
 * An employee is classified as INACTIVE if and only if they have not logged
 * a punch-in for 3 or more continuous days.
 */

export const calculateEmployeeInactivity = (emp, attendanceRecords = []) => {
  if (!emp) {
    return { isInactive: false, days: 0, label: 'Active', badgeText: 'Active', lastPunchDate: null };
  }

  // 1. If employee was explicitly archived/terminated in employment status
  if (emp.status === 'TERMINATED' || emp.status === 'RESIGNED') {
    return {
      isInactive: true,
      isTerminated: true,
      days: 0,
      label: 'Inactive (Terminated)',
      badgeText: 'INACTIVE (Terminated)',
      shortLabel: 'Terminated',
      lastPunchDate: null,
    };
  }

  // 2. If backend already computed unpunched_days from the database
  if (emp.unpunched_days !== undefined && emp.unpunched_days !== null) {
    const days = Number(emp.unpunched_days);
    if (!isNaN(days) && days >= 3) {
      return {
        isInactive: true,
        days,
        label: `Inactive (No punch for ${days} days)`,
        badgeText: `Inactive (${days} days no punch)`,
        shortLabel: `${days}d no punch`,
        lastPunchDate: emp.last_punch_date || null,
      };
    }
  }

  const todayStr = new Date().toLocaleDateString('en-CA');
  const today = new Date(todayStr + 'T00:00:00');

  // 2. Find all punch records for this employee with valid check_in or PRESENT status
  const empPunches = Array.isArray(attendanceRecords)
    ? attendanceRecords.filter((r) => {
        const matchesEmp = r.employee === emp.id || r.employee_id === emp.id;
        const hasPunch = Boolean(r.check_in || (r.status === 'PRESENT' && Number(r.working_hours || 0) > 0));
        return matchesEmp && hasPunch && r.date;
      })
    : [];

  // Sort descending by date (most recent first)
  empPunches.sort((a, b) => (b.date > a.date ? 1 : -1));
  const latestPunch = empPunches[0];

  let referenceDateStr = null;
  if (latestPunch && latestPunch.date) {
    referenceDateStr = latestPunch.date;
  } else if (emp.last_punch_date) {
    referenceDateStr = emp.last_punch_date;
  } else if (emp.joining_date) {
    referenceDateStr = emp.joining_date;
  }

  if (!referenceDateStr) {
    return {
      isInactive: false,
      days: 0,
      label: 'Active',
      badgeText: 'ACTIVE',
      shortLabel: 'Active',
      lastPunchDate: null,
    };
  }

  const refDate = new Date(referenceDateStr + 'T00:00:00');
  const diffTime = today.getTime() - refDate.getTime();
  const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  // 3. 3 or more consecutive days without punch = INACTIVE
  if (diffDays >= 3) {
    return {
      isInactive: true,
      days: diffDays,
      label: `Inactive (No punch for ${diffDays} days)`,
      badgeText: `Inactive (${diffDays} days no punch)`,
      shortLabel: `${diffDays}d no punch`,
      lastPunchDate: referenceDateStr,
    };
  }

  return {
    isInactive: false,
    days: diffDays,
    label: 'Active',
    badgeText: 'ACTIVE',
    shortLabel: 'Active',
    lastPunchDate: referenceDateStr,
  };
};

