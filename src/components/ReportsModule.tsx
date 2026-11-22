import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  Building2,
  Briefcase,
  Printer,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Clock,
  Layers,
} from 'lucide-react';
import {
  AttendanceRecord,
  Company,
  DailyWorkEntry,
  ExpenseEntry,
  FilterState,
  IncomeEntry,
  ProfitLossSummary,
  Project,
  SalaryPayment,
  Worker,
} from '../types';
import { calculateProfitLossSummary, formatCurrency } from '../lib/calculations';
import {
  exportProfitLossExcel,
  generateDailyReportPDF,
  generateSalaryPDF,
  printDailyReportPDF,
} from '../lib/exportUtils';

interface ReportsModuleProps {
  companies: Company[];
  projects: Project[];
  workers: Worker[];
  workEntries: DailyWorkEntry[];
  expenseEntries: ExpenseEntry[];
  salaryPayments: SalaryPayment[];
  attendanceRecords: AttendanceRecord[];
  incomeEntries: IncomeEntry[];
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  companies,
  projects,
  workers,
  workEntries,
  expenseEntries,
  salaryPayments,
  attendanceRecords,
  incomeEntries,
}) => {
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'custom'>('daily');

  // Daily report controls
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().slice(0, 10));
  const [dailyCompanyId, setDailyCompanyId] = useState('all');
  const [dailyProjectId, setDailyProjectId] = useState('all');
  const [dailyViewMode, setDailyViewMode] = useState<'work_value' | 'received_income'>('work_value');

  // Monthly report controls
  const [monthlyMonth, setMonthlyMonth] = useState('2026-09');
  const [monthlyCompanyId, setMonthlyCompanyId] = useState('all');
  const [monthlyProjectId, setMonthlyProjectId] = useState('all');

  // Custom range controls
  const [fromDate, setFromDate] = useState('2026-09-01');
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [customCompanyId, setCustomCompanyId] = useState('all');
  const [customProjectId, setCustomProjectId] = useState('all');

  // Compute Daily Summary dynamically
  const dailyFilter: FilterState = {
    date: dailyDate,
    companyId: dailyCompanyId,
    projectId: dailyProjectId,
    viewMode: dailyViewMode,
  };
  const dailySummary = calculateProfitLossSummary(
    workEntries,
    expenseEntries,
    incomeEntries,
    attendanceRecords,
    workers,
    dailyFilter
  );

  // Compute Monthly Summary dynamically
  const monthlyWork = workEntries.filter((w) => {
    if (!w.date.startsWith(monthlyMonth)) return false;
    if (monthlyCompanyId !== 'all' && w.companyId !== monthlyCompanyId) return false;
    if (monthlyProjectId !== 'all' && w.projectId !== monthlyProjectId) return false;
    return true;
  });
  const monthlyExp = expenseEntries.filter((e) => {
    if (!e.date.startsWith(monthlyMonth)) return false;
    if (monthlyCompanyId !== 'all' && e.companyId !== monthlyCompanyId) return false;
    if (monthlyProjectId !== 'all' && e.projectId !== monthlyProjectId) return false;
    return true;
  });
  const monthlyInc = incomeEntries.filter((i) => {
    if (!i.date.startsWith(monthlyMonth)) return false;
    if (monthlyCompanyId !== 'all' && i.companyId !== monthlyCompanyId) return false;
    if (monthlyProjectId !== 'all' && i.projectId !== monthlyProjectId) return false;
    return true;
  });
  const monthlyAtt = attendanceRecords.filter((a) => {
    if (!a.date.startsWith(monthlyMonth)) return false;
    if (monthlyCompanyId !== 'all' && a.companyId !== monthlyCompanyId) return false;
    if (monthlyProjectId !== 'all' && a.projectId !== monthlyProjectId) return false;
    return true;
  });

  const monthlyWorkVal = monthlyWork.reduce((acc, curr) => acc + (curr.workValue || 0), 0);
  const monthlyReceivedInc = monthlyInc.reduce((acc, curr) => acc + curr.receivedAmount, 0);
  const monthlyTotalInc = monthlyWorkVal > 0 ? monthlyWorkVal : monthlyReceivedInc;
  const monthlySiteExp = monthlyExp.reduce((acc, curr) => acc + curr.amount, 0);
  const monthlySalaries = salaryPayments
    .filter((s) => s.month === monthlyMonth)
    .reduce((acc, curr) => acc + (curr.paidAmount || curr.netSalary), 0);
  const monthlyTotalExp = monthlySiteExp + (monthlySalaries > 0 ? monthlySalaries : monthlyAtt.reduce((acc, c) => acc + c.netDailyWage, 0));
  const monthlyNet = monthlyTotalInc - monthlyTotalExp;
  const monthlyIsProfit = monthlyNet >= 0;
  const monthlyMargin = monthlyTotalInc > 0 ? Math.round((Math.abs(monthlyNet) / monthlyTotalInc) * 10000) / 100 : 0;

  // Custom Range summary
  const customWork = workEntries.filter((w) => {
    if (w.date < fromDate || w.date > toDate) return false;
    if (customCompanyId !== 'all' && w.companyId !== customCompanyId) return false;
    if (customProjectId !== 'all' && w.projectId !== customProjectId) return false;
    return true;
  });
  const customExp = expenseEntries.filter((e) => {
    if (e.date < fromDate || e.date > toDate) return false;
    if (customCompanyId !== 'all' && e.companyId !== customCompanyId) return false;
    if (customProjectId !== 'all' && e.projectId !== customProjectId) return false;
    return true;
  });
  const customInc = incomeEntries.filter((i) => {
    if (i.date < fromDate || i.date > toDate) return false;
    if (customCompanyId !== 'all' && i.companyId !== customCompanyId) return false;
    if (customProjectId !== 'all' && i.projectId !== customProjectId) return false;
    return true;
  });
  const customAtt = attendanceRecords.filter((a) => {
    if (a.date < fromDate || a.date > toDate) return false;
    if (customCompanyId !== 'all' && a.companyId !== customCompanyId) return false;
    if (customProjectId !== 'all' && a.projectId !== customProjectId) return false;
    return true;
  });

  const customWorkVal = customWork.reduce((acc, curr) => acc + (curr.workValue || 0), 0);
  const customReceivedInc = customInc.reduce((acc, curr) => acc + curr.receivedAmount, 0);
  const customTotalInc = customWorkVal > 0 ? customWorkVal : customReceivedInc;
  const customSiteExp = customExp.reduce((acc, curr) => acc + curr.amount, 0);
  const customLaborWage = customAtt.reduce((acc, curr) => acc + curr.netDailyWage, 0);
  const customTotalExp = customSiteExp + customLaborWage;
  const customNet = customTotalInc - customTotalExp;
  const customIsProfit = customNet >= 0;
  const customMargin = customTotalInc > 0 ? Math.round((Math.abs(customNet) / customTotalInc) * 10000) / 100 : 0;

  const getCompanyName = (id: string) => (id === 'all' ? 'All Companies' : companies.find((c) => c.id === id)?.name || id);
  const getProjectName = (id: string) => (id === 'all' ? 'All Projects' : projects.find((p) => p.id === id)?.projectName || id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white font-mono uppercase tracking-tight">
              REPORTS & AUDIT GENERATION MODULE
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate formal Section 13, 14, and 15 business audit reports with signed PDF printing and Excel exports.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-700 p-1 rounded-lg">
          <button
            onClick={() => setReportType('daily')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              reportType === 'daily'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Daily P&L
          </button>
          <button
            onClick={() => setReportType('monthly')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              reportType === 'monthly'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Monthly P&L
          </button>
          <button
            onClick={() => setReportType('custom')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              reportType === 'custom'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom Date Range
          </button>
        </div>
      </div>

      {/* 1. Daily Profit / Loss Report (Section 13) */}
      {reportType === 'daily' && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Select Report Date:</label>
                <input
                  type="date"
                  value={dailyDate}
                  onChange={(e) => setDailyDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Company:</label>
                <select
                  value={dailyCompanyId}
                  onChange={(e) => setDailyCompanyId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                >
                  <option value="all">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Project:</label>
                <select
                  value={dailyProjectId}
                  onChange={(e) => setDailyProjectId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                >
                  <option value="all">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectId} - {p.projectName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Revenue Metric:</label>
                <select
                  value={dailyViewMode}
                  onChange={(e) => setDailyViewMode(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                >
                  <option value="work_value">Daily Work Value (Accrual)</option>
                  <option value="received_income">Cash Remittance Realized</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={() => exportProfitLossExcel(dailySummary, getCompanyName(dailyCompanyId), getProjectName(dailyProjectId))}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                Export Daily Excel
              </button>
              <button
                onClick={() =>
                  generateDailyReportPDF(
                    dailySummary,
                    getCompanyName(dailyCompanyId),
                    getProjectName(dailyProjectId),
                    workEntries.filter((w) => w.date === dailyDate),
                    expenseEntries.filter((e) => e.date === dailyDate)
                  )
                }
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 shadow-sm"
                title="Download PDF File"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                Download PDF
              </button>
              <button
                onClick={() =>
                  printDailyReportPDF(
                    dailySummary,
                    getCompanyName(dailyCompanyId),
                    getProjectName(dailyProjectId),
                    workEntries.filter((w) => w.date === dailyDate),
                    expenseEntries.filter((e) => e.date === dailyDate)
                  )
                }
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                title="Direct Print Document"
              >
                <Printer className="w-3.5 h-3.5 text-slate-950" />
                Direct Print
              </button>
            </div>
          </div>

          {/* Section 13 Standard Layout Sheet */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-xl max-w-4xl mx-auto font-mono text-xs">
            <div className="border-b-2 border-amber-500 pb-4 mb-5 text-center">
              <h2 className="text-xl font-black text-white uppercase tracking-wider">
                SR GROUP – DAILY BUSINESS REPORT
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                ENGINEERING • INFRASTRUCTURE • FABRICATION • ERECTION • POWER
              </p>
              <div className="flex justify-center gap-4 text-xs text-amber-400 font-bold mt-2">
                <span>Date: {dailyDate}</span>
                <span>•</span>
                <span>Company: {getCompanyName(dailyCompanyId)}</span>
                <span>•</span>
                <span>Project: {getProjectName(dailyProjectId)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-slate-800 pb-5">
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Total Work Value:</span>
                  <span className="text-white font-bold">{formatCurrency(dailySummary.totalWorkValue)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Total Revenue / Income:</span>
                  <span className="text-amber-400 font-bold">{formatCurrency(dailySummary.totalIncome)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Total Workers On Site:</span>
                  <span className="text-slate-200">{dailySummary.workerCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Present (Full / Half):</span>
                  <span className="text-emerald-400">
                    {dailySummary.presentWorkers} Full / {dailySummary.halfDayWorkers} Half
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Worker Salary / Wages:</span>
                  <span className="text-blue-400 font-bold">{formatCurrency(dailySummary.totalWorkerSalary)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Site Direct Expenses:</span>
                  <span className="text-slate-300">{formatCurrency(dailySummary.otherExpenses)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Total Combined Expenses:</span>
                  <span className="text-red-400 font-bold">{formatCurrency(dailySummary.totalExpense)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Total OT Hours:</span>
                  <span className="text-slate-300">{dailySummary.totalOtHours} hrs</span>
                </div>
              </div>
            </div>

            {/* Bottom Bottomline: Profit / Loss */}
            <div
              className={`mt-6 p-4 rounded-xl border text-center ${
                dailySummary.isProfit
                  ? 'bg-emerald-950/40 border-emerald-500/40'
                  : 'bg-red-950/40 border-red-500/40'
              }`}
            >
              <div
                className={`text-sm font-black uppercase tracking-widest ${
                  dailySummary.isProfit ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {dailySummary.isProfit ? "TODAY'S NET PROFIT" : "TODAY'S NET LOSS"}
              </div>
              <div
                className={`text-3xl font-black mt-1 ${
                  dailySummary.isProfit ? 'text-emerald-300' : 'text-red-300'
                }`}
              >
                {formatCurrency(dailySummary.isProfit ? dailySummary.netProfit : dailySummary.netLoss)}
              </div>
              <div className="text-xs text-slate-300 mt-1 font-bold">
                MARGIN: {dailySummary.profitPercentage}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Monthly Profit / Loss Report (Section 14) */}
      {reportType === 'monthly' && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Select Month:</label>
                <input
                  type="month"
                  value={monthlyMonth}
                  onChange={(e) => setMonthlyMonth(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Company:</label>
                <select
                  value={monthlyCompanyId}
                  onChange={(e) => setMonthlyCompanyId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                >
                  <option value="all">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Project:</label>
                <select
                  value={monthlyProjectId}
                  onChange={(e) => setMonthlyProjectId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                >
                  <option value="all">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectId} - {p.projectName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 14 Monthly Layout Sheet */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-xl max-w-4xl mx-auto font-mono text-xs">
            <div className="border-b-2 border-amber-500 pb-4 mb-5 text-center">
              <h2 className="text-xl font-black text-white uppercase tracking-wider">
                SR GROUP – MONTHLY PROFIT / LOSS STATEMENT
              </h2>
              <div className="text-xs text-amber-400 font-bold mt-2">
                Month: {monthlyMonth} • Company: {getCompanyName(monthlyCompanyId)} • Project:{' '}
                {getProjectName(monthlyProjectId)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">Total Monthly Income:</span>
                <div className="text-lg font-bold text-amber-400 mt-1">{formatCurrency(monthlyTotalInc)}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Work Done: {formatCurrency(monthlyWorkVal)}</div>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">Total Monthly Expenses:</span>
                <div className="text-lg font-bold text-red-400 mt-1">{formatCurrency(monthlyTotalExp)}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Salaries + Material/Equipment</div>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  monthlyIsProfit ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-red-950/40 border-red-500/40'
                }`}
              >
                <span className={monthlyIsProfit ? 'text-emerald-400' : 'text-red-400'}>
                  {monthlyIsProfit ? 'Net Monthly Profit:' : 'Net Monthly Loss:'}
                </span>
                <div
                  className={`text-lg font-black mt-1 ${
                    monthlyIsProfit ? 'text-emerald-300' : 'text-red-300'
                  }`}
                >
                  {formatCurrency(Math.abs(monthlyNet))}
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">Margin: {monthlyMargin}%</div>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-4">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Work Logs Registered:</span>
                <span className="text-white">{monthlyWork.length} logs</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Site Overheads Logged:</span>
                <span className="text-white">{monthlyExp.length} logs ({formatCurrency(monthlySiteExp)})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Active Workforce Deployed:</span>
                <span className="text-white">{workers.length} Personnel</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Custom Date Range Report (Section 15) */}
      {reportType === 'custom' && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">From Date:</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">To Date:</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Company:</label>
                <select
                  value={customCompanyId}
                  onChange={(e) => setCustomCompanyId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                >
                  <option value="all">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Project:</label>
                <select
                  value={customProjectId}
                  onChange={(e) => setCustomProjectId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                >
                  <option value="all">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectId} - {p.projectName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 15 Custom Range Layout Sheet */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-xl max-w-4xl mx-auto font-mono text-xs">
            <div className="border-b-2 border-amber-500 pb-4 mb-5 text-center">
              <h2 className="text-xl font-black text-white uppercase tracking-wider">
                SR GROUP – CONSOLIDATED AUDIT REPORT
              </h2>
              <div className="text-xs text-amber-400 font-bold mt-2">
                Period: {fromDate} to {toDate} • Company: {getCompanyName(customCompanyId)} • Project:{' '}
                {getProjectName(customProjectId)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">Total Period Revenue:</span>
                <div className="text-lg font-bold text-amber-400 mt-1">{formatCurrency(customTotalInc)}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Work Done: {formatCurrency(customWorkVal)}</div>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">Total Period Costs:</span>
                <div className="text-lg font-bold text-red-400 mt-1">{formatCurrency(customTotalExp)}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Wages: {formatCurrency(customLaborWage)} • Overheads: {formatCurrency(customSiteExp)}
                </div>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  customIsProfit ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-red-950/40 border-red-500/40'
                }`}
              >
                <span className={customIsProfit ? 'text-emerald-400' : 'text-red-400'}>
                  {customIsProfit ? 'Net Period Profit:' : 'Net Period Loss:'}
                </span>
                <div
                  className={`text-lg font-black mt-1 ${
                    customIsProfit ? 'text-emerald-300' : 'text-red-300'
                  }`}
                >
                  {formatCurrency(Math.abs(customNet))}
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">Margin: {customMargin}%</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
