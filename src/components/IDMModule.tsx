import React, { useState } from 'react';
import { IDMRecord, Project, User } from '../types';
import {
  FileCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Paperclip,
  Building,
  Filter,
  AlertTriangle,
} from 'lucide-react';

interface IDMModuleProps {
  idmRecords: IDMRecord[];
  projects: Project[];
  currentUser: User;
  onSaveIDM: (record: Partial<IDMRecord>) => Promise<IDMRecord>;
  onDeleteIDM: (id: string) => Promise<boolean>;
}

export const IDMModule: React.FC<IDMModuleProps> = ({
  idmRecords,
  projects,
  currentUser,
  onSaveIDM,
  onDeleteIDM,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Partial<IDMRecord>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredRecords = idmRecords.filter((rec) => {
    const matchSearch =
      searchQuery === '' ||
      rec.idmNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rec.idmReference && rec.idmReference.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchProj = projectFilter === 'all' || rec.projectId === projectFilter;
    const matchStatus = statusFilter === 'all' || rec.status === statusFilter;

    return matchSearch && matchProj && matchStatus;
  });

  const handleOpenAdd = () => {
    const defaultProj = projects[0];
    setEditingRecord({
      idmNo: `IDM-${new Date().getFullYear()}-${String(idmRecords.length + 1).padStart(3, '0')}`,
      idmDate: new Date().toISOString().slice(0, 10),
      projectId: defaultProj?.projectId || '',
      description: '',
      quantity: 1000,
      unit: 'KG',
      status: 'Verified',
      remarks: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: IDMRecord) => {
    setEditingRecord(rec);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord.idmNo || !editingRecord.projectId) return;

    await onSaveIDM({
      ...editingRecord,
      updatedAt: new Date().toISOString(),
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/40 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">IDM MANAGEMENT</h1>
            <p className="text-xs text-slate-400">
              Inspection & Dispatch Musters • Link Quality Clearances to Measurement Bills
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          New IDM Record
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search IDM No, Description, Ref..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.projectId}>{p.projectName}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Verified">Verified</option>
            <option value="Approved">Approved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">IDM No</th>
                <th className="py-3.5 px-4">Project</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">IDM Date</th>
                <th className="py-3.5 px-4 text-right">Quantity</th>
                <th className="py-3.5 px-4">Linked Bill</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No IDM records found. Click &quot;New IDM Record&quot; to add one.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      {rec.idmNo}
                      {rec.idmReference && (
                        <div className="text-[10px] text-slate-400 font-sans">Ref: {rec.idmReference}</div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-300 font-bold">{rec.projectId}</span>
                    </td>

                    <td className="py-3 px-4 text-slate-200">
                      <div>{rec.description}</div>
                      {rec.remarks && <div className="text-[11px] text-slate-500">{rec.remarks}</div>}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400">{rec.idmDate}</td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {rec.quantity.toLocaleString('en-IN')} {rec.unit}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400">
                      {rec.billNo ? (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                          {rec.billNo}
                        </span>
                      ) : (
                        <span className="text-slate-600">Unlinked</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'Approved' || rec.status === 'Closed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(rec)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(rec.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Delete IDM Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-400" />
              {editingRecord.id ? 'Edit IDM Record' : 'Create New IDM Record'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">IDM Number *</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.idmNo || ''}
                    onChange={(e) => setEditingRecord((p) => ({ ...p, idmNo: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">IDM Date *</label>
                  <input
                    type="date"
                    required
                    value={editingRecord.idmDate || ''}
                    onChange={(e) => setEditingRecord((p) => ({ ...p, idmDate: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Project ID *</label>
                  <select
                    value={editingRecord.projectId || ''}
                    onChange={(e) => setEditingRecord((p) => ({ ...p, projectId: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.projectId}>
                        {p.projectId} - {p.projectName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">IDM Reference / Report No</label>
                  <input
                    type="text"
                    value={editingRecord.idmReference || ''}
                    onChange={(e) => setEditingRecord((p) => ({ ...p, idmReference: e.target.value }))}
                    placeholder="QAP-IR-2026-XXXX"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Description of Measured Work *</label>
                <input
                  type="text"
                  required
                  value={editingRecord.description || ''}
                  onChange={(e) => setEditingRecord((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Fabrication & Erection of Roof Trusses"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Quantity</label>
                  <input
                    type="number"
                    value={editingRecord.quantity || 0}
                    onChange={(e) => setEditingRecord((p) => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Unit</label>
                  <select
                    value={editingRecord.unit || 'KG'}
                    onChange={(e) => setEditingRecord((p) => ({ ...p, unit: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="KG">KG</option>
                    <option value="MT">MT</option>
                    <option value="MTR">MTR</option>
                    <option value="SQM">SQM</option>
                    <option value="NOS">NOS</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Status</label>
                  <select
                    value={editingRecord.status || 'Verified'}
                    onChange={(e) => setEditingRecord((p) => ({ ...p, status: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Verified">Verified</option>
                    <option value="Approved">Approved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Remarks</label>
                <input
                  type="text"
                  value={editingRecord.remarks || ''}
                  onChange={(e) => setEditingRecord((p) => ({ ...p, remarks: e.target.value }))}
                  placeholder="Client Inspector sign-off"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition"
                >
                  Save IDM Record
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
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white font-mono uppercase">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to delete this IDM clearance record? This cannot be undone.
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
                    await onDeleteIDM(deleteConfirmId);
                    setDeleteConfirmId(null);
                  } catch (err) {
                    console.error('Delete IDM error:', err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Delete IDM Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
