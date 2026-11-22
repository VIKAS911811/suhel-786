import React, { useState, useMemo } from 'react';
import {
  AttendanceRecord,
  Company,
  DailyWorkEntry,
  ExpenseEntry,
  IncomeEntry,
  ProfitLossSummary,
  Project,
  SalaryPayment,
  Worker,
} from '../types';
import { formatCurrency } from '../lib/calculations';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
  Building,
  Briefcase,
  Download,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProfitLossModuleProps {
  companies: Company[];
  projects: Project[];
  workers: Worker[];
  workEntries: DailyWorkEntry[];
  expenseEntries: ExpenseEntry[];
  salaryPayments: SalaryPayment[];
  attendanceRecords: AttendanceRecord[];
  incomeEntries: IncomeEntry[];
}

export const ProfitLossModule: React.FC<ProfitLossModuleProps> = ({
  companies,
  projects,
  workers,
  workEntries,
  expenseEntries,
  salaryPayments,
  attendanceRecords,
  incomeEntries,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'monthly' | 'project' | 'company'>('daily');
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // 1. Daily Breakdown Rows (Past 30 days)
  const dailyRows = useMemo(() => {
    const dates = Array.from(
      new Set([
        ...workEntries.map((w) => w.date),
        ...expenseEntries.map((e) => e.date),
        ...incomeEntries.map((i) => i.date),
        ...attendanceRecords.map((a) => a.date),
      ])
    ).sort().reverse().slice(0, 30);

    return dates.map((d) => {
      // Income
      const workVal = workEntries
        .filter((w) => w.date === d && (selectedCompanyId === 'all' || w.companyId === selectedCompanyId) && (selectedProjectId === 'all' || w.projectId === selectedProjectId))
        .reduce((sum, w) => sum + (w.workValue || 0), 0);
      const incVal = incomeEntries
        .filter((i) => i.date === d && (selectedCompanyId === 'all' || i.companyId === selectedCompanyId) && (selectedProjectId === 'all' || i.projectId === selectedProjectId))
        .reduce((sum, i) => sum + i.receivedAmount, 0);
      const totalIncome = workVal > 0 ? workVal : incVal;

      // Expenses
      const siteExp = expenseEntries
        .filter((e) => e.date === d && (selectedCompanyId === 'all' || e.companyId === selectedCompanyId) && (selectedProjectId === 'all' || e.projectId === selectedProjectId))
        .reduce((sum, e) => sum + e.amount, 0);

      const wages = attendanceRecords
        .filter((a) => a.date === d && (selectedCompanyId === 'all' || a.companyId === selectedCompanyId) && (selectedProjectId === 'all' || a.projectId === selectedProjectId))
        .reduce((sum, a) => sum + a.netDailyWage, 0);

      const totalExpense = siteExp + wages;
      const net = totalIncome - totalExpense;
      const isProfit = net >= 0;
      const margin = totalIncome > 0 ? Math.round((Math.abs(net) / totalIncome) * 10000) / 100 : 0;

      return {
        date: d,
        workValue: workVal,
        income: totalIncome,
        wages,
        siteExp,
        totalExpense,
        net,
        isProfit,
        margin,
      };
    });
  }, [workEntries, expenseEntries, incomeEntries, attendanceRecords, selectedCompanyId, selectedProjectId]);

  // 2. Project-wise Breakdown
  const projectRows = useMemo(() => {
    return projects.map((p) => {
      const pWork = workEntries
        .filter((w) => w.projectId === p.projectId || w.projectId === p.id)
        .reduce((sum, w) => sum + (w.workValue || 0), 0);
      const pInc = incomeEntries
        .filter((i) => i.projectId === p.id || i.projectId === p.projectId)
        .reduce((sum, i) => sum + i.receivedAmount, 0);
      const income = pWork > 0 ? pWork : pInc;

      const siteExp = expenseEntries
        .filter((e) => e.projectId === p.id || e.projectId === p.projectId)
        .reduce((sum, e) => sum + e.amount, 0);

      const wages = attendanceRecords
        .filter((a) => a.projectId === p.id || a.projectId === p.projectId)
        .reduce((sum, a) => sum + a.netDailyWage, 0);

      const totalExpense = siteExp + wages;
      const net = income - totalExpense;
      const isProfit = net >= 0;
      const margin = income > 0 ? Math.round((Math.abs(net) / income) * 10000) / 100 : 0;

      return {
        id: p.id,
        projectId: p.projectId,
        projectName: p.projectName,
        client: p.clientName,
        income,
        wages,
        siteExp,
        totalExpense,
        net,
        isProfit,
        margin,
        progress: p.completionPercentage || 0,
      };
    });
  }, [projects, workEntries, incomeEntries, expenseEntries, attendanceRecords]);

  // 3. Company-wise Breakdown
  const companyRows = useMemo(() => {
    return companies.map((c) => {
      const cWork = workEntries
        .filter((w) => w.companyId === c.id)
        .reduce((sum, w) => sum + (w.workValue || 0), 0);
      const cInc = incomeEntries
        .filter((i) => i.companyId === c.id)
        .reduce((sum, i) => sum + i.receivedAmount, 0);
      const income = cWork > 0 ? cWork : cInc;

      const siteExp = expenseEntries
        .filter((e) => e.companyId === c.id)
        .reduce((sum, e) => sum + e.amount, 0);

      const wages = attendanceRecords
        .filter((a) => a.companyId === c.id)
        .reduce((sum, a) => sum + a.netDailyWage, 0);

      const totalExpense = siteExp + wages;
      const net = income - totalExpense;
      const isProfit = net >= 0;
      const margin = income > 0 ? Math.round((Math.abs(net) / income) * 10000) / 100 : 0;

      return {
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        income,
        wages,
        siteExp,
        totalExpense,
        net,
        isProfit,
        margin,
      };
    });
  }, [companies, workEntries, incomeEntries, expenseEntries, attendanceRecords]);

  // 4. Monthly Breakdown (Past 12 months)
  const monthlyRows = useMemo(() => {
    const months = Array.from(
      new Set([
        ...workEntries.map((w) => w.date.slice(0, 7)),
        ...expenseEntries.map((e) => e.date.slice(0, 7)),
        ...incomeEntries.map((i) => i.date.slice(0, 7)),
      ])
    ).sort().reverse();

    return months.map((m) => {
      const mWork = workEntries
        .filter((w) => w.date.startsWith(m))
        .reduce((sum, w) => sum + (w.workValue || 0), 0);
      const mInc = incomeEntries
        .filter((i) => i.date.startsWith(m))
        .reduce((sum, i) => sum + i.receivedAmount, 0);
      const income = mWork > 0 ? mWork : mInc;

      const siteExp = expenseEntries
        .filter((e) => e.date.startsWith(m))
        .reduce((sum, e) => sum + e.amount, 0);

      const wages = attendanceRecords
        .filter((a) => a.date.startsWith(m))
        .reduce((sum, a) => sum + a.netDailyWage, 0);

      const salaries = salaryPayments
        .filter((s) => s.month === m)
        .reduce((sum, s) => sum + (s.paidAmount || s.netSalary), 0);

      const totalExpense = siteExp + (salaries > 0 ? salaries : wages);
      const net = income - totalExpense;
      const isProfit = net >= 0;
      const margin = income > 0 ? Math.round((Math.abs(net) / income) * 10000) / 100 : 0;

      return {
        month: m,
        income,
        salaries: salaries > 0 ? salaries : wages,
        siteExp,
        totalExpense,
        net,
        isProfit,
        margin,
      };
    });
  }, [workEntries, incomeEntries, expenseEntries, attendanceRecords, salaryPayments]);

  // Export current breakdown to Excel
  const handleExportExcel = () => {
    let data: any[] = [];
    let sheetName = 'Profit Loss';

    if (activeSubTab === 'daily') {
      sheetName = 'Daily P&L';
      data = dailyRows.map((r) => ({
        Date: r.date,
        'Work Value (₹)': r.workValue,
        'Income (₹)': r.income,
        'Wages (₹)': r.wages,
        'Site Expenses (₹)': r.siteExp,
        'Total Expense (₹)': r.totalExpense,
        'Net Profit/Loss (₹)': r.net,
        'Margin (%)': r.margin,
        Status: r.isProfit ? 'PROFIT' : 'LOSS',
      }));
    } else if (activeSubTab === 'project') {
      sheetName = 'Project P&L';
      data = projectRows.map((r) => ({
        'Project ID': r.projectId,
        'Project Name': r.projectName,
        Client: r.client,
        'Total Income (₹)': r.income,
        'Labor Wages (₹)': r.wages,
        'Site Expenses (₹)': r.siteExp,
        'Total Expense (₹)': r.totalExpense,
        'Net Profit/Loss (₹)': r.net,
        'Margin (%)': r.margin,
        Status: r.isProfit ? 'PROFIT' : 'LOSS',
      }));
    } else if (activeSubTab === 'company') {
      sheetName = 'Company P&L';
      data = companyRows.map((r) => ({
        Company: r.name,
        'Total Income (₹)': r.income,
        'Labor Wages (₹)': r.wages,
        'Site Expenses (₹)': r.siteExp,
        'Total Expense (₹)': r.totalExpense,
        'Net Profit/Loss (₹)': r.net,
        'Margin (%)': r.margin,
        Status: r.isProfit ? 'PROFIT' : 'LOSS',
      }));
    } else {
      sheetName = 'Monthly P&L';
      data = monthlyRows.map((r) => ({
        Month: r.month,
        'Total Income (₹)': r.income,
        'Salaries/Wages (₹)': r.salaries,
        'Site Expenses (₹)': r.siteExp,
        'Total Expense (₹)': r.totalExpense,
        'Net Profit/Loss (₹)': r.net,
        'Margin (%)': r.margin,
        Status: r.isProfit ? 'PROFIT' : 'LOSS',
      }));
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `SR_GROUP_${sheetName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/40 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">AUTOMATIC PROFIT / LOSS</h1>
            <p className="text-xs text-slate-400">
              Formula: Net Profit = Income − (Salary + Overtime + Material + Cranes + Transport + Other Site Expenses)
            </p>
          </div>
        </div>

        <button
          onClick={handleExportExcel}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
        >
          <Download className="w-4 h-4" />
          Export P&L to Excel
        </button>
      </div>

      {/* Tabs Switcher: Daily, Monthly, Project-wise, Company-wise */}
      <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-fit">
        <button
          onClick={() => setActiveSubTab('daily')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeSubTab === 'daily'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Daily P&L
        </button>
        <button
          onClick={() => setActiveSubTab('monthly')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeSubTab === 'monthly'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Monthly P&L
        </button>
        <button
          onClick={() => setActiveSubTab('project')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeSubTab === 'project'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Project-wise P&L
        </button>
        <button
          onClick={() => setActiveSubTab('company')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeSubTab === 'company'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-4 h-4" />
          Company-wise P&L
        </button>
      </div>

      {/* Sub-view Rendering */}
      {activeSubTab === 'daily' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-white uppercase tracking-wider">
              Daily Profit & Loss Ledger (Past 30 Recorded Days)
            </span>
            <div className="flex items-center gap-2">
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300"
              >
                <option value="all">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.projectId}>{p.projectName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Work Value / Income (₹)</th>
                  <th className="py-3 px-4 text-right">Labor Wages (₹)</th>
                  <th className="py-3 px-4 text-right">Site Expenses (₹)</th>
                  <th className="py-3 px-4 text-right">Total Expense (₹)</th>
                  <th className="py-3 px-4 text-right">Net Profit / Loss (₹)</th>
                  <th className="py-3 px-4 text-right">Margin (%)</th>
                  <th className="py-3 px-4 text-center">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {dailyRows.map((r) => (
                  <tr key={r.date} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white">{r.date}</td>
                    <td className="py-3 px-4 text-right text-amber-300 font-bold">
                      ₹{r.income.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      ₹{r.wages.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      ₹{r.siteExp.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-400 font-bold">
                      ₹{r.totalExpense.toLocaleString('en-IN')}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-black ${
                        r.isProfit ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {r.isProfit ? '+' : '-'}₹{Math.abs(r.net).toLocaleString('en-IN')}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        r.isProfit ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {r.margin}%
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.isProfit
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                            : 'bg-red-500/15 text-red-400 border border-red-500/25'
                        }`}
                      >
                        {r.isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {r.isProfit ? 'PROFIT' : 'LOSS'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'project' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 text-xs font-bold text-white uppercase tracking-wider">
            Project-wise Consolidated Profit & Loss Analysis
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Project ID</th>
                  <th className="py-3 px-4">Project Name & Client</th>
                  <th className="py-3 px-4 text-right">Income / Work (₹)</th>
                  <th className="py-3 px-4 text-right">Labor Wages (₹)</th>
                  <th className="py-3 px-4 text-right">Site Expenses (₹)</th>
                  <th className="py-3 px-4 text-right">Total Costs (₹)</th>
                  <th className="py-3 px-4 text-right">Net Margin (₹)</th>
                  <th className="py-3 px-4 text-right">Progress</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {projectRows.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-amber-400">{p.projectId}</td>
                    <td className="py-3 px-4 font-sans">
                      <div className="font-bold text-white">{p.projectName}</div>
                      <div className="text-[11px] text-slate-400">Client: {p.client}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-300">
                      ₹{p.income.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      ₹{p.wages.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      ₹{p.siteExp.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-400">
                      ₹{p.totalExpense.toLocaleString('en-IN')}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-black ${
                        p.isProfit ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {p.isProfit ? '+' : '-'}₹{Math.abs(p.net).toLocaleString('en-IN')}
                      <div className="text-[10px] font-normal text-slate-400">{p.margin}%</div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-200">
                      {p.progress}%
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.isProfit
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                            : 'bg-red-500/15 text-red-400 border border-red-500/25'
                        }`}
                      >
                        {p.isProfit ? 'PROFITABLE' : 'NET LOSS'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'company' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 text-xs font-bold text-white uppercase tracking-wider">
            Company-wise Profit & Loss
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4 text-right">Total Inflow (₹)</th>
                  <th className="py-3 px-4 text-right">Labor Wages (₹)</th>
                  <th className="py-3 px-4 text-right">Site Overheads (₹)</th>
                  <th className="py-3 px-4 text-right">Total Outflow (₹)</th>
                  <th className="py-3 px-4 text-right">Net Profit / Loss (₹)</th>
                  <th className="py-3 px-4 text-right">Margin (%)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {companyRows.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-sans font-bold text-white">
                      {c.name}
                      <span className="ml-2 text-xs font-mono text-amber-400">({c.shortName})</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-300">
                      ₹{c.income.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      ₹{c.wages.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      ₹{c.siteExp.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-400">
                      ₹{c.totalExpense.toLocaleString('en-IN')}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-black ${
                        c.isProfit ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {c.isProfit ? '+' : '-'}₹{Math.abs(c.net).toLocaleString('en-IN')}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        c.isProfit ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {c.margin}%
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.isProfit
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                            : 'bg-red-500/15 text-red-400 border border-red-500/25'
                        }`}
                      >
                        {c.isProfit ? 'SURPLUS' : 'DEFICIT'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'monthly' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 text-xs font-bold text-white uppercase tracking-wider">
            Monthly Consolidated Financial Review
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Billing Month</th>
                  <th className="py-3 px-4 text-right">Inflow / Revenue (₹)</th>
                  <th className="py-3 px-4 text-right">Salary Outflow (₹)</th>
                  <th className="py-3 px-4 text-right">Site Expenses (₹)</th>
                  <th className="py-3 px-4 text-right">Total Outflow (₹)</th>
                  <th className="py-3 px-4 text-right">Net Profit / Loss (₹)</th>
                  <th className="py-3 px-4 text-right">Margin (%)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {monthlyRows.map((m) => (
                  <tr key={m.month} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-amber-400">{m.month}</td>
                    <td className="py-3 px-4 text-right font-bold text-amber-300">
                      ₹{m.income.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      ₹{m.salaries.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      ₹{m.siteExp.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-400">
                      ₹{m.totalExpense.toLocaleString('en-IN')}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-black ${
                        m.isProfit ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {m.isProfit ? '+' : '-'}₹{Math.abs(m.net).toLocaleString('en-IN')}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        m.isProfit ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {m.margin}%
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.isProfit
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                            : 'bg-red-500/15 text-red-400 border border-red-500/25'
                        }`}
                      >
                        {m.isProfit ? 'PROFIT' : 'LOSS'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
