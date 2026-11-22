import React, { useState } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Download,
  Filter,
  Trash2,
  Edit2,
  Eye,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  TrendingUp,
  TrendingDown,
  Layers,
} from 'lucide-react';
import {
  Company,
  DailyWorkEntry,
  ExpenseEntry,
  IncomeEntry,
  Project,
  ProjectStatus,
  User,
} from '../types';
import { formatCurrency } from '../lib/calculations';
import { exportToExcel } from '../lib/exportUtils';

interface ProjectModuleProps {
  projects: Project[];
  companies: Company[];
  workEntries: DailyWorkEntry[];
  expenseEntries: ExpenseEntry[];
  incomeEntries: IncomeEntry[];
  currentUser: User;
  onSaveProject: (project: Partial<Project>) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
}

export const ProjectModule: React.FC<ProjectModuleProps> = ({
  projects,
  companies,
  workEntries,
  expenseEntries,
  incomeEntries,
  currentUser,
  onSaveProject,
  onDeleteProject,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [formProjectId, setFormProjectId] = useState('');
  const [formName, setFormName] = useState('');
  const [formClient, setFormClient] = useState('');
  const [formSite, setFormSite] = useState('');
  const [formCompanyId, setFormCompanyId] = useState(companies[0]?.id || '');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [formEndDate, setFormEndDate] = useState('');
  const [formContractValue, setFormContractValue] = useState<number>(5000000);
  const [formStatus, setFormStatus] = useState<ProjectStatus>('Running');
  const [formRemarks, setFormRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const openCreateModal = () => {
    setEditingProject(null);
    setFormProjectId(`SR-PRJ-${Math.floor(100 + Math.random() * 900)}`);
    setFormName('');
    setFormClient('');
    setFormSite('');
    setFormCompanyId(companies[0]?.id || '');
    setFormStartDate(new Date().toISOString().slice(0, 10));
    setFormEndDate('');
    setFormContractValue(5000000);
    setFormStatus('Running');
    setFormRemarks('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Project) => {
    setEditingProject(p);
    setFormProjectId(p.projectId);
    setFormName(p.projectName);
    setFormClient(p.clientName);
    setFormSite(p.site);
    setFormCompanyId(p.companyId);
    setFormStartDate(p.startDate);
    setFormEndDate(p.expectedEndDate || '');
    setFormContractValue(p.totalContractValue);
    setFormStatus(p.projectStatus);
    setFormRemarks(p.remarks || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formProjectId.trim() || !formName.trim() || !formClient.trim()) {
      setFormError('Project ID, Name and Client Name are required.');
      return;
    }
    if (formContractValue <= 0) {
      setFormError('Contract value must be greater than zero.');
      return;
    }

    try {
      setIsSaving(true);
      await onSaveProject({
        id: editingProject?.id,
        projectId: formProjectId.trim(),
        projectName: formName.trim(),
        clientName: formClient.trim(),
        site: formSite.trim(),
        companyId: formCompanyId,
        startDate: formStartDate,
        expectedEndDate: formEndDate,
        totalContractValue: Number(formContractValue),
        projectStatus: formStatus,
        remarks: formRemarks.trim(),
      });
      setIsModalOpen(false);
    } catch (err) {
      setFormError('Failed to save project.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (statusFilter !== 'all' && p.projectStatus !== statusFilter) return false;
    if (companyFilter !== 'all' && p.companyId !== companyFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = p.projectName.toLowerCase().includes(q);
      const matchId = p.projectId.toLowerCase().includes(q);
      const matchClient = p.clientName.toLowerCase().includes(q);
      const matchSite = p.site.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchClient && !matchSite) return false;
    }
    return true;
  });

  // Calculate project financial metrics (Income, Expense, Net Profit/Loss)
  const getProjectFinancials = (projectId: string) => {
    const projectIncome = incomeEntries
      .filter((i) => i.projectId === projectId)
      .reduce((acc, curr) => acc + curr.receivedAmount, 0);

    const projectExpenses = expenseEntries
      .filter((e) => e.projectId === projectId)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const projectWorkVal = workEntries
      .filter((w) => w.projectId === projectId)
      .reduce((acc, curr) => acc + (curr.workValue || 0), 0);

    const net = projectIncome - projectExpenses;
    return {
      income: projectIncome,
      expenses: projectExpenses,
      workValue: projectWorkVal,
      net,
      isProfit: net >= 0,
    };
  };

  const exportProjectsList = () => {
    const data = filteredProjects.map((p, idx) => {
      const comp = companies.find((c) => c.id === p.companyId)?.name || p.companyId;
      const fin = getProjectFinancials(p.id);
      return {
        'S.No': idx + 1,
        'Project ID': p.projectId,
        'Project Name': p.projectName,
        Client: p.clientName,
        Site: p.site,
        Company: comp,
        'Contract Value (INR)': p.totalContractValue,
        'Total Invoiced/Received (INR)': fin.income,
        'Total Site Expense (INR)': fin.expenses,
        'Net Profit/Loss (INR)': fin.net,
        Status: p.projectStatus,
        'Start Date': p.startDate,
        'Expected End Date': p.expectedEndDate || 'Ongoing',
      };
    });
    exportToExcel(data, 'SR_GROUP_Projects_Register', 'Projects');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white font-mono uppercase tracking-tight">
              PROJECT MANAGEMENT MODULE
            </h2>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-800 text-amber-300 rounded border border-slate-700">
              {filteredProjects.length} Contracts
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage contract portfolios, client sites, milestone progress and project-level profit & loss.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportProjectsList}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export Excel
          </button>

          {['ADMIN', 'MANAGER'].includes(currentUser.role) && (
            <button
              onClick={openCreateModal}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              + Add Project
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search project name, ID, client, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Company Filter */}
          <div>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All SR Group Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Project Statuses</option>
              <option value="Running">Running</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Cards Grid with Real P&L Breakdown (Section 12) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((p) => {
            const comp = companies.find((c) => c.id === p.companyId);
            const fin = getProjectFinancials(p.id);

            // Estimate progress based on work completed vs contract value
            const progressPercent = Math.min(
              100,
              Math.max(12, Math.round((fin.workValue / (p.totalContractValue || 1)) * 100))
            );

            return (
              <div
                key={p.id}
                className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
                    <div>
                      <span className="font-mono text-xs font-bold text-amber-400">{p.projectId}</span>
                      <h3 className="font-bold text-white text-sm line-clamp-1 mt-0.5">{p.projectName}</h3>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{p.clientName}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        p.projectStatus === 'Running'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : p.projectStatus === 'Completed'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {p.projectStatus}
                    </span>
                  </div>

                  <div className="space-y-2 mt-3 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>SR Company:</span>
                      <span className="text-slate-200 font-medium">{comp?.name || 'SR Group'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Site Location:</span>
                      <span className="text-slate-200 font-medium">{p.site}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Contract Value:</span>
                      <span className="font-mono font-bold text-white">
                        {formatCurrency(p.totalContractValue)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-1">
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Physical Progress:</span>
                        <span className="font-mono text-amber-400 font-bold">{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Project Financials Box (Income, Expenses, Net Profit/Loss) */}
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 mt-3 space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Total Income:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {formatCurrency(fin.income)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Site Expenses:</span>
                        <span className="font-mono font-bold text-red-400">
                          {formatCurrency(fin.expenses)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs pt-1 border-t border-slate-800">
                        <span className="font-semibold text-slate-300">
                          {fin.isProfit ? 'Project Profit:' : 'Project Loss:'}
                        </span>
                        <span
                          className={`font-mono font-black ${
                            fin.isProfit ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {formatCurrency(fin.net)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Start: {p.startDate}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {['ADMIN', 'MANAGER'].includes(currentUser.role) && (
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                        title="Edit Project"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {['ADMIN'].includes(currentUser.role) && (
                      <button
                        onClick={() => setDeleteConfirmId(p.id)}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-3 py-12 text-center text-slate-500 text-xs">
            No projects match the selected criteria.
          </div>
        )}
      </div>

      {/* Add / Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-mono uppercase">
                  {editingProject ? 'Edit Project Contract' : 'Create Project Contract'}
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
                  <label className="block text-slate-400 font-medium mb-1">Project ID *</label>
                  <input
                    type="text"
                    required
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    placeholder="e.g. PRJ-NTPC-01"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Boiler Piping & Fabrication Phase 2"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={formClient}
                    onChange={(e) => setFormClient(e.target.value)}
                    placeholder="e.g. NTPC Limited"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Site Location *</label>
                  <input
                    type="text"
                    required
                    value={formSite}
                    onChange={(e) => setFormSite(e.target.value)}
                    placeholder="e.g. Ramagundam STPP, Telangana"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">SR Group Company *</label>
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
                  <label className="block text-slate-400 font-medium mb-1">Total Contract Value (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    required
                    value={formContractValue}
                    onChange={(e) => setFormContractValue(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Expected End Date</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ProjectStatus)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                  >
                    <option value="Running">Running</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Remarks</label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="Scope notes, BOQ references"
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
                  {isSaving ? 'Saving...' : editingProject ? 'Update Project' : 'Save Project'}
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
              <h3 className="text-base font-bold text-white font-mono uppercase">Confirm Project Deletion</h3>
            </div>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to delete this project? Existing work and expense records will remain preserved in historical logs.
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
                  await onDeleteProject(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
