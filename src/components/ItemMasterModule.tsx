import React, { useState } from 'react';
import { ItemMaster, User } from '../types';
import {
  Boxes,
  Plus,
  Search,
  Trash2,
  Edit3,
  Tag,
  Filter,
  AlertTriangle,
} from 'lucide-react';

interface ItemMasterModuleProps {
  items: ItemMaster[];
  currentUser: User;
  onSaveItem: (item: Partial<ItemMaster>) => Promise<ItemMaster>;
  onDeleteItem: (id: string) => Promise<boolean>;
}

export const ItemMasterModule: React.FC<ItemMasterModuleProps> = ({
  items,
  currentUser,
  onSaveItem,
  onDeleteItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<ItemMaster>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredItems = items.filter((item) => {
    const matchSearch =
      searchQuery === '' ||
      item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.specification && item.specification.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleOpenAdd = () => {
    setEditingItem({
      itemCode: `ITM-${String(items.length + 1).padStart(3, '0')}`,
      description: '',
      category: 'Plate',
      unit: 'KG',
      unitWeight: 0,
      standardRate: 70,
      specification: 'IS 2062 E250',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ItemMaster) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem.itemCode || !editingItem.description) return;

    await onSaveItem({
      ...editingItem,
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
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">ITEM MASTER</h1>
            <p className="text-xs text-slate-400">
              Structural Sections, Plates, Pipes, TMT & Labour Muster Standard Catalog
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Item Master
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
            placeholder="Search Item Code, Specs, Description..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300"
        >
          <option value="all">All Categories</option>
          <option value="Plate">Plate</option>
          <option value="Beam">Beam</option>
          <option value="Column">Column</option>
          <option value="Channel">Channel</option>
          <option value="Angle">Angle</option>
          <option value="Pipe">Pipe</option>
          <option value="Square Tube">Square Tube</option>
          <option value="TMT">TMT</option>
          <option value="Labour">Labour</option>
          <option value="Fastener">Fastener</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Item Code</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-center">Unit</th>
                <th className="py-3.5 px-4 text-right">Unit Weight (KG)</th>
                <th className="py-3.5 px-4 text-right">Standard Rate (₹)</th>
                <th className="py-3.5 px-4">Specification</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 font-sans">
                    No items found. Click &quot;Add Item Master&quot; to seed catalog.
                  </td>
                </tr>
              ) : (
                filteredItems.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-amber-400">{it.itemCode}</td>
                    <td className="py-3 px-4 font-sans font-semibold text-white">
                      {it.description}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {it.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-300">{it.unit}</td>
                    <td className="py-3 px-4 text-right text-slate-200">
                      {it.unitWeight ? it.unitWeight.toFixed(2) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      ₹{it.standardRate?.toLocaleString('en-IN') || 0}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-400">
                      {it.specification || '-'}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(it)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(it.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Delete Item"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-400" />
              {editingItem.id ? 'Edit Master Item' : 'New Master Item'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Item Code *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.itemCode || ''}
                    onChange={(e) => setEditingItem((p) => ({ ...p, itemCode: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Category</label>
                  <select
                    value={editingItem.category || 'Plate'}
                    onChange={(e) => setEditingItem((p) => ({ ...p, category: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="Plate">Plate</option>
                    <option value="Beam">Beam</option>
                    <option value="Column">Column</option>
                    <option value="Channel">Channel</option>
                    <option value="Angle">Angle</option>
                    <option value="Pipe">Pipe</option>
                    <option value="Square Tube">Square Tube</option>
                    <option value="TMT">TMT</option>
                    <option value="Labour">Labour</option>
                    <option value="Fastener">Fastener</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Item Description *</label>
                <input
                  type="text"
                  required
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem((p) => ({ ...p, description: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Unit</label>
                  <input
                    type="text"
                    value={editingItem.unit || 'KG'}
                    onChange={(e) => setEditingItem((p) => ({ ...p, unit: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Unit Weight (KG)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingItem.unitWeight || 0}
                    onChange={(e) => setEditingItem((p) => ({ ...p, unitWeight: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Standard Rate (₹)</label>
                  <input
                    type="number"
                    value={editingItem.standardRate || 0}
                    onChange={(e) => setEditingItem((p) => ({ ...p, standardRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Specification / Grade</label>
                <input
                  type="text"
                  value={editingItem.specification || ''}
                  onChange={(e) => setEditingItem((p) => ({ ...p, specification: e.target.value }))}
                  placeholder="e.g. IS 2062 Grade B / ASTM A36"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
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
                  Save to Item Master
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
              <h3 className="text-base font-bold text-white font-mono uppercase">Confirm Item Deletion</h3>
            </div>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to remove this item from Item Master Catalog? Measurement sheets already using this item will keep their existing dimensions.
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
                    await onDeleteItem(deleteConfirmId);
                    setDeleteConfirmId(null);
                  } catch (err) {
                    console.error('Delete item error:', err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Delete Catalog Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
