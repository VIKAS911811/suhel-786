import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Printer,
  Download,
  Eye,
  CheckCircle2,
  Calendar,
  Building2,
  Briefcase,
  Search,
  Filter,
  Save,
  ArrowLeft,
  Copy,
  Layers,
  FileCheck,
  Sparkles,
  Info,
  X,
  FileText,
  Clock,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import {
  Company,
  Project,
  MeasurementBill,
  MeasurementGroup,
  MeasurementItem,
  User,
} from '../types';
import {
  buildMeasurementBillPdf,
  exportClientMeasurementSheetToExcel,
} from '../lib/billExportUtils';
import { printJsPdfDocument } from '../lib/printUtils';

interface ClientMeasurementSheetModuleProps {
  bills: MeasurementBill[];
  projects: Project[];
  companies: Company[];
  currentUser: User;
  onSaveBill: (bill: MeasurementBill) => void;
  onDeleteBill: (id: string) => void;
}

// Common Structural & Steel Catalog items for quick 1-click addition
const QUICK_STEEL_CATALOG = [
  { name: 'Plate 8mm', thk: 8, unitWt: 62.8 },
  { name: 'Plate 10mm', thk: 10, unitWt: 78.5 },
  { name: 'Plate 12mm', thk: 12, unitWt: 94.2 },
  { name: 'Plate 16mm', thk: 16, unitWt: 125.6 },
  { name: 'Plate 20mm', thk: 20, unitWt: 157.0 },
  { name: 'Plate 25mm', thk: 25, unitWt: 196.25 },
  { name: 'ISMB 150', thk: 5, unitWt: 14.9 },
  { name: 'ISMB 200', thk: 5.7, unitWt: 25.4 },
  { name: 'ISMB 250', thk: 6.9, unitWt: 37.3 },
  { name: 'ISMB 300', thk: 7.5, unitWt: 44.2 },
  { name: 'ISMB 400', thk: 8.9, unitWt: 61.6 },
  { name: 'ISMC 100', thk: 4.7, unitWt: 9.56 },
  { name: 'ISMC 150', thk: 5.4, unitWt: 16.8 },
  { name: 'ISMC 200', thk: 6.1, unitWt: 22.3 },
  { name: 'ISA 50x50x6', thk: 6, unitWt: 4.5 },
  { name: 'ISA 75x75x6', thk: 6, unitWt: 6.8 },
  { name: 'ISA 100x100x8', thk: 8, unitWt: 12.1 },
  { name: 'Pipe 80mm NB', thk: 4.5, unitWt: 8.87 },
  { name: 'Pipe 100mm NB', thk: 4.5, unitWt: 12.2 },
  { name: 'Chequered Plate 6mm', thk: 6, unitWt: 49.5 },
];

export const ClientMeasurementSheetModule: React.FC<ClientMeasurementSheetModuleProps> = ({
  bills,
  projects,
  companies,
  currentUser,
  onSaveBill,
  onDeleteBill,
}) => {
  // Navigation inside this module
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [activeSheet, setActiveSheet] = useState<MeasurementBill | null>(null);

  // Search & Filter state for list
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  // Import from existing bill modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedBillToImport, setSelectedBillToImport] = useState<string>('');

  // Delete Confirmation Modal
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // PDF Live Preview Modal State
  const [pdfPreviewModal, setPdfPreviewModal] = useState<{
    sheet: MeasurementBill;
    company?: Company;
  } | null>(null);
  const [previewTab, setPreviewTab] = useState<'visual' | 'pdf'>('visual');

  // Filtered sheets: all bills or sheets tagged for client checking
  const clientSheets = useMemo(() => {
    return bills.filter((b) => {
      const matchSearch =
        searchQuery === '' ||
        b.billNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.client.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCompany = companyFilter === 'all' || b.companyId === companyFilter;
      const matchProject = projectFilter === 'all' || b.projectId === projectFilter;
      return matchSearch && matchCompany && matchProject;
    });
  }, [bills, searchQuery, companyFilter, projectFilter]);

  // Overall Statistics
  const stats = useMemo(() => {
    let totalKg = 0;
    bills.forEach((b) => {
      totalKg += b.currentQuantity || 0;
    });
    return {
      totalSheets: bills.length,
      totalWeightKg: totalKg,
      totalWeightMt: Math.round((totalKg / 1000) * 100) / 100,
    };
  }, [bills]);

  // PDF Preview Data Memo
  const pdfPreviewData = useMemo(() => {
    if (!pdfPreviewModal) return null;
    return buildMeasurementBillPdf(pdfPreviewModal.sheet, {
      company: pdfPreviewModal.company,
      hideRates: true,
      customTitle: 'CLIENT JOINT MEASUREMENT SHEET (FOR CHECKING & VERIFICATION)',
    });
  }, [pdfPreviewModal]);

  // Helper to calculate row weight
  const calculateItemWeight = (item: MeasurementItem): number => {
    if (item.isManualKgOverride && item.manualKgValue !== undefined) {
      return item.manualKgValue;
    }
    const qty = Number(item.quantity) || 0;
    const thk = Number(item.thickness) || 0;
    const len = Number(item.length) || 0;
    const width = Number(item.width) || 0;
    const unitWt = Number(item.unitWeight) || 0;

    // 1. If plate dimensions (thk, length, width) exist:
    if (thk > 0 && len > 0 && width > 0) {
      // standard steel density 7.85 kg/m3 (dimensions in mm or m)
      // If len > 50, assume mm, else assume meters
      const lenM = len > 50 ? len / 1000 : len;
      const widthM = width > 50 ? width / 1000 : width;
      const calculatedPlateKg = Math.round(lenM * widthM * thk * 7.85 * qty * 100) / 100;
      return calculatedPlateKg > 0 ? calculatedPlateKg : (unitWt > 0 ? Math.round(unitWt * qty * 100) / 100 : 0);
    }

    // 2. If unit weight and length exist:
    if (unitWt > 0 && len > 0) {
      const lenM = len > 50 ? len / 1000 : len;
      return Math.round(lenM * unitWt * qty * 100) / 100;
    }

    // 3. If unit weight and quantity exist directly:
    if (unitWt > 0 && qty > 0) {
      return Math.round(unitWt * qty * 100) / 100;
    }

    // 4. Default to existing item.kg
    return item.kg || 0;
  };

  // Create New Client Sheet from Scratch
  const handleCreateNewSheet = () => {
    const defaultComp = companies[0];
    const defaultProj = projects[0];
    const sheetNo = `SR/CMS/${new Date().getFullYear()}/${String(bills.length + 1).padStart(3, '0')}`;

    const newGroup: MeasurementGroup = {
      id: `grp-${Date.now()}`,
      groupName: 'Main Fabrication Yard / Structure Scope',
      area: 'Grid A1-A10',
      items: [
        {
          id: `item-${Date.now()}-1`,
          slNo: 1,
          descriptionItem: 'ISMB 300 Column Fabrication',
          measurementType: 'Structural Section',
          thickness: 7.5,
          length: 6,
          width: 0,
          quantity: 10,
          unit: 'KG',
          unitWeight: 44.2,
          kg: 2652,
          rate: 0,
          amount: 0,
          remark: 'Drawing Dwg-01 Rev 2',
        },
        {
          id: `item-${Date.now()}-2`,
          slNo: 2,
          descriptionItem: 'Base Plate 20mm Thk',
          measurementType: 'Plate',
          thickness: 20,
          length: 0.5,
          width: 0.5,
          quantity: 10,
          unit: 'KG',
          unitWeight: 157.0,
          kg: 392.5,
          rate: 0,
          amount: 0,
          remark: 'Base Connection Grid A1',
        },
      ],
      groupTotalKg: 3044.5,
      groupTotalAmount: 0,
    };

    const newSheet: MeasurementBill = {
      id: `cms-${Date.now()}`,
      billNo: sheetNo,
      billType: 'Client Measurement Sheet',
      billDate: new Date().toISOString().slice(0, 10),
      measurementDate: new Date().toISOString().slice(0, 10),
      workPeriodFrom: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
      workPeriodTo: new Date().toISOString().slice(0, 10),
      companyId: defaultComp?.id || '',
      companyName: defaultComp?.name || 'SR GROUP',
      projectId: defaultProj?.projectId || '',
      projectName: defaultProj?.projectName || 'Industrial Project',
      client: defaultProj?.client || defaultProj?.clientName || 'Client Company',
      site: defaultProj?.site || 'Site Yard',
      contractQuantity: 50000,
      previousQuantity: 0,
      currentQuantity: 3044.5,
      cumulativeQuantity: 3044.5,
      status: 'Under Verification',
      preparedBy: currentUser.name || 'Site Billing Engineer',
      checkedBy: 'Site In-Charge',
      verifiedBy: 'Client Representative / Engineer',
      approvedBy: 'Client Project Manager',
      remarks: 'Joint site measurement sheet for company verification without rates.',
      groups: [newGroup],
      linkedIdmNos: [],
      currentAmount: 0,
      cumulativeAmount: 0,
      statusHistory: [],
      revisions: [],
      payments: [],
      createdAt: new Date().toISOString(),
      deductions: {
        subtotal: 0,
        gstRate: 0,
        gstAmount: 0,
        otherCharges: 0,
        grossBill: 0,
        tdsRate: 0,
        tdsAmount: 0,
        retentionRate: 0,
        retentionAmount: 0,
        advanceRecovery: 0,
        materialRecovery: 0,
        otherDeduction: 0,
        totalDeduction: 0,
        netBill: 0,
        amountReceived: 0,
        balanceAmount: 0,
      },
    };

    setActiveSheet(newSheet);
    setViewMode('editor');
  };

  // Import existing measurement bill to create rate-free client sheet
  const handleImportBill = () => {
    const targetBill = bills.find((b) => b.id === selectedBillToImport);
    if (!targetBill) return;

    // Clone deep and strip rates
    const clonedSheet: MeasurementBill = {
      ...JSON.parse(JSON.stringify(targetBill)),
      id: `cms-${Date.now()}`,
      billNo: `SR/CMS/${targetBill.billNo.replace(/[^0-9]/g, '').slice(-3) || '001'}`,
      billType: 'Client Measurement Sheet',
      remarks: `Imported from Bill ${targetBill.billNo} for Client Checking without rates.`,
      status: 'Under Verification',
      groups: targetBill.groups.map((grp) => ({
        ...grp,
        groupTotalAmount: 0,
        items: grp.items.map((it) => ({
          ...it,
          rate: 0,
          amount: 0,
        })),
      })),
      deductions: {
        subtotal: 0,
        gstRate: 0,
        gstAmount: 0,
        otherCharges: 0,
        grossBill: 0,
        tdsAmount: 0,
        retentionAmount: 0,
        advanceRecovery: 0,
        materialRecovery: 0,
        otherDeduction: 0,
        totalDeduction: 0,
        netBill: 0,
        amountReceived: 0,
        balanceAmount: 0,
      },
    };

    setActiveSheet(clonedSheet);
    setImportModalOpen(false);
    setViewMode('editor');
  };

  // Open existing sheet for editing
  const handleOpenSheet = (sheet: MeasurementBill) => {
    setActiveSheet(JSON.parse(JSON.stringify(sheet)));
    setViewMode('editor');
  };

  // Update a single item cell inline
  const handleUpdateItemCell = (
    groupIndex: number,
    itemIndex: number,
    field: keyof MeasurementItem,
    value: any
  ) => {
    if (!activeSheet) return;

    const updatedGroups = [...activeSheet.groups];
    const grp = { ...updatedGroups[groupIndex] };
    const items = [...grp.items];
    const item = { ...items[itemIndex], [field]: value };

    // Auto-calculate weight when dimension or qty changes
    if (['thickness', 'length', 'width', 'quantity', 'unitWeight'].includes(field as string)) {
      item.kg = calculateItemWeight(item);
    }

    items[itemIndex] = item;
    grp.items = items;
    grp.groupTotalKg = items.reduce((sum, it) => sum + (it.kg || 0), 0);
    updatedGroups[groupIndex] = grp;

    const newTotalKg = updatedGroups.reduce((sum, g) => sum + (g.groupTotalKg || 0), 0);

    setActiveSheet({
      ...activeSheet,
      groups: updatedGroups,
      currentQuantity: newTotalKg,
      cumulativeQuantity: (activeSheet.previousQuantity || 0) + newTotalKg,
    });
  };

  // Add Item to Group
  const handleAddItemToGroup = (groupIndex: number, preset?: typeof QUICK_STEEL_CATALOG[0]) => {
    if (!activeSheet) return;

    const updatedGroups = [...activeSheet.groups];
    const grp = { ...updatedGroups[groupIndex] };
    const items = [...grp.items];

    const newItem: MeasurementItem = {
      id: `it-${Date.now()}-${items.length + 1}`,
      slNo: items.length + 1,
      descriptionItem: preset ? preset.name : 'Fabrication Structural Member',
      measurementType: preset?.name.includes('Plate') ? 'Plate' : 'Structural Section',
      thickness: preset ? preset.thk : 10,
      length: 1,
      width: 1,
      quantity: 1,
      unit: 'KG',
      unitWeight: preset ? preset.unitWt : 44.2,
      kg: preset ? preset.unitWt : 44.2,
      rate: 0,
      amount: 0,
      remark: 'Grid / Drawing Reference',
    };

    items.push(newItem);
    grp.items = items;
    grp.groupTotalKg = items.reduce((sum, it) => sum + (it.kg || 0), 0);
    updatedGroups[groupIndex] = grp;

    const newTotalKg = updatedGroups.reduce((sum, g) => sum + (g.groupTotalKg || 0), 0);

    setActiveSheet({
      ...activeSheet,
      groups: updatedGroups,
      currentQuantity: newTotalKg,
      cumulativeQuantity: (activeSheet.previousQuantity || 0) + newTotalKg,
    });
  };

  // Delete Item from Group
  const handleDeleteItem = (groupIndex: number, itemIndex: number) => {
    if (!activeSheet) return;

    const updatedGroups = [...activeSheet.groups];
    const grp = { ...updatedGroups[groupIndex] };
    const items = grp.items.filter((_, idx) => idx !== itemIndex);

    grp.items = items.map((it, idx) => ({ ...it, slNo: idx + 1 }));
    grp.groupTotalKg = items.reduce((sum, it) => sum + (it.kg || 0), 0);
    updatedGroups[groupIndex] = grp;

    const newTotalKg = updatedGroups.reduce((sum, g) => sum + (g.groupTotalKg || 0), 0);

    setActiveSheet({
      ...activeSheet,
      groups: updatedGroups,
      currentQuantity: newTotalKg,
      cumulativeQuantity: (activeSheet.previousQuantity || 0) + newTotalKg,
    });
  };

  // Add New Group
  const handleAddNewGroup = () => {
    if (!activeSheet) return;

    const newGrp: MeasurementGroup = {
      id: `grp-${Date.now()}`,
      groupName: `Group ${activeSheet.groups.length + 1}: Roof Truss / Site Area`,
      area: 'Grid B1-B8',
      items: [
        {
          id: `it-${Date.now()}-1`,
          slNo: 1,
          descriptionItem: 'ISMB 250 Rafter Member',
          measurementType: 'Structural Section',
          thickness: 6.9,
          length: 6,
          width: 0,
          quantity: 4,
          unit: 'KG',
          unitWeight: 37.3,
          kg: 895.2,
          rate: 0,
          amount: 0,
          remark: 'Truss T-1',
        },
      ],
      groupTotalKg: 895.2,
      groupTotalAmount: 0,
    };

    const updatedGroups = [...activeSheet.groups, newGrp];
    const newTotalKg = updatedGroups.reduce((sum, g) => sum + (g.groupTotalKg || 0), 0);

    setActiveSheet({
      ...activeSheet,
      groups: updatedGroups,
      currentQuantity: newTotalKg,
      cumulativeQuantity: (activeSheet.previousQuantity || 0) + newTotalKg,
    });
  };

  // Delete Group
  const handleDeleteGroup = (groupIndex: number) => {
    if (!activeSheet) return;
    if (activeSheet.groups.length <= 1) {
      alert('At least one measurement group is required in the sheet.');
      return;
    }

    const updatedGroups = activeSheet.groups.filter((_, idx) => idx !== groupIndex);
    const newTotalKg = updatedGroups.reduce((sum, g) => sum + (g.groupTotalKg || 0), 0);

    setActiveSheet({
      ...activeSheet,
      groups: updatedGroups,
      currentQuantity: newTotalKg,
      cumulativeQuantity: (activeSheet.previousQuantity || 0) + newTotalKg,
    });
  };

  // Save the sheet
  const handleSaveActiveSheet = () => {
    if (!activeSheet) return;
    onSaveBill(activeSheet);
    alert('Measurement Sheet (Client Verification) saved successfully!');
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & NAVIGATION */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white tracking-tight">
                    Client Measurement Sheet (Checking & Verification)
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Checking & Verification
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Physical measurement and unit weight sheet for client inspection and joint site checking without rates.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {viewMode === 'editor' ? (
              <>
                <button
                  onClick={() => setViewMode('list')}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-2 border border-slate-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sheets List
                </button>
                <button
                  onClick={handleSaveActiveSheet}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Save className="w-4 h-4" />
                  Save Sheet
                </button>
                <button
                  onClick={() => {
                    if (activeSheet) {
                      const comp = companies.find((c) => c.id === activeSheet.companyId);
                      setPdfPreviewModal({ sheet: activeSheet, company: comp });
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Printer className="w-4 h-4" />
                  Print / PDF Preview
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setImportModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-2 border border-slate-700"
                  title="Import items from existing bill"
                >
                  <Copy className="w-4 h-4 text-amber-400" />
                  Import from Bill
                </button>
                <button
                  onClick={handleCreateNewSheet}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                  + New Measurement Sheet
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick Statistics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Total Available Sheets</span>
            <span className="text-base font-bold text-white font-mono">{stats.totalSheets} Sheets</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Total Measured Weight</span>
            <span className="text-base font-bold text-amber-400 font-mono">
              {stats.totalWeightKg.toLocaleString('en-IN')} KG
            </span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 col-span-2 md:col-span-1">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Metric Tonnes (MT)</span>
            <span className="text-base font-bold text-emerald-400 font-mono">
              {stats.totalWeightMt} MT
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. MODE: LIST OF MEASUREMENT SHEETS */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Sheet No, Project, Client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300"
              >
                <option value="all">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>{p.projectName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sheets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientSheets.map((sheet) => {
              const totalItems = sheet.groups.reduce((acc, g) => acc + g.items.length, 0);
              const comp = companies.find((c) => c.id === sheet.companyId);

              return (
                <div
                  key={sheet.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        {sheet.billNo}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {sheet.status || 'Verification'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition line-clamp-1">
                        {sheet.projectName}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Client: <span className="text-slate-300 font-medium">{sheet.client}</span>
                      </p>
                    </div>

                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Total Items:</span>
                        <span className="text-white font-semibold">{totalItems} Nos</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Measured Weight:</span>
                        <span className="text-amber-400 font-bold">
                          {(sheet.currentQuantity || 0).toLocaleString('en-IN')} KG
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Metric Tonnes:</span>
                        <span className="text-emerald-400 font-bold">
                          {(((sheet.currentQuantity || 0) / 1000).toFixed(3))} MT
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>M-Date: {sheet.measurementDate}</span>
                      <span>Prepared By: {sheet.preparedBy || 'Engineer'}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenSheet(sheet)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      Open & Edit
                    </button>

                    <button
                      onClick={() => setPdfPreviewModal({ sheet, company: comp })}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition border border-amber-500/30 flex items-center gap-1"
                      title="Live PDF Print Preview"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print
                    </button>

                    <button
                      onClick={() => exportClientMeasurementSheetToExcel(sheet)}
                      className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                      title="Export Excel (Without Rates)"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(sheet.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
                      title="Delete Sheet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. MODE: INTERACTIVE MEASUREMENT ENTRY SHEET (WITHOUT RATES) */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'editor' && activeSheet && (
        <div className="space-y-6">
          {/* Header Metadata Information Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">
                  Sheet Header & Project Identification
                </h2>
              </div>
              <span className="text-xs text-amber-400 font-mono bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                Notice: All rates are omitted for client checking
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Company / Contractor</label>
                <select
                  value={activeSheet.companyId}
                  onChange={(e) => {
                    const c = companies.find((comp) => comp.id === e.target.value);
                    setActiveSheet({
                      ...activeSheet,
                      companyId: e.target.value,
                      companyName: c?.name || activeSheet.companyName,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Project & Client</label>
                <select
                  value={activeSheet.projectId}
                  onChange={(e) => {
                    const p = projects.find((proj) => proj.projectId === e.target.value);
                    setActiveSheet({
                      ...activeSheet,
                      projectId: e.target.value,
                      projectName: p?.projectName || activeSheet.projectName,
                      client: p?.client || p?.clientName || activeSheet.client,
                      site: p?.site || activeSheet.site,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {projects.map((p) => (
                    <option key={p.projectId} value={p.projectId}>
                      {p.projectName} ({p.client || 'Client'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Client Measurement Sheet No</label>
                <input
                  type="text"
                  value={activeSheet.billNo}
                  onChange={(e) => setActiveSheet({ ...activeSheet, billNo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-amber-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Verification Status</label>
                <select
                  value={activeSheet.status}
                  onChange={(e) => setActiveSheet({ ...activeSheet, status: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="Draft">Draft</option>
                  <option value="Under Verification">Under Verification</option>
                  <option value="Client Verified">Client Verified</option>
                  <option value="Approved">Approved</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Measurement Date</label>
                <input
                  type="date"
                  value={activeSheet.measurementDate}
                  onChange={(e) => setActiveSheet({ ...activeSheet, measurementDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                </input>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Work Period (From - To)</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="date"
                    value={activeSheet.workPeriodFrom || ''}
                    onChange={(e) => setActiveSheet({ ...activeSheet, workPeriodFrom: e.target.value })}
                    className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-[11px]"
                  />
                  <input
                    type="date"
                    value={activeSheet.workPeriodTo || ''}
                    onChange={(e) => setActiveSheet({ ...activeSheet, workPeriodTo: e.target.value })}
                    className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Work Order / PO Ref</label>
                <input
                  type="text"
                  placeholder="e.g. WO-2026/889"
                  value={activeSheet.workOrderNo || ''}
                  onChange={(e) => setActiveSheet({ ...activeSheet, workOrderNo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Location / Site / Yard</label>
                <input
                  type="text"
                  placeholder="e.g. Fabrication Yard Bay-2"
                  value={activeSheet.site || ''}
                  onChange={(e) => setActiveSheet({ ...activeSheet, site: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>
          </div>

          {/* Quick Steel Catalog Presets Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              ⚡ Quick Add Standard Engineering Steel (Click to insert row with standard Unit Weight):
            </span>
            <div className="flex flex-wrap gap-2">
              {QUICK_STEEL_CATALOG.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAddItemToGroup(0, cat)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 text-[11px] font-mono transition flex items-center gap-1"
                >
                  <span>{cat.name}</span>
                  <span className="text-amber-400 font-bold">({cat.unitWt} kg/m)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Measurement Groups & Rows Table */}
          {activeSheet.groups.map((group, gIdx) => (
            <div
              key={group.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
            >
              {/* Group Header */}
              <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold text-xs flex items-center justify-center border border-amber-500/30">
                    {gIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={group.groupName}
                    onChange={(e) => {
                      const updatedGroups = [...activeSheet.groups];
                      updatedGroups[gIdx].groupName = e.target.value;
                      setActiveSheet({ ...activeSheet, groups: updatedGroups });
                    }}
                    placeholder="Group / Area Name"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold w-64 md:w-80"
                  />
                  <input
                    type="text"
                    value={group.area || ''}
                    onChange={(e) => {
                      const updatedGroups = [...activeSheet.groups];
                      updatedGroups[gIdx].area = e.target.value;
                      setActiveSheet({ ...activeSheet, groups: updatedGroups });
                    }}
                    placeholder="Grid / Block"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 w-32"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-xs font-mono">
                    <span className="text-slate-400">Group Weight: </span>
                    <span className="text-amber-400 font-bold text-sm">
                      {(group.groupTotalKg || 0).toLocaleString('en-IN')} KG
                    </span>
                    <span className="text-emerald-400 font-semibold ml-1.5">
                      ({(((group.groupTotalKg || 0) / 1000).toFixed(3))} MT)
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteGroup(gIdx)}
                    className="p-1 text-slate-500 hover:text-red-400 transition"
                    title="Delete Group"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editable Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-950/40 uppercase font-semibold">
                      <th className="py-2.5 px-3 text-center w-10">#</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Item Description</th>
                      <th className="py-2.5 px-2 text-center w-24">Thk (mm)</th>
                      <th className="py-2.5 px-2 text-center w-24">Length (m)</th>
                      <th className="py-2.5 px-2 text-center w-24">Width (m)</th>
                      <th className="py-2.5 px-2 text-center w-20">Qty</th>
                      <th className="py-2.5 px-2 text-center w-28 text-amber-400 font-bold">
                        Unit Wt (kg/m)
                      </th>
                      <th className="py-2.5 px-3 text-right w-32 font-bold text-slate-300">
                        Weight (KG)
                      </th>
                      <th className="py-2.5 px-2 text-right w-24 font-bold text-emerald-400">
                        Weight (MT)
                      </th>
                      <th className="py-2.5 px-3 min-w-[160px]">Remark / Grid / Location</th>
                      <th className="py-2.5 px-2 text-center w-12">Act</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {group.items.map((it, iIdx) => (
                      <tr key={it.id} className="hover:bg-slate-850/40 transition">
                        <td className="py-2 px-3 text-center font-mono text-slate-400 font-bold">
                          {iIdx + 1}
                        </td>

                        {/* Description */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={it.descriptionItem}
                            onChange={(e) =>
                              handleUpdateItemCell(gIdx, iIdx, 'descriptionItem', e.target.value)
                            }
                            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-white font-medium text-xs"
                          />
                        </td>

                        {/* Thickness */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            step="0.1"
                            value={it.thickness || ''}
                            onChange={(e) =>
                              handleUpdateItemCell(gIdx, iIdx, 'thickness', parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg px-2 py-1.5 text-center text-slate-200 font-mono text-xs"
                          />
                        </td>

                        {/* Length */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={it.length || ''}
                            onChange={(e) =>
                              handleUpdateItemCell(gIdx, iIdx, 'length', parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg px-2 py-1.5 text-center text-slate-200 font-mono text-xs"
                          />
                        </td>

                        {/* Width */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={it.width || ''}
                            onChange={(e) =>
                              handleUpdateItemCell(gIdx, iIdx, 'width', parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg px-2 py-1.5 text-center text-slate-200 font-mono text-xs"
                          />
                        </td>

                        {/* Quantity */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            step="1"
                            value={it.quantity || ''}
                            onChange={(e) =>
                              handleUpdateItemCell(gIdx, iIdx, 'quantity', parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg px-2 py-1.5 text-center text-white font-mono font-bold text-xs"
                          />
                        </td>

                        {/* Unit Weight */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={it.unitWeight || ''}
                            onChange={(e) =>
                              handleUpdateItemCell(gIdx, iIdx, 'unitWeight', parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-amber-500/10 border border-amber-500/30 focus:border-amber-400 rounded-lg px-2 py-1.5 text-center text-amber-300 font-mono font-bold text-xs"
                          />
                        </td>

                        {/* Weight (KG) - Calculated */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-400">
                          {(it.kg || 0).toLocaleString('en-IN')}
                        </td>

                        {/* Weight (MT) - Calculated */}
                        <td className="py-2 px-2 text-right font-mono font-bold text-emerald-400">
                          {(((it.kg || 0) / 1000).toFixed(3))}
                        </td>

                        {/* Remark */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="Grid, Dwg Rev, Location"
                            value={it.remark || ''}
                            onChange={(e) =>
                              handleUpdateItemCell(gIdx, iIdx, 'remark', e.target.value)
                            }
                            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-slate-300 text-xs"
                          />
                        </td>

                        {/* Delete Row Action */}
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => handleDeleteItem(gIdx, iIdx)}
                            className="p-1 text-slate-500 hover:text-red-400 transition"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Group Bottom Bar */}
              <div className="bg-slate-950/70 px-5 py-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => handleAddItemToGroup(gIdx)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-400 transition flex items-center gap-1.5 border border-slate-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add Item Row
                </button>

                <div className="text-xs font-mono">
                  <span className="text-slate-400">Total Group Items: </span>
                  <span className="text-white font-bold">{group.items.length} Nos</span>
                </div>
              </div>
            </div>
          ))}

          {/* Add Another Group Button */}
          <div className="flex justify-center">
            <button
              onClick={handleAddNewGroup}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-2 border border-slate-700 shadow-md"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              + Add Another Scope / Area Group
            </button>
          </div>

          {/* Signatures & Certification Workflow Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Site Verification & Joint Signatures Authority
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Prepared By (Contractor)</label>
                <input
                  type="text"
                  value={activeSheet.preparedBy || ''}
                  onChange={(e) => setActiveSheet({ ...activeSheet, preparedBy: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Checked By (Site In-Charge)</label>
                <input
                  type="text"
                  value={activeSheet.checkedBy || ''}
                  onChange={(e) => setActiveSheet({ ...activeSheet, checkedBy: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Verified By (Client Engineer)</label>
                <input
                  type="text"
                  value={activeSheet.verifiedBy || ''}
                  onChange={(e) => setActiveSheet({ ...activeSheet, verifiedBy: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Approved By (Client Project Manager)</label>
                <input
                  type="text"
                  value={activeSheet.approvedBy || ''}
                  onChange={(e) => setActiveSheet({ ...activeSheet, approvedBy: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>

            {/* Total Footprint Banner */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Total Verified Scope Weight:</span>
                <span className="text-amber-400 font-bold text-base">
                  {(activeSheet.currentQuantity || 0).toLocaleString('en-IN')} KG
                </span>
                <span className="text-emerald-400 font-bold text-base ml-2">
                  ({(((activeSheet.currentQuantity || 0) / 1000).toFixed(3))} MT)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => exportClientMeasurementSheetToExcel(activeSheet)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5 border border-slate-700 font-semibold"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  Excel Export (No Rates)
                </button>
                <button
                  onClick={handleSaveActiveSheet}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <Save className="w-4 h-4" />
                  Save Sheet
                </button>
                <button
                  onClick={() => {
                    const comp = companies.find((c) => c.id === activeSheet.companyId);
                    setPdfPreviewModal({ sheet: activeSheet, company: comp });
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <Printer className="w-4 h-4" />
                  Print & PDF Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. IMPORT MODAL FROM BILL */}
      {/* ------------------------------------------------------------- */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Copy className="w-5 h-5 text-amber-400" />
                Import from Measurement Bill
              </h3>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select any existing bill. All item descriptions, dimensions, quantities, and unit weights will be imported, while all financial rates and amounts will be stripped automatically.
            </p>

            <div>
              <label className="text-slate-300 text-xs font-semibold block mb-1.5">
                Select Source Bill:
              </label>
              <select
                value={selectedBillToImport}
                onChange={(e) => setSelectedBillToImport(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="">-- Choose a bill to import --</option>
                {bills.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.billNo} • {b.projectName} ({(b.currentQuantity || 0).toLocaleString('en-IN')} KG)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={!selectedBillToImport}
                onClick={handleImportBill}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                Import & Create Checking Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. DELETE CONFIRMATION MODAL */}
      {/* ------------------------------------------------------------- */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Confirm Sheet Deletion</h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to delete this client measurement sheet? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteBill(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-400 text-white transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ------------------------------------------------------------- */}
      {/* 6. LIVE SHEET & PDF PREVIEW MODAL (WITHOUT RATES) */}
      {/* ------------------------------------------------------------- */}
      {pdfPreviewModal && pdfPreviewData && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full h-[95vh] sm:h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Printer className="w-4 sm:w-5 h-4 sm:h-5 text-amber-400" />
                  Client Joint Measurement Sheet Preview
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  Sheet No: <span className="font-mono text-amber-400 font-semibold">{pdfPreviewModal.sheet.billNo}</span> •
                  Project: <span className="text-slate-200">{pdfPreviewModal.sheet.projectName}</span>
                </p>
              </div>

              {/* View Mode Toggle (Visual Paper View vs PDF Engine) */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPreviewTab('visual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    previewTab === 'visual'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Paper View
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('pdf')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    previewTab === 'pdf'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  PDF Engine
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (previewTab === 'visual') {
                      window.print();
                    } else {
                      printJsPdfDocument(pdfPreviewData.doc, `${pdfPreviewData.cleanBillNo}_CLIENT_SHEET`);
                    }
                  }}
                  className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  Print Now
                </button>

                <button
                  type="button"
                  onClick={() => {
                    pdfPreviewData.doc.save(`${pdfPreviewData.cleanBillNo}_CLIENT_MEASUREMENT_SHEET.pdf`);
                  }}
                  className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5 border border-slate-700 active:scale-95"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  Download PDF
                </button>

                <button
                  type="button"
                  onClick={() => setPdfPreviewModal(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div className="flex-1 bg-slate-950 p-2 sm:p-4 overflow-y-auto">
              {previewTab === 'visual' ? (
                /* High-Fidelity Paper Document View (100% Reliable on Mobile & Desktop) */
                <div className="max-w-4xl mx-auto bg-white text-slate-900 rounded-xl shadow-2xl p-4 sm:p-8 font-sans border border-slate-300 print:shadow-none print:border-none print:p-0">
                  {/* Document Header */}
                  <div className="border-b-2 border-slate-800 pb-4 mb-4 text-center">
                    <h2 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                      {pdfPreviewModal.company?.name || 'SR GROUP ENTERPRISES'}
                    </h2>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      {pdfPreviewModal.company?.address || 'Industrial Area Phase 2, Steel Fabrication & Erection Complex'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-slate-600 mt-1">
                      {pdfPreviewModal.company?.gstNo && <span>GSTIN: <strong>{pdfPreviewModal.company.gstNo}</strong></span>}
                      {pdfPreviewModal.company?.pan && <span>PAN: <strong>{pdfPreviewModal.company.pan}</strong></span>}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-300">
                      <div className="inline-block bg-slate-900 text-white font-extrabold text-xs sm:text-sm px-4 py-1 uppercase tracking-wider rounded">
                        CLIENT JOINT MEASUREMENT SHEET
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-600 font-semibold mt-1">
                        (Physical Checking & Site Verification Record — Rates strictly omitted)
                      </p>
                    </div>
                  </div>

                  {/* Document Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 border border-slate-300 p-3 rounded-lg mb-4 font-sans">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Sheet No:</span>
                      <input
                        type="text"
                        value={pdfPreviewModal.sheet.billNo}
                        onChange={(e) => {
                          const updated = { ...pdfPreviewModal.sheet, billNo: e.target.value };
                          setPdfPreviewModal({ ...pdfPreviewModal, sheet: updated });
                          if (activeSheet && activeSheet.id === updated.id) setActiveSheet(updated);
                        }}
                        className="font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded px-1.5 py-0.5 w-full text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Date:</span>
                      <input
                        type="date"
                        value={pdfPreviewModal.sheet.billDate}
                        onChange={(e) => {
                          const updated = { ...pdfPreviewModal.sheet, billDate: e.target.value };
                          setPdfPreviewModal({ ...pdfPreviewModal, sheet: updated });
                          if (activeSheet && activeSheet.id === updated.id) setActiveSheet(updated);
                        }}
                        className="font-bold text-slate-900 bg-white border border-slate-300 rounded px-1.5 py-0.5 w-full text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Project Name:</span>
                      <input
                        type="text"
                        value={pdfPreviewModal.sheet.projectName}
                        onChange={(e) => {
                          const updated = { ...pdfPreviewModal.sheet, projectName: e.target.value };
                          setPdfPreviewModal({ ...pdfPreviewModal, sheet: updated });
                          if (activeSheet && activeSheet.id === updated.id) setActiveSheet(updated);
                        }}
                        className="font-semibold text-slate-900 bg-white border border-slate-300 rounded px-1.5 py-0.5 w-full text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Client / Owner:</span>
                      <input
                        type="text"
                        value={pdfPreviewModal.sheet.client}
                        onChange={(e) => {
                          const updated = { ...pdfPreviewModal.sheet, client: e.target.value };
                          setPdfPreviewModal({ ...pdfPreviewModal, sheet: updated });
                          if (activeSheet && activeSheet.id === updated.id) setActiveSheet(updated);
                        }}
                        className="font-semibold text-slate-900 bg-white border border-slate-300 rounded px-1.5 py-0.5 w-full text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Site Location:</span>
                      <input
                        type="text"
                        value={pdfPreviewModal.sheet.site || ''}
                        onChange={(e) => {
                          const updated = { ...pdfPreviewModal.sheet, site: e.target.value };
                          setPdfPreviewModal({ ...pdfPreviewModal, sheet: updated });
                          if (activeSheet && activeSheet.id === updated.id) setActiveSheet(updated);
                        }}
                        className="text-slate-800 bg-white border border-slate-300 rounded px-1.5 py-0.5 w-full text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Period From:</span>
                      <input
                        type="date"
                        value={pdfPreviewModal.sheet.workPeriodFrom || ''}
                        onChange={(e) => {
                          const updated = { ...pdfPreviewModal.sheet, workPeriodFrom: e.target.value };
                          setPdfPreviewModal({ ...pdfPreviewModal, sheet: updated });
                          if (activeSheet && activeSheet.id === updated.id) setActiveSheet(updated);
                        }}
                        className="text-slate-800 bg-white border border-slate-300 rounded px-1.5 py-0.5 w-full text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Period To:</span>
                      <input
                        type="date"
                        value={pdfPreviewModal.sheet.workPeriodTo || ''}
                        onChange={(e) => {
                          const updated = { ...pdfPreviewModal.sheet, workPeriodTo: e.target.value };
                          setPdfPreviewModal({ ...pdfPreviewModal, sheet: updated });
                          if (activeSheet && activeSheet.id === updated.id) setActiveSheet(updated);
                        }}
                        className="text-slate-800 bg-white border border-slate-300 rounded px-1.5 py-0.5 w-full text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Verification Status:</span>
                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded text-[11px]">
                        {pdfPreviewModal.sheet.status || 'Under Joint Checking'}
                      </span>
                    </div>
                  </div>

                  {/* 9-Column Measurement Table */}
                  <div className="overflow-x-auto border border-slate-400 rounded mb-4">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-800 text-white font-bold text-[11px] uppercase tracking-wider text-center">
                          <th className="p-2 border border-slate-400 w-12">S.No</th>
                          <th className="p-2 border border-slate-400 text-left">Item Description</th>
                          <th className="p-2 border border-slate-400 w-16">Thk (mm)</th>
                          <th className="p-2 border border-slate-400 w-16">Length (m)</th>
                          <th className="p-2 border border-slate-400 w-16">Width (m)</th>
                          <th className="p-2 border border-slate-400 w-14">Qty</th>
                          <th className="p-2 border border-slate-400 w-20">Unit Wt (kg/m)</th>
                          <th className="p-2 border border-slate-400 w-24">Total Wt (KG)</th>
                          <th className="p-2 border border-slate-400">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pdfPreviewModal.sheet.groups.map((group, gIdx) => (
                          <React.Fragment key={group.id || gIdx}>
                            <tr className="bg-slate-200 font-bold text-slate-900">
                              <td colSpan={9} className="p-2 border border-slate-400">
                                <div className="flex items-center justify-between">
                                  <span>{group.groupName} {group.area ? `• (${group.area})` : ''}</span>
                                  <span className="font-mono text-slate-800">
                                    Subtotal: {(group.groupTotalKg || 0).toLocaleString('en-IN')} KG
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {group.items.map((item, iIdx) => (
                              <tr key={item.id || iIdx} className="hover:bg-amber-50/60 transition">
                                <td className="p-1.5 border border-slate-300 text-center font-mono font-semibold">
                                  {iIdx + 1}
                                </td>
                                <td className="p-1 border border-slate-300">
                                  <input
                                    type="text"
                                    value={item.descriptionItem}
                                    onChange={(e) => {
                                      const updatedSheet = { ...pdfPreviewModal.sheet };
                                      updatedSheet.groups[gIdx].items[iIdx].descriptionItem = e.target.value;
                                      setPdfPreviewModal({ ...pdfPreviewModal, sheet: updatedSheet });
                                      if (activeSheet && activeSheet.id === updatedSheet.id) setActiveSheet(updatedSheet);
                                    }}
                                    className="w-full bg-transparent px-1 py-0.5 rounded font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-amber-500"
                                  />
                                </td>
                                <td className="p-1 border border-slate-300 text-right">
                                  <input
                                    type="number"
                                    step="any"
                                    value={item.thickness || ''}
                                    onChange={(e) => {
                                      const updatedSheet = { ...pdfPreviewModal.sheet };
                                      const val = parseFloat(e.target.value) || 0;
                                      updatedSheet.groups[gIdx].items[iIdx].thickness = val;
                                      updatedSheet.groups[gIdx].items[iIdx].kg = calculateItemWeight(updatedSheet.groups[gIdx].items[iIdx]);
                                      updatedSheet.groups[gIdx].groupTotalKg = updatedSheet.groups[gIdx].items.reduce((s, it) => s + (it.kg || 0), 0);
                                      updatedSheet.currentQuantity = updatedSheet.groups.reduce((s, g) => s + (g.groupTotalKg || 0), 0);
                                      setPdfPreviewModal({ ...pdfPreviewModal, sheet: updatedSheet });
                                      if (activeSheet && activeSheet.id === updatedSheet.id) setActiveSheet(updatedSheet);
                                    }}
                                    className="w-full bg-transparent px-1 py-0.5 rounded text-right font-mono focus:bg-white focus:ring-1 focus:ring-amber-500"
                                  />
                                </td>
                                <td className="p-1 border border-slate-300 text-right">
                                  <input
                                    type="number"
                                    step="any"
                                    value={item.length || ''}
                                    onChange={(e) => {
                                      const updatedSheet = { ...pdfPreviewModal.sheet };
                                      const val = parseFloat(e.target.value) || 0;
                                      updatedSheet.groups[gIdx].items[iIdx].length = val;
                                      updatedSheet.groups[gIdx].items[iIdx].kg = calculateItemWeight(updatedSheet.groups[gIdx].items[iIdx]);
                                      updatedSheet.groups[gIdx].groupTotalKg = updatedSheet.groups[gIdx].items.reduce((s, it) => s + (it.kg || 0), 0);
                                      updatedSheet.currentQuantity = updatedSheet.groups.reduce((s, g) => s + (g.groupTotalKg || 0), 0);
                                      setPdfPreviewModal({ ...pdfPreviewModal, sheet: updatedSheet });
                                      if (activeSheet && activeSheet.id === updatedSheet.id) setActiveSheet(updatedSheet);
                                    }}
                                    className="w-full bg-transparent px-1 py-0.5 rounded text-right font-mono focus:bg-white focus:ring-1 focus:ring-amber-500"
                                  />
                                </td>
                                <td className="p-1 border border-slate-300 text-right">
                                  <input
                                    type="number"
                                    step="any"
                                    value={item.width || ''}
                                    onChange={(e) => {
                                      const updatedSheet = { ...pdfPreviewModal.sheet };
                                      const val = parseFloat(e.target.value) || 0;
                                      updatedSheet.groups[gIdx].items[iIdx].width = val;
                                      updatedSheet.groups[gIdx].items[iIdx].kg = calculateItemWeight(updatedSheet.groups[gIdx].items[iIdx]);
                                      updatedSheet.groups[gIdx].groupTotalKg = updatedSheet.groups[gIdx].items.reduce((s, it) => s + (it.kg || 0), 0);
                                      updatedSheet.currentQuantity = updatedSheet.groups.reduce((s, g) => s + (g.groupTotalKg || 0), 0);
                                      setPdfPreviewModal({ ...pdfPreviewModal, sheet: updatedSheet });
                                      if (activeSheet && activeSheet.id === updatedSheet.id) setActiveSheet(updatedSheet);
                                    }}
                                    className="w-full bg-transparent px-1 py-0.5 rounded text-right font-mono focus:bg-white focus:ring-1 focus:ring-amber-500"
                                  />
                                </td>
                                <td className="p-1 border border-slate-300 text-right">
                                  <input
                                    type="number"
                                    step="any"
                                    value={item.quantity || ''}
                                    onChange={(e) => {
                                      const updatedSheet = { ...pdfPreviewModal.sheet };
                                      const val = parseFloat(e.target.value) || 0;
                                      updatedSheet.groups[gIdx].items[iIdx].quantity = val;
                                      updatedSheet.groups[gIdx].items[iIdx].kg = calculateItemWeight(updatedSheet.groups[gIdx].items[iIdx]);
                                      updatedSheet.groups[gIdx].groupTotalKg = updatedSheet.groups[gIdx].items.reduce((s, it) => s + (it.kg || 0), 0);
                                      updatedSheet.currentQuantity = updatedSheet.groups.reduce((s, g) => s + (g.groupTotalKg || 0), 0);
                                      setPdfPreviewModal({ ...pdfPreviewModal, sheet: updatedSheet });
                                      if (activeSheet && activeSheet.id === updatedSheet.id) setActiveSheet(updatedSheet);
                                    }}
                                    className="w-full bg-transparent px-1 py-0.5 rounded text-right font-mono font-bold focus:bg-white focus:ring-1 focus:ring-amber-500"
                                  />
                                </td>
                                <td className="p-1 border border-slate-300 text-right">
                                  <input
                                    type="number"
                                    step="any"
                                    value={item.unitWeight || ''}
                                    onChange={(e) => {
                                      const updatedSheet = { ...pdfPreviewModal.sheet };
                                      const val = parseFloat(e.target.value) || 0;
                                      updatedSheet.groups[gIdx].items[iIdx].unitWeight = val;
                                      updatedSheet.groups[gIdx].items[iIdx].kg = calculateItemWeight(updatedSheet.groups[gIdx].items[iIdx]);
                                      updatedSheet.groups[gIdx].groupTotalKg = updatedSheet.groups[gIdx].items.reduce((s, it) => s + (it.kg || 0), 0);
                                      updatedSheet.currentQuantity = updatedSheet.groups.reduce((s, g) => s + (g.groupTotalKg || 0), 0);
                                      setPdfPreviewModal({ ...pdfPreviewModal, sheet: updatedSheet });
                                      if (activeSheet && activeSheet.id === updatedSheet.id) setActiveSheet(updatedSheet);
                                    }}
                                    className="w-full bg-transparent px-1 py-0.5 rounded text-right font-mono focus:bg-white focus:ring-1 focus:ring-amber-500"
                                  />
                                </td>
                                <td className="p-1.5 border border-slate-300 text-right font-mono font-bold text-slate-900 bg-slate-50">
                                  {(item.kg || 0).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-1 border border-slate-300 text-left">
                                  <input
                                    type="text"
                                    value={item.remark || ''}
                                    onChange={(e) => {
                                      const updatedSheet = { ...pdfPreviewModal.sheet };
                                      updatedSheet.groups[gIdx].items[iIdx].remark = e.target.value;
                                      setPdfPreviewModal({ ...pdfPreviewModal, sheet: updatedSheet });
                                      if (activeSheet && activeSheet.id === updatedSheet.id) setActiveSheet(updatedSheet);
                                    }}
                                    className="w-full bg-transparent px-1 py-0.5 rounded text-slate-700 focus:bg-white focus:ring-1 focus:ring-amber-500"
                                  />
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900 text-white font-bold text-xs">
                          <td colSpan={7} className="p-2.5 border border-slate-800 text-right uppercase">
                            Grand Total Measured Weight:
                          </td>
                          <td className="p-2.5 border border-slate-800 text-right font-mono text-amber-300 text-sm">
                            {(pdfPreviewModal.sheet.currentQuantity || 0).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} KG
                          </td>
                          <td className="p-2.5 border border-slate-800 text-center font-mono text-emerald-300 text-xs">
                            ({(((pdfPreviewModal.sheet.currentQuantity || 0) / 1000).toFixed(3))} MT)
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Joint Site Verification Certification Statement */}
                  <div className="border border-slate-400 bg-slate-50 p-3 rounded mb-6 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900 mb-1">
                      Joint Inspection Certification & Site Declaration:
                    </p>
                    <p className="italic leading-relaxed text-[11px]">
                      Certified that the dimensions, item descriptions, quantities, and steel weights recorded in this measurement sheet have been jointly inspected, physically measured, and verified at site as per actual fabrication & erection execution without valuation or rates.
                    </p>
                  </div>

                  {/* 4 Joint Signatures Authority Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-400 text-center text-xs">
                    <div className="border-t border-dashed border-slate-400 pt-2">
                      <div className="font-bold text-slate-900">Site Engineer</div>
                      <div className="text-[10px] text-slate-500">Prepared By</div>
                    </div>
                    <div className="border-t border-dashed border-slate-400 pt-2">
                      <div className="font-bold text-slate-900">QC / QA Engineer</div>
                      <div className="text-[10px] text-slate-500">Checked By</div>
                    </div>
                    <div className="border-t border-dashed border-slate-400 pt-2">
                      <div className="font-bold text-slate-900">Contractor Representative</div>
                      <div className="text-[10px] text-slate-500">Joint Verified</div>
                    </div>
                    <div className="border-t border-dashed border-slate-400 pt-2">
                      <div className="font-bold text-slate-900">Client / PMC Engineer</div>
                      <div className="text-[10px] text-slate-500">Approved & Accepted</div>
                    </div>
                  </div>
                </div>
              ) : (
                /* PDF Engine Viewer */
                <div className="w-full h-full flex flex-col items-center">
                  <div className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-2 rounded-xl text-xs flex items-center justify-between mb-2">
                    <span>
                      Tip: If PDF does not display inside your mobile browser, click <strong>Download PDF</strong> or switch to <strong>Paper View</strong>.
                    </span>
                    <a
                      href={pdfPreviewData.blobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-bold text-amber-400 hover:text-white"
                    >
                      Open in New Tab
                    </a>
                  </div>
                  <iframe
                    src={pdfPreviewData.blobUrl}
                    className="w-full flex-1 rounded-xl border border-slate-800 bg-white"
                    title="Client Measurement Sheet PDF"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
              <span>Ready for Client Submission & Verification • Rates strictly omitted</span>
              <button
                type="button"
                onClick={() => setPdfPreviewModal(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
