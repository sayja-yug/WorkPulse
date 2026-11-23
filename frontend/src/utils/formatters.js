export const formatINR = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatTime = (timeString) => {
  if (!timeString) return '-';
  try {
    const d = new Date(timeString);
    if (isNaN(d.getTime())) return timeString;
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timeString;
  }
};

/**
 * Calculates exact age in years from a date of birth string (YYYY-MM-DD).
 */
export const calculateAge = (dobString) => {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

/**
 * Returns structured age information, legal compliance status, and UI feedback
 * (underage < 18 detection complying with labor laws).
 */
export const getAgeInfo = (dobString) => {
  if (!dobString) {
    return { age: null, isUnderage: false, isFuture: false, label: '', text: '' };
  }
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) {
    return { age: null, isUnderage: false, isFuture: false, label: '', text: '' };
  }

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dobMidnight = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());

  if (dobMidnight > todayMidnight) {
    return {
      age: null,
      isUnderage: true,
      isFuture: true,
      label: 'Invalid Date',
      text: 'Date of birth cannot be in the future.',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }

  const age = calculateAge(dobString);
  if (age === null) {
    return { age: null, isUnderage: false, isFuture: false, label: '', text: '' };
  }

  if (age < 18) {
    return {
      age,
      isUnderage: true,
      isFuture: false,
      label: `Age: ${age} years old (Under 18 — Illegal to Employ)`,
      text: `Candidate is ${age} years old. Employing workers under 18 years of age is illegal under child labor prevention laws.`,
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
    };
  }

  return {
    age,
    isUnderage: false,
    isFuture: false,
    label: `Age: ${age} years old (Legal working age)`,
    text: `Adult (${age} yrs) — eligible for full-time employment`,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };
};


