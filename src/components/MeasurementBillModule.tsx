import React, { useState, useMemo } from 'react';
import {
  BillDeductions,
  BillStatus,
  Company,
  DynamicColumn,
  IDMRecord,
  ItemMaster,
  MeasurementBill,
  MeasurementGroup,
  MeasurementItem,
  MeasurementTemplate,
  MeasurementType,
  Project,
  User,
} from '../types';
import {
  calculateBillDeductions,
  calculateItemWeightAndMetrics,
  recalculateGroups,
  STEEL_DENSITY,
} from '../lib/billCalculations';
import {
  exportMeasurementBillToExcel,
  exportMeasurementBillToPdf,
  buildMeasurementBillPdf,
  PageFormat,
  PageOrientation,
} from '../lib/billExportUtils';
import { printJsPdfDocument } from '../lib/printUtils';
import {
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Copy,
  Trash2,
  Edit3,
  Columns,
  Layers,
  Calculator,
  Eye,
  FileCheck,
  ShieldCheck,
  Building,
  Calendar,
  DollarSign,
  Briefcase,
  Sliders,
  Sparkles,
  Printer,
  Download,
  X,
} from 'lucide-react';

interface MeasurementBillModuleProps {
  bills: MeasurementBill[];
  projects: Project[];
  companies: Company[];
  idmRecords: IDMRecord[];
  itemMaster: ItemMaster[];
  templates: MeasurementTemplate[];
  currentUser: User;
  onSaveBill: (bill: Partial<MeasurementBill>) => Promise<MeasurementBill>;
  onDeleteBill: (id: string) => Promise<boolean>;
  onOpenItemMaster?: () => void;
  onOpenTemplates?: () => void;
}

export const MeasurementBillModule: React.FC<MeasurementBillModuleProps> = ({
  bills,
  projects,
  companies,
  idmRecords,
  itemMaster,
  templates,
  currentUser,
  onSaveBill,
  onDeleteBill,
}) => {
  // Navigation inside module: 'list' | 'wizard' | 'view'
  const [viewMode, setViewMode] = useState<'list' | 'wizard' | 'view'>('list');
  const [selectedBill, setSelectedBill] = useState<MeasurementBill | null>(null);

  // Filters for register table
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // PDF Export Modal
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [billToExport, setBillToExport] = useState<MeasurementBill | null>(null);
  const [pdfFormat, setPdfFormat] = useState<PageFormat>('a4');
  const [pdfOrientation, setPdfOrientation] = useState<PageOrientation | 'auto'>('auto');

  // Live PDF preview state for print/download inspection
  const pdfPreviewData = useMemo(() => {
    if (!exportModalOpen || !billToExport) return null;
    const comp = companies.find((c) => c.id === billToExport.companyId);
    return buildMeasurementBillPdf(billToExport, {
      format: pdfFormat,
      orientation: pdfOrientation,
      company: comp,
    });
  }, [exportModalOpen, billToExport, pdfFormat, pdfOrientation, companies]);

  // Column Builder Modal
  const [columnBuilderOpen, setColumnBuilderOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<DynamicColumn['type']>('Text');
  const [newColumnFormula, setNewColumnFormula] = useState('');

  // Delete Confirmation Modal State
  const [deleteConfirmBillId, setDeleteConfirmBillId] = useState<string | null>(null);
  const [isDeletingBill, setIsDeletingBill] = useState(false);

  // Step 5 Row Edit Modal State
  const [editingRowItem, setEditingRowItem] = useState<{
    groupIndex: number;
    itemIndex: number;
    item: MeasurementItem;
  } | null>(null);

  // Step 5 Row Preview Breakdown Modal State
  const [previewRowItem, setPreviewRowItem] = useState<MeasurementItem | null>(null);

  // Step 5 Live Measurement Sheet Preview State
  const [previewMeasurementsOpen, setPreviewMeasurementsOpen] = useState(false);

  // -------------------------------------------------------------
  // WIZARD STATE (9 Steps)
  // -------------------------------------------------------------
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardBill, setWizardBill] = useState<Partial<MeasurementBill>>({
    billType: 'Measurement Bill',
    billDate: new Date().toISOString().slice(0, 10),
    measurementDate: new Date().toISOString().slice(0, 10),
    workPeriodFrom: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
    workPeriodTo: new Date().toISOString().slice(0, 10),
    groups: [],
    linkedIdmNos: [],
    status: 'Draft',
    preparedBy: currentUser.name,
    deductions: {
      subtotal: 0,
      gstRate: 18,
      gstAmount: 0,
      otherCharges: 0,
      grossBill: 0,
      tdsRate: 2,
      tdsAmount: 0,
      retentionRate: 5,
      retentionAmount: 0,
      advanceRecovery: 0,
      materialRecovery: 0,
      otherDeduction: 0,
      totalDeduction: 0,
      netBill: 0,
      amountReceived: 0,
      balanceAmount: 0,
    },
  });

  // Selected template in Step 4
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tmpl-1');

  // Active Group in Step 5
  const [activeGroupIndex, setActiveGroupIndex] = useState<number>(0);

  // Filtered bills for register
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchSearch =
        searchQuery === '' ||
        b.billNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.workOrderNo && b.workOrderNo.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchCompany = companyFilter === 'all' || b.companyId === companyFilter;
      const matchProject = projectFilter === 'all' || b.projectId === projectFilter;

      return matchSearch && matchStatus && matchCompany && matchProject;
    });
  }, [bills, searchQuery, statusFilter, companyFilter, projectFilter]);

  // Start creating new bill with Wizard
  const handleStartNewBill = () => {
    const defaultProj = projects[0];
    const defaultComp = companies.find((c) => c.id === defaultProj?.companyId) || companies[0];

    const initialGroup: MeasurementGroup = {
      id: `grp-${Date.now()}`,
      groupName: 'Main Fabrication & Erection Scope',
      area: 'Area 1',
      location: 'Grid A-1 to A-10',
      items: [
        {
          id: `item-${Date.now()}`,
          slNo: 1,
          descriptionItem: 'Heavy Beam ISMB 300 Column Member',
          measurementType: 'Structural Section',
          length: 12000,
          quantity: 10,
          unit: 'KG',
          unitWeight: 44.2,
          kg: 5304,
          mtr: 120,
          rate: 68,
          amount: 360672,
          remark: 'Layout Grid A1-A5',
        },
      ],
      groupTotalKg: 5304,
      groupTotalAmount: 360672,
    };

    setWizardBill({
      billNo: `SR/MB/${new Date().getFullYear()}/${String(bills.length + 1).padStart(3, '0')}`,
      billType: 'Measurement Bill',
      billDate: new Date().toISOString().slice(0, 10),
      measurementDate: new Date().toISOString().slice(0, 10),
      workPeriodFrom: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
      workPeriodTo: new Date().toISOString().slice(0, 10),
      companyId: defaultComp?.id || '',
      companyName: defaultComp?.name || '',
      projectId: defaultProj?.projectId || '',
      projectName: defaultProj?.projectName || '',
      client: defaultProj?.client || defaultProj?.clientName || '',
      site: defaultProj?.site || '',
      contractQuantity: 50000,
      previousQuantity: 0,
      currentQuantity: 5304,
      cumulativeQuantity: 5304,
      groups: [initialGroup],
      linkedIdmNos: [],
      status: 'Draft',
      preparedBy: currentUser.name,
      checkedBy: 'Billing Incharge',
      verifiedBy: 'Client Quality Lead',
      approvedBy: 'Managing Director',
      deductions: calculateBillDeductions(360672, {
        gstRate: 18,
        tdsRate: 2,
        retentionRate: 5,
      }),
    });

    setWizardStep(1);
    setViewMode('wizard');
  };

  // Start Copy Previous Bill
  const handleCopyBill = (sourceBill: MeasurementBill) => {
    const newBillNo = `SR/MB/${new Date().getFullYear()}/${String(bills.length + 1).padStart(3, '0')}-COPY`;
    
    // Deep clone groups and items to ensure original bill is completely unchanged
    const clonedGroups: MeasurementGroup[] = JSON.parse(JSON.stringify(sourceBill.groups)).map((g: MeasurementGroup) => ({
      ...g,
      id: `grp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      items: g.items.map((it: MeasurementItem, idx: number) => ({
        ...it,
        id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      })),
    }));

    setWizardBill({
      ...JSON.parse(JSON.stringify(sourceBill)),
      id: undefined,
      billNo: newBillNo,
      billDate: new Date().toISOString().slice(0, 10),
      measurementDate: new Date().toISOString().slice(0, 10),
      status: 'Draft',
      statusHistory: [],
      revisions: [],
      payments: [],
      preparedBy: currentUser.name,
      previousQuantity: sourceBill.cumulativeQuantity, // automatically becomes previous
      currentQuantity: 0,
      cumulativeQuantity: sourceBill.cumulativeQuantity,
      groups: clonedGroups,
      deductions: {
        ...sourceBill.deductions,
        amountReceived: 0,
        balanceAmount: sourceBill.deductions.netBill,
      },
    });

    setWizardStep(1);
    setViewMode('wizard');
  };

  // Open existing bill for editing in Wizard (defaulting to Step 5: Measurements Entry)
  const handleEditBill = (billToEdit: MeasurementBill, step: number = 5) => {
    setWizardBill(JSON.parse(JSON.stringify(billToEdit)));
    setWizardStep(step);
    setActiveGroupIndex(0);
    setViewMode('wizard');
  };

  // When Project ID changes, auto-populate all project details
  const handleProjectSelect = (projId: string) => {
    const proj = projects.find((p) => p.projectId === projId || p.id === projId);
    if (proj) {
      const comp = companies.find((c) => c.id === proj.companyId);
      setWizardBill((prev) => ({
        ...prev,
        projectId: proj.projectId,
        projectName: proj.projectName,
        companyId: proj.companyId,
        companyName: comp?.name || prev.companyName,
        client: proj.client || proj.clientName || prev.client,
        site: proj.site || prev.site,
        contractQuantity: prev.contractQuantity || 50000,
      }));
    }
  };

  // Group Management in Wizard
  const handleAddGroup = () => {
    const newGroup: MeasurementGroup = {
      id: `grp-${Date.now()}`,
      groupName: `Section / Front ${((wizardBill.groups || []).length + 1)}`,
      area: 'New Area',
      items: [],
      groupTotalKg: 0,
      groupTotalAmount: 0,
    };
    const updated = [...(wizardBill.groups || []), newGroup];
    setWizardBill((prev) => ({ ...prev, groups: updated }));
    setActiveGroupIndex(updated.length - 1);
  };

  const handleDeleteGroup = (gIdx: number) => {
    const updated = (wizardBill.groups || []).filter((_, idx) => idx !== gIdx);
    const recalculated = recalculateGroups(updated);
    setWizardBill((prev) => ({
      ...prev,
      groups: recalculated.updatedGroups,
      currentQuantity: recalculated.grandTotalKg,
      cumulativeQuantity: (prev.previousQuantity || 0) + recalculated.grandTotalKg,
      deductions: calculateBillDeductions(recalculated.grandTotalAmount, prev.deductions),
    }));
    setActiveGroupIndex(Math.max(0, gIdx - 1));
  };

  // Item Management in Active Group
  const handleAddItemToActiveGroup = (measurementType: MeasurementType = 'Plate') => {
    const groups = [...(wizardBill.groups || [])];
    const grp = groups[activeGroupIndex];
    if (!grp) return;

    const newItem: MeasurementItem = {
      id: `item-${Date.now()}`,
      slNo: grp.items.length + 1,
      descriptionItem: 'New Item Description',
      measurementType,
      quantity: 1,
      unit: 'KG',
      rate: 70,
      amount: 0,
      length: 1000,
      width: 500,
      thickness: 10,
    };

    const metrics = calculateItemWeightAndMetrics(newItem);
    newItem.kg = metrics.calculatedKg;
    newItem.amount = metrics.amount;

    grp.items.push(newItem);
    const recalculated = recalculateGroups(groups);

    setWizardBill((prev) => ({
      ...prev,
      groups: recalculated.updatedGroups,
      currentQuantity: recalculated.grandTotalKg,
      cumulativeQuantity: (prev.previousQuantity || 0) + recalculated.grandTotalKg,
      deductions: calculateBillDeductions(recalculated.grandTotalAmount, prev.deductions),
    }));
  };

  const handleUpdateItem = (itemIdx: number, changes: Partial<MeasurementItem>) => {
    const groups = [...(wizardBill.groups || [])];
    const grp = groups[activeGroupIndex];
    if (!grp || !grp.items[itemIdx]) return;

    const updatedItem = { ...grp.items[itemIdx], ...changes };
    const metrics = calculateItemWeightAndMetrics(updatedItem);

    updatedItem.kg = updatedItem.isManualKgOverride && updatedItem.manualKgValue !== undefined
      ? updatedItem.manualKgValue
      : metrics.calculatedKg;
    updatedItem.amount = metrics.amount;
    updatedItem.mtr = metrics.mtr;
    updatedItem.sqm = metrics.sqm;
    updatedItem.sqft = metrics.sqft;

    grp.items[itemIdx] = updatedItem;
    const recalculated = recalculateGroups(groups);

    setWizardBill((prev) => ({
      ...prev,
      groups: recalculated.updatedGroups,
      currentQuantity: recalculated.grandTotalKg,
      cumulativeQuantity: (prev.previousQuantity || 0) + recalculated.grandTotalKg,
      deductions: calculateBillDeductions(recalculated.grandTotalAmount, prev.deductions),
    }));
  };

  const handleDeleteItem = (itemIdx: number) => {
    const groups = [...(wizardBill.groups || [])];
    const grp = groups[activeGroupIndex];
    if (!grp) return;

    grp.items = grp.items.filter((_, idx) => idx !== itemIdx);
    const recalculated = recalculateGroups(groups);

    setWizardBill((prev) => ({
      ...prev,
      groups: recalculated.updatedGroups,
      currentQuantity: recalculated.grandTotalKg,
      cumulativeQuantity: (prev.previousQuantity || 0) + recalculated.grandTotalKg,
      deductions: calculateBillDeductions(recalculated.grandTotalAmount, prev.deductions),
    }));
  };

  const handleDuplicateItem = (itemIdx: number) => {
    const groups = [...(wizardBill.groups || [])];
    const grp = groups[activeGroupIndex];
    if (!grp || !grp.items[itemIdx]) return;

    const source = grp.items[itemIdx];
    const duplicate: MeasurementItem = {
      ...source,
      id: `item-${Date.now()}`,
      descriptionItem: `${source.descriptionItem} (Copy)`,
    };

    grp.items.splice(itemIdx + 1, 0, duplicate);
    const recalculated = recalculateGroups(groups);

    setWizardBill((prev) => ({
      ...prev,
      groups: recalculated.updatedGroups,
      currentQuantity: recalculated.grandTotalKg,
      cumulativeQuantity: (prev.previousQuantity || 0) + recalculated.grandTotalKg,
      deductions: calculateBillDeductions(recalculated.grandTotalAmount, prev.deductions),
    }));
  };

  // Save bill from Wizard
  const handleSaveWizardBill = async (statusOverride?: BillStatus) => {
    const finalBillData: Partial<MeasurementBill> = {
      ...wizardBill,
      status: statusOverride || wizardBill.status || 'Draft',
      updatedAt: new Date().toISOString(),
    };

    if (!finalBillData.id) {
      finalBillData.createdAt = new Date().toISOString();
      finalBillData.statusHistory = [
        {
          id: `sh-${Date.now()}`,
          status: finalBillData.status as BillStatus,
          changedBy: currentUser.name,
          timestamp: new Date().toISOString(),
          remarks: 'Bill created and saved',
        },
      ];
    }

    const saved = await onSaveBill(finalBillData);
    setSelectedBill(saved);
    setViewMode('view');
  };

  // Status Change handler
  const handleStatusChange = async (bill: MeasurementBill, newStatus: BillStatus) => {
    const updated: MeasurementBill = {
      ...bill,
      status: newStatus,
      statusHistory: [
        ...(bill.statusHistory || []),
        {
          id: `sh-${Date.now()}`,
          status: newStatus,
          changedBy: currentUser.name,
          timestamp: new Date().toISOString(),
          remarks: `Status updated to ${newStatus}`,
        },
      ],
    };
    const saved = await onSaveBill(updated);
    if (selectedBill?.id === saved.id) {
      setSelectedBill(saved);
    }
  };

  // Real-time inline edit handler for View Mode (Preview Screen)
  const handleUpdateViewBillItem = async (
    groupIndex: number,
    itemIndex: number,
    changes: Partial<MeasurementItem>
  ) => {
    if (!selectedBill) return;
    const updatedGroups = selectedBill.groups.map((grp, gIdx) => {
      if (gIdx !== groupIndex) return grp;
      const updatedItems = grp.items.map((it, iIdx) => {
        if (iIdx !== itemIndex) return it;
        const updatedItem = { ...it, ...changes };
        const metrics = calculateItemWeightAndMetrics(updatedItem);
        return {
          ...updatedItem,
          kg: updatedItem.isManualKgOverride && updatedItem.manualKgValue !== undefined
            ? updatedItem.manualKgValue
            : metrics.calculatedKg,
          amount: metrics.amount,
          mtr: metrics.mtr,
          sqm: metrics.sqm,
          sqft: metrics.sqft,
        };
      });
      return {
        ...grp,
        items: updatedItems,
        groupTotalKg: Math.round(updatedItems.reduce((sum, item) => sum + (item.kg || 0), 0) * 100) / 100,
        groupTotalAmount: Math.round(updatedItems.reduce((sum, item) => sum + (item.amount || 0), 0) * 100) / 100,
      };
    });

    const recalculated = recalculateGroups(updatedGroups);
    const updatedBill: MeasurementBill = {
      ...selectedBill,
      groups: recalculated.updatedGroups,
      currentQuantity: recalculated.grandTotalKg,
      cumulativeQuantity: (selectedBill.previousQuantity || 0) + recalculated.grandTotalKg,
      deductions: calculateBillDeductions(recalculated.grandTotalAmount, selectedBill.deductions),
      updatedAt: new Date().toISOString(),
    };

    setSelectedBill(updatedBill);
    await onSaveBill(updatedBill);
  };

  // Add row directly from View Mode (Preview)
  const handleAddViewBillItem = async (groupIndex: number) => {
    if (!selectedBill) return;
    const grp = selectedBill.groups[groupIndex];
    if (!grp) return;

    const newItem: MeasurementItem = {
      id: `item-${Date.now()}`,
      slNo: grp.items.length + 1,
      descriptionItem: 'New Item Description',
      measurementType: 'Plate',
      quantity: 1,
      unit: 'KG',
      rate: 70,
      amount: 0,
      length: 1000,
      width: 500,
      thickness: 10,
    };
    const metrics = calculateItemWeightAndMetrics(newItem);
    newItem.kg = metrics.calculatedKg;
    newItem.amount = metrics.amount;

    const updatedGroups = selectedBill.groups.map((g, idx) => {
      if (idx !== groupIndex) return g;
      const items = [...g.items, newItem];
      return {
        ...g,
        items,
        groupTotalKg: Math.round(items.reduce((sum, item) => sum + (item.kg || 0), 0) * 100) / 100,
        groupTotalAmount: Math.round(items.reduce((sum, item) => sum + (item.amount || 0), 0) * 100) / 100,
      };
    });

    const recalculated = recalculateGroups(updatedGroups);
    const updatedBill: MeasurementBill = {
      ...selectedBill,
      groups: recalculated.updatedGroups,
      currentQuantity: recalculated.grandTotalKg,
      cumulativeQuantity: (selectedBill.previousQuantity || 0) + recalculated.grandTotalKg,
      deductions: calculateBillDeductions(recalculated.grandTotalAmount, selectedBill.deductions),
      updatedAt: new Date().toISOString(),
    };

    setSelectedBill(updatedBill);
    await onSaveBill(updatedBill);
  };

  // Delete row directly from View Mode (Preview)
  const handleDeleteViewBillItem = async (groupIndex: number, itemIndex: number) => {
    if (!selectedBill) return;
    const updatedGroups = selectedBill.groups.map((g, idx) => {
      if (idx !== groupIndex) return g;
      const items = g.items.filter((_, i) => i !== itemIndex);
      return {
        ...g,
        items,
        groupTotalKg: Math.round(items.reduce((sum, item) => sum + (item.kg || 0), 0) * 100) / 100,
        groupTotalAmount: Math.round(items.reduce((sum, item) => sum + (item.amount || 0), 0) * 100) / 100,
      };
    });

    const recalculated = recalculateGroups(updatedGroups);
    const updatedBill: MeasurementBill = {
      ...selectedBill,
      groups: recalculated.updatedGroups,
      currentQuantity: recalculated.grandTotalKg,
      cumulativeQuantity: (selectedBill.previousQuantity || 0) + recalculated.grandTotalKg,
      deductions: calculateBillDeductions(recalculated.grandTotalAmount, selectedBill.deductions),
      updatedAt: new Date().toISOString(),
    };

    setSelectedBill(updatedBill);
    await onSaveBill(updatedBill);
  };

  // Status Badge Component
  const getStatusBadge = (status: BillStatus) => {
    switch (status) {
      case 'Approved':
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      case 'Partially Paid':
      case 'Submitted':
      case 'Under Verification':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      case 'Rejected':
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-300 border border-slate-600">
            <FileText className="w-3.5 h-3.5" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/40 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  MEASUREMENT & MUSTER BILL SYSTEM
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                    Major Module
                  </span>
                </h1>
                <p className="text-sm text-slate-400">
                  Precision weight formulas, dynamic columns, multi-group structures, GST/TDS deductions & A4/A3 export
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {viewMode !== 'list' && (
              <button
                onClick={() => setViewMode('list')}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm flex items-center gap-2"
              >
                <Layers className="w-4 h-4" />
                Bill Register
              </button>
            )}

            <button
              onClick={handleStartNewBill}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Measurement Bill (Wizard)
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. REGISTER LIST VIEW */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Bill No, Project, WO..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.projectId}>{p.projectName}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Verification">Under Verification</option>
                <option value="Approved">Approved</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Bills Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Bill No & Type</th>
                    <th className="py-3.5 px-4">Project & Client</th>
                    <th className="py-3.5 px-4">Date & IDM</th>
                    <th className="py-3.5 px-4 text-right">Measured Qty</th>
                    <th className="py-3.5 px-4 text-right">Gross Bill</th>
                    <th className="py-3.5 px-4 text-right">Deductions</th>
                    <th className="py-3.5 px-4 text-right">Net Bill</th>
                    <th className="py-3.5 px-4 text-right">Balance</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        No measurement bills found. Click &quot;New Measurement Bill&quot; to build one.
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((b) => (
                      <tr
                        key={b.id}
                        className="hover:bg-slate-800/40 transition group cursor-pointer"
                        onClick={() => {
                          setSelectedBill(b);
                          setViewMode('view');
                        }}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-white group-hover:text-amber-400 transition">
                            {b.billNo}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">
                            {b.billType}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-200 line-clamp-1">
                            {b.projectName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {b.client} • {b.companyName}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-slate-300 font-mono">{b.billDate}</div>
                          <div className="text-[10px] text-amber-400/90 font-mono">
                            {b.linkedIdmNos && b.linkedIdmNos.length > 0
                              ? b.linkedIdmNos.join(', ')
                              : 'No IDM'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-200">
                          {(b.currentQuantity || 0).toLocaleString('en-IN')} KG
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-200">
                          ₹{(b.deductions?.grossBill || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-rose-400">
                          -₹{(b.deductions?.totalDeduction || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                          ₹{(b.deductions?.netBill || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-amber-300">
                          ₹{(b.deductions?.balanceAmount || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {getStatusBadge(b.status)}
                        </td>

                        <td
                          className="py-3.5 px-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <button
                              title="Preview Bill"
                              onClick={() => {
                                setSelectedBill(b);
                                setViewMode('view');
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              title="Edit Bill & Measurements"
                              onClick={() => handleEditBill(b)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              title="Direct Print Bill"
                              onClick={() => {
                                const comp = companies.find((c) => c.id === b.companyId);
                                exportMeasurementBillToPdf(b, {
                                  action: 'print',
                                  company: comp,
                                });
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            <button
                              title="Export PDF"
                              onClick={() => {
                                setBillToExport(b);
                                setExportModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            <button
                              title="Export Excel"
                              onClick={() => exportMeasurementBillToExcel(b)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </button>

                            <button
                              title="Copy Previous Bill"
                              onClick={() => handleCopyBill(b)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            <button
                              title="Delete Bill"
                              onClick={() => setDeleteConfirmBillId(b.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. 9-STEP BILL WIZARD */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'wizard' && (
        <div className="space-y-6">
          {/* Step Indicator Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between overflow-x-auto gap-2 pb-1">
              {[
                { step: 1, title: '1. Project & Header' },
                { step: 2, title: '2. IDM & Clearances' },
                { step: 3, title: '3. Groups & Areas' },
                { step: 4, title: '4. Templates' },
                { step: 5, title: '5. Measurements Entry' },
                { step: 6, title: '6. Cumulative Check' },
                { step: 7, title: '7. Deductions & GST' },
                { step: 8, title: '8. Preview Sheet' },
                { step: 9, title: '9. Save & PDF' },
              ].map((s) => (
                <button
                  key={s.step}
                  onClick={() => setWizardStep(s.step)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    wizardStep === s.step
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : wizardStep > s.step
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {wizardStep > s.step && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          {/* WIZARD STEP CONTENTS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            {/* STEP 1: Project & Bill Information */}
            {wizardStep === 1 && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Building className="w-5 h-5 text-amber-400" />
                    Step 1 – Project & Bill Information
                  </h3>
                  <span className="text-xs text-amber-400 font-semibold">* Project ID is mandatory</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Project Selection (MANDATORY) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Project ID * (Auto loads client & site)
                    </label>
                    <select
                      value={wizardBill.projectId || ''}
                      onChange={(e) => handleProjectSelect(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                    >
                      <option value="">-- Select Mandatory Project ID --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.projectId}>
                          {p.projectId} - {p.projectName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Company Entity
                    </label>
                    <select
                      value={wizardBill.companyId || ''}
                      onChange={(e) => {
                        const comp = companies.find((c) => c.id === e.target.value);
                        setWizardBill((prev) => ({
                          ...prev,
                          companyId: e.target.value,
                          companyName: comp?.name || prev.companyName,
                        }));
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bill Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Bill Type
                    </label>
                    <select
                      value={wizardBill.billType || 'Measurement Bill'}
                      onChange={(e) => setWizardBill((prev) => ({ ...prev, billType: e.target.value as any }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Measurement Bill">Measurement Bill (RA Bill)</option>
                      <option value="Labour Muster Bill">Labour Muster Bill</option>
                      <option value="Final Bill">Final Bill</option>
                      <option value="Advance Bill">Advance Bill</option>
                    </select>
                  </div>

                  {/* Bill Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Bill Number *
                    </label>
                    <input
                      type="text"
                      value={wizardBill.billNo || ''}
                      onChange={(e) => setWizardBill((prev) => ({ ...prev, billNo: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Client */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Client Name</label>
                    <input
                      type="text"
                      value={wizardBill.client || ''}
                      onChange={(e) => setWizardBill((prev) => ({ ...prev, client: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Site */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Site / Plant</label>
                    <input
                      type="text"
                      value={wizardBill.site || ''}
                      onChange={(e) => setWizardBill((prev) => ({ ...prev, site: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Work Order No */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Work Order No.</label>
                    <input
                      type="text"
                      value={wizardBill.workOrderNo || ''}
                      onChange={(e) => setWizardBill((prev) => ({ ...prev, workOrderNo: e.target.value }))}
                      placeholder="WO-2025-XXXX"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* PO No */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">PO Number</label>
                    <input
                      type="text"
                      value={wizardBill.poNo || ''}
                      onChange={(e) => setWizardBill((prev) => ({ ...prev, poNo: e.target.value }))}
                      placeholder="PO-4500XXXX"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Contract No */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Contract No</label>
                    <input
                      type="text"
                      value={wizardBill.contractNo || ''}
                      onChange={(e) => setWizardBill((prev) => ({ ...prev, contractNo: e.target.value }))}
                      placeholder="CNT-INFRA-XXXX"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Bill Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Bill Date</label>
                    <input
                      type="date"
                      value={wizardBill.billDate || ''}
                      onChange={(e) => setWizardBill((prev) => ({ ...prev, billDate: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Measurement Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Measurement Date</label>
                    <input
                      type="date"
                      value={wizardBill.measurementDate || ''}
                      onChange={(e) => setWizardBill((prev) => ({ ...prev, measurementDate: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Department / Area */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Department / Division</label>
                    <input
                      type="text"
                      value={wizardBill.department || ''}
                      onChange={(e) => setWizardBill((prev) => ({ ...prev, department: e.target.value }))}
                      placeholder="Civil & Structural"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: IDM & Clearances */}
            {wizardStep === 2 && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-amber-400" />
                    Step 2 – IDM (Inspection & Dispatch Muster) Information
                  </h3>
                  <span className="text-xs text-slate-400">Link verified IDM inspection clearances</span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Available Project IDMs
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {idmRecords.map((rec) => {
                      const isLinked = (wizardBill.linkedIdmNos || []).includes(rec.idmNo);
                      return (
                        <div
                          key={rec.id}
                          onClick={() => {
                            const current = wizardBill.linkedIdmNos || [];
                            const updated = isLinked
                              ? current.filter((x) => x !== rec.idmNo)
                              : [...current, rec.idmNo];
                            setWizardBill((prev) => ({ ...prev, linkedIdmNos: updated }));
                          }}
                          className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start justify-between ${
                            isLinked
                              ? 'bg-amber-500/10 border-amber-500/40 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="font-mono font-bold text-sm flex items-center gap-2">
                              {rec.idmNo}
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-sans">
                                {rec.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">{rec.description}</div>
                            <div className="text-[11px] text-slate-500 mt-1 font-mono">
                              Date: {rec.idmDate} • Ref: {rec.idmReference}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-amber-400">
                              {rec.quantity} {rec.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Direct IDM Entry */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Linked IDM Numbers (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={(wizardBill.linkedIdmNos || []).join(', ')}
                      onChange={(e) =>
                        setWizardBill((prev) => ({
                          ...prev,
                          linkedIdmNos: e.target.value.split(',').map((x) => x.trim()).filter(Boolean),
                        }))
                      }
                      placeholder="IDM-2026-001, IDM-2026-002"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Remarks / Quality Inspector Sign-off
                    </label>
                    <input
                      type="text"
                      value={wizardBill.remarks || ''}
                      onChange={(e) => setWizardBill((prev) => ({ ...prev, remarks: e.target.value }))}
                      placeholder="e.g. 100% Visual & DPT Clearances Received"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Work Area / Location / Groups */}
            {wizardStep === 3 && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-amber-400" />
                      Step 3 – Measurement Groups & Work Areas
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Break down bill by Area, Elevation, Building, Floor, Machine or Grid
                    </p>
                  </div>
                  <button
                    onClick={handleAddGroup}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Group
                  </button>
                </div>

                <div className="space-y-4">
                  {(wizardBill.groups || []).map((grp, gIdx) => (
                    <div
                      key={grp.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center">
                            {gIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={grp.groupName}
                            onChange={(e) => {
                              const updated = [...(wizardBill.groups || [])];
                              updated[gIdx].groupName = e.target.value;
                              setWizardBill((prev) => ({ ...prev, groups: updated }));
                            }}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-amber-500 w-64 md:w-96"
                          />
                        </div>
                        <button
                          onClick={() => handleDeleteGroup(gIdx)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                          title="Delete Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <label className="text-slate-400 block mb-1">Area / Work Front</label>
                          <input
                            type="text"
                            value={grp.area || ''}
                            onChange={(e) => {
                              const updated = [...(wizardBill.groups || [])];
                              updated[gIdx].area = e.target.value;
                              setWizardBill((prev) => ({ ...prev, groups: updated }));
                            }}
                            placeholder="Bay-4, Unit-101"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-1">Grid / Location</label>
                          <input
                            type="text"
                            value={grp.location || ''}
                            onChange={(e) => {
                              const updated = [...(wizardBill.groups || [])];
                              updated[gIdx].location = e.target.value;
                              setWizardBill((prev) => ({ ...prev, groups: updated }));
                            }}
                            placeholder="Grid A1 to A8"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-1">Elevation / Level</label>
                          <input
                            type="text"
                            value={grp.elevation || ''}
                            onChange={(e) => {
                              const updated = [...(wizardBill.groups || [])];
                              updated[gIdx].elevation = e.target.value;
                              setWizardBill((prev) => ({ ...prev, groups: updated }));
                            }}
                            placeholder="+12.500m"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-1">Machine / Equipment</label>
                          <input
                            type="text"
                            value={grp.machine || ''}
                            onChange={(e) => {
                              const updated = [...(wizardBill.groups || [])];
                              updated[gIdx].machine = e.target.value;
                              setWizardBill((prev) => ({ ...prev, groups: updated }));
                            }}
                            placeholder="Hydra 14T Crane"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: Measurement Template Selector */}
            {wizardStep === 4 && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-amber-400" />
                    Step 4 – Measurement Template & Dynamic Columns
                  </h3>
                  <span className="text-xs text-slate-400">Select pre-configured formulas & column presets</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {templates.map((tmpl) => {
                    const isSelected = selectedTemplateId === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => setSelectedTemplateId(tmpl.id)}
                        className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-sm text-white">{tmpl.name}</span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {tmpl.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2">{tmpl.description}</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                          <span>{tmpl.defaultColumns.length} Columns</span>
                          <span className="text-amber-400 font-semibold">{tmpl.measurementType}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 5: Measurements Entry (Core Table) */}
            {wizardStep === 5 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-amber-400" />
                      Step 5 – Measurement Entry Table
                    </h3>
                    <p className="text-xs text-slate-400">
                      Enter dimensions, quantities, rates and inspect automatic KG calculations
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Switch Group tabs */}
                    <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                      {(wizardBill.groups || []).map((grp, idx) => (
                        <button
                          key={grp.id}
                          onClick={() => setActiveGroupIndex(idx)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                            activeGroupIndex === idx
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Grp {idx + 1}: {grp.groupName.slice(0, 16)}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setColumnBuilderOpen(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
                    >
                      <Columns className="w-3.5 h-3.5" />
                      Dynamic Columns
                    </button>

                    <button
                      onClick={() => setPreviewMeasurementsOpen(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview Measurement Sheet
                    </button>

                    <button
                      onClick={() => handleAddItemToActiveGroup('Plate')}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Row
                    </button>
                  </div>
                </div>

                {/* Quick Add By Measurement Type */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs text-slate-400 font-semibold">Add Type:</span>
                  {(
                    [
                      'Plate',
                      'Structural Section',
                      'TMT',
                      'Pipe',
                      'Square Tube',
                      'Labour Muster',
                      'Custom',
                    ] as MeasurementType[]
                  ).map((mType) => (
                    <button
                      key={mType}
                      onClick={() => handleAddItemToActiveGroup(mType)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition whitespace-nowrap"
                    >
                      + {mType}
                    </button>
                  ))}
                </div>

                {/* Measurement Rows Table */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto shadow-inner">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-3 px-2 text-center w-10">#</th>
                        <th className="py-3 px-3 min-w-[200px]">Item Description</th>
                        <th className="py-3 px-2 w-20 text-center">Thk (mm)</th>
                        <th className="py-3 px-2 w-24 text-center">Length (mm/m)</th>
                        <th className="py-3 px-2 w-20 text-center">Width (mm)</th>
                        <th className="py-3 px-2 w-16 text-center">Qty</th>
                        <th className="py-3 px-2 w-20 text-center">Unit</th>
                        <th className="py-3 px-2 w-24 text-center">Unit Wt</th>
                        <th className="py-3 px-3 min-w-[120px] text-right">Calculated KG</th>
                        <th className="py-3 px-2 w-20 text-right">Rate (₹)</th>
                        <th className="py-3 px-3 min-w-[110px] text-right">Amount (₹)</th>
                        <th className="py-3 px-3 min-w-[130px]">Remark</th>
                        <th className="py-3 px-2 text-center w-28">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {((wizardBill.groups || [])[activeGroupIndex]?.items || []).length === 0 ? (
                        <tr>
                          <td colSpan={13} className="py-8 text-center text-slate-400">
                            No measurement rows in this group yet. Click &quot;Add Row&quot; above.
                          </td>
                        </tr>
                      ) : (
                        ((wizardBill.groups || [])[activeGroupIndex]?.items || []).map((it, itemIdx) => (
                          <tr key={it.id} className="hover:bg-slate-900/50 transition">
                            <td className="py-2.5 px-2 text-center font-mono text-slate-400">
                              {itemIdx + 1}
                            </td>

                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={it.descriptionItem}
                                onChange={(e) => handleUpdateItem(itemIdx, { descriptionItem: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-500"
                              />
                            </td>

                            {/* Thickness */}
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                value={it.thickness || ''}
                                onChange={(e) => handleUpdateItem(itemIdx, { thickness: parseFloat(e.target.value) || 0 })}
                                placeholder="mm"
                                className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-1 text-center text-white"
                              />
                            </td>

                            {/* Length */}
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                value={it.length || ''}
                                onChange={(e) => handleUpdateItem(itemIdx, { length: parseFloat(e.target.value) || 0 })}
                                placeholder="L"
                                className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-1 text-center text-white font-mono"
                              />
                            </td>

                            {/* Width */}
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                value={it.width || ''}
                                onChange={(e) => handleUpdateItem(itemIdx, { width: parseFloat(e.target.value) || 0 })}
                                placeholder="W"
                                className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-1 text-center text-white"
                              />
                            </td>

                            {/* Quantity */}
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                value={it.quantity}
                                onChange={(e) => handleUpdateItem(itemIdx, { quantity: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-1 text-center text-white font-bold"
                              />
                            </td>

                            {/* Unit */}
                            <td className="py-2.5 px-2 text-center">
                              <select
                                value={it.unit || 'KG'}
                                onChange={(e) => handleUpdateItem(itemIdx, { unit: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-1 text-center text-slate-300 text-[11px]"
                              >
                                <option value="KG">KG</option>
                                <option value="MT">MT</option>
                                <option value="MTR">MTR</option>
                                <option value="SQM">SQM</option>
                                <option value="SQFT">SQFT</option>
                                <option value="NOS">NOS</option>
                                <option value="DAYS">DAYS</option>
                              </select>
                            </td>

                            {/* Unit Weight */}
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                step="0.01"
                                value={it.unitWeight || ''}
                                onChange={(e) => handleUpdateItem(itemIdx, { unitWeight: parseFloat(e.target.value) || 0 })}
                                placeholder="kg/m"
                                className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-1 text-center text-white"
                              />
                            </td>

                            {/* Calculated Weight with Manual Override Toggle */}
                            <td className="py-2.5 px-3 text-right">
                              {it.isManualKgOverride ? (
                                <div className="flex items-center gap-1 justify-end">
                                  <input
                                    type="number"
                                    value={it.manualKgValue || it.kg}
                                    onChange={(e) =>
                                      handleUpdateItem(itemIdx, { manualKgValue: parseFloat(e.target.value) || 0 })
                                    }
                                    className="w-20 bg-amber-500/20 border border-amber-500 text-amber-300 font-mono text-xs rounded px-1 py-0.5 text-right font-bold"
                                  />
                                  <button
                                    title="Disable Manual Override"
                                    onClick={() => handleUpdateItem(itemIdx, { isManualKgOverride: false })}
                                    className="text-[10px] font-bold text-amber-400 hover:text-white"
                                  >
                                    OVR
                                  </button>
                                </div>
                              ) : (
                                <div
                                  className="font-mono text-slate-200 cursor-pointer hover:text-amber-400 transition"
                                  title="Click to manually override KG"
                                  onClick={() =>
                                    handleUpdateItem(itemIdx, {
                                      isManualKgOverride: true,
                                      manualKgValue: it.kg,
                                    })
                                  }
                                >
                                  {(it.kg || 0).toLocaleString('en-IN')}
                                </div>
                              )}
                            </td>

                            {/* Rate */}
                            <td className="py-2.5 px-2 text-right">
                              <input
                                type="number"
                                value={it.rate}
                                onChange={(e) => handleUpdateItem(itemIdx, { rate: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-right text-white font-mono"
                              />
                            </td>

                            {/* Amount */}
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                              ₹{(it.amount || 0).toLocaleString('en-IN')}
                            </td>

                            {/* Remarks */}
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={it.remark || ''}
                                onChange={(e) => handleUpdateItem(itemIdx, { remark: e.target.value })}
                                placeholder="Grid/Drawing Ref"
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white"
                              />
                            </td>

                            {/* Actions */}
                            <td className="py-2.5 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setPreviewRowItem(it)}
                                  title="Preview Calculation Breakdown"
                                  className="p-1 text-slate-400 hover:text-blue-400 transition"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    setEditingRowItem({
                                      groupIndex: activeGroupIndex,
                                      itemIndex: itemIdx,
                                      item: { ...it },
                                    })
                                  }
                                  title="Edit Row Full Details"
                                  className="p-1 text-slate-400 hover:text-amber-400 transition"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDuplicateItem(itemIdx)}
                                  title="Duplicate Row"
                                  className="p-1 text-slate-400 hover:text-amber-400 transition"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(itemIdx)}
                                  title="Delete Row"
                                  className="p-1 text-slate-400 hover:text-rose-400 transition"
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

                {/* Group Summary Footer */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Active Group:{' '}
                    <span className="font-bold text-white">
                      {(wizardBill.groups || [])[activeGroupIndex]?.groupName}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm font-mono">
                    <div>
                      <span className="text-slate-400 text-xs mr-2">Group KG:</span>
                      <span className="font-bold text-white">
                        {((wizardBill.groups || [])[activeGroupIndex]?.groupTotalKg || 0).toLocaleString('en-IN')} KG
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs mr-2">Group Value:</span>
                      <span className="font-bold text-amber-400">
                        ₹{((wizardBill.groups || [])[activeGroupIndex]?.groupTotalAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: Cumulative Scope & Progress Check */}
            {wizardStep === 6 && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                    Step 6 – Previous, Current & Cumulative Scope Check
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cumulative = Previous + Current. Prevents duplicate billing and warns when exceeding contract scope.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Contract Quantity */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="text-xs text-slate-400 font-semibold block mb-1">Contract Scope Quantity (KG)</label>
                    <input
                      type="number"
                      value={wizardBill.contractQuantity || 50000}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const cum = wizardBill.cumulativeQuantity || 0;
                        setWizardBill((prev) => ({
                          ...prev,
                          contractQuantity: val,
                          balanceQuantity: val - cum,
                          completionPercentage: val > 0 ? Math.round((cum / val) * 10000) / 100 : 0,
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-lg font-mono font-bold text-white"
                    />
                  </div>

                  {/* Previous Quantity */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="text-xs text-slate-400 font-semibold block mb-1">Previous Billed Quantity (KG)</label>
                    <input
                      type="number"
                      value={wizardBill.previousQuantity || 0}
                      onChange={(e) => {
                        const prevVal = parseFloat(e.target.value) || 0;
                        const currVal = wizardBill.currentQuantity || 0;
                        const cum = prevVal + currVal;
                        const contract = wizardBill.contractQuantity || 50000;
                        setWizardBill((prev) => ({
                          ...prev,
                          previousQuantity: prevVal,
                          cumulativeQuantity: cum,
                          balanceQuantity: contract - cum,
                          completionPercentage: contract > 0 ? Math.round((cum / contract) * 10000) / 100 : 0,
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-lg font-mono font-bold text-slate-300"
                    />
                  </div>

                  {/* Current Quantity */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="text-xs text-slate-400 font-semibold block mb-1">Current Bill Quantity (KG)</label>
                    <div className="text-lg font-mono font-bold text-amber-400 p-2">
                      {(wizardBill.currentQuantity || 0).toLocaleString('en-IN')} KG
                    </div>
                  </div>
                </div>

                {/* Exceeded Warning */}
                {(wizardBill.cumulativeQuantity || 0) > (wizardBill.contractQuantity || 50000) && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-rose-300">Warning: Cumulative Quantity Exceeds Contract Scope!</h4>
                      <p className="text-xs text-rose-400 mt-1">
                        Cumulative billed weight is {(wizardBill.cumulativeQuantity || 0).toLocaleString('en-IN')} KG, which is greater than contract scope of {(wizardBill.contractQuantity || 0).toLocaleString('en-IN')} KG. Verify if an Amendment / Variation Order is issued before submitting.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 7: GST & Deductions */}
            {wizardStep === 7 && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-400" />
                    Step 7 – Deductions, GST & Net Payable Bill
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Gross Subtotal: ₹{(wizardBill.deductions?.subtotal || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Deduction Inputs */}
                  <div className="space-y-3.5 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Statutory Rates & Recoveries
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">GST Rate (%)</label>
                        <input
                          type="number"
                          value={wizardBill.deductions?.gstRate || 18}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const sub = wizardBill.deductions?.subtotal || 0;
                            setWizardBill((prev) => ({
                              ...prev,
                              deductions: calculateBillDeductions(sub, { ...prev.deductions, gstRate: val }),
                            }));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Other Charges / Freight (₹)</label>
                        <input
                          type="number"
                          value={wizardBill.deductions?.otherCharges || 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const sub = wizardBill.deductions?.subtotal || 0;
                            setWizardBill((prev) => ({
                              ...prev,
                              deductions: calculateBillDeductions(sub, { ...prev.deductions, otherCharges: val }),
                            }));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block mb-1">TDS Rate (%)</label>
                        <input
                          type="number"
                          value={wizardBill.deductions?.tdsRate || 2}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const sub = wizardBill.deductions?.subtotal || 0;
                            setWizardBill((prev) => ({
                              ...prev,
                              deductions: calculateBillDeductions(sub, { ...prev.deductions, tdsRate: val }),
                            }));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Retention (%)</label>
                        <input
                          type="number"
                          value={wizardBill.deductions?.retentionRate || 5}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const sub = wizardBill.deductions?.subtotal || 0;
                            setWizardBill((prev) => ({
                              ...prev,
                              deductions: calculateBillDeductions(sub, { ...prev.deductions, retentionRate: val }),
                            }));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Advance Recovery (₹)</label>
                        <input
                          type="number"
                          value={wizardBill.deductions?.advanceRecovery || 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const sub = wizardBill.deductions?.subtotal || 0;
                            setWizardBill((prev) => ({
                              ...prev,
                              deductions: calculateBillDeductions(sub, { ...prev.deductions, advanceRecovery: val }),
                            }));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Material Recovery (₹)</label>
                        <input
                          type="number"
                          value={wizardBill.deductions?.materialRecovery || 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const sub = wizardBill.deductions?.subtotal || 0;
                            setWizardBill((prev) => ({
                              ...prev,
                              deductions: calculateBillDeductions(sub, { ...prev.deductions, materialRecovery: val }),
                            }));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Net Calculation Card */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Financial Summary
                    </h4>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">Gross Subtotal</span>
                      <span className="font-mono text-white font-bold">
                        ₹{(wizardBill.deductions?.subtotal || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900 text-slate-300">
                      <span>Add: GST ({wizardBill.deductions?.gstRate}%)</span>
                      <span className="font-mono text-emerald-400">
                        + ₹{(wizardBill.deductions?.gstAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400 font-bold">Gross Bill Value</span>
                      <span className="font-mono text-white font-bold">
                        ₹{(wizardBill.deductions?.grossBill || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900 text-rose-400">
                      <span>Less: Total Deductions (TDS + Retention + Recovery)</span>
                      <span className="font-mono font-bold">
                        - ₹{(wizardBill.deductions?.totalDeduction || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 bg-slate-900/80 px-3 rounded-lg text-sm">
                      <span className="font-bold text-white">NET PAYABLE BILL</span>
                      <span className="font-mono font-black text-emerald-400">
                        ₹{(wizardBill.deductions?.netBill || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 8: Preview Sheet */}
            {wizardStep === 8 && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Eye className="w-5 h-5 text-amber-400" />
                      Step 8 – Final Measurement Sheet Preview
                    </h3>
                    <p className="text-xs text-slate-400">Verify all items, quantities and totals before final sign-off</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-lg text-emerald-400">
                      ₹{(wizardBill.deductions?.netBill || 0).toLocaleString('en-IN')}
                    </span>
                    <div className="text-[11px] text-slate-400">Net Payable Amount</div>
                  </div>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block">Bill No & Type</span>
                      <span className="font-mono font-bold text-white">{wizardBill.billNo}</span>
                      <div className="text-slate-400">{wizardBill.billType}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Project & Client</span>
                      <span className="font-semibold text-white">{wizardBill.projectName}</span>
                      <div className="text-slate-400">{wizardBill.client}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Work Order / PO</span>
                      <span className="font-mono text-white">{wizardBill.workOrderNo || 'N/A'}</span>
                      <div className="text-slate-400 font-mono">{wizardBill.poNo || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Dates</span>
                      <span className="text-white font-mono">M-Date: {wizardBill.measurementDate}</span>
                      <div className="text-slate-400 font-mono">Bill Date: {wizardBill.billDate}</div>
                    </div>
                  </div>

                  {/* Groups Table Preview */}
                  {(wizardBill.groups || []).map((grp, gIdx) => (
                    <div key={grp.id} className="border border-slate-800 rounded-lg overflow-hidden mt-4">
                      <div className="bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 flex justify-between">
                        <span>Group {gIdx + 1}: {grp.groupName}</span>
                        <span className="font-mono text-amber-400">
                          {grp.groupTotalKg?.toLocaleString('en-IN')} KG • ₹{grp.groupTotalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-2 overflow-x-auto text-xs">
                        <table className="w-full text-left">
                          <thead className="text-[10px] text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="p-1">#</th>
                              <th className="p-1">Description</th>
                              <th className="p-1">Type</th>
                              <th className="p-1 text-center">Qty</th>
                              <th className="p-1 text-right">KG</th>
                              <th className="p-1 text-right">Rate</th>
                              <th className="p-1 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40 font-mono">
                            {grp.items.map((it, idx) => (
                              <tr key={it.id}>
                                <td className="p-1 text-slate-500">{idx + 1}</td>
                                <td className="p-1 text-white font-sans">{it.descriptionItem}</td>
                                <td className="p-1 text-slate-400">{it.measurementType}</td>
                                <td className="p-1 text-center text-slate-200">{it.quantity}</td>
                                <td className="p-1 text-right text-slate-200">{it.kg?.toLocaleString('en-IN')}</td>
                                <td className="p-1 text-right text-slate-200">₹{it.rate}</td>
                                <td className="p-1 text-right text-emerald-400 font-bold">₹{it.amount.toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 9: Save & PDF Generation */}
            {wizardStep === 9 && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    Step 9 – Save, Submit & Export Measurement Bill
                  </h3>
                  <span className="text-xs text-emerald-400 font-bold">Ready to finalize</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Workflow & Approvals
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-slate-400 block mb-1">Prepared By</label>
                        <input
                          type="text"
                          value={wizardBill.preparedBy || ''}
                          onChange={(e) => setWizardBill((prev) => ({ ...prev, preparedBy: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Checked By</label>
                        <input
                          type="text"
                          value={wizardBill.checkedBy || ''}
                          onChange={(e) => setWizardBill((prev) => ({ ...prev, checkedBy: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Approved By</label>
                        <input
                          type="text"
                          value={wizardBill.approvedBy || ''}
                          onChange={(e) => setWizardBill((prev) => ({ ...prev, approvedBy: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Export & Print Options
                      </h4>
                      <p className="text-xs text-slate-400 mb-4">
                        Produce professional multi-group bills in A4 or A3 format with complete GST, deduction tables and company seal signatures.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={() => handleSaveWizardBill('Draft')}
                        className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition border border-slate-700 flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Save as Draft
                      </button>

                      <button
                        onClick={() => handleSaveWizardBill('Submitted')}
                        className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Submit for Verification & Approval
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons for Wizard */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-800 mt-6">
              <button
                disabled={wizardStep === 1}
                onClick={() => setWizardStep((prev) => Math.max(1, prev - 1))}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Back
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>

                {wizardStep < 9 ? (
                  <button
                    onClick={() => setWizardStep((prev) => Math.min(9, prev + 1))}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                  >
                    Next Step →
                  </button>
                ) : (
                  <button
                    onClick={() => handleSaveWizardBill('Submitted')}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Complete & Save Bill
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. DETAILED VIEW MODE */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'view' && selectedBill && (
        <div className="space-y-6">
          {/* Bill Action Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white font-mono">{selectedBill.billNo}</h2>
                {getStatusBadge(selectedBill.status)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedBill.projectName} • {selectedBill.client} • {selectedBill.billType}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Update Dropdown */}
              <select
                value={selectedBill.status}
                onChange={(e) => handleStatusChange(selectedBill, e.target.value as BillStatus)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              >
                <option value="Draft">Set Draft</option>
                <option value="Submitted">Submit Bill</option>
                <option value="Under Verification">Under Verification</option>
                <option value="Approved">Approve Bill</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Mark Paid</option>
                <option value="Rejected">Reject</option>
                <option value="Cancelled">Cancel</option>
              </select>

              <button
                onClick={() => handleEditBill(selectedBill)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <Edit3 className="w-4 h-4" />
                Edit Bill
              </button>

              <button
                onClick={() => {
                  const comp = companies.find((c) => c.id === selectedBill.companyId);
                  exportMeasurementBillToPdf(selectedBill, {
                    action: 'print',
                    company: comp,
                  });
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Printer className="w-4 h-4" />
                Direct Print
              </button>

              <button
                onClick={() => {
                  setBillToExport(selectedBill);
                  setExportModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-amber-400" />
                Export PDF
              </button>

              <button
                onClick={() => exportMeasurementBillToExcel(selectedBill)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </button>

              <button
                onClick={() => {
                  setBillToExport({
                    ...selectedBill,
                    billType: 'Client Measurement Sheet',
                  });
                  setExportModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition flex items-center gap-1.5"
                title="Client Checking Sheet without Rates"
              >
                <FileCheck className="w-4 h-4 text-amber-400" />
                Client Sheet (No Rates)
              </button>

              <button
                onClick={() => handleCopyBill(selectedBill)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                Copy Bill
              </button>

              <button
                onClick={() => setViewMode('list')}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>

          {/* Bill View Body */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block">Company</span>
                <span className="font-bold text-white">{selectedBill.companyName}</span>
                <div className="text-slate-400">WO: {selectedBill.workOrderNo || 'N/A'}</div>
              </div>
              <div>
                <span className="text-slate-500 block">Client</span>
                <span className="font-bold text-white">{selectedBill.client}</span>
                <div className="text-slate-400">PO: {selectedBill.poNo || 'N/A'}</div>
              </div>
              <div>
                <span className="text-slate-500 block">Period</span>
                <span className="font-mono text-white">
                  {selectedBill.workPeriodFrom || '-'} to {selectedBill.workPeriodTo || '-'}
                </span>
                <div className="text-amber-400 font-mono text-[10px]">
                  IDM: {selectedBill.linkedIdmNos?.join(', ') || 'Direct'}
                </div>
              </div>
              <div>
                <span className="text-slate-500 block">Net Payable Value</span>
                <span className="font-mono font-black text-emerald-400 text-base">
                  ₹{selectedBill.deductions.netBill.toLocaleString('en-IN')}
                </span>
                <div className="text-slate-400">Balance: ₹{selectedBill.deductions.balanceAmount.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Measurement Groups & Items Tables (Live Editable Preview) */}
            {selectedBill.groups.map((grp, gIdx) => (
              <div key={grp.id} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 shadow-lg">
                <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      <span>Group {gIdx + 1}: {grp.groupName} {grp.area ? `[${grp.area}]` : ''}</span>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Live Inline Editable Cells
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {(grp.groupTotalKg || 0).toLocaleString('en-IN')} KG • ₹{(grp.groupTotalAmount || 0).toLocaleString('en-IN')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddViewBillItem(gIdx)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white transition flex items-center gap-1 border border-slate-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Row
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-950 border-b border-slate-800 text-[11px] uppercase font-bold text-slate-400">
                      <tr>
                        <th className="py-2.5 px-2 text-center w-8">Sl</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Description</th>
                        <th className="py-2.5 px-2 text-center w-20">Thk (mm)</th>
                        <th className="py-2.5 px-2 text-center w-24">L (mm)</th>
                        <th className="py-2.5 px-2 text-center w-20">W (mm)</th>
                        <th className="py-2.5 px-2 text-center w-18">Qty</th>
                        <th className="py-2.5 px-2 text-center w-24 text-amber-400">Unit Wt (kg/m)</th>
                        <th className="py-2.5 px-3 text-right w-28">Weight (KG)</th>
                        <th className="py-2.5 px-2 text-right w-20">Rate (₹)</th>
                        <th className="py-2.5 px-3 text-right w-28">Amount (₹)</th>
                        <th className="py-2.5 px-3 min-w-[140px]">Remark</th>
                        <th className="py-2.5 px-2 text-center w-12">Act</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {grp.items.map((it, idx) => {
                        const unitWtVal = it.unitWeight !== undefined && it.unitWeight !== null && Number(it.unitWeight) > 0
                          ? it.unitWeight
                          : (it.kg && it.quantity ? Math.round((it.kg / it.quantity) * 100) / 100 : '');

                        return (
                          <tr key={it.id} className="hover:bg-slate-900/60 transition group">
                            {/* Sl No */}
                            <td className="py-2 px-2 text-center text-slate-500 font-mono text-[11px]">
                              {idx + 1}
                            </td>

                            {/* Description Box */}
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                value={it.descriptionItem}
                                onChange={(e) =>
                                  handleUpdateViewBillItem(gIdx, idx, { descriptionItem: e.target.value })
                                }
                                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-amber-500 rounded px-2 py-1 text-white font-sans text-xs focus:outline-none transition"
                              />
                            </td>

                            {/* Thickness Box */}
                            <td className="py-1.5 px-1.5">
                              <input
                                type="number"
                                value={it.thickness || ''}
                                placeholder="-"
                                onChange={(e) =>
                                  handleUpdateViewBillItem(gIdx, idx, {
                                    thickness: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-amber-500 rounded px-1 py-1 text-center text-slate-200 text-xs focus:outline-none transition"
                              />
                            </td>

                            {/* Length Box */}
                            <td className="py-1.5 px-1.5">
                              <input
                                type="number"
                                value={it.length || ''}
                                placeholder="-"
                                onChange={(e) =>
                                  handleUpdateViewBillItem(gIdx, idx, {
                                    length: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-amber-500 rounded px-1 py-1 text-center text-slate-200 text-xs focus:outline-none transition"
                              />
                            </td>

                            {/* Width Box */}
                            <td className="py-1.5 px-1.5">
                              <input
                                type="number"
                                value={it.width || ''}
                                placeholder="-"
                                onChange={(e) =>
                                  handleUpdateViewBillItem(gIdx, idx, {
                                    width: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-amber-500 rounded px-1 py-1 text-center text-slate-200 text-xs focus:outline-none transition"
                              />
                            </td>

                            {/* Quantity Box */}
                            <td className="py-1.5 px-1.5">
                              <input
                                type="number"
                                value={it.quantity}
                                onChange={(e) =>
                                  handleUpdateViewBillItem(gIdx, idx, {
                                    quantity: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-amber-500 rounded px-1 py-1 text-center text-white font-bold text-xs focus:outline-none transition"
                              />
                            </td>

                            {/* Unit Weight Box (Replaces Unit and never shows NOS) */}
                            <td className="py-1.5 px-1.5">
                              <input
                                type="number"
                                step="0.01"
                                value={unitWtVal}
                                placeholder="0.00"
                                onChange={(e) =>
                                  handleUpdateViewBillItem(gIdx, idx, {
                                    unitWeight: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full bg-slate-900 border border-amber-500/30 hover:border-amber-500 focus:border-amber-500 rounded px-1.5 py-1 text-center text-amber-300 font-bold text-xs focus:outline-none transition shadow-xs"
                              />
                            </td>

                            {/* Calculated Weight */}
                            <td className="py-2 px-2 text-right">
                              <span className="font-bold text-white">
                                {(it.kg || 0).toLocaleString('en-IN')}
                              </span>
                              {it.isManualKgOverride && (
                                <span className="text-[10px] text-amber-400 ml-1 font-bold">[OVR]</span>
                              )}
                            </td>

                            {/* Rate Box */}
                            <td className="py-1.5 px-1.5">
                              <input
                                type="number"
                                value={it.rate}
                                onChange={(e) =>
                                  handleUpdateViewBillItem(gIdx, idx, {
                                    rate: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-amber-500 rounded px-1.5 py-1 text-right text-slate-200 text-xs focus:outline-none transition"
                              />
                            </td>

                            {/* Amount Display */}
                            <td className="py-2 px-2 text-right font-bold text-emerald-400">
                              ₹{(it.amount || 0).toLocaleString('en-IN')}
                            </td>

                            {/* Remark Box */}
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                value={it.remark || ''}
                                placeholder="Remark / Grid"
                                onChange={(e) =>
                                  handleUpdateViewBillItem(gIdx, idx, { remark: e.target.value })
                                }
                                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-amber-500 rounded px-2 py-1 text-slate-300 font-sans text-xs focus:outline-none transition"
                              />
                            </td>

                            {/* Action: Delete Row */}
                            <td className="py-2 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteViewBillItem(gIdx, idx)}
                                title="Delete row from bill"
                                className="p-1 text-slate-500 hover:text-rose-400 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Deductions Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Scope Progress
                </h4>
                <div className="flex justify-between text-slate-400">
                  <span>Contract Scope</span>
                  <span className="font-mono text-white font-bold">
                    {(selectedBill.contractQuantity || 0).toLocaleString('en-IN')} KG
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Cumulative Measured</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {(selectedBill.cumulativeQuantity || 0).toLocaleString('en-IN')} KG
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Balance Remaining</span>
                  <span className="font-mono text-slate-300">
                    {(selectedBill.balanceQuantity || 0).toLocaleString('en-IN')} KG
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Payment Summary
                </h4>
                <div className="flex justify-between text-slate-400">
                  <span>Gross Bill</span>
                  <span className="font-mono text-white">
                    ₹{selectedBill.deductions.grossBill.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Total Deductions</span>
                  <span className="font-mono font-bold">
                    - ₹{selectedBill.deductions.totalDeduction.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-slate-800">
                  <span>Net Payable Bill</span>
                  <span className="font-mono">
                    ₹{selectedBill.deductions.netBill.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PDF PRINT & EXPORT PREVIEW MODAL */}
      {/* ------------------------------------------------------------- */}
      {exportModalOpen && billToExport && pdfPreviewData && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full p-4 sm:p-6 space-y-4 shadow-2xl flex flex-col max-h-[95vh]">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    Print & Export Document Preview
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Bill No: <span className="text-amber-400 font-bold">{billToExport.billNo}</span> • {billToExport.projectName}
                  </p>
                </div>
              </div>

              {/* Format & Orientation Selectors */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setPdfFormat('a4')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      pdfFormat === 'a4' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfFormat('a3')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      pdfFormat === 'a3' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    A3
                  </button>
                </div>

                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setPdfOrientation('auto')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      pdfOrientation === 'auto' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfOrientation('l')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      pdfOrientation === 'l' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Landscape
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfOrientation('p')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      pdfOrientation === 'p' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Portrait
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setExportModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Preview Pane */}
            <div className="flex-1 min-h-[50vh] sm:min-h-[58vh] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative flex flex-col">
              <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-300 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
                <span>
                  Tip: If PDF does not display inside your mobile browser, tap <strong>Download PDF</strong> or <strong>Open in New Tab</strong>.
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
                id="measurement-bill-preview-frame"
                src={`${pdfPreviewData.blobUrl}#toolbar=0`}
                className="w-full flex-1 min-h-[45vh] sm:min-h-[52vh] bg-white rounded-b-xl"
                title="Measurement Bill Live Preview"
              />
            </div>

            {/* Footer with Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-400" />
                Inspect all measurement dimensions, unit weights & totals above before printing or downloading.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const frame = document.getElementById('measurement-bill-preview-frame') as HTMLIFrameElement;
                    if (frame && frame.contentWindow) {
                      try {
                        frame.contentWindow.focus();
                        frame.contentWindow.print();
                      } catch {
                        printJsPdfDocument(pdfPreviewData.doc, `${pdfPreviewData.cleanBillNo}_MEASUREMENT_BILL`);
                      }
                    } else {
                      printJsPdfDocument(pdfPreviewData.doc, `${pdfPreviewData.cleanBillNo}_MEASUREMENT_BILL`);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  <Printer className="w-4 h-4 text-slate-950" />
                  Print Now
                </button>

                <button
                  type="button"
                  onClick={() => {
                    pdfPreviewData.doc.save(`${pdfPreviewData.cleanBillNo}_MEASUREMENT_BILL.pdf`);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition flex items-center gap-2 border border-slate-700 shadow-md active:scale-95"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DYNAMIC COLUMN BUILDER MODAL */}
      {/* ------------------------------------------------------------- */}
      {columnBuilderOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Columns className="w-5 h-5 text-amber-400" />
                Dynamic Column Builder
              </h3>
              <button
                onClick={() => setColumnBuilderOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Add new custom measurement, rate, dropdown, or formula column without writing code.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Column Label *</label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="e.g. Paint Area (SQM) or Weld Inch-Dia"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Column Type</label>
                <select
                  value={newColumnType}
                  onChange={(e) => setNewColumnType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Text">Text</option>
                  <option value="Number">Number</option>
                  <option value="Decimal">Decimal</option>
                  <option value="Date">Date</option>
                  <option value="Dropdown">Dropdown</option>
                  <option value="Quantity">Quantity</option>
                  <option value="Measurement">Measurement</option>
                  <option value="Rate">Rate</option>
                  <option value="Formula">Formula</option>
                  <option value="Remark">Remark</option>
                  <option value="Attachment">Attachment</option>
                </select>
              </div>

              {newColumnType === 'Formula' && (
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Formula Expression (e.g. length * width * 2 / 1000)
                  </label>
                  <input
                    type="text"
                    value={newColumnFormula}
                    onChange={(e) => setNewColumnFormula(e.target.value)}
                    placeholder="length * width * quantity / 1000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                onClick={() => setColumnBuilderOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newColumnName) return;
                  const newCol: DynamicColumn = {
                    id: `col-${Date.now()}`,
                    key: newColumnName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                    label: newColumnName,
                    type: newColumnType,
                    formula: newColumnFormula,
                    order: 99,
                  };
                  const currentCols = wizardBill.dynamicColumns || [];
                  setWizardBill((prev) => ({
                    ...prev,
                    dynamicColumns: [...currentCols, newCol],
                  }));
                  setNewColumnName('');
                  setNewColumnFormula('');
                  setColumnBuilderOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition"
              >
                Add Column to Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. DELETE BILL CONFIRMATION MODAL */}
      {/* ------------------------------------------------------------- */}
      {deleteConfirmBillId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white font-mono uppercase">Confirm Bill Deletion</h3>
            </div>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to permanently delete this measurement bill? This operation will remove the bill and all associated measurement records from the register.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmBillId(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingBill}
                onClick={async () => {
                  try {
                    setIsDeletingBill(true);
                    await onDeleteBill(deleteConfirmBillId);
                    setDeleteConfirmBillId(null);
                  } catch (err) {
                    console.error('Delete bill error:', err);
                  } finally {
                    setIsDeletingBill(false);
                  }
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
              >
                {isDeletingBill ? 'Deleting...' : 'Delete Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. EDIT MEASUREMENT ROW MODAL */}
      {/* ------------------------------------------------------------- */}
      {editingRowItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                Edit Measurement Entry #{editingRowItem.itemIndex + 1}
              </h3>
              <button
                onClick={() => setEditingRowItem(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Item Description / Specification</label>
                <input
                  type="text"
                  value={editingRowItem.item.descriptionItem || ''}
                  onChange={(e) =>
                    setEditingRowItem((prev) =>
                      prev
                        ? {
                            ...prev,
                            item: { ...prev.item, descriptionItem: e.target.value },
                          }
                        : null
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Thickness (mm)</label>
                  <input
                    type="number"
                    value={editingRowItem.item.thickness || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditingRowItem((prev) => {
                        if (!prev) return null;
                        const it = { ...prev.item, thickness: val };
                        const met = calculateItemWeightAndMetrics(it);
                        return { ...prev, item: { ...it, kg: it.isManualKgOverride ? it.kg : met.calculatedKg, amount: met.amount } };
                      });
                    }}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-center font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Length (mm/m)</label>
                  <input
                    type="number"
                    value={editingRowItem.item.length || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditingRowItem((prev) => {
                        if (!prev) return null;
                        const it = { ...prev.item, length: val };
                        const met = calculateItemWeightAndMetrics(it);
                        return { ...prev, item: { ...it, kg: it.isManualKgOverride ? it.kg : met.calculatedKg, amount: met.amount } };
                      });
                    }}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-center font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Width (mm)</label>
                  <input
                    type="number"
                    value={editingRowItem.item.width || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditingRowItem((prev) => {
                        if (!prev) return null;
                        const it = { ...prev.item, width: val };
                        const met = calculateItemWeightAndMetrics(it);
                        return { ...prev, item: { ...it, kg: it.isManualKgOverride ? it.kg : met.calculatedKg, amount: met.amount } };
                      });
                    }}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-center font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Diameter (mm)</label>
                  <input
                    type="number"
                    value={editingRowItem.item.diameter || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditingRowItem((prev) => {
                        if (!prev) return null;
                        const it = { ...prev.item, diameter: val };
                        const met = calculateItemWeightAndMetrics(it);
                        return { ...prev, item: { ...it, kg: it.isManualKgOverride ? it.kg : met.calculatedKg, amount: met.amount } };
                      });
                    }}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-center font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Quantity</label>
                  <input
                    type="number"
                    value={editingRowItem.item.quantity || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditingRowItem((prev) => {
                        if (!prev) return null;
                        const it = { ...prev.item, quantity: val };
                        const met = calculateItemWeightAndMetrics(it);
                        return { ...prev, item: { ...it, kg: it.isManualKgOverride ? it.kg : met.calculatedKg, amount: met.amount } };
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-center font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Unit</label>
                  <select
                    value={editingRowItem.item.unit || 'KG'}
                    onChange={(e) =>
                      setEditingRowItem((prev) =>
                        prev
                          ? {
                              ...prev,
                              item: { ...prev.item, unit: e.target.value },
                            }
                          : null
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-center font-mono"
                  >
                    <option value="KG">KG</option>
                    <option value="MT">MT</option>
                    <option value="MTR">MTR</option>
                    <option value="SQM">SQM</option>
                    <option value="SQFT">SQFT</option>
                    <option value="NOS">NOS</option>
                    <option value="DAYS">DAYS</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Unit Weight (kg/m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRowItem.item.unitWeight || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditingRowItem((prev) => {
                        if (!prev) return null;
                        const it = { ...prev.item, unitWeight: val };
                        const met = calculateItemWeightAndMetrics(it);
                        return { ...prev, item: { ...it, kg: it.isManualKgOverride ? it.kg : met.calculatedKg, amount: met.amount } };
                      });
                    }}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-center font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Rate (₹)</label>
                  <input
                    type="number"
                    value={editingRowItem.item.rate || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditingRowItem((prev) => {
                        if (!prev) return null;
                        const it = { ...prev.item, rate: val };
                        const met = calculateItemWeightAndMetrics(it);
                        return { ...prev, item: { ...it, amount: met.amount } };
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-right font-mono"
                  />
                </div>
              </div>

              {/* Manual KG Override */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-white font-semibold">Manual Weight (KG) Override</span>
                  <p className="text-[11px] text-slate-400">Bypass auto-calculated formula weight with weighing scale slip</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!editingRowItem.item.isManualKgOverride}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEditingRowItem((prev) => {
                        if (!prev) return null;
                        const it = {
                          ...prev.item,
                          isManualKgOverride: checked,
                          manualKgValue: checked ? (prev.item.manualKgValue || prev.item.kg) : undefined,
                        };
                        const met = calculateItemWeightAndMetrics(it);
                        return {
                          ...prev,
                          item: {
                            ...it,
                            kg: checked ? (it.manualKgValue || 0) : met.calculatedKg,
                            amount: (checked ? (it.manualKgValue || 0) : met.calculatedKg) * (it.rate || 0),
                          },
                        };
                      });
                    }}
                    className="w-4 h-4 rounded text-amber-500"
                  />
                  {editingRowItem.item.isManualKgOverride && (
                    <input
                      type="number"
                      value={editingRowItem.item.manualKgValue || editingRowItem.item.kg}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setEditingRowItem((prev) =>
                          prev
                            ? {
                                ...prev,
                                item: {
                                  ...prev.item,
                                  manualKgValue: val,
                                  kg: val,
                                  amount: val * (prev.item.rate || 0),
                                },
                              }
                            : null
                        );
                      }}
                      className="w-28 bg-amber-500/20 border border-amber-500 text-amber-300 font-mono text-xs rounded-lg px-2 py-1 text-right font-bold"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Remarks / Drawing / Grid Ref</label>
                <input
                  type="text"
                  value={editingRowItem.item.remark || ''}
                  onChange={(e) =>
                    setEditingRowItem((prev) =>
                      prev
                        ? {
                            ...prev,
                            item: { ...prev.item, remark: e.target.value },
                          }
                        : null
                    )
                  }
                  placeholder="e.g. Drawing Rev 2, Grid 12-B"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              {/* Calculated Summary Callout */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between font-mono">
                <div>
                  <span className="text-slate-400 text-xs">Calculated Weight:</span>
                  <div className="text-base font-bold text-amber-400">
                    {(editingRowItem.item.kg || 0).toLocaleString('en-IN')} KG
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-xs">Net Item Amount:</span>
                  <div className="text-base font-bold text-emerald-400">
                    ₹{(editingRowItem.item.amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingRowItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateItem(editingRowItem.itemIndex, editingRowItem.item);
                  setEditingRowItem(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-md shadow-amber-500/20"
              >
                Apply Changes & Recalculate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. ROW PREVIEW CALCULATION BREAKDOWN MODAL */}
      {/* ------------------------------------------------------------- */}
      {previewRowItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-400" />
                Calculation Breakdown Preview
              </h3>
              <button
                onClick={() => setPreviewRowItem(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">Item Name</span>
                <span className="text-white text-sm font-bold">{previewRowItem.descriptionItem || 'Measurement Item'}</span>
                {previewRowItem.remark && (
                  <span className="text-slate-400 block text-xs mt-1">Ref: {previewRowItem.remark}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Dimensions</span>
                  <span className="text-slate-200 font-mono font-bold">
                    {previewRowItem.thickness ? `Thk: ${previewRowItem.thickness}mm • ` : ''}
                    {previewRowItem.length ? `L: ${previewRowItem.length} • ` : ''}
                    {previewRowItem.width ? `W: ${previewRowItem.width}` : ''}
                    {!previewRowItem.thickness && !previewRowItem.length && !previewRowItem.width && 'Direct Entry'}
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Quantity & Unit</span>
                  <span className="text-slate-200 font-mono font-bold">
                    {previewRowItem.quantity} {previewRowItem.unit || 'KG'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Total Weight:</span>
                  <span className="text-amber-400 font-bold text-sm">
                    {(previewRowItem.kg || 0).toLocaleString('en-IN')} KG ({(
                      ((previewRowItem.kg || 0) / 1000).toFixed(3)
                    )} MT)
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Applied Rate:</span>
                  <span className="text-slate-200">₹{(previewRowItem.rate || 0).toLocaleString('en-IN')} / unit</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-xs">
                  <span className="text-white font-bold">Total Work Amount:</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    ₹{(previewRowItem.amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {previewRowItem.isManualKgOverride && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
                  ⚠️ This row has a manual weight override applied ({previewRowItem.manualKgValue} KG).
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setPreviewRowItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. LIVE MEASUREMENT SHEET PREVIEW MODAL */}
      {/* ------------------------------------------------------------- */}
      {previewMeasurementsOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-400" />
                  Live Measurement Sheet Preview
                </h3>
                <p className="text-xs text-slate-400">
                  Bill No: <span className="font-mono text-amber-400">{wizardBill.billNo || 'DRAFT'}</span> • Project: {wizardBill.projectName || 'Active Project'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setBillToExport(wizardBill as MeasurementBill);
                    setExportModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5 shadow-sm"
                  title="Print & PDF Live Preview"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Print / PDF Preview
                </button>
                <button
                  onClick={() => setPreviewMeasurementsOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {(wizardBill.groups || []).map((grp, gIdx) => (
                <div key={grp.id} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex justify-between items-center text-xs">
                    <span className="font-bold text-white">
                      GROUP {gIdx + 1}: {grp.groupName} {grp.area ? `[${grp.area}]` : ''}
                    </span>
                    <span className="font-mono text-amber-400 font-bold">
                      {(grp.groupTotalKg || 0).toLocaleString('en-IN')} KG • ₹{(grp.groupTotalAmount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-[11px] text-slate-400 bg-slate-950/60 font-semibold">
                        <th className="py-2 px-3 text-center w-8">#</th>
                        <th className="py-2 px-3">Item Description</th>
                        <th className="py-2 px-2 text-center">Thk</th>
                        <th className="py-2 px-2 text-center">Length</th>
                        <th className="py-2 px-2 text-center">Width</th>
                        <th className="py-2 px-2 text-center">Qty</th>
                        <th className="py-2 px-2 text-center">Unit Wt (kg/m)</th>
                        <th className="py-2 px-3 text-right">Weight (KG)</th>
                        <th className="py-2 px-2 text-right">Rate (₹)</th>
                        <th className="py-2 px-3 text-right">Amount (₹)</th>
                        <th className="py-2 px-3">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {grp.items.map((it, idx) => (
                        <tr key={it.id} className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 text-white font-medium">{it.descriptionItem}</td>
                          <td className="py-2 px-2 text-center text-slate-300 font-mono">{it.thickness || '-'}</td>
                          <td className="py-2 px-2 text-center text-slate-300 font-mono">{it.length || '-'}</td>
                          <td className="py-2 px-2 text-center text-slate-300 font-mono">{it.width || '-'}</td>
                          <td className="py-2 px-2 text-center text-white font-bold font-mono">{it.quantity}</td>
                          <td className="py-2 px-2 text-center text-amber-400 font-mono font-semibold">
                            {it.unitWeight && it.unitWeight > 0
                              ? it.unitWeight.toFixed(2)
                              : it.kg && it.quantity && it.quantity > 0
                              ? (Math.round((it.kg / it.quantity) * 100) / 100).toFixed(2)
                              : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-amber-300 font-bold">
                            {(it.kg || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-300">
                            {(it.rate || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-400 font-bold">
                            ₹{(it.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-slate-400 text-[11px]">{it.remark || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {/* Total Footprint Summary */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-400">Total Scope Weight: </span>
                  <span className="text-white font-bold text-sm">
                    {(wizardBill.currentQuantity || 0).toLocaleString('en-IN')} KG
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Gross Total Work: </span>
                  <span className="text-emerald-400 font-bold text-base">
                    ₹{(wizardBill.deductions?.subtotal || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setPreviewMeasurementsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
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
