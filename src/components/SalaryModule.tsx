import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  Calendar,
  DollarSign,
  AlertCircle,
  X,
  CreditCard,
  Building2,
  Briefcase,
  Layers,
  Trash2,
} from 'lucide-react';
import {
  AttendanceRecord,
  Company,
  PaymentMode,
  Project,
  SalaryPayment,
  SalaryStatus,
  User,
  Worker,
} from '../types';
import { formatCurrency } from '../lib/calculations';
import { exportSalaryExcel, generateSalaryPDF, printSalaryPDF } from '../lib/exportUtils';

interface SalaryModuleProps {
  salaryPayments: SalaryPayment[];
  attendanceRecords: AttendanceRecord[];
  workers: Worker[];
  companies: Company[];
  projects: Project[];
  currentUser: User;
  onSaveSalary: (salary: Partial<SalaryPayment>) => Promise<void>;
  onDeleteSalary: (id: string) => Promise<void>;
}

export const SalaryModule: React.FC<SalaryModuleProps> = ({
  salaryPayments,
  attendanceRecords,
  workers,
  companies,
  projects,
  currentUser,
  onSaveSalary,
  onDeleteSalary,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SalaryPayment | null>(null);

  // Form states
  const [formWorkerId, setFormWorkerId] = useState(workers[0]?.id || '');
  const [formMonth, setFormMonth] = useState('2026-09');
  const [formPaymentDate, setFormPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [formDaysWorked, setFormDaysWorked] = useState<number>(26);
  const [formOtHours, setFormOtHours] = useState<number>(30);
  const [formBasicSalary, setFormBasicSalary] = useState<number>(25000);
  const [formOtSalary, setFormOtSalary] = useState<number>(3600);
  const [formAdvance, setFormAdvance] = useState<number>(3000);
  const [formStatus, setFormStatus] = useState<SalaryStatus>('Paid');
  const [formPaymentMode, setFormPaymentMode] = useState<PaymentMode>('Bank');
  const [formRemarks, setFormRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculated net salary for form
  const formNetSalary = Math.max(0, formBasicSalary + formOtSalary - formAdvance);

  // When worker is selected in form, auto-fill base rates and company
  const handleWorkerSelection = (workerId: string) => {
    setFormWorkerId(workerId);
    const w = workers.find((item) => item.id === workerId);
    if (w) {
      // Calculate from attendance if any exists for that month
      const workerAttendance = attendanceRecords.filter(
        (a) => a.workerId === workerId && a.date.startsWith(formMonth)
      );

      let days = 0;
      let ot = 0;
      workerAttendance.forEach((a) => {
        if (a.status === 'Full Day') days += 1;
        else if (a.status === 'Half Day') days += 0.5;
        ot += a.overtimeHours;
      });

      const effectiveDays = days > 0 ? days : 26;
      const effectiveOt = ot > 0 ? ot : 24;
      const basic = effectiveDays * w.dailyRate;
      const otWage = effectiveOt * w.overtimeRate;

      setFormDaysWorked(effectiveDays);
      setFormOtHours(effectiveOt);
      setFormBasicSalary(basic);
      setFormOtSalary(otWage);
    }
  };

  const openNewPayoutModal = () => {
    setEditingPayment(null);
    const firstWorker = workers[0];
    if (firstWorker) {
      handleWorkerSelection(firstWorker.id);
    }
    setFormMonth('2026-09');
    setFormPaymentDate(new Date().toISOString().slice(0, 10));
    setFormAdvance(2000);
    setFormStatus('Paid');
    setFormPaymentMode('Bank');
    setFormRemarks('Monthly wage disbursement');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const w = workers.find((item) => item.id === formWorkerId);
    if (!w) {
      setFormError('Please select a worker.');
      return;
    }
    if (formBasicSalary < 0 || formOtSalary < 0 || formAdvance < 0) {
      setFormError('Negative amounts are not allowed.');
      return;
    }

    try {
      setIsSaving(true);
      await onSaveSalary({
        id: editingPayment?.id,
        workerId: w.id,
        workerName: w.workerName,
        companyId: w.companyId,
        projectId: w.projectId,
        month: formMonth,
        paymentDate: formPaymentDate,
        daysWorked: Number(formDaysWorked),
        otHours: Number(formOtHours),
        basicSalary: Number(formBasicSalary),
        otSalary: Number(formOtSalary),
        advance: Number(formAdvance),
        netSalary: Number(formNetSalary),
        paidAmount: formStatus === 'Paid' ? Number(formNetSalary) : 0,
        status: formStatus,
        paymentMode: formPaymentMode,
        remarks: formRemarks,
      });
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed saving salary payment:', err);
      setFormError(err?.message || 'Data save nahi ho saka. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered salary records
  const filteredSalaries = salaryPayments.filter((s) => {
    if (selectedMonth !== 'all' && s.month !== selectedMonth) return false;
    if (companyFilter !== 'all' && s.companyId !== companyFilter) return false;
    if (projectFilter !== 'all' && s.projectId !== projectFilter) return false;
    if (workerFilter !== 'all' && s.workerId !== workerFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!s.workerName.toLowerCase().includes(q) && !s.remarks?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Calculate Required Totals:
  // TOTAL SALARY PAID, TOTAL SALARY PENDING, TOTAL ADVANCE
  const totalSalaryPaid = filteredSalaries
    .filter((s) => s.status === 'Paid')
    .reduce((acc, curr) => acc + (curr.paidAmount || curr.netSalary), 0);

  const totalSalaryPending = filteredSalaries
    .filter((s) => s.status === 'Pending' || s.status === 'Partial')
    .reduce((acc, curr) => acc + (curr.netSalary - (curr.paidAmount || 0)), 0);

  const totalAdvance = filteredSalaries.reduce((acc, curr) => acc + (curr.advance || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white font-mono uppercase tracking-tight">
              WORKER SALARY & WAGES MODULE
            </h2>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-800 text-amber-300 rounded border border-slate-700">
              {filteredSalaries.length} Salary Records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Worker salary registers, advance deductions, overtime pay and payment verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportSalaryExcel(filteredSalaries, companies, projects)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export Excel
          </button>
          <button
            onClick={() => generateSalaryPDF(filteredSalaries, selectedMonth, 'SR GROUP (ALL UNITS)')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Download PDF Salary Slips"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            PDF Slips
          </button>
          <button
            onClick={() => printSalaryPDF(filteredSalaries, selectedMonth, 'SR GROUP (ALL UNITS)')}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Direct Print Salary Register & Slips"
          >
            <Printer className="w-3.5 h-3.5 text-slate-950" />
            Print Slips
          </button>

          {['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(currentUser.role) && (
            <button
              onClick={openNewPayoutModal}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              + Process Salary / Advance
            </button>
          )}
        </div>
      </div>

      {/* Required Dashboard KPI Strip: Total Salary Paid, Total Salary Pending, Total Advance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
              TOTAL SALARY PAID
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {formatCurrency(totalSalaryPaid)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Disbursed via Bank, Cash & UPI</p>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
              TOTAL SALARY PENDING
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">
            {formatCurrency(totalSalaryPending)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Approved dues awaiting final payment</p>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
              TOTAL ADVANCE DEDUCTED
            </span>
            <CreditCard className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {formatCurrency(totalAdvance)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Mid-month advances recovered</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Month Selector */}
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono font-medium focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Months</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-08">August 2026</option>
              <option value="2026-07">July 2026</option>
            </select>
          </div>

          {/* Worker Filter */}
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Worker:</label>
            <select
              value={workerFilter}
              onChange={(e) => setWorkerFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Workers</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.workerName} ({w.workerId})
                </option>
              ))}
            </select>
          </div>

          {/* Company Filter */}
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Company:</label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Project:</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectId} - {p.projectName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
            </select>
          </div>
        </div>
      </div>

      {/* Salary Register Table (Section 9 Requirement) */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b1220] text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Worker</th>
                <th className="py-3 px-3 text-center">Month</th>
                <th className="py-3 px-3 text-right">Days</th>
                <th className="py-3 px-3 text-right">OT Hours</th>
                <th className="py-3 px-3 text-right">Basic Salary</th>
                <th className="py-3 px-3 text-right">OT Pay</th>
                <th className="py-3 px-3 text-right">Advance</th>
                <th className="py-3 px-3 text-right font-bold">Net Salary</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Mode & Date</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredSalaries.length > 0 ? (
                filteredSalaries.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white whitespace-nowrap">{s.workerName}</div>
                      <div className="text-[10px] text-slate-400">
                        {companies.find((c) => c.id === s.companyId)?.name}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-300 whitespace-nowrap">
                      {s.month}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{s.daysWorked}</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-400">{s.otHours} h</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-200">
                      {formatCurrency(s.basicSalary)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-400">
                      {formatCurrency(s.otSalary)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-red-400">
                      -{formatCurrency(s.advance)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 whitespace-nowrap">
                      {formatCurrency(s.netSalary)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'Paid'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="text-slate-300 font-medium">{s.paymentMode}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{s.paymentDate}</div>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => setDeleteConfirmId(s.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Salary Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-500">
                    No salary records match the selected month and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Salary / Advance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-mono uppercase">
                  Process Salary / Advance Payout
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Select Worker *</label>
                  <select
                    required
                    value={formWorkerId}
                    onChange={(e) => handleWorkerSelection(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.workerName} ({w.workerId}) - {w.category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Salary Month *</label>
                  <input
                    type="month"
                    required
                    value={formMonth}
                    onChange={(e) => setFormMonth(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Days Worked</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    step="0.5"
                    value={formDaysWorked}
                    onChange={(e) => {
                      const d = parseFloat(e.target.value) || 0;
                      setFormDaysWorked(d);
                      const w = workers.find((item) => item.id === formWorkerId);
                      if (w) setFormBasicSalary(d * w.dailyRate);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">OT Hours</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formOtHours}
                    onChange={(e) => {
                      const ot = parseFloat(e.target.value) || 0;
                      setFormOtHours(ot);
                      const w = workers.find((item) => item.id === formWorkerId);
                      if (w) setFormOtSalary(ot * w.overtimeRate);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Basic Salary (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formBasicSalary}
                    onChange={(e) => setFormBasicSalary(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">OT Salary (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formOtSalary}
                    onChange={(e) => setFormOtSalary(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Advance Deducted (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formAdvance}
                  onChange={(e) => setFormAdvance(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 2000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Automatic Net Salary Banner */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                <span className="text-xs text-slate-300">
                  Formula: Basic + OT - Advance = Net Salary
                </span>
                <div className="font-mono text-base font-black text-emerald-400">
                  Net: {formatCurrency(formNetSalary)}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={formPaymentDate}
                    onChange={(e) => setFormPaymentDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Payment Mode</label>
                  <select
                    value={formPaymentMode}
                    onChange={(e) => setFormPaymentMode(e.target.value as PaymentMode)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                  >
                    <option value="Bank">Bank NEFT/RTGS</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Payment Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as SalaryStatus)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                  >
                    <option value="Paid">Paid (Disbursed)</option>
                    <option value="Pending">Pending (Approved)</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Remarks / Reference</label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="e.g. Bank Ref UTR: 902194812"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-md"
                >
                  {isSaving ? 'Processing...' : 'Save Salary Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white font-mono uppercase">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to delete this salary disbursement record? The payment ledger will be permanently updated.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    await onDeleteSalary(deleteConfirmId);
                    setDeleteConfirmId(null);
                  } catch (err) {
                    console.error('Delete error:', err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Delete Salary Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
