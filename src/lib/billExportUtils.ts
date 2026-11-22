import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Company, MeasurementBill } from '../types';
import { printJsPdfDocument } from './printUtils';

export type PageOrientation = 'p' | 'l'; // portrait | landscape
export type PageFormat = 'a4' | 'a3';

export interface PdfExportOptions {
  format?: PageFormat;
  orientation?: PageOrientation | 'auto';
  company?: Company;
  action?: 'download' | 'print';
  hideRates?: boolean;
  customTitle?: string;
  isClientCheckingSheet?: boolean;
}

/**
 * Builds the jsPDF instance and blob URL for preview and printing
 */
export function buildMeasurementBillPdf(
  bill: MeasurementBill,
  options: PdfExportOptions = {}
): { doc: jsPDF; blobUrl: string; cleanBillNo: string } {
  const isClientSheet = options.hideRates || options.isClientCheckingSheet || bill.billType === 'Client Measurement Sheet';

  // Determine table width to pick best orientation if 'auto'
  const colCount = (bill.dynamicColumns && bill.dynamicColumns.length > 0)
    ? bill.dynamicColumns.length
    : (isClientSheet ? 9 : 12);
  const isWide = colCount > 8;

  let orientation: PageOrientation = 'l';
  if (options.orientation === 'p') orientation = 'p';
  else if (options.orientation === 'l') orientation = 'l';
  else orientation = isWide ? 'l' : 'p';

  const format: PageFormat = options.format || 'a4';

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  // Header Banner - Industrial Dark
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, margin, pageWidth - margin * 2, 24, 'F');

  // Company Name & Bill Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const companyTitle = options.company?.name || bill.companyName || 'SR GROUP';
  doc.text(companyTitle, margin + 4, margin + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  const companyTagline = options.company?.tagline || 'Heavy Structural Fabrication, Erection, Piping & Industrial Solutions';
  doc.text(companyTagline, margin + 4, margin + 14);

  const gstStr = options.company?.gstNumber ? `GSTIN: ${options.company.gstNumber}` : 'GST Registered Entity';
  doc.text(gstStr, margin + 4, margin + 19);

  // Bill Badge (Right-aligned in header)
  doc.setFillColor(245, 158, 11); // amber-500
  const badgeWidth = isClientSheet ? 70 : 54;
  doc.roundedRect(pageWidth - margin - badgeWidth, margin + 4, badgeWidth - 2, 16, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isClientSheet ? 7.5 : 9);
  const badgeTitle = isClientSheet
    ? (options.customTitle || 'CLIENT MEASUREMENT SHEET').toUpperCase()
    : bill.billType.toUpperCase();
  doc.text(badgeTitle, pageWidth - margin - badgeWidth + 3, margin + 10);
  doc.setFontSize(8);
  doc.text(`SHEET NO: ${bill.billNo}`, pageWidth - margin - badgeWidth + 3, margin + 16);

  // Metadata Grid Box
  let currentY = margin + 28;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY, pageWidth - margin * 2, 24, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, currentY, pageWidth - margin * 2, 24, 'S');

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);

  const colW = (pageWidth - margin * 2) / 4;

  // Col 1: Project Details
  doc.setFont('helvetica', 'bold');
  doc.text('PROJECT DETAILS', margin + 3, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Client: ${bill.client || 'N/A'}`, margin + 3, currentY + 10);
  doc.text(`Project: [${bill.projectId}] ${bill.projectName.slice(0, 30)}`, margin + 3, currentY + 15);
  doc.text(`Site: ${bill.site?.slice(0, 32) || 'Site Office'}`, margin + 3, currentY + 20);

  // Col 2: Contract & Orders
  doc.setFont('helvetica', 'bold');
  doc.text('WORK ORDER & CONTRACT', margin + colW + 3, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`WO No: ${bill.workOrderNo || 'N/A'}`, margin + colW + 3, currentY + 10);
  doc.text(`PO No: ${bill.poNo || 'N/A'}`, margin + colW + 3, currentY + 15);
  doc.text(`Contract No: ${bill.contractNo || 'N/A'}`, margin + colW + 3, currentY + 20);

  // Col 3: Dates & Period
  doc.setFont('helvetica', 'bold');
  doc.text('MEASUREMENT PERIOD', margin + colW * 2 + 3, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bill Date: ${bill.billDate}`, margin + colW * 2 + 3, currentY + 10);
  doc.text(`M-Date: ${bill.measurementDate}`, margin + colW * 2 + 3, currentY + 15);
  doc.text(`Period: ${bill.workPeriodFrom || '-'} to ${bill.workPeriodTo || '-'}`, margin + colW * 2 + 3, currentY + 20);

  // Col 4: Status & IDM
  doc.setFont('helvetica', 'bold');
  doc.text('STATUS & CLEARANCES', margin + colW * 3 + 3, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Status: ${bill.status.toUpperCase()}`, margin + colW * 3 + 3, currentY + 10);
  const idmText = bill.linkedIdmNos && bill.linkedIdmNos.length > 0
    ? `IDM: ${bill.linkedIdmNos.join(', ')}`
    : 'IDM: Direct Entry';
  doc.text(idmText, margin + colW * 3 + 3, currentY + 15);
  doc.text(`Area / Dept: ${bill.area || bill.department || 'Main Yard'}`, margin + colW * 3 + 3, currentY + 20);

  currentY += 28;

  // Build rows for autotable without 'Type' column
  const tableHead = isClientSheet
    ? [
        [
          'Sl',
          'Item Description',
          'Thk\n(mm)',
          'L\n(m)',
          'W\n(m)',
          'Qty',
          'Unit Wt\n(kg/m)',
          'Weight\n(KG)',
          'Remarks / Drawing / Grid Ref',
        ],
      ]
    : [
        [
          'Sl',
          'Item Description',
          'Thk\n(mm)',
          'L\n(mm)',
          'W\n(mm)',
          'Qty',
          'Unit Wt\n(kg/m)',
          'Weight\n(KG)',
          'Rate\n(Rs.)',
          'Amount\n(Rs.)',
          'Remarks / Grid',
        ],
      ];

  const tableBody: any[] = [];

  let grandTotalKg = 0;
  let grandTotalAmount = 0;

  bill.groups.forEach((grp, gIdx) => {
    // Group Header Row
    tableBody.push([
      {
        content: `GROUP ${gIdx + 1}: ${grp.groupName.toUpperCase()} ${grp.area ? `[${grp.area}]` : ''}`,
        colSpan: isClientSheet ? 9 : 11,
        styles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          halign: 'left',
        },
      },
    ]);

    grp.items.forEach((item, iIdx) => {
      grandTotalKg += item.kg || 0;
      grandTotalAmount += item.amount || 0;

      const overrideIndicator = item.isManualKgOverride ? ' [OVR]' : '';

      // Determine unit weight display: prioritize manually entered unitWeight,
      // fallback to calculated kg/quantity, and only fallback to unit if not NOS
      let unitWeightDisplay = '-';
      if (item.unitWeight !== undefined && item.unitWeight !== null && Number(item.unitWeight) > 0) {
        const num = Number(item.unitWeight);
        unitWeightDisplay = Number.isInteger(num) ? num.toString() : num.toFixed(2);
      } else if (item.kg && item.quantity && item.quantity > 0) {
        const computedUnitWt = Math.round((item.kg / item.quantity) * 100) / 100;
        unitWeightDisplay = computedUnitWt > 0
          ? (Number.isInteger(computedUnitWt) ? computedUnitWt.toString() : computedUnitWt.toFixed(2))
          : '-';
      } else if (item.unit && item.unit !== 'NOS') {
        unitWeightDisplay = item.unit;
      }

      if (isClientSheet) {
        tableBody.push([
          (iIdx + 1).toString(),
          item.descriptionItem || '-',
          item.thickness ? item.thickness.toString() : '-',
          item.length ? item.length.toString() : '-',
          item.width ? item.width.toString() : '-',
          item.quantity.toString(),
          unitWeightDisplay,
          `${(item.kg || 0).toLocaleString('en-IN')}${overrideIndicator}`,
          item.remark || '',
        ]);
      } else {
        tableBody.push([
          (iIdx + 1).toString(),
          item.descriptionItem || '-',
          item.thickness ? item.thickness.toString() : '-',
          item.length ? item.length.toString() : '-',
          item.width ? item.width.toString() : '-',
          item.quantity.toString(),
          unitWeightDisplay,
          `${(item.kg || 0).toLocaleString('en-IN')}${overrideIndicator}`,
          (item.rate || 0).toLocaleString('en-IN'),
          (item.amount || 0).toLocaleString('en-IN'),
          item.remark || '',
        ]);
      }
    });

    // Group Subtotal Row
    if (isClientSheet) {
      tableBody.push([
        {
          content: `Subtotal for ${grp.groupName}:`,
          colSpan: 7,
          styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] },
        },
        {
          content: `${(grp.groupTotalKg || 0).toLocaleString('en-IN')} KG (${(((grp.groupTotalKg || 0) / 1000).toFixed(3))} MT)`,
          styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252], textColor: [15, 23, 42] },
        },
        {
          content: '',
          styles: { fillColor: [248, 250, 252] },
        },
      ]);
    } else {
      tableBody.push([
        {
          content: `Subtotal for ${grp.groupName}:`,
          colSpan: 7,
          styles: { fontStyle: 'bold', halign: 'right', fillColor: [250, 250, 250] },
        },
        {
          content: `${(grp.groupTotalKg || 0).toLocaleString('en-IN')} KG`,
          styles: { fontStyle: 'bold', halign: 'right', fillColor: [250, 250, 250] },
        },
        {
          content: '',
          styles: { fillColor: [250, 250, 250] },
        },
        {
          content: `Rs. ${(grp.groupTotalAmount || 0).toLocaleString('en-IN')}`,
          styles: { fontStyle: 'bold', halign: 'right', fillColor: [250, 250, 250] },
        },
        {
          content: '',
          styles: { fillColor: [250, 250, 250] },
        },
      ]);
    }
  });

  // Grand Total Row
  if (isClientSheet) {
    tableBody.push([
      {
        content: 'TOTAL MEASURED & VERIFIED WEIGHT:',
        colSpan: 7,
        styles: {
          fontStyle: 'bold',
          halign: 'right',
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
        },
      },
      {
        content: `${grandTotalKg.toLocaleString('en-IN')} KG (${(grandTotalKg / 1000).toFixed(3)} MT)`,
        styles: {
          fontStyle: 'bold',
          halign: 'right',
          fillColor: [15, 23, 42],
          textColor: [245, 158, 11],
        },
      },
      {
        content: '',
        styles: { fillColor: [15, 23, 42] },
      },
    ]);
  } else {
    tableBody.push([
      {
        content: 'GRAND TOTAL MEASURED VALUE:',
        colSpan: 7,
        styles: {
          fontStyle: 'bold',
          halign: 'right',
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
        },
      },
      {
        content: `${grandTotalKg.toLocaleString('en-IN')} KG`,
        styles: {
          fontStyle: 'bold',
          halign: 'right',
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
        },
      },
      {
        content: '',
        styles: { fillColor: [15, 23, 42] },
      },
      {
        content: `Rs. ${grandTotalAmount.toLocaleString('en-IN')}`,
        styles: {
          fontStyle: 'bold',
          halign: 'right',
          fillColor: [15, 23, 42],
          textColor: [245, 158, 11],
        },
      },
      {
        content: '',
        styles: { fillColor: [15, 23, 42] },
      },
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
    },
    columnStyles: isClientSheet
      ? {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: isWide ? 85 : 55 },
          2: { cellWidth: 16, halign: 'center' },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 16, halign: 'center' },
          5: { cellWidth: 16, halign: 'center' },
          6: { cellWidth: 22, halign: 'center' },
          7: { cellWidth: 32, halign: 'right' },
          8: { cellWidth: 'auto' },
        }
      : {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 62 },
          2: { cellWidth: 14, halign: 'center' },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 16, halign: 'center' },
          5: { cellWidth: 14, halign: 'center' },
          6: { cellWidth: 14, halign: 'center' },
          7: { cellWidth: 24, halign: 'right' },
          8: { cellWidth: 20, halign: 'right' },
          9: { cellWidth: 26, halign: 'right' },
          10: { cellWidth: 'auto' },
        },
    margin: { left: margin, right: margin },
  });

  let finalY = (doc as any).lastAutoTable?.finalY || currentY + 60;

  // If table ran close to bottom of page, add a new page for signatures/summaries
  if (finalY > pageHeight - 55) {
    doc.addPage();
    finalY = margin + 10;
  }

  if (isClientSheet) {
    // Client Verification Summary & Scope (Without monetary rate/amount deductions)
    const boxW = (pageWidth - margin * 2 - 8) / 2;

    // Box 1: Scope Progress
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, finalY + 4, boxW, 40, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, finalY + 4, boxW, 40, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('MEASURED WEIGHT & SCOPE PROGRESS', margin + 3, finalY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Total Measured Weight: ${grandTotalKg.toLocaleString('en-IN')} KG`, margin + 3, finalY + 16);
    doc.text(`Weight in Metric Tonnes: ${(grandTotalKg / 1000).toFixed(3)} MT`, margin + 3, finalY + 22);
    doc.text(`Total Items Listed: ${bill.groups.reduce((acc, g) => acc + g.items.length, 0)} Nos`, margin + 3, finalY + 28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`Status: ${bill.status.toUpperCase()}`, margin + 3, finalY + 35);

    // Box 2: Joint Inspection & Client Verification Certificate
    doc.setFillColor(248, 250, 252);
    doc.rect(margin + boxW + 8, finalY + 4, boxW, 40, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin + boxW + 8, finalY + 4, boxW, 40, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('JOINT SITE VERIFICATION CERTIFICATE', margin + boxW + 11, finalY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Certified that the items, dimensions, lengths, widths and unit weights', margin + boxW + 11, finalY + 16);
    doc.text('detailed above have been jointly inspected and physically checked', margin + boxW + 11, finalY + 21);
    doc.text('at site against approved fabrication drawings and found verified.', margin + boxW + 11, finalY + 26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(245, 158, 11);
    doc.text('RATES & FINANCIAL CHARGES OMITTED AS PER CLIENT CHECKING STANDARD', margin + boxW + 11, finalY + 34);
  } else {
    // Deductions & Financials Summary Table (Right column)
    const deductionsX = pageWidth - margin - 100;
    const d = bill.deductions;

    autoTable(doc, {
      startY: finalY + 4,
      margin: { left: deductionsX, right: margin },
      theme: 'plain',
      styles: { fontSize: 7.5, cellPadding: 1.2 },
      body: [
        ['Gross Work Subtotal:', `Rs. ${d.subtotal.toLocaleString('en-IN')}`],
        [`Add: GST (${d.gstRate}%):`, `+ Rs. ${d.gstAmount.toLocaleString('en-IN')}`],
        ['Other Charges / Freight:', `+ Rs. ${d.otherCharges.toLocaleString('en-IN')}`],
        [{ content: 'Gross Bill Amount:', styles: { fontStyle: 'bold' } }, { content: `Rs. ${d.grossBill.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold' } }],
        [`Less: TDS (${d.tdsRate || 2}%):`, `- Rs. ${d.tdsAmount.toLocaleString('en-IN')}`],
        [`Less: Retention (${d.retentionRate || 5}%):`, `- Rs. ${d.retentionAmount.toLocaleString('en-IN')}`],
        ['Less: Advance Recovery:', `- Rs. ${d.advanceRecovery.toLocaleString('en-IN')}`],
        ['Less: Material Recovery:', `- Rs. ${d.materialRecovery.toLocaleString('en-IN')}`],
        [{ content: 'Total Deductions:', styles: { fontStyle: 'bold', textColor: [220, 38, 38] } }, { content: `- Rs. ${d.totalDeduction.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', textColor: [220, 38, 38] } }],
        [{ content: 'NET PAYABLE BILL:', styles: { fontStyle: 'bold', fillColor: [15, 23, 42], textColor: [255, 255, 255] } }, { content: `Rs. ${d.netBill.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [15, 23, 42], textColor: [34, 197, 94] } }],
        ['Amount Received Till Date:', `Rs. ${d.amountReceived.toLocaleString('en-IN')}`],
        [{ content: 'Balance Pending:', styles: { fontStyle: 'bold' } }, { content: `Rs. ${d.balanceAmount.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold' } }],
      ],
    });

    // Cumulative Scope Progress (Left side box)
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, finalY + 4, deductionsX - margin - 8, 42, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, finalY + 4, deductionsX - margin - 8, 42, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('CUMULATIVE CONTRACT QUANTITY & PROGRESS', margin + 3, finalY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const contractQtyStr = (bill.contractQuantity || 0).toLocaleString('en-IN');
    const prevQtyStr = (bill.previousQuantity || 0).toLocaleString('en-IN');
    const currQtyStr = (bill.currentQuantity || grandTotalKg).toLocaleString('en-IN');
    const cumQtyStr = (bill.cumulativeQuantity || grandTotalKg).toLocaleString('en-IN');
    const balQtyStr = (bill.balanceQuantity || 0).toLocaleString('en-IN');
    const compPct = bill.completionPercentage || 0;

    doc.text(`Total Contract Scope: ${contractQtyStr} KG`, margin + 3, finalY + 16);
    doc.text(`Previous Billed Qty: ${prevQtyStr} KG`, margin + 3, finalY + 21);
    doc.text(`Current Bill Qty: ${currQtyStr} KG`, margin + 3, finalY + 26);
    doc.text(`Cumulative Billed Qty: ${cumQtyStr} KG`, margin + 3, finalY + 31);
    doc.text(`Balance Remaining Scope: ${balQtyStr} KG`, margin + 3, finalY + 36);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text(`Overall Progress: ${compPct}% Completed`, margin + 3, finalY + 42);
  }

  // Signatures Section
  const sigY = pageHeight - margin - 18;
  const sigW = (pageWidth - margin * 2) / 4;

  const signatures = [
    { title: 'PREPARED BY', name: bill.preparedBy || 'Site Engineer' },
    { title: 'CHECKED BY', name: bill.checkedBy || 'Billing Engineer' },
    { title: 'VERIFIED BY', name: bill.verifiedBy || 'Resident Manager' },
    { title: 'APPROVED BY', name: bill.approvedBy || 'Managing Director' },
  ];

  signatures.forEach((sig, idx) => {
    const xPos = margin + idx * sigW;
    doc.setDrawColor(148, 163, 184);
    doc.line(xPos + 2, sigY + 6, xPos + sigW - 6, sigY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(sig.title, xPos + 2, sigY + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(sig.name, xPos + 2, sigY + 14);
  });

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `SR GROUP ERP – Official Measurement Bill Document • Generated on ${new Date().toLocaleString('en-IN')}`,
    margin,
    pageHeight - margin + 4
  );

  const cleanBillNo = bill.billNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  return { doc, blobUrl, cleanBillNo };
}

/**
 * Generates an industrial-grade PDF measurement bill (download or direct print)
 */
export function exportMeasurementBillToPdf(
  bill: MeasurementBill,
  options: PdfExportOptions = {}
) {
  const { doc, cleanBillNo } = buildMeasurementBillPdf(bill, options);
  if (options.action === 'print') {
    printJsPdfDocument(doc, `${cleanBillNo}_MEASUREMENT_BILL`);
  } else {
    doc.save(`${cleanBillNo}_MEASUREMENT_BILL.pdf`);
  }
}

/**
 * Directly prints the measurement bill
 */
export function printMeasurementBillToPdf(
  bill: MeasurementBill,
  options: Omit<PdfExportOptions, 'action'> = {}
) {
  exportMeasurementBillToPdf(bill, { ...options, action: 'print' });
}

/**
 * Exports measurement bill to comprehensive Excel spreadsheet
 */
export function exportMeasurementBillToExcel(bill: MeasurementBill) {
  const wb = XLSX.utils.book_new();

  // 1. Details & Header Sheet
  const headerData = [
    ['SR GROUP – MEASUREMENT & MUSTER BILL REPORT'],
    ['Company', bill.companyName],
    ['Client', bill.client],
    ['Project ID', bill.projectId],
    ['Project Name', bill.projectName],
    ['Site', bill.site],
    ['Work Order No', bill.workOrderNo || 'N/A'],
    ['PO No', bill.poNo || 'N/A'],
    ['Contract No', bill.contractNo || 'N/A'],
    ['Bill No', bill.billNo],
    ['Bill Type', bill.billType],
    ['Bill Date', bill.billDate],
    ['Measurement Date', bill.measurementDate],
    ['Period From', bill.workPeriodFrom || ''],
    ['Period To', bill.workPeriodTo || ''],
    ['Status', bill.status],
    ['Linked IDM', bill.linkedIdmNos ? bill.linkedIdmNos.join(', ') : 'None'],
    ['Prepared By', bill.preparedBy],
    ['Approved By', bill.approvedBy || ''],
    ['Remarks', bill.remarks || ''],
    [],
    ['FINANCIAL SUMMARY'],
    ['Gross Subtotal (₹)', bill.deductions.subtotal],
    ['GST Rate (%)', bill.deductions.gstRate],
    ['GST Amount (₹)', bill.deductions.gstAmount],
    ['Other Charges (₹)', bill.deductions.otherCharges],
    ['Gross Bill (₹)', bill.deductions.grossBill],
    ['TDS (₹)', bill.deductions.tdsAmount],
    ['Retention (₹)', bill.deductions.retentionAmount],
    ['Advance Recovery (₹)', bill.deductions.advanceRecovery],
    ['Material Recovery (₹)', bill.deductions.materialRecovery],
    ['Total Deductions (₹)', bill.deductions.totalDeduction],
    ['NET BILL PAYABLE (₹)', bill.deductions.netBill],
    ['Amount Received (₹)', bill.deductions.amountReceived],
    ['Balance Pending (₹)', bill.deductions.balanceAmount],
  ];

  const wsHeader = XLSX.utils.aoa_to_sheet(headerData);
  XLSX.utils.book_append_sheet(wb, wsHeader, 'Bill Summary');

  // 2. Measurements Sheet with all groups and item rows
  const itemRows: any[] = [];
  itemRows.push([
    'Group Name',
    'Group Area',
    'Sl No',
    'Item Code',
    'Item Description',
    'Measurement Type',
    'Thickness (mm)',
    'Length (mm/m)',
    'Width (mm/m)',
    'Diameter (mm)',
    'Quantity',
    'Unit',
    'Unit Wt (kg/m)',
    'Weight (KG)',
    'Rate (₹)',
    'Amount (₹)',
    'Manual Override',
    'Remarks',
  ]);

  bill.groups.forEach((grp) => {
    grp.items.forEach((item) => {
      itemRows.push([
        grp.groupName,
        grp.area || '',
        item.slNo,
        item.itemCode || '',
        item.descriptionItem,
        item.measurementType,
        item.thickness || '',
        item.length || '',
        item.width || '',
        item.diameter || '',
        item.quantity,
        item.unit,
        item.unitWeight || '',
        item.kg || 0,
        item.rate,
        item.amount,
        item.isManualKgOverride ? 'YES' : 'NO',
        item.remark || '',
      ]);
    });
  });

  const wsItems = XLSX.utils.aoa_to_sheet(itemRows);
  XLSX.utils.book_append_sheet(wb, wsItems, 'Measurements Table');

  const cleanBillNo = bill.billNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `${cleanBillNo}_MEASUREMENT_BILL.xlsx`);
}

/**
 * Exports client measurement verification sheet to Excel without any rate or monetary columns
 */
export function exportClientMeasurementSheetToExcel(bill: MeasurementBill) {
  const wb = XLSX.utils.book_new();

  let grandTotalKg = 0;
  let totalItems = 0;

  bill.groups.forEach((g) => {
    grandTotalKg += g.groupTotalKg || 0;
    totalItems += g.items.length;
  });

  // 1. Details & Header Sheet
  const headerData = [
    ['SR GROUP – CLIENT JOINT MEASUREMENT SHEET (FOR CHECKING & VERIFICATION)'],
    ['Company', bill.companyName],
    ['Client', bill.client],
    ['Project ID', bill.projectId],
    ['Project Name', bill.projectName],
    ['Site / Location', bill.site || 'Site'],
    ['Work Order No', bill.workOrderNo || 'N/A'],
    ['PO No', bill.poNo || 'N/A'],
    ['Contract No', bill.contractNo || 'N/A'],
    ['Sheet No', bill.billNo],
    ['Document Type', 'Client Measurement Checking Sheet (Without Rates)'],
    ['Sheet Date', bill.billDate],
    ['Measurement Date', bill.measurementDate],
    ['Period From', bill.workPeriodFrom || ''],
    ['Period To', bill.workPeriodTo || ''],
    ['Status', bill.status],
    ['Prepared By', bill.preparedBy],
    ['Checked By', bill.checkedBy || ''],
    ['Verified By', bill.verifiedBy || ''],
    ['Approved By', bill.approvedBy || ''],
    ['Remarks', bill.remarks || ''],
    [],
    ['WEIGHT & SCOPE VERIFICATION SUMMARY'],
    ['Total Items Inspected', totalItems],
    ['Total Verified Weight (KG)', grandTotalKg],
    ['Total Verified Weight (MT)', Math.round((grandTotalKg / 1000) * 1000) / 1000],
    ['Rates / Financial Values', 'OMITTED AS PER CLIENT CHECKING PROTOCOL'],
  ];

  const wsHeader = XLSX.utils.aoa_to_sheet(headerData);
  XLSX.utils.book_append_sheet(wb, wsHeader, 'Sheet Summary');

  // 2. Measurements Sheet without Rate and Amount
  const itemRows: any[] = [];
  itemRows.push([
    'Group Name',
    'Group Area',
    'Sl No',
    'Item Description',
    'Thickness (mm)',
    'Length (m)',
    'Width (m)',
    'Quantity',
    'Unit Wt (kg/m)',
    'Weight (KG)',
    'Weight (MT)',
    'Remarks / Grid / Location',
  ]);

  bill.groups.forEach((grp) => {
    grp.items.forEach((item, iIdx) => {
      let unitWeightDisplay = '-';
      if (item.unitWeight !== undefined && item.unitWeight !== null && Number(item.unitWeight) > 0) {
        unitWeightDisplay = Number(item.unitWeight).toFixed(2);
      } else if (item.kg && item.quantity && item.quantity > 0) {
        unitWeightDisplay = (Math.round((item.kg / item.quantity) * 100) / 100).toFixed(2);
      }

      itemRows.push([
        grp.groupName,
        grp.area || '',
        iIdx + 1,
        item.descriptionItem,
        item.thickness || '',
        item.length || '',
        item.width || '',
        item.quantity,
        unitWeightDisplay,
        item.kg || 0,
        Math.round(((item.kg || 0) / 1000) * 1000) / 1000,
        item.remark || '',
      ]);
    });
  });

  const wsItems = XLSX.utils.aoa_to_sheet(itemRows);
  XLSX.utils.book_append_sheet(wb, wsItems, 'Measurement Details');

  const cleanBillNo = bill.billNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `${cleanBillNo}_CLIENT_MEASUREMENT_SHEET.xlsx`);
}

