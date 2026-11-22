import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Download,
  Filter,
  Trash2,
  Edit2,
  Eye,
  Building2,
  Briefcase,
  Phone,
  Calendar,
  AlertCircle,
  X,
  Award,
  CheckCircle2,
} from 'lucide-react';
import { Company, Project, User, Worker, WorkerCategory } from '../types';
import { formatCurrency } from '../lib/calculations';
import { exportToExcel } from '../lib/exportUtils';

interface WorkerModuleProps {
  workers: Worker[];
  companies: Company[];
  projects: Project[];
  currentUser: User;
  onSaveWorker: (worker: Partial<Worker>) => Promise<void>;
  onDeleteWorker: (id: string) => Promise<void>;
}

const WORKER_CATEGORIES: WorkerCategory[] = [
  'Welder',
  'Fitter',
  'Fabricator',
  'Helper',
  'Rigger',
  'Electrician',
  'Supervisor',
  'Operator',
  'Other',
];

export const WorkerModule: React.FC<WorkerModuleProps> = ({
  workers,
  companies,
  projects,
  currentUser,
  onSaveWorker,
  onDeleteWorker,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingWorker, setViewingWorker] = useState<Worker | null>(null);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [formWorkerId, setFormWorkerId] = useState('');
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formSkill, setFormSkill] = useState('');
  const [formCategory, setFormCategory] = useState<WorkerCategory>('Welder');
  const [formDailyRate, setFormDailyRate] = useState<number>(900);
  const [formOtRate, setFormOtRate] = useState<number>(115);
  const [formJoiningDate, setFormJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [formCompanyId, setFormCompanyId] = useState(companies[0]?.id || '');
  const [formProjectId, setFormProjectId] = useState(projects[0]?.id || '');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive' | 'On Leave'>('Active');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const openCreateModal = () => {
    setEditingWorker(null);
    const nextNum = workers.length + 1;
    setFormWorkerId(`SR-W${nextNum.toString().padStart(3, '0')}`);
    setFormName('');
    setFormMobile('');
    setFormSkill('');
    setFormCategory('Welder');
    setFormDailyRate(950);
    setFormOtRate(120);
    setFormJoiningDate(new Date().toISOString().slice(0, 10));
    setFormCompanyId(companies[0]?.id || '');
    setFormProjectId(projects[0]?.id || '');
    setFormStatus('Active');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (w: Worker) => {
    setEditingWorker(w);
    setFormWorkerId(w.workerId);
    setFormName(w.workerName);
    setFormMobile(w.mobileNumber);
    setFormSkill(w.skill);
    setFormCategory(w.category);
    setFormDailyRate(w.dailyRate);
    setFormOtRate(w.overtimeRate);
    setFormJoiningDate(w.joiningDate);
    setFormCompanyId(w.companyId);
    setFormProjectId(w.projectId);
    setFormStatus(w.status);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formWorkerId.trim() || !formName.trim()) {
      setFormError('Please enter Worker ID and Name (Worker Name aur ID zaroori hai).');
      return;
    }
    if (formDailyRate <= 0) {
      setFormError('Daily rate must be greater than zero.');
      return;
    }
    if (formOtRate < 0) {
      setFormError('Overtime rate cannot be negative.');
      return;
    }

    try {
      setIsSaving(true);
      await onSaveWorker({
        id: editingWorker?.id,
        workerId: formWorkerId.trim(),
        workerName: formName.trim(),
        mobileNumber: formMobile.trim(),
        skill: formSkill.trim(),
        category: formCategory,
        dailyRate: Number(formDailyRate),
        overtimeRate: Number(formOtRate),
        joiningDate: formJoiningDate,
        companyId: formCompanyId,
        projectId: formProjectId,
        status: formStatus,
      });
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed saving worker:', err);
      setFormError(err?.message || 'Data save nahi ho saka. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredWorkers = workers.filter((w) => {
    if (categoryFilter !== 'all' && w.category !== categoryFilter) return false;
    if (companyFilter !== 'all' && w.companyId !== companyFilter) return false;
    if (statusFilter !== 'all' && w.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = w.workerName.toLowerCase().includes(q);
      const matchId = w.workerId.toLowerCase().includes(q);
      const matchSkill = w.skill.toLowerCase().includes(q);
      const matchMobile = w.mobileNumber.includes(q);
      if (!matchName && !matchId && !matchSkill && !matchMobile) return false;
    }
    return true;
  });

  const exportWorkersExcel = () => {
    const formatted = filteredWorkers.map((w, idx) => {
      const comp = companies.find((c) => c.id === w.companyId)?.name || w.companyId;
      const proj = projects.find((p) => p.id === w.projectId)?.projectName || w.projectId;
      return {
        'S.No': idx + 1,
        'Worker ID': w.workerId,
        Name: w.workerName,
        Category: w.category,
        Skill: w.skill,
        Mobile: w.mobileNumber,
        Company: comp,
        Project: proj,
        'Daily Rate (INR)': w.dailyRate,
        'OT Rate (INR/hr)': w.overtimeRate,
        'Joining Date': w.joiningDate,
        Status: w.status,
      };
    });
    exportToExcel(formatted, 'SR_GROUP_Workers_Master', 'Workers');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white font-mono uppercase tracking-tight">
              WORKER MANAGEMENT MODULE
            </h2>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-800 text-amber-300 rounded border border-slate-700">
              {filteredWorkers.length} Workers Registered
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage site workforce, skilled trades, daily rates, overtime specifications and deployment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportWorkersExcel}
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
              + Add Worker
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by worker name, ID, skill, mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Categories (Welder, Fitter, etc.)</option>
              {WORKER_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Company Filter */}
          <div>
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

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>
        </div>
      </div>

      {/* Workers Directory Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b1220] text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Worker ID</th>
                <th className="py-3 px-3">Worker Name</th>
                <th className="py-3 px-3">Trade / Skill</th>
                <th className="py-3 px-3">Company & Project</th>
                <th className="py-3 px-3 text-right">Daily Rate</th>
                <th className="py-3 px-3 text-right">OT Rate/Hr</th>
                <th className="py-3 px-3">Mobile</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredWorkers.length > 0 ? (
                filteredWorkers.map((w) => {
                  const comp = companies.find((c) => c.id === w.companyId);
                  const proj = projects.find((p) => p.id === w.projectId);

                  return (
                    <tr key={w.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                        {w.workerId}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white whitespace-nowrap">{w.workerName}</div>
                        <div className="text-[11px] text-slate-400">{w.category}</div>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="text-slate-300 line-clamp-1">{w.skill}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-300">{comp?.name || 'Unassigned'}</div>
                        <div className="text-[11px] text-blue-400">{proj?.projectId}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                        {formatCurrency(w.dailyRate)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-400 whitespace-nowrap">
                        {formatCurrency(w.overtimeRate)}/hr
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">{w.mobileNumber || '-'}</td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            w.status === 'Active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : w.status === 'On Leave'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-700 text-slate-400 border border-slate-600'
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewingWorker(w)}
                            className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                            title="View Worker Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {['ADMIN', 'MANAGER'].includes(currentUser.role) && (
                            <button
                              onClick={() => openEditModal(w)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                              title="Edit Worker"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {['ADMIN'].includes(currentUser.role) && (
                            <button
                              onClick={() => setDeleteConfirmId(w.id)}
                              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                              title="Delete Worker"
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
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    No workers match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Worker Details Modal */}
      {viewingWorker && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex justify-between items-start pb-3 border-b border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold text-amber-400">{viewingWorker.workerId}</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{viewingWorker.workerName}</h3>
                <span className="text-xs text-slate-400">{viewingWorker.category}</span>
              </div>
              <button onClick={() => setViewingWorker(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500">Daily Rate:</span>
                  <div className="font-mono font-bold text-emerald-400 text-sm">
                    {formatCurrency(viewingWorker.dailyRate)} / day
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Overtime Rate:</span>
                  <div className="font-mono font-bold text-amber-400 text-sm">
                    {formatCurrency(viewingWorker.overtimeRate)} / hr
                  </div>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block">Trade Specialization:</span>
                <span className="text-slate-200 font-medium">{viewingWorker.skill || 'General Skilled Work'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block">Mobile Contact:</span>
                  <span className="text-slate-200 font-mono">{viewingWorker.mobileNumber || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Joining Date:</span>
                  <span className="text-slate-200 font-mono">{viewingWorker.joiningDate}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block">Assigned Company:</span>
                  <span className="text-slate-200">
                    {companies.find((c) => c.id === viewingWorker.companyId)?.name || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Current Project:</span>
                  <span className="text-slate-200">
                    {projects.find((p) => p.id === viewingWorker.projectId)?.projectName || 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setViewingWorker(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Worker Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-mono uppercase">
                  {editingWorker ? 'Edit Worker Profile' : 'Register New Worker'}
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
                  <label className="block text-slate-400 font-medium mb-1">Worker ID *</label>
                  <input
                    type="text"
                    required
                    value={formWorkerId}
                    onChange={(e) => setFormWorkerId(e.target.value)}
                    placeholder="e.g. SR-W011"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Worker Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Rameshwar Mahato"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Trade Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as WorkerCategory)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {WORKER_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Skill Specialization</label>
                <input
                  type="text"
                  value={formSkill}
                  onChange={(e) => setFormSkill(e.target.value)}
                  placeholder="e.g. 6G TIG & Arc Welder (Alloy P91)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Wage Rates */}
              <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div>
                  <label className="block text-emerald-400 font-semibold mb-1">Daily Basic Rate (₹ / Day) *</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    required
                    value={formDailyRate}
                    onChange={(e) => setFormDailyRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-amber-400 font-semibold mb-1">Overtime Rate (₹ / Hour) *</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    required
                    value={formOtRate}
                    onChange={(e) => setFormOtRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Assigned Company</label>
                  <select
                    value={formCompanyId}
                    onChange={(e) => setFormCompanyId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Assigned Project</label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectId} - {p.projectName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
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
                  {isSaving ? 'Saving...' : editingWorker ? 'Update Worker' : 'Save Worker Profile'}
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
              <h3 className="text-base font-bold text-white font-mono uppercase">Confirm Worker Deletion</h3>
            </div>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to delete this worker profile? This will not erase historical paid salary records.
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
                  await onDeleteWorker(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold"
              >
                Delete Worker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
