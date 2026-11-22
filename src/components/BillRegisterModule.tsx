import React, { useState, useMemo } from 'react';
import { Company, MeasurementBill, Project, User } from '../types';
import {
  exportMeasurementBillToExcel,
  exportMeasurementBillToPdf,
  buildMeasurementBillPdf,
  PageFormat,
  PageOrientation,
} from '../lib/billExportUtils';
import { printJsPdfDocument } from '../lib/printUtils';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Filter,
  ArrowUpDown,
  Building,
  Printer,
  Trash2,
  Eye,
  AlertTriangle,
  X,
} from 'lucide-react';

interface BillRegisterModuleProps {
  bills: MeasurementBill[];
  projects: Project[];
  companies: Company[];
  currentUser: User;
  onOpenBillDetails: (bill: MeasurementBill) => void;
  onDeleteBill?: (id: string) => Promise<boolean>;
}

export const BillRegisterModule: React.FC<BillRegisterModuleProps> = ({
  bills,
  projects,
  companies,
  currentUser,
  onOpenBillDetails,
  onDeleteBill,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<'billDate' | 'netBill' | 'billNo'>('billDate');
  const [sortAsc, setSortAsc] = useState(false);

  // PDF Export Modal State
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

  const filteredBills = useMemo(() => {
    return bills
      .filter((b) => {
        const matchSearch =
          searchQuery === '' ||
          b.billNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (b.linkedIdmNos && b.linkedIdmNos.some((idm) => idm.toLowerCase().includes(searchQuery.toLowerCase())));

        const matchComp = companyFilter === 'all' || b.companyId === companyFilter;
        const matchProj = projectFilter === 'all' || b.projectId === projectFilter;
        const matchStat = statusFilter === 'all' || b.status === statusFilter;

        return matchSearch && matchComp && matchProj && matchStat;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        if (sortField === 'netBill') {
          valA = a.deductions?.netBill || 0;
          valB = b.deductions?.netBill || 0;
        }
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [bills, searchQuery, companyFilter, projectFilter, statusFilter, sortField, sortAsc]);

  // Export full register table to Excel
  const handleExportRegisterExcel = () => {
    const rows = filteredBills.map((b) => ({
      'Bill No': b.billNo,
      'Project ID': b.projectId,
      'Project Name': b.projectName,
      'Client': b.client,
      'Company': b.companyName,
      'IDM No': b.linkedIdmNos ? b.linkedIdmNos.join(', ') : '',
      'Bill Date': b.billDate,
      'Measurement Date': b.measurementDate,
      'Measured Qty (KG)': b.currentQuantity || 0,
      'Gross Bill (₹)': b.deductions?.grossBill || 0,
      'Deductions (₹)': b.deductions?.totalDeduction || 0,
      'Net Bill (₹)': b.deductions?.netBill || 0,
      'Amount Received (₹)': b.deductions?.amountReceived || 0,
      'Balance (₹)': b.deductions?.balanceAmount || 0,
      'Status': b.status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Measurement Bill Register');
    XLSX.writeFile(wb, `SR_GROUP_BILL_REGISTER_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Status Badge
  const renderBadge = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-3 h-3" />
            {status}
          </span>
        );
      case 'Submitted':
      case 'Under Verification':
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
            <Clock className="w-3 h-3" />
            {status}
          </span>
        );
      case 'Rejected':
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25">
            <XCircle className="w-3 h-3" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  // Summary Totals
  const totalGross = filteredBills.reduce((s, b) => s + (b.deductions?.grossBill || 0), 0);
  const totalDeductions = filteredBills.reduce((s, b) => s + (b.deductions?.totalDeduction || 0), 0);
  const totalNet = filteredBills.reduce((s, b) => s + (b.deductions?.netBill || 0), 0);
  const totalReceived = filteredBills.reduce((s, b) => s + (b.deductions?.amountReceived || 0), 0);
  const totalBalance = filteredBills.reduce((s, b) => s + (b.deductions?.balanceAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/40 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">BILL REGISTER</h1>
            <p className="text-xs text-slate-400">
              Master Register of Measurement, RA & Muster Bills with Statutory Deductions & Balances
            </p>
          </div>
        </div>

        <button
          onClick={handleExportRegisterExcel}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
        >
          <Download className="w-4 h-4" />
          Export Register to Excel
        </button>
      </div>

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="text-[11px] text-slate-400 font-semibold">Total Gross Bills</div>
          <div className="text-base font-mono font-black text-white mt-1">
            ₹{totalGross.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="text-[11px] text-slate-400 font-semibold">Total Deductions</div>
          <div className="text-base font-mono font-bold text-rose-400 mt-1">
            -₹{totalDeductions.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="text-[11px] text-slate-400 font-semibold">Net Payable Bills</div>
          <div className="text-base font-mono font-black text-emerald-400 mt-1">
            ₹{totalNet.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="text-[11px] text-slate-400 font-semibold">Amount Received</div>
          <div className="text-base font-mono font-bold text-slate-200 mt-1">
            ₹{totalReceived.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="text-[11px] text-slate-400 font-semibold">Balance Pending</div>
          <div className="text-base font-mono font-black text-amber-400 mt-1">
            ₹{totalBalance.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Bill No, Project ID, IDM..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300"
          >
            <option value="all">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

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
            <option value="Under Verification">Under Verification</option>
            <option value="Approved">Approved</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
            <option value="Rejected">Rejected</option>
          </select>

          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Register Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Bill No.</th>
                <th className="py-3.5 px-4">Project ID & Name</th>
                <th className="py-3.5 px-4">IDM No.</th>
                <th className="py-3.5 px-4">Bill Date</th>
                <th className="py-3.5 px-4">Measurement Date</th>
                <th className="py-3.5 px-4 text-right">Gross Bill (₹)</th>
                <th className="py-3.5 px-4 text-right">Deduction (₹)</th>
                <th className="py-3.5 px-4 text-right">Net Bill (₹)</th>
                <th className="py-3.5 px-4 text-right">Received (₹)</th>
                <th className="py-3.5 px-4 text-right">Balance (₹)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-400 font-sans">
                    No bills matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredBills.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => onOpenBillDetails(b)}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 font-bold text-amber-400">{b.billNo}</td>

                    <td className="py-3 px-4 font-sans">
                      <div className="font-bold text-white line-clamp-1">{b.projectName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">ID: {b.projectId}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {b.linkedIdmNos && b.linkedIdmNos.length > 0 ? (
                        <span className="text-amber-400/90">{b.linkedIdmNos.join(', ')}</span>
                      ) : (
                        <span className="text-slate-600 font-sans">Direct</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-400">{b.billDate}</td>
                    <td className="py-3 px-4 text-slate-400">{b.measurementDate}</td>

                    <td className="py-3 px-4 text-right text-slate-200">
                      ₹{(b.deductions?.grossBill || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-right text-rose-400">
                      -₹{(b.deductions?.totalDeduction || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-right font-black text-emerald-400">
                      ₹{(b.deductions?.netBill || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-right text-slate-300">
                      ₹{(b.deductions?.amountReceived || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-amber-300">
                      ₹{(b.deductions?.balanceAmount || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-center font-sans">
                      {renderBadge(b.status)}
                    </td>

                    <td
                      className="py-3 px-4 text-center font-sans"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          title="Preview / Details"
                          onClick={() => onOpenBillDetails(b)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
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
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          title="Export PDF"
                          onClick={() => {
                            setBillToExport(b);
                            setExportModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        <button
                          title="Export Excel"
                          onClick={() => exportMeasurementBillToExcel(b)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </button>

                        {onDeleteBill && (
                          <button
                            title="Delete Bill"
                            onClick={() => setDeleteConfirmId(b.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF PRINT & EXPORT PREVIEW MODAL */}
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
            <div className="flex-1 min-h-[50vh] sm:min-h-[58vh] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative">
              <iframe
                id="register-bill-preview-frame"
                src={`${pdfPreviewData.blobUrl}#toolbar=0`}
                className="w-full h-full min-h-[50vh] sm:min-h-[58vh] bg-white rounded-xl"
                title="Bill Register Document Live Preview"
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
                    const frame = document.getElementById('register-bill-preview-frame') as HTMLIFrameElement;
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && onDeleteBill && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white font-mono uppercase">Confirm Bill Deletion</h3>
            </div>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to permanently delete this measurement bill from the register? This cannot be undone.
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
                    await onDeleteBill(deleteConfirmId);
                    setDeleteConfirmId(null);
                  } catch (err) {
                    console.error('Delete bill error:', err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Delete Bill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
