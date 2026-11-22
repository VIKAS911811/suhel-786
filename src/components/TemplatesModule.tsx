import React, { useState } from 'react';
import { DynamicColumn, MeasurementTemplate, MeasurementType, User } from '../types';
import {
  FileCode,
  Plus,
  Search,
  Copy,
  Trash2,
  Edit3,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface TemplatesModuleProps {
  templates: MeasurementTemplate[];
  currentUser: User;
  onSaveTemplate: (template: Partial<MeasurementTemplate>) => Promise<MeasurementTemplate>;
  onDeleteTemplate: (id: string) => Promise<boolean>;
}

export const TemplatesModule: React.FC<TemplatesModuleProps> = ({
  templates,
  currentUser,
  onSaveTemplate,
  onDeleteTemplate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<MeasurementTemplate>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredTemplates = templates.filter((tmpl) => {
    const matchSearch =
      searchQuery === '' ||
      tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'all' || tmpl.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleOpenAdd = () => {
    setEditingTemplate({
      name: '',
      category: 'Structural Fabrication',
      description: '',
      measurementType: 'Structural Section',
      defaultColumns: [
        { id: 'col-1', key: 'sl_no', label: 'Sl. No.', type: 'Number', order: 1, isMandatory: true },
        { id: 'col-2', key: 'description', label: 'Item Description', type: 'Text', order: 2, isMandatory: true },
        { id: 'col-3', key: 'length', label: 'Length (mm)', type: 'Measurement', order: 3 },
        { id: 'col-4', key: 'quantity', label: 'Quantity', type: 'Quantity', order: 4, isMandatory: true },
        { id: 'col-5', key: 'unit_weight', label: 'Unit Wt (kg/m)', type: 'Decimal', order: 5 },
        { id: 'col-6', key: 'weight_kg', label: 'Total Weight (KG)', type: 'Formula', formula: 'length * quantity * unit_weight / 1000', order: 6 },
        { id: 'col-7', key: 'rate', label: 'Rate (₹)', type: 'Rate', order: 7 },
        { id: 'col-8', key: 'amount', label: 'Amount (₹)', type: 'Formula', formula: 'weight_kg * rate', order: 8 },
      ],
      isSystemDefault: false,
    });
    setIsModalOpen(true);
  };

  const handleDuplicate = async (tmpl: MeasurementTemplate) => {
    const duplicate: Partial<MeasurementTemplate> = {
      ...JSON.parse(JSON.stringify(tmpl)),
      id: undefined,
      name: `${tmpl.name} (Copy)`,
      isSystemDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await onSaveTemplate(duplicate);
  };

  const handleOpenEdit = (tmpl: MeasurementTemplate) => {
    setEditingTemplate(JSON.parse(JSON.stringify(tmpl)));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate.name) return;

    await onSaveTemplate({
      ...editingTemplate,
      updatedAt: new Date().toISOString(),
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/40 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">MEASUREMENT TEMPLATES</h1>
            <p className="text-xs text-slate-400">
              Pre-configured layout presets for Fabrication, Erection, Piping, Plates, TMT & Labour Muster
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {/* Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300"
        >
          <option value="all">All Template Categories</option>
          <option value="Structural Fabrication">Structural Fabrication</option>
          <option value="Structural Erection">Structural Erection</option>
          <option value="Plate Measurement">Plate Measurement</option>
          <option value="Piping">Piping</option>
          <option value="Pipeline">Pipeline</option>
          <option value="Mechanical">Mechanical</option>
          <option value="TMT">TMT</option>
          <option value="Dismantling">Dismantling</option>
          <option value="Labour Muster">Labour Muster</option>
          <option value="Custom">Custom</option>
        </select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((tmpl) => (
          <div
            key={tmpl.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition">
                  {tmpl.name}
                </h3>
                {tmpl.isSystemDefault ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                    System
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                    Custom
                  </span>
                )}
              </div>

              <div className="text-xs text-amber-400 font-semibold mt-1">
                {tmpl.category} • {tmpl.measurementType}
              </div>

              <p className="text-xs text-slate-400 mt-2 line-clamp-3">
                {tmpl.description}
              </p>

              {/* Columns pill list */}
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-500 font-semibold block mb-2">
                  Active Columns ({tmpl.defaultColumns.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tmpl.defaultColumns.slice(0, 6).map((col) => (
                    <span
                      key={col.id}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono"
                    >
                      {col.label}
                    </span>
                  ))}
                  {tmpl.defaultColumns.length > 6 && (
                    <span className="text-[10px] px-1.5 py-0.5 text-slate-500 font-mono">
                      +{tmpl.defaultColumns.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800 text-xs">
              <span className="text-slate-500 font-mono">
                {tmpl.formulaSettings?.density ? `Density: ${tmpl.formulaSettings.density} kg/m³` : 'Standard Calc'}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleDuplicate(tmpl)}
                  title="Duplicate Template"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleOpenEdit(tmpl)}
                  title="Edit Template"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                {!tmpl.isSystemDefault && (
                  <button
                    onClick={() => setDeleteConfirmId(tmpl.id)}
                    title="Delete Template"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              {editingTemplate.id ? 'Edit Measurement Template' : 'New Measurement Template'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  value={editingTemplate.name || ''}
                  onChange={(e) => setEditingTemplate((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Category</label>
                  <select
                    value={editingTemplate.category || 'Structural Fabrication'}
                    onChange={(e) => setEditingTemplate((p) => ({ ...p, category: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="Structural Fabrication">Structural Fabrication</option>
                    <option value="Structural Erection">Structural Erection</option>
                    <option value="Plate Measurement">Plate Measurement</option>
                    <option value="Piping">Piping</option>
                    <option value="Pipeline">Pipeline</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="TMT">TMT</option>
                    <option value="Dismantling">Dismantling</option>
                    <option value="Labour Muster">Labour Muster</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Measurement Type</label>
                  <select
                    value={editingTemplate.measurementType || 'Structural Section'}
                    onChange={(e) => setEditingTemplate((p) => ({ ...p, measurementType: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="Plate">Plate</option>
                    <option value="Structural Section">Structural Section</option>
                    <option value="TMT">TMT</option>
                    <option value="Pipe">Pipe</option>
                    <option value="Square Tube">Square Tube</option>
                    <option value="Labour Muster">Labour Muster</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingTemplate.description || ''}
                  onChange={(e) => setEditingTemplate((p) => ({ ...p, description: e.target.value }))}
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
                  Save Template
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
              <h3 className="text-base font-bold text-white font-mono uppercase">Confirm Template Deletion</h3>
            </div>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to delete this custom measurement template? Existing bills that used this template will not be affected.
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
                    await onDeleteTemplate(deleteConfirmId);
                    setDeleteConfirmId(null);
                  } catch (err) {
                    console.error('Delete template error:', err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Delete Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
