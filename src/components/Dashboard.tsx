import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  HardHat,
  Wallet,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Printer,
  Download,
  FileSpreadsheet,
  Building2,
  Briefcase,
  Layers,
  IndianRupee,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  AttendanceRecord,
  Company,
  DailyWorkEntry,
  ExpenseEntry,
  FilterState,
  IncomeEntry,
  MeasurementBill,
  ProfitLossSummary,
  Project,
  SalaryPayment,
  User,
  Worker,
} from '../types';
import { formatCurrency, formatNumber } from '../lib/calculations';
import { exportProfitLossExcel, generateDailyReportPDF, printDailyReportPDF } from '../lib/exportUtils';
import { NavTab } from './Sidebar';

interface DashboardProps {
  summary: ProfitLossSummary;
  filter: FilterState;
  companies: Company[];
  projects: Project[];
  workers: Worker[];
  workEntries: DailyWorkEntry[];
  expenseEntries: ExpenseEntry[];
  salaryPayments: SalaryPayment[];
  attendanceRecords: AttendanceRecord[];
  incomeEntries: IncomeEntry[];
  measurementBills?: MeasurementBill[];
  currentUser: User;
  onNavigateTab: (tab: NavTab) => void;
  onOpenQuickWork: () => void;
  onOpenAttendance: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  summary,
  filter,
  companies,
  projects,
  workers,
  workEntries,
  expenseEntries,
  salaryPayments,
  attendanceRecords,
  incomeEntries,
  measurementBills = [],
  currentUser,
  onNavigateTab,
  onOpenQuickWork,
  onOpenAttendance,
}) => {
  const activeCompany = companies.find((c) => c.id === filter.companyId);
  const activeProject = projects.find((p) => p.id === filter.projectId);

  const companyName = activeCompany ? activeCompany.name : 'All Companies';
  const projectName = activeProject ? `${activeProject.projectId} - ${activeProject.projectName}` : 'All Projects';

  // Recent 4 records
  const recentWork = workEntries.slice(0, 4);
  const recentExpenses = expenseEntries.slice(0, 4);
  const recentSalaries = salaryPayments.slice(0, 4);

  // Chart data: Financial Breakdown (Income vs Expense vs Net)
  const comparisonData = [
    {
      name: 'Today Summary',
      Income: summary.totalIncome,
      Expense: summary.totalExpense,
      WorkerSalary: summary.totalWorkerSalary,
      SiteExpense: summary.otherExpenses,
    },
  ];

  // Chart data: Expense Category Breakdown
  const categoryChartData = Object.entries(summary.categoryExpenses).map(([key, val]) => ({
    name: key,
    value: val,
  }));

  // Chart data: Attendance Breakdown
  const attendancePieData = [
    { name: 'Present (Full Day)', value: summary.presentWorkers, color: '#10b981' },
    { name: 'Half Day', value: summary.halfDayWorkers, color: '#f59e0b' },
    { name: 'Absent', value: summary.absentWorkers, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase font-mono">
              SR GROUP DAILY REPORT
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Live Stored Data
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Executive financial & operational metrics for {filter.date} • {companyName} • {projectName}
          </p>
        </div>

        {/* Quick Export & Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportProfitLossExcel(summary, companyName, projectName)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Export summary to Excel spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => generateDailyReportPDF(summary, companyName, projectName, workEntries, expenseEntries)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Download Signed PDF Report"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>PDF</span>
          </button>
          <button
            onClick={() => printDailyReportPDF(summary, companyName, projectName, workEntries, expenseEntries)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Direct Print Daily Report"
          >
            <Printer className="w-3.5 h-3.5 text-slate-950" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Hero Financial KPI Spotlight: Executive Board (Section 30 Format) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 cols: The Classic SR GROUP DAILY BUSINESS REPORT Frame */}
        <div className="lg:col-span-7 bg-gradient-to-b from-[#111c30] to-[#0d1627] border border-slate-800 rounded-xl p-5 shadow-2xl relative overflow-hidden">
          {/* Subtle watermarked industrial badge */}
          <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="font-mono font-black text-slate-200 text-sm tracking-wider uppercase">
                SR GROUP – DAILY BUSINESS REPORT
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-medium">
              Mode: {filter.viewMode === 'work_value' ? 'Work Value View' : 'Cash Received View'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Work Value
              </div>
              <div className="text-lg font-bold text-white font-mono mt-1">
                {formatCurrency(summary.totalWorkValue)}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Total Income
              </div>
              <div className="text-lg font-bold text-amber-400 font-mono mt-1">
                {formatCurrency(summary.totalIncome)}
              </div>
              {filter.viewMode === 'work_value' && (
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Cash: {formatCurrency(summary.totalReceived)}
                </div>
              )}
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Total Workers
              </div>
              <div className="text-lg font-bold text-slate-200 font-mono mt-1">
                {summary.workerCount}
              </div>
              <div className="text-[10px] text-emerald-400 font-medium mt-0.5">
                {summary.presentWorkers} Present • {summary.absentWorkers} Absent
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Worker Salary
              </div>
              <div className="text-lg font-bold text-slate-200 font-mono mt-1">
                {formatCurrency(summary.totalWorkerSalary)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {summary.totalOtHours} hrs OT included
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Site Expenses
              </div>
              <div className="text-lg font-bold text-slate-200 font-mono mt-1">
                {formatCurrency(summary.otherExpenses)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Material, Crane, Transport
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Total Expense
              </div>
              <div className="text-lg font-bold text-red-400 font-mono mt-1">
                {formatCurrency(summary.totalExpense)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Salary + Site Expenses
              </div>
            </div>
          </div>

          {/* Conditional TODAY'S PROFIT vs TODAY'S LOSS Display */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
              summary.isProfit
                ? 'bg-emerald-950/40 border-emerald-500/40 shadow-lg shadow-emerald-950/50'
                : 'bg-red-950/40 border-red-500/40 shadow-lg shadow-red-950/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  summary.isProfit
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {summary.isProfit ? (
                  <TrendingUp className="w-7 h-7" />
                ) : (
                  <TrendingDown className="w-7 h-7" />
                )}
              </div>
              <div>
                <div
                  className={`text-xs font-black tracking-widest uppercase font-mono ${
                    summary.isProfit ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {summary.isProfit ? "TODAY'S PROFIT" : "TODAY'S LOSS"}
                </div>
                <div
                  className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                    summary.isProfit ? 'text-emerald-300' : 'text-red-300'
                  }`}
                >
                  {formatCurrency(summary.isProfit ? summary.netProfit : summary.netLoss)}
                </div>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-slate-800/80 sm:pl-6">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                {summary.isProfit ? 'PROFIT MARGIN' : 'LOSS MARGIN'}
              </div>
              <div
                className={`text-xl font-extrabold font-mono mt-0.5 ${
                  summary.isProfit ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {summary.profitPercentage > 0 ? `+${summary.profitPercentage}%` : `${summary.profitPercentage}%`}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Formula: ((Income - Expense) / Income) × 100
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 cols: Financial Balance & Income Meter */}
        <div className="lg:col-span-5 bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Income vs Expense Balance
              </span>
              <span className="text-xs text-amber-400 font-mono font-semibold">
                SR Industrial Core
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {/* Income Progress Bar */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-amber-400">Total Income</span>
                  <span className="text-white font-mono font-bold">{formatCurrency(summary.totalIncome)}</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (summary.totalIncome / Math.max(summary.totalIncome, summary.totalExpense, 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Expense Progress Bar */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-red-400">Total Expense</span>
                  <span className="text-white font-mono font-bold">{formatCurrency(summary.totalExpense)}</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-red-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (summary.totalExpense / Math.max(summary.totalIncome, summary.totalExpense, 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Worker Salary component of Expense */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-blue-400">Worker Salary Share</span>
                  <span className="text-slate-300 font-mono">
                    {summary.totalExpense > 0
                      ? `${Math.round((summary.totalWorkerSalary / summary.totalExpense) * 100)}% of Expense`
                      : '0%'}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{
                      width: `${summary.totalExpense > 0 ? (summary.totalWorkerSalary / summary.totalExpense) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Site Action Strip */}
          <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <button
              onClick={onOpenQuickWork}
              className="flex-1 py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-all text-center"
            >
              + Log Daily Work
            </button>
            <button
              onClick={onOpenAttendance}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all text-center"
            >
              Mark Attendance
            </button>
            <button
              onClick={() => onNavigateTab('charts')}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold transition-all"
              title="View all 10 Charts"
            >
              All Charts &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* 16 Standard Automatic KPI Cards Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            16 Automatic Industrial Metrics (Database Synced)
          </h2>
          <span className="text-[11px] text-slate-500 font-mono">Live Recalculated</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
          {/* 1. Total Work Value */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">1. Work Value</span>
            <div className="text-sm font-black text-white font-mono mt-0.5 truncate">
              {formatCurrency(summary.totalWorkValue)}
            </div>
            <span className="text-[9px] text-slate-500">Completed Site Log</span>
          </div>

          {/* 2. Total Income */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
            <span className="text-[10px] text-amber-400 font-bold block uppercase">2. Total Income</span>
            <div className="text-sm font-black text-amber-300 font-mono mt-0.5 truncate">
              {formatCurrency(summary.totalIncome)}
            </div>
            <span className="text-[9px] text-slate-500">Invoiced & Billed</span>
          </div>

          {/* 3. Amount Received */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
            <span className="text-[10px] text-emerald-400 font-bold block uppercase">3. Received</span>
            <div className="text-sm font-black text-emerald-300 font-mono mt-0.5 truncate">
              {formatCurrency(summary.totalReceived)}
            </div>
            <span className="text-[9px] text-slate-500">Bank Realized</span>
          </div>

          {/* 4. Pending Amount */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
            <span className="text-[10px] text-amber-500 font-bold block uppercase">4. Pending Amount</span>
            <div className="text-sm font-black text-amber-400 font-mono mt-0.5 truncate">
              {formatCurrency(summary.totalPendingIncome)}
            </div>
            <span className="text-[9px] text-slate-500">Due from Clients</span>
          </div>

          {/* 5. Total Workers */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">5. Total Workers</span>
            <div className="text-sm font-black text-white font-mono mt-0.5">
              {summary.workerCount}
            </div>
            <span className="text-[9px] text-slate-500">On Active Roll</span>
          </div>

          {/* 6. Present Workers */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
            <span className="text-[10px] text-emerald-400 font-bold block uppercase">6. Present</span>
            <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
              {summary.presentWorkers}
            </div>
            <span className="text-[9px] text-slate-500">{summary.halfDayWorkers} Half-Day</span>
          </div>

          {/* 7. Absent Workers */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
            <span className="text-[10px] text-rose-400 font-bold block uppercase">7. Absent</span>
            <div className="text-sm font-black text-rose-400 font-mono mt-0.5">
              {summary.absentWorkers}
            </div>
            <span className="text-[9px] text-slate-500">Leave / Off</span>
          </div>

          {/* 8. Overtime */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
            <span className="text-[10px] text-blue-400 font-bold block uppercase">8. Overtime</span>
            <div className="text-sm font-black text-blue-300 font-mono mt-0.5">
              {summary.totalOtHours} hrs
            </div>
            <span className="text-[9px] text-slate-500">Extra Hours</span>
          </div>

          {/* 9. Worker Salary */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">9. Worker Salary</span>
            <div className="text-sm font-black text-white font-mono mt-0.5 truncate">
              {formatCurrency(summary.totalWorkerSalary)}
            </div>
            <span className="text-[9px] text-slate-500">Basic + OT</span>
          </div>

          {/* 10. Total Expenses */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
            <span className="text-[10px] text-rose-400 font-bold block uppercase">10. Total Expenses</span>
            <div className="text-sm font-black text-rose-400 font-mono mt-0.5 truncate">
              {formatCurrency(summary.totalExpense)}
            </div>
            <span className="text-[9px] text-slate-500">Salaries + Sites</span>
          </div>

          {/* 11. Net Profit */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
            <span className="text-[10px] text-emerald-400 font-bold block uppercase">11. Net Profit</span>
            <div className="text-sm font-black text-emerald-400 font-mono mt-0.5 truncate">
              {summary.isProfit ? formatCurrency(summary.netProfit) : '₹0'}
            </div>
            <span className="text-[9px] text-slate-500">Positive Net</span>
          </div>

          {/* 12. Net Loss */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
            <span className="text-[10px] text-red-400 font-bold block uppercase">12. Net Loss</span>
            <div className="text-sm font-black text-red-400 font-mono mt-0.5 truncate">
              {!summary.isProfit ? formatCurrency(summary.netLoss) : '₹0'}
            </div>
            <span className="text-[9px] text-slate-500">When Exp &gt; Inc</span>
          </div>

          {/* 13. Profit Percentage */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
            <span className="text-[10px] text-amber-400 font-bold block uppercase">13. Profit %</span>
            <div className="text-sm font-black text-amber-300 font-mono mt-0.5">
              {summary.profitPercentage}%
            </div>
            <span className="text-[9px] text-slate-500">Safe Calc</span>
          </div>

          {/* 14. Approved Bills */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
            <span className="text-[10px] text-emerald-400 font-bold block uppercase">14. Approved Bills</span>
            <div className="text-sm font-black text-emerald-300 font-mono mt-0.5">
              {measurementBills.filter((b) => b.status === 'Approved' || b.status === 'Paid').length} Bills
            </div>
            <span className="text-[9px] text-slate-500">Cleared RA/Muster</span>
          </div>

          {/* 15. Pending Bills */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
            <span className="text-[10px] text-amber-400 font-bold block uppercase">15. Pending Bills</span>
            <div className="text-sm font-black text-amber-300 font-mono mt-0.5">
              {measurementBills.filter((b) => b.status === 'Submitted' || b.status === 'Under Verification' || b.status === 'Draft').length} Bills
            </div>
            <span className="text-[9px] text-slate-500">Under Review</span>
          </div>

          {/* 16. Project Progress */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
            <span className="text-[10px] text-purple-400 font-bold block uppercase">16. Progress</span>
            <div className="text-sm font-black text-purple-300 font-mono mt-0.5">
              {projects.length > 0
                ? Math.round(projects.reduce((s, p) => s + (p.completionPercentage || 0), 0) / projects.length)
                : 0}%
            </div>
            <span className="text-[9px] text-slate-500">Avg Completion</span>
          </div>
        </div>
      </div>

      {/* Two Essential Interactive Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Income vs Expense Bar Chart */}
        <div className="lg:col-span-7 bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Chart 1: Daily Income vs Expense
              </h3>
              <p className="text-[11px] text-slate-400">Comparing Work Inflow, Total Outflow & Wages</p>
            </div>
            <button
              onClick={() => onNavigateTab('charts')}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
            >
              Open All 10 Charts <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tickFormatter={(val) => `₹${val / 1000}k`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Income" fill="#f59e0b" name="Total Income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="#ef4444" name="Total Expense" radius={[4, 4, 0, 0]} />
                <Bar dataKey="WorkerSalary" fill="#3b82f6" name="Worker Salary" radius={[4, 4, 0, 0]} />
                <Bar dataKey="SiteExpense" fill="#a855f7" name="Material & Site" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown Pie */}
        <div className="lg:col-span-5 bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Chart 9: Expense Categories
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Total: {formatCurrency(summary.otherExpenses)}
            </span>
          </div>

          <div className="h-60 mt-2 w-full flex items-center justify-center">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => formatCurrency(Number(val))}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 text-xs text-center">No site expenses recorded for this date.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Sections: Work, Expenses & Salary Payouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Work Entries */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white font-mono uppercase flex items-center gap-1.5">
                <HardHat className="w-3.5 h-3.5 text-amber-400" />
                Recent Work Completed
              </span>
              <button
                onClick={() => onNavigateTab('daily_work')}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
              >
                View All &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-800/60 mt-2">
              {recentWork.length > 0 ? (
                recentWork.map((w) => (
                  <div key={w.id} className="py-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-slate-200 line-clamp-1">
                        {w.workCategory}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400 shrink-0 ml-2">
                        {formatCurrency(w.workValue)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {w.workDescription}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>
                        {w.completedQuantity} {w.unit} done @ {formatCurrency(w.rate)}/{w.unit}
                      </span>
                      <span>{w.date}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">No work logged for this filter.</div>
              )}
            </div>
          </div>

          <button
            onClick={onOpenQuickWork}
            className="w-full mt-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 text-center transition-all"
          >
            + Add Work Entry
          </button>
        </div>

        {/* Recent Site Expenses */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white font-mono uppercase flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-red-400" />
                Recent Site Expenses
              </span>
              <button
                onClick={() => onNavigateTab('expenses')}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
              >
                View All &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-800/60 mt-2">
              {recentExpenses.length > 0 ? (
                recentExpenses.map((e) => (
                  <div key={e.id} className="py-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-slate-200">{e.expenseCategory}</span>
                      <span className="text-xs font-mono font-bold text-red-400 shrink-0 ml-2">
                        {formatCurrency(e.amount)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{e.description}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>Paid by {e.paidBy}</span>
                      <span>{e.date}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">No expenses recorded.</div>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('expenses')}
            className="w-full mt-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 text-center transition-all"
          >
            + Log Expense Entry
          </button>
        </div>

        {/* Recent Salary Payouts & Advances */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white font-mono uppercase flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-blue-400" />
                Recent Salary Records
              </span>
              <button
                onClick={() => onNavigateTab('salary')}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
              >
                Salary Register &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-800/60 mt-2">
              {recentSalaries.length > 0 ? (
                recentSalaries.map((s) => (
                  <div key={s.id} className="py-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-slate-200">{s.workerName}</span>
                      <span className="text-xs font-mono font-bold text-blue-400 shrink-0 ml-2">
                        {formatCurrency(s.paidAmount || s.netSalary)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Month: {s.month} • {s.daysWorked} days • {s.otHours} hrs OT
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span className="text-emerald-400 font-medium">Status: {s.status}</span>
                      <span>Mode: {s.paymentMode}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">No salary records yet.</div>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('salary')}
            className="w-full mt-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 text-center transition-all"
          >
            Manage Salary & Advance
          </button>
        </div>
      </div>
    </div>
  );
};
