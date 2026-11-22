import React, { useState } from 'react';
import {
  HardHat,
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
  CheckCircle2,
  X,
  Layers,
} from 'lucide-react';
import {
  Company,
  DailyWorkEntry,
  FilterState,
  Project,
  User,
  WorkCategory,
} from '../types';
import { formatCurrency } from '../lib/calculations';
import { exportDailyWorkExcel } from '../lib/exportUtils';

interface DailyWorkModuleProps {
  workEntries: DailyWorkEntry[];
  companies: Company[];
  projects: Project[];
  currentUser: User;
  onSaveEntry?: (entry: Partial<DailyWorkEntry>) => Promise<void>;
  onSaveWork?: (entry: Partial<DailyWorkEntry>) => Promise<void>;
  onDeleteEntry?: (id: string) => Promise<void>;
  onDeleteWork?: (id: string) => Promise<void>;
  globalFilter: FilterState;
}

const WORK_CATEGORIES: WorkCategory[] = [
  'Structural Fabrication',
  'Structural Erection',
  'Pipeline',
  'Piping',
  'Welding',
  'Mechanical Work',
  'Equipment Installation',
  'Dismantling',
  'Power Work',
  'Other',
];

const COMMON_UNITS = ['MT', 'Inch-Dia', 'Meters', 'Sq.M', 'Joints', 'Tons', 'Nos', 'Running Mtr'];

export const DailyWorkModule: React.FC<DailyWorkModuleProps> = ({
  workEntries,
  companies,
  projects,
  currentUser,
  onSaveEntry,
  onSaveWork,
  onDeleteEntry,
  onDeleteWork,
  globalFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>(globalFilter.companyId);
  const [selectedProject, setSelectedProject] = useState<string>(globalFilter.projectId);
  const [dateFilter, setDateFilter] = useState<string>(globalFilter.date);
  const [useDateFilter, setUseDateFilter] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DailyWorkEntry | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [formDate, setFormDate] = useState(globalFilter.date || new Date().toISOString().slice(0, 10));
  const [formCompanyId, setFormCompanyId] = useState(companies[0]?.id || '');
  const [formProjectId, setFormProjectId] = useState(projects[0]?.id || '');
  const [formSite, setFormSite] = useState('');
  const [formCategory, setFormCategory] = useState<WorkCategory>('Structural Fabrication');
  const [formDescription, setFormDescription] = useState('');
  const [formQuantity, setFormQuantity] = useState<number>(10);
  const [formUnit, setFormUnit] = useState('MT');
  const [formCompletedQty, setFormCompletedQty] = useState<number>(5);
  const [formRate, setFormRate] = useState<number>(15000);
  const [formSupervisor, setFormSupervisor] = useState(currentUser.name || 'Vikram Sharma');
  const [formRemarks, setFormRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Calculated values in form
  const calculatedRemaining = Math.max(0, formQuantity - formCompletedQty);
  const calculatedWorkValue = formCompletedQty * formRate;

  // Filter available projects based on selected company in form
  const formProjects = formCompanyId
    ? projects.filter((p) => p.companyId === formCompanyId)
    : projects;

  const openCreateModal = () => {
    setEditingEntry(null);
    setFormDate(globalFilter.date || new Date().toISOString().slice(0, 10));
    setFormCompanyId(companies[0]?.id || '');
    setFormProjectId(projects[0]?.id || '');
    setFormSite(projects[0]?.site || '');
    setFormCategory('Structural Fabrication');
    setFormDescription('');
    setFormQuantity(10);
    setFormUnit('MT');
    setFormCompletedQty(2);
    setFormRate(18000);
    setFormSupervisor(currentUser.name);
    setFormRemarks('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (entry: DailyWorkEntry) => {
    setEditingEntry(entry);
    setFormDate(entry.date);
    setFormCompanyId(entry.companyId);
    setFormProjectId(entry.projectId);
    setFormSite(entry.site);
    setFormCategory(entry.workCategory);
    setFormDescription(entry.workDescription);
    setFormQuantity(entry.quantity);
    setFormUnit(entry.unit);
    setFormCompletedQty(entry.completedQuantity);
    setFormRate(entry.rate);
    setFormSupervisor(entry.supervisor);
    setFormRemarks(entry.remarks || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!formDate) {
      setFormError('Please select a valid date (Tarikh select karein).');
      return;
    }
    if (!formCompanyId || !formProjectId) {
      setFormError('Please select Company and Project (Company aur Project select karein).');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('Please enter work description (Work detail likhein).');
      return;
    }
    if (formQuantity <= 0) {
      setFormError('Total quantity must be greater than zero (Quantity 0 se zyada honi chahiye).');
      return;
    }
    if (formCompletedQty < 0) {
      setFormError('Completed quantity cannot be negative.');
      return;
    }
    if (formRate <= 0) {
      setFormError('Rate must be greater than zero (Valid rate enter karein).');
      return;
    }

    const saveAction = onSaveEntry || onSaveWork;
    if (!saveAction) {
      setFormError('Save handler is not configured.');
      return;
    }

    try {
      setIsSaving(true);
      await saveAction({
        id: editingEntry?.id,
        date: formDate,
        companyId: formCompanyId,
        projectId: formProjectId,
        site: formSite,
        workCategory: formCategory,
        workDescription: formDescription.trim(),
        quantity: Number(formQuantity),
        unit: formUnit,
        completedQuantity: Number(formCompletedQty),
        remainingQuantity: Number(calculatedRemaining),
        rate: Number(formRate),
        workValue: Number(calculatedWorkValue),
        supervisor: formSupervisor,
        remarks: formRemarks.trim(),
      });
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save daily work entry:', err);
      setFormError(err?.message || 'Data save nahi ho saka. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered entries
  const filteredEntries = workEntries.filter((w) => {
    if (useDateFilter && w.date !== dateFilter) return false;
    if (selectedCompany !== 'all' && w.companyId !== selectedCompany) return false;
    if (selectedProject !== 'all' && w.projectId !== selectedProject) return false;
    if (selectedCategory !== 'all' && w.workCategory !== selectedCategory) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchDesc = w.workDescription.toLowerCase().includes(q);
      const matchSite = w.site.toLowerCase().includes(q);
      const matchSup = w.supervisor.toLowerCase().includes(q);
      if (!matchDesc && !matchSite && !matchSup) return false;
    }
    return true;
  });

  const totalFilteredValue = filteredEntries.reduce((acc, curr) => acc + (curr.workValue || 0), 0);

  return (
    <div className="space-y-5">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <HardHat className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white font-mono uppercase tracking-tight">
              DAILY WORK MODULE
            </h2>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-800 text-amber-300 rounded border border-slate-700">
              {filteredEntries.length} Entries
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Record daily work completed, quantities, rates and auto-calculated work values.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportDailyWorkExcel(filteredEntries, companies, projects)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export Excel
          </button>

          {['ADMIN', 'MANAGER', 'SUPERVISOR'].includes(currentUser.role) && (
            <button
              onClick={openCreateModal}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              + Add Daily Work
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search description, site, supervisor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Company Filter */}
          <div>
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setSelectedProject('all');
              }}
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
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Projects</option>
              {(selectedCompany === 'all'
                ? projects
                : projects.filter((p) => p.companyId === selectedCompany)
              ).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectId} - {p.projectName}
                </option>
              ))}
            </select>
          </div>

          {/* Work Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Categories</option>
              {WORK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useDateFilter"
              checked={useDateFilter}
              onChange={(e) => setUseDateFilter(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="useDateFilter" className="text-slate-400 text-xs cursor-pointer select-none">
              Filter by Date:
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

        {/* Total Metric Strip */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          <div className="text-slate-400">
            Showing <span className="font-bold text-slate-200">{filteredEntries.length}</span> work logs
          </div>
          <div className="font-mono text-amber-400 font-bold">
            Total Filtered Work Value: <span className="text-white text-sm">{formatCurrency(totalFilteredValue)}</span>
          </div>
        </div>
      </div>

      {/* Work Entries Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b1220] text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Description & Site</th>
                <th className="py-3 px-3 text-right">Target</th>
                <th className="py-3 px-3 text-right">Completed</th>
                <th className="py-3 px-3 text-right">Remaining</th>
                <th className="py-3 px-3 text-right">Rate</th>
                <th className="py-3 px-3 text-right">Work Value</th>
                <th className="py-3 px-3">Supervisor</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredEntries.length > 0 ? (
                filteredEntries.map((w) => {
                  const comp = companies.find((c) => c.id === w.companyId);
                  const proj = projects.find((p) => p.id === w.projectId);

                  return (
                    <tr key={w.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">{w.date}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-amber-400 border border-slate-700 whitespace-nowrap">
                          {w.workCategory}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-medium text-white line-clamp-1">{w.workDescription}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="text-blue-400">{proj?.projectId}</span>
                          <span>•</span>
                          <span>{w.site || proj?.site}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400 whitespace-nowrap">
                        {w.quantity} {w.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {w.completedQuantity} {w.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400 whitespace-nowrap">
                        {w.remainingQuantity} {w.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300 whitespace-nowrap">
                        {formatCurrency(w.rate)}/{w.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-amber-400 whitespace-nowrap">
                        {formatCurrency(w.workValue)}
                      </td>
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap">{w.supervisor}</td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {['ADMIN', 'MANAGER', 'SUPERVISOR'].includes(currentUser.role) && (
                            <button
                              onClick={() => openEditModal(w)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                              title="Edit Entry"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {['ADMIN', 'MANAGER'].includes(currentUser.role) && (
                            <button
                              onClick={() => setDeleteConfirmId(w.id)}
                              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                              title="Delete Entry"
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
                    No daily work entries match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Daily Work Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardHat className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-mono uppercase">
                  {editingEntry ? 'Edit Daily Work Entry' : 'New Daily Work Entry'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
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
                {/* Date */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Work Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Company *</label>
                  <select
                    required
                    value={formCompanyId}
                    onChange={(e) => {
                      setFormCompanyId(e.target.value);
                      const matchingProjects = projects.filter((p) => p.companyId === e.target.value);
                      if (matchingProjects[0]) {
                        setFormProjectId(matchingProjects[0].id);
                        setFormSite(matchingProjects[0].site);
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Project */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Project *</label>
                  <select
                    required
                    value={formProjectId}
                    onChange={(e) => {
                      setFormProjectId(e.target.value);
                      const p = projects.find((item) => item.id === e.target.value);
                      if (p) setFormSite(p.site);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {formProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectId} - {p.projectName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Site */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Site / Work Area</label>
                  <input
                    type="text"
                    value={formSite}
                    onChange={(e) => setFormSite(e.target.value)}
                    placeholder="e.g. Unit 4, Pipe Rack Area"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Work Category */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Work Category *</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as WorkCategory)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {WORK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Work Description */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Work Description *</label>
                <textarea
                  required
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detailed work completed today (e.g. Erection of 12.5 MT columns with crane alignment and high tensile bolting)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Quantities & Rate calculation row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Target Qty</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Unit</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-emerald-400 font-semibold mb-1">Completed Qty *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formCompletedQty}
                    onChange={(e) => setFormCompletedQty(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-emerald-300 font-mono font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Rate (₹ / Unit) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formRate}
                    onChange={(e) => setFormRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Automatic Calculation Preview Banner */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs">Remaining Quantity: </span>
                  <span className="font-mono font-bold text-slate-200">
                    {calculatedRemaining} {formUnit}
                  </span>
                </div>
                <div>
                  <span className="text-amber-400 text-xs font-semibold">
                    Calculated Work Value (Completed Qty × Rate):{' '}
                  </span>
                  <span className="font-mono text-base font-extrabold text-amber-300 ml-1">
                    {formatCurrency(calculatedWorkValue)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Supervisor</label>
                  <input
                    type="text"
                    value={formSupervisor}
                    onChange={(e) => setFormSupervisor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Remarks / Inspection Status</label>
                  <input
                    type="text"
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                    placeholder="e.g. Cleared visual and ultrasonic testing"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
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
                  {isSaving ? 'Saving Record...' : editingEntry ? 'Update Work Entry' : 'Save Daily Work'}
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
              Are you sure you want to delete this work entry? All linked daily metrics and charts will automatically recalculate.
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
                  const deleteAction = onDeleteEntry || onDeleteWork;
                  if (deleteAction && deleteConfirmId) {
                    await deleteAction(deleteConfirmId);
                  }
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
