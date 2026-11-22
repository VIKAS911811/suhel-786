import {
  AttendanceRecord,
  DailyWorkEntry,
  ExpenseEntry,
  FilterState,
  IncomeEntry,
  ProfitLossSummary,
  Worker,
} from '../types';

/**
 * Formats currency in Indian Rupee format (₹xx,xx,xxx)
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format numbers cleanly
 */
export function formatNumber(val: number): string {
  if (isNaN(val) || !isFinite(val)) return '0';
  return new Intl.NumberFormat('en-IN').format(val);
}

/**
 * Check if a date string falls inside the filter date range
 */
export function isDateInRange(dateStr: string, filter: FilterState): boolean {
  if (!dateStr) return false;

  if (filter.datePreset === 'custom' && filter.startDate && filter.endDate) {
    return dateStr >= filter.startDate && dateStr <= filter.endDate;
  }

  if (filter.datePreset === 'this_month') {
    // Current filter date's month
    const filterMonth = filter.date.substring(0, 7); // YYYY-MM
    return dateStr.startsWith(filterMonth);
  }

  if (filter.datePreset === 'this_week') {
    const target = new Date(filter.date);
    const day = target.getDay(); // 0 is Sun
    const diffToMonday = target.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(target.setDate(diffToMonday));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const targetDate = new Date(dateStr);
    return targetDate >= monday && targetDate <= sunday;
  }

  // Default: exact date match (today or yesterday or specific date)
  return dateStr === filter.date;
}

/**
 * Calculate Profit/Loss summary for filtered data
 */
export function calculateProfitLossSummary(
  workEntries: DailyWorkEntry[],
  attendanceRecords: AttendanceRecord[],
  expenseEntries: ExpenseEntry[],
  incomeEntries: IncomeEntry[],
  workers: Worker[],
  filter: FilterState
): ProfitLossSummary {
  // 1. Filter records according to date, company, project
  const filteredWork = workEntries.filter((w) => {
    if (!isDateInRange(w.date, filter)) return false;
    if (filter.companyId !== 'all' && w.companyId !== filter.companyId) return false;
    if (filter.projectId !== 'all' && w.projectId !== filter.projectId) return false;
    return true;
  });

  const filteredAttendance = attendanceRecords.filter((a) => {
    if (!isDateInRange(a.date, filter)) return false;
    if (filter.companyId !== 'all' && a.companyId !== filter.companyId) return false;
    if (filter.projectId !== 'all' && a.projectId !== filter.projectId) return false;
    return true;
  });

  const filteredExpenses = expenseEntries.filter((e) => {
    if (!isDateInRange(e.date, filter)) return false;
    if (filter.companyId !== 'all' && e.companyId !== filter.companyId) return false;
    if (filter.projectId !== 'all' && e.projectId !== filter.projectId) return false;
    return true;
  });

  const filteredIncome = incomeEntries.filter((i) => {
    if (!isDateInRange(i.date, filter)) return false;
    if (filter.companyId !== 'all' && i.companyId !== filter.companyId) return false;
    if (filter.projectId !== 'all' && i.projectId !== filter.projectId) return false;
    return true;
  });

  // 2. Aggregate Work Value
  const totalWorkValueFromWork = filteredWork.reduce((acc, curr) => acc + (curr.workValue || 0), 0);
  const totalWorkValueFromIncome = filteredIncome.reduce((acc, curr) => acc + (curr.workValue || 0), 0);
  const totalWorkValue = Math.max(totalWorkValueFromWork, totalWorkValueFromIncome, totalWorkValueFromWork + totalWorkValueFromIncome > 0 ? (totalWorkValueFromWork || totalWorkValueFromIncome) : 0);

  // 3. Aggregate Income (Billed vs Cash Received)
  const totalReceived = filteredIncome.reduce((acc, curr) => acc + (curr.amountReceived || 0), 0);
  const totalBilledIncome = filteredIncome.reduce((acc, curr) => acc + (curr.workValue || 0), 0);
  const totalPendingIncome = filteredIncome.reduce((acc, curr) => acc + (curr.amountPending || 0), 0);

  // Determine Effective Total Income depending on View Mode
  let totalIncome = 0;
  if (filter.viewMode === 'cash_received') {
    totalIncome = totalReceived;
  } else {
    // Work value view: prefer work entry value or billed income
    totalIncome = totalBilledIncome > 0 ? totalBilledIncome : totalWorkValue;
  }

  // 4. Aggregate Workers & Attendance
  const activeWorkersList = workers.filter((w) => {
    if (filter.companyId !== 'all' && w.companyId !== filter.companyId) return false;
    if (filter.projectId !== 'all' && w.projectId !== filter.projectId) return false;
    return true;
  });
  const workerCount = activeWorkersList.length || filteredAttendance.length;

  let presentWorkers = 0;
  let halfDayWorkers = 0;
  let absentWorkers = 0;
  let totalOtHours = 0;
  let totalAttendanceSalary = 0;

  filteredAttendance.forEach((att) => {
    if (att.status === 'Full Day') {
      presentWorkers += 1;
    } else if (att.status === 'Half Day') {
      halfDayWorkers += 1;
    } else if (att.status === 'Absent') {
      absentWorkers += 1;
    }
    totalOtHours += Number(att.overtimeHours) || 0;
    totalAttendanceSalary += Number(att.netDailyWage) || 0;
  });

  // 5. Aggregate Expenses by Category
  const categoryExpenses: Record<string, number> = {};
  let otherExpensesTotal = 0;

  filteredExpenses.forEach((exp) => {
    const cat = exp.expenseCategory || 'Other';
    const amt = Number(exp.amount) || 0;
    categoryExpenses[cat] = (categoryExpenses[cat] || 0) + amt;

    // If it is NOT worker salary already captured, count under other
    if (cat !== 'Worker Salary') {
      otherExpensesTotal += amt;
    }
  });

  // Calculate Total Worker Salary:
  // If we have attendance records, use totalAttendanceSalary.
  // Plus any explicit expense entries tagged as 'Worker Salary'.
  const explicitSalaryExpense = categoryExpenses['Worker Salary'] || 0;
  const totalWorkerSalary = totalAttendanceSalary > 0 
    ? totalAttendanceSalary + explicitSalaryExpense 
    : explicitSalaryExpense;

  // Total Expense = Worker Salary + other expenses
  const totalExpense = totalWorkerSalary + otherExpensesTotal;

  // 6. Net Profit / Loss Calculation
  const netDiff = totalIncome - totalExpense;
  const isProfit = netDiff >= 0;
  const netProfit = isProfit ? netDiff : 0;
  const netLoss = isProfit ? 0 : Math.abs(netDiff);

  // Profit Percentage
  // ((TOTAL INCOME - TOTAL EXPENSE) / TOTAL INCOME) * 100
  let profitPercentage = 0;
  if (totalIncome > 0) {
    profitPercentage = ((totalIncome - totalExpense) / totalIncome) * 100;
  } else if (totalExpense > 0) {
    profitPercentage = -100;
  } else {
    profitPercentage = 0;
  }

  // Ensure safe numeric bounds
  if (isNaN(profitPercentage) || !isFinite(profitPercentage)) {
    profitPercentage = 0;
  }

  return {
    date: filter.date,
    totalWorkValue,
    totalIncome,
    totalReceived,
    totalPendingIncome,
    workerCount,
    presentWorkers,
    halfDayWorkers,
    absentWorkers,
    totalOtHours,
    totalWorkerSalary,
    otherExpenses: otherExpensesTotal,
    totalExpense,
    netProfit,
    netLoss,
    isProfit,
    profitPercentage: Math.round(profitPercentage * 100) / 100,
    categoryExpenses,
    approvedBillsCount: 0,
    pendingBillsCount: 0,
    totalBilledAmount: 0,
    totalBillReceived: 0,
    totalBillBalance: 0,
    projectProgressPct: 0,
  };
}
