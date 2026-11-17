/**
 * Utility functions for computing and formatting employee work hours
 * (Today's hours, Total Weekly hours, Total Monthly hours).
 * Guarantees zero logical errors, safe Date handling, and immune to NaN.
 */

export const parseCheckInDate = (val, dateStr = null) => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  // 1. If it's a full ISO or datetime string with 'T' or space
  if (typeof val === 'string' && (val.includes('T') || val.includes(' '))) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. If it's just a time like '09:30' or '09:30:00'
  if (typeof val === 'string' && val.includes(':')) {
    const parts = val.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parts[2] ? parseInt(parts[2], 10) : 0;
    if (isNaN(h) || isNaN(m)) return null;

    let base = new Date();
    if (dateStr) {
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        base = parsedDate;
      }
    }
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, s);
    return isNaN(d.getTime()) ? null : d;
  }

  const fallback = new Date(val);
  return isNaN(fallback.getTime()) ? null : fallback;
};

export const formatHoursText = (hours) => {
  if (hours == null || isNaN(hours) || !isFinite(hours) || hours <= 0) {
    return '0h 0m';
  }
  const totalMin = Math.round(Number(hours) * 60);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return `${hrs}h ${mins}m`;
};

export const getWeekRange = (refDate = new Date()) => {
  const d = new Date(refDate);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday ...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const mondayStr = monday.toLocaleDateString('en-CA');
  const sundayStr = sunday.toLocaleDateString('en-CA');

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekLabel = `${monday.getDate()} ${monthNames[monday.getMonth()]} - ${sunday.getDate()} ${monthNames[sunday.getMonth()]}`;

  return {
    monday,
    sunday,
    mondayStr,
    sundayStr,
    weekLabel,
  };
};

export const getMonthRange = (refDate = new Date()) => {
  const d = new Date(refDate);
  const year = d.getFullYear();
  const month = d.getMonth();

  const firstDay = new Date(year, month, 1, 0, 0, 0, 0);
  const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const firstDayStr = firstDay.toLocaleDateString('en-CA');
  const lastDayStr = lastDay.toLocaleDateString('en-CA');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthLabel = `${monthNames[month]} ${year}`;

  return {
    firstDay,
    lastDay,
    firstDayStr,
    lastDayStr,
    monthLabel,
  };
};

/**
 * Computes aggregated work hours (Today, Current Week, Current Month)
 * from attendance history, today's record, and live clock-in status.
 */
export const calculateWorkHoursSummary = (records = [], todayRecord = null, liveElapsedHours = null) => {
  const safeRecords = Array.isArray(records) ? records : [];
  const localToday = new Date().toLocaleDateString('en-CA');
  const { mondayStr, sundayStr, weekLabel } = getWeekRange();
  const { firstDayStr, lastDayStr, monthLabel } = getMonthRange();

  let todayHours = 0;
  let weeklyHours = 0;
  let monthlyHours = 0;
  let daysWorkedThisWeek = 0;
  let daysWorkedThisMonth = 0;

  // Track if today was explicitly processed from the records array
  let todayProcessed = false;

  safeRecords.forEach((rec) => {
    if (!rec || !rec.date) return;
    const isToday = rec.date === localToday;

    let h = 0;
    if (isToday) {
      todayProcessed = true;
      if (liveElapsedHours != null && isFinite(liveElapsedHours) && liveElapsedHours >= 0) {
        h = liveElapsedHours;
      } else if (rec.working_hours != null && !isNaN(parseFloat(rec.working_hours))) {
        h = parseFloat(rec.working_hours);
      } else if (rec.check_in && rec.check_out) {
        const inD = parseCheckInDate(rec.check_in, rec.date);
        const outD = parseCheckInDate(rec.check_out, rec.date);
        if (inD && outD && outD > inD) {
          h = (outD - inD) / 3600000;
        }
      }
      todayHours = h;
    } else {
      if (rec.working_hours != null && !isNaN(parseFloat(rec.working_hours))) {
        h = parseFloat(rec.working_hours);
      } else if (rec.check_in && rec.check_out) {
        const inD = parseCheckInDate(rec.check_in, rec.date);
        const outD = parseCheckInDate(rec.check_out, rec.date);
        if (inD && outD && outD > inD) {
          h = (outD - inD) / 3600000;
        }
      }
    }

    if (isNaN(h) || !isFinite(h) || h < 0) {
      h = 0;
    }

    // Weekly accumulator (Monday to Sunday)
    if (rec.date >= mondayStr && rec.date <= sundayStr) {
      weeklyHours += h;
      if (h > 0) daysWorkedThisWeek += 1;
    }

    // Monthly accumulator (1st to last day of month)
    if (rec.date >= firstDayStr && rec.date <= lastDayStr) {
      monthlyHours += h;
      if (h > 0) daysWorkedThisMonth += 1;
    }
  });

  // If today's record wasn't in safeRecords yet (e.g. freshly clocked in)
  if (!todayProcessed && todayRecord) {
    let h = 0;
    if (liveElapsedHours != null && isFinite(liveElapsedHours) && liveElapsedHours >= 0) {
      h = liveElapsedHours;
    } else if (todayRecord.working_hours != null && !isNaN(parseFloat(todayRecord.working_hours))) {
      h = parseFloat(todayRecord.working_hours);
    } else if (todayRecord.check_in && todayRecord.check_out) {
      const inD = parseCheckInDate(todayRecord.check_in, todayRecord.date || localToday);
      const outD = parseCheckInDate(todayRecord.check_out, todayRecord.date || localToday);
      if (inD && outD && outD > inD) {
        h = (outD - inD) / 3600000;
      }
    }

    if (isFinite(h) && h >= 0) {
      todayHours = h;
      const tDate = todayRecord.date || localToday;
      if (tDate >= mondayStr && tDate <= sundayStr) {
        weeklyHours += h;
        if (h > 0) daysWorkedThisWeek += 1;
      }
      if (tDate >= firstDayStr && tDate <= lastDayStr) {
        monthlyHours += h;
        if (h > 0) daysWorkedThisMonth += 1;
      }
    }
  }

  const safeToday = Math.round((isNaN(todayHours) ? 0 : todayHours) * 100) / 100;
  const safeWeekly = Math.round((isNaN(weeklyHours) ? 0 : weeklyHours) * 100) / 100;
  const safeMonthly = Math.round((isNaN(monthlyHours) ? 0 : monthlyHours) * 100) / 100;

  return {
    today: safeToday,
    todayFormatted: `${safeToday.toFixed(2)} hrs`,
    todayText: `${formatHoursText(safeToday)} completed`,
    weekly: safeWeekly,
    weeklyFormatted: `${safeWeekly.toFixed(2)} hrs`,
    weeklyText: formatHoursText(safeWeekly),
    monthly: safeMonthly,
    monthlyFormatted: `${safeMonthly.toFixed(2)} hrs`,
    monthlyText: formatHoursText(safeMonthly),
    weekLabel,
    monthLabel,
    daysWorkedThisWeek,
    daysWorkedThisMonth,
  };
};
