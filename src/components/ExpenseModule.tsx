import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Download,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  Building2,
  Briefcase,
  AlertCircle,
  X,
  CreditCard,
  DollarSign,
  Truck,
  Wrench,
  Fuel,
} from 'lucide-react';
import {
  Company,
  ExpenseCategory,
  ExpenseEntry,
  FilterState,
  PaymentMode,
  Project,
  User,
} from '../types';
import { formatCurrency } from '../lib/calculations';
import { exportExpensesExcel } from '../lib/exportUtils';

interface ExpenseModuleProps {
  expenseEntries: ExpenseEntry[];
  companies: Company[];
  projects: Project[];
  currentUser: User;
  onSaveExpense: (expense: Partial<ExpenseEntry>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  globalFilter: FilterState;
  workerSalaryExpense?: number; // for the full cost rollup
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Material Expense',
  'Transport Expense',
  'Machinery Expense',
  'Diesel/Fuel',
  'Crane/Hydra',
  'Food/Mess',
  'Room Rent',
  'Site Consumables',
  'Safety Equipment',
  'Maintenance',
  'Other',
];

export const ExpenseModule: React.FC<ExpenseModuleProps> = ({
  expenseEntries,
  companies,
  projects,
  currentUser,
  onSaveExpense,
  onDeleteExpense,
  globalFilter,
  workerSalaryExpense = 0,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>(globalFilter.companyId);
  const [selectedProject, setSelectedProject] = useState<string>(globalFilter.projectId);
  const [dateFilter, setDateFilter] = useState<string>(globalFilter.date);
  const [useDateFilter, setUseDateFilter] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [formDate, setFormDate] = useState(globalFilter.date || new Date().toISOString().slice(0, 10));
  const [formCompanyId, setFormCompanyId] = useState(companies[0]?.id || '');
  const [formProjectId, setFormProjectId] = useState(projects[0]?.id || '');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Material Expense');
  const [formAmount, setFormAmount] = useState<number>(15000);
  const [formDescription, setFormDescription] = useState('');
  const [formPaidBy, setFormPaidBy] = useState('Site Cashier');
  const [formPaymentMode, setFormPaymentMode] = useState<PaymentMode>('Bank');
  const [formBillNo, setFormBillNo] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const openCreateModal = () => {
    setEditingExpense(null);
    setFormDate(globalFilter.date || new Date().toISOString().slice(0, 10));
    setFormCompanyId(companies[0]?.id || '');
    setFormProjectId(projects[0]?.id || '');
    setFormCategory('Material Expense');
    setFormAmount(12000);
    setFormDescription('');
    setFormPaidBy('Site Cashier');
    setFormPaymentMode('Bank');
    setFormBillNo('');
    setFormRemarks('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (e: ExpenseEntry) => {
    setEditingExpense(e);
    setFormDate(e.date);
    setFormCompanyId(e.companyId);
    setFormProjectId(e.projectId);
    setFormCategory(e.expenseCategory);
    setFormAmount(e.amount);
    setFormDescription(e.description);
    setFormPaidBy(e.paidBy);
    setFormPaymentMode(e.paymentMode);
    setFormBillNo(e.receiptBillNo || '');
    setFormRemarks(e.remarks || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formDescription.trim()) {
      setFormError('Please enter expense description.');
      return;
    }
    if (formAmount <= 0) {
      setFormError('Amount must be greater than zero.');
      return;
    }

    try {
      setIsSaving(true);
      await onSaveExpense({
        id: editingExpense?.id,
        date: formDate,
        companyId: formCompanyId,
        projectId: formProjectId,
        expenseCategory: formCategory,
        amount: Number(formAmount),
        description: formDescription.trim(),
        paidBy: formPaidBy.trim(),
        paymentMode: formPaymentMode,
        receiptBillNo: formBillNo.trim(),
        remarks: formRemarks.trim(),
      });
      setIsModalOpen(false);
    } catch (err) {
      setFormError('Failed to save expense.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered expense list
  const filteredExpenses = expenseEntries.filter((e) => {
    if (useDateFilter && e.date !== dateFilter) return false;
    if (selectedCompany !== 'all' && e.companyId !== selectedCompany) return false;
    if (selectedProject !== 'all' && e.projectId !== selectedProject) return false;
    if (selectedCategory !== 'all' && e.expenseCategory !== selectedCategory) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchDesc = e.description.toLowerCase().includes(q);
      const matchPaid = e.paidBy.toLowerCase().includes(q);
      const matchBill = e.receiptBillNo?.toLowerCase().includes(q);
      if (!matchDesc && !matchPaid && !matchBill) return false;
    }
    return true;
  });

  // Calculate required totals from Section 10:
  // Total Material, Total Transport, Total Machinery, Total Worker Salary, Total Other, GRAND TOTAL
  const totalMaterial = filteredExpenses
    .filter((e) => e.expenseCategory === 'Material Expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalTransport = filteredExpenses
    .filter((e) => e.expenseCategory === 'Transport Expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalMachinery = filteredExpenses
    .filter((e) => e.expenseCategory === 'Machinery Expense' || e.expenseCategory === 'Crane/Hydra')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalFuel = filteredExpenses
    .filter((e) => e.expenseCategory === 'Diesel/Fuel')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalOtherDirect = filteredExpenses
    .filter(
      (e) =>
        !['Material Expense', 'Transport Expense', 'Machinery Expense', 'Crane/Hydra', 'Diesel/Fuel'].includes(
          e.expenseCategory
        )
    )
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalDirectExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const grandTotalExpense = totalDirectExpenses + workerSalaryExpense;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-black text-white font-mono uppercase tracking-tight">
              EXPENSE MANAGEMENT MODULE
            </h2>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-800 text-red-400 rounded border border-slate-700">
              {filteredExpenses.length} Expense Logs
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Log, categorize and track site overheads, crane rentals, raw material, transport and petty cash.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportExpensesExcel(filteredExpenses, companies, projects)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export Excel
          </button>

          {['ADMIN', 'MANAGER', 'SUPERVISOR', 'ACCOUNTANT'].includes(currentUser.role) && (
            <button
              onClick={openCreateModal}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              + Log Site Expense
            </button>
          )}
        </div>
      </div>

      {/* Section 10 Summary Cards Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Material</div>
          <div className="text-base font-mono font-bold text-white mt-1">{formatCurrency(totalMaterial)}</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Transport</div>
          <div className="text-base font-mono font-bold text-white mt-1">{formatCurrency(totalTransport)}</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Machinery / Crane</div>
          <div className="text-base font-mono font-bold text-white mt-1">{formatCurrency(totalMachinery)}</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-semibold text-blue-400 uppercase">Worker Wages</div>
          <div className="text-base font-mono font-bold text-blue-300 mt-1">
            {formatCurrency(workerSalaryExpense)}
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Other Overheads</div>
          <div className="text-base font-mono font-bold text-white mt-1">
            {formatCurrency(totalFuel + totalOtherDirect)}
          </div>
        </div>

        <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-3">
          <div className="text-[11px] font-bold text-red-400 uppercase font-mono">GRAND TOTAL</div>
          <div className="text-base font-mono font-black text-red-300 mt-1">
            {formatCurrency(grandTotalExpense)}
          </div>
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
              placeholder="Search description, bill no, paid by..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Category */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-red-500"
            >
              <option value="all">All Expense Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Company */}
          <div>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-red-500"
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
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-red-500"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectId} - {p.projectName}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useExpDateFilter"
              checked={useDateFilter}
              onChange={(e) => setUseDateFilter(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-red-500 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="useExpDateFilter" className="text-slate-400 text-xs cursor-pointer select-none">
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

      {/* Expense List Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b1220] text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Description & Project</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3">Paid By</th>
                <th className="py-3 px-3">Payment Mode</th>
                <th className="py-3 px-3">Bill / Ref No</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((e) => {
                  const proj = projects.find((p) => p.id === e.projectId);
                  return (
                    <tr key={e.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">{e.date}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-red-400 border border-slate-700">
                          {e.expenseCategory}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-sm">
                        <div className="font-medium text-white line-clamp-1">{e.description}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {proj ? `${proj.projectId} (${proj.projectName})` : 'General SR Operations'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-red-400 whitespace-nowrap">
                        {formatCurrency(e.amount)}
                      </td>
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap">{e.paidBy}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                          {e.paymentMode}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {e.receiptBillNo || '-'}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(currentUser.role) && (
                            <button
                              onClick={() => openEditModal(e)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                              title="Edit Expense"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {['ADMIN'].includes(currentUser.role) && (
                            <button
                              onClick={() => setDeleteConfirmId(e.id)}
                              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                              title="Delete Expense"
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
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No site expenses match your selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-bold text-white font-mono uppercase">
                  {editingExpense ? 'Edit Expense Record' : 'Record Site Expense'}
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
                  <label className="block text-slate-400 font-medium mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Expense Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Company *</label>
                  <select
                    value={formCompanyId}
                    onChange={(e) => setFormCompanyId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-red-500"
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
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectId} - {p.projectName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-red-400 font-semibold mb-1">Amount (₹ INR) *</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-red-500/50 rounded-lg px-3 py-2 text-red-300 font-mono text-base font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Expense Description *</label>
                <textarea
                  rows={2}
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detailed breakdown (e.g. 500 liters high speed diesel for 50-ton mobile crane and site generator)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Paid By</label>
                  <input
                    type="text"
                    value={formPaidBy}
                    onChange={(e) => setFormPaidBy(e.target.value)}
                    placeholder="e.g. Site Supervisor"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Payment Mode</label>
                  <select
                    value={formPaymentMode}
                    onChange={(e) => setFormPaymentMode(e.target.value as PaymentMode)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200"
                  >
                    <option value="Bank">Bank Transfer</option>
                    <option value="Cash">Petty Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Bill / Invoice No</label>
                  <input
                    type="text"
                    value={formBillNo}
                    onChange={(e) => setFormBillNo(e.target.value)}
                    placeholder="e.g. INV-8921"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Remarks</label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="Optional site notes"
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
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                >
                  {isSaving ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense Record'}
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
              <h3 className="text-base font-bold text-white font-mono uppercase">Confirm Expense Deletion</h3>
            </div>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to delete this expense record? The site balance and profit calculations will update automatically.
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
                  await onDeleteExpense(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold"
              >
                Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
