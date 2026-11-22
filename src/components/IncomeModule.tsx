import React, { useState } from 'react';
import {
  TrendingUp,
  Plus,
  Search,
  Download,
  Filter,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  CreditCard,
  FileText,
} from 'lucide-react';
import {
  Company,
  FilterState,
  IncomeEntry,
  PaymentMode,
  PaymentStatus,
  Project,
  User,
} from '../types';
import { formatCurrency } from '../lib/calculations';
import { exportIncomeExcel } from '../lib/exportUtils';

interface IncomeModuleProps {
  incomeEntries: IncomeEntry[];
  companies: Company[];
  projects: Project[];
  currentUser: User;
  onSaveIncome: (income: Partial<IncomeEntry>) => Promise<void>;
  onDeleteIncome: (id: string) => Promise<void>;
  globalFilter: FilterState;
}

export const IncomeModule: React.FC<IncomeModuleProps> = ({
  incomeEntries,
  companies,
  projects,
  currentUser,
  onSaveIncome,
  onDeleteIncome,
  globalFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>(globalFilter.companyId);
  const [selectedProject, setSelectedProject] = useState<string>(globalFilter.projectId);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(globalFilter.date);
  const [useDateFilter, setUseDateFilter] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeEntry | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [formDate, setFormDate] = useState(globalFilter.date || new Date().toISOString().slice(0, 10));
  const [formCompanyId, setFormCompanyId] = useState(companies[0]?.id || '');
  const [formProjectId, setFormProjectId] = useState(projects[0]?.id || '');
  const [formClientName, setFormClientName] = useState('NTPC Limited');
  const [formInvoiceNo, setFormInvoiceNo] = useState('');
  const [formBillAmount, setFormBillAmount] = useState<number>(250000);
  const [formReceivedAmount, setFormReceivedAmount] = useState<number>(200000);
  const [formPaymentMode, setFormPaymentMode] = useState<PaymentMode>('Bank');
  const [formPaymentStatus, setFormPaymentStatus] = useState<PaymentStatus>('Partial');
  const [formRemarks, setFormRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Auto calculate pending amount: Bill Amount - Received Amount
  const calculatedPending = Math.max(0, formBillAmount - formReceivedAmount);

  const openCreateModal = () => {
    setEditingIncome(null);
    setFormDate(globalFilter.date || new Date().toISOString().slice(0, 10));
    setFormCompanyId(companies[0]?.id || '');
    setFormProjectId(projects[0]?.id || '');
    setFormClientName(projects[0]?.clientName || 'NTPC Limited');
    setFormInvoiceNo(`SR-INV-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormBillAmount(350000);
    setFormReceivedAmount(350000);
    setFormPaymentMode('Bank');
    setFormPaymentStatus('Received');
    setFormRemarks('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (inc: IncomeEntry) => {
    setEditingIncome(inc);
    setFormDate(inc.date);
    setFormCompanyId(inc.companyId);
    setFormProjectId(inc.projectId);
    setFormClientName(inc.clientName);
    setFormInvoiceNo(inc.invoiceNumber);
    setFormBillAmount(inc.billAmount);
    setFormReceivedAmount(inc.receivedAmount);
    setFormPaymentMode(inc.paymentMode);
    setFormPaymentStatus(inc.paymentStatus);
    setFormRemarks(inc.remarks || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formClientName.trim()) {
      setFormError('Please enter Client Name.');
      return;
    }
    if (formBillAmount <= 0) {
      setFormError('Bill amount must be greater than zero.');
      return;
    }
    if (formReceivedAmount < 0) {
      setFormError('Received amount cannot be negative.');
      return;
    }

    try {
      setIsSaving(true);
      await onSaveIncome({
        id: editingIncome?.id,
        date: formDate,
        companyId: formCompanyId,
        projectId: formProjectId,
        clientName: formClientName.trim(),
        invoiceNumber: formInvoiceNo.trim() || `RA-BILL-${Date.now().toString().slice(-4)}`,
        billAmount: Number(formBillAmount),
        receivedAmount: Number(formReceivedAmount),
        pendingAmount: Number(calculatedPending),
        paymentMode: formPaymentMode,
        paymentStatus: formPaymentStatus,
        remarks: formRemarks.trim(),
      });
      setIsModalOpen(false);
    } catch (err) {
      setFormError('Failed to save income record.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredIncomes = incomeEntries.filter((inc) => {
    if (useDateFilter && inc.date !== dateFilter) return false;
    if (selectedCompany !== 'all' && inc.companyId !== selectedCompany) return false;
    if (selectedProject !== 'all' && inc.projectId !== selectedProject) return false;
    if (statusFilter !== 'all' && inc.paymentStatus !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchClient = inc.clientName.toLowerCase().includes(q);
      const matchInv = inc.invoiceNumber.toLowerCase().includes(q);
      const matchRem = inc.remarks?.toLowerCase().includes(q);
      if (!matchClient && !matchInv && !matchRem) return false;
    }
    return true;
  });

  // Required Section 11 Summaries: Total Billed, Total Received, Total Pending
  const totalBilled = filteredIncomes.reduce((acc, curr) => acc + curr.billAmount, 0);
  const totalReceived = filteredIncomes.reduce((acc, curr) => acc + curr.receivedAmount, 0);
  const totalPending = filteredIncomes.reduce((acc, curr) => acc + curr.pendingAmount, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white font-mono uppercase tracking-tight">
              INCOME & BILLING MODULE
            </h2>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-800 text-amber-300 rounded border border-slate-700">
              {filteredIncomes.length} Invoices / Receipts
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Client RA bills, progressive milestone certificates, cash receipts and uncollected balance tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportIncomeExcel(filteredIncomes, companies, projects)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export Excel
          </button>

          {['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(currentUser.role) && (
            <button
              onClick={openCreateModal}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              + Create RA Bill / Receipt
            </button>
          )}
        </div>
      </div>

      {/* Required Section 11 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              TOTAL BILLED / CERTIFIED
            </span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {formatCurrency(totalBilled)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Total value of invoices submitted to clients</p>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
              TOTAL RECEIVED (CASH-IN)
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300 font-mono mt-1">
            {formatCurrency(totalReceived)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Bank credits and verified remittances</p>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
              TOTAL PENDING RECEIVABLES
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">
            {formatCurrency(totalPending)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Formula: Bill Amount - Received Amount</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search client, invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Company */}
          <div>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
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

          {/* Project */}
          <div>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
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

          {/* Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Payment Statuses</option>
              <option value="Received">Received</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useIncDateFilter"
              checked={useDateFilter}
              onChange={(e) => setUseDateFilter(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="useIncDateFilter" className="text-slate-400 text-xs cursor-pointer select-none">
              Filter Date:
            </label>
            <input
              type="date"
              disabled={!useDateFilter}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={`bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none ${
                !useDateFilter ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            />
          </div>
        </div>
      </div>

      {/* Incomes Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b1220] text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Invoice / RA No</th>
                <th className="py-3 px-3">Client & Project</th>
                <th className="py-3 px-3 text-right">Bill Amount</th>
                <th className="py-3 px-3 text-right">Received Amount</th>
                <th className="py-3 px-3 text-right font-bold">Pending Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-3">Remarks</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredIncomes.length > 0 ? (
                filteredIncomes.map((inc) => {
                  const proj = projects.find((p) => p.id === inc.projectId);
                  return (
                    <tr key={inc.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">{inc.date}</td>
                      <td className="py-3 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                        {inc.invoiceNumber}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white whitespace-nowrap">{inc.clientName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {proj ? `${proj.projectId} (${proj.projectName})` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                        {formatCurrency(inc.billAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {formatCurrency(inc.receivedAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                        {formatCurrency(inc.pendingAmount)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inc.paymentStatus === 'Received'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : inc.paymentStatus === 'Partial'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {inc.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-400">{inc.paymentMode}</td>
                      <td className="py-3 px-3 max-w-xs text-slate-400 truncate">{inc.remarks || '-'}</td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(currentUser.role) && (
                            <button
                              onClick={() => openEditModal(inc)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                              title="Edit Record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {['ADMIN'].includes(currentUser.role) && (
                            <button
                              onClick={() => setDeleteConfirmId(inc.id)}
                              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500">
                    No income or billing entries match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Income Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-mono uppercase">
                  {editingIncome ? 'Edit Client Billing' : 'Create Client Billing / Receipt'}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Billing Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Company *</label>
                  <select
                    value={formCompanyId}
                    onChange={(e) => setFormCompanyId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Project *</label>
                  <select
                    value={formProjectId}
                    onChange={(e) => {
                      setFormProjectId(e.target.value);
                      const p = projects.find((item) => item.id === e.target.value);
                      if (p?.clientName) setFormClientName(p.clientName);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectId} - {p.projectName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={formClientName}
                    onChange={(e) => setFormClientName(e.target.value)}
                    placeholder="e.g. NTPC Limited"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Invoice / RA Bill Number</label>
                  <input
                    type="text"
                    value={formInvoiceNo}
                    onChange={(e) => setFormInvoiceNo(e.target.value)}
                    placeholder="e.g. NTPC-RA-09"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Payment Mode</label>
                  <select
                    value={formPaymentMode}
                    onChange={(e) => setFormPaymentMode(e.target.value as PaymentMode)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                  >
                    <option value="Bank">Bank NEFT/RTGS</option>
                    <option value="Cash">Direct Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Amounts Calculation */}
              <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div>
                  <label className="block text-white font-semibold mb-1">Bill Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={formBillAmount}
                    onChange={(e) => setFormBillAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-emerald-400 font-semibold mb-1">Received Amount (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formReceivedAmount}
                    onChange={(e) => {
                      const rec = parseFloat(e.target.value) || 0;
                      setFormReceivedAmount(rec);
                      if (rec >= formBillAmount) setFormPaymentStatus('Received');
                      else if (rec > 0) setFormPaymentStatus('Partial');
                      else setFormPaymentStatus('Pending');
                    }}
                    className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg px-3 py-2 text-emerald-300 font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Auto Pending Banner */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs">Payment Status: </span>
                  <span className="font-bold text-amber-300 font-mono">{formPaymentStatus}</span>
                </div>
                <div>
                  <span className="text-amber-400 text-xs font-semibold">Calculated Pending Balance: </span>
                  <span className="font-mono text-base font-extrabold text-amber-300 ml-1">
                    {formatCurrency(calculatedPending)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Remarks / Bank Transaction Details</label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="e.g. NEFT Reference #SBI982138712"
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
                  {isSaving ? 'Saving...' : editingIncome ? 'Update Bill' : 'Save Billing Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white font-mono uppercase">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to delete this billing entry? Company income and net profit metrics will adjust immediately.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onDeleteIncome(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
