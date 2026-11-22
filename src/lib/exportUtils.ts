import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AttendanceRecord,
  Company,
  DailyWorkEntry,
  ExpenseEntry,
  IncomeEntry,
  Project,
  ProfitLossSummary,
  SalaryPayment,
  Worker,
} from '../types';
import { formatCurrency } from './calculations';
import { printJsPdfDocument } from './printUtils';

// -------------------------------------------------------------
// EXCEL EXPORTS (XLSX)
// -------------------------------------------------------------

export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportDailyWorkExcel(workList: DailyWorkEntry[], companies: Company[], projects: Project[]) {
  const formatted = workList.map((w, index) => {
    const comp = companies.find((c) => c.id === w.companyId)?.name || w.companyId;
    const proj = projects.find((p) => p.id === w.projectId)?.projectName || w.projectId;
    return {
      'S.No': index + 1,
      Date: w.date,
      Company: comp,
      Project: proj,
      Site: w.site,
      Category: w.workCategory,
      Description: w.workDescription,
      'Target Qty': w.quantity,
      Unit: w.unit,
      'Completed Qty': w.completedQuantity,
      'Remaining Qty': w.remainingQuantity,
      Rate: w.rate,
      'Work Value (INR)': w.workValue,
      Supervisor: w.supervisor,
      Remarks: w.remarks || '',
    };
  });
  exportToExcel(formatted, 'SR_GROUP_Daily_Work_Report', 'Daily Work');
}

export function exportAttendanceExcel(records: AttendanceRecord[], companies: Company[], projects: Project[]) {
  const formatted = records.map((a, index) => {
    const comp = companies.find((c) => c.id === a.companyId)?.name || a.companyId;
    const proj = projects.find((p) => p.id === a.projectId)?.projectName || a.projectId;
    return {
      'S.No': index + 1,
      Date: a.date,
      'Worker Name': a.workerName,
      Company: comp,
      Project: proj,
      Status: a.status,
      'Daily Rate (INR)': a.dailyRate,
      'OT Hours': a.overtimeHours,
      'OT Rate (INR/hr)': a.overtimeRate,
      'Basic Wage (INR)': a.basicWage,
      'OT Wage (INR)': a.overtimeWage,
      'Net Daily Wage (INR)': a.netDailyWage,
      Remarks: a.remarks || '',
    };
  });
  exportToExcel(formatted, 'SR_GROUP_Worker_Attendance', 'Attendance');
}

export function exportSalaryExcel(salaries: SalaryPayment[], companies: Company[], projects: Project[]) {
  const formatted = salaries.map((s, index) => {
    const comp = companies.find((c) => c.id === s.companyId)?.name || s.companyId;
    const proj = projects.find((p) => p.id === s.projectId)?.projectName || s.projectId;
    return {
      'S.No': index + 1,
      Worker: s.workerName,
      Month: s.month,
      PaymentDate: s.paymentDate,
      Company: comp,
      Project: proj,
      'Days Worked': s.daysWorked,
      'OT Hours': s.otHours,
      'Basic Salary (INR)': s.basicSalary,
      'OT Salary (INR)': s.otSalary,
      'Advance Deducted (INR)': s.advance,
      'Net Salary (INR)': s.netSalary,
      'Paid Amount (INR)': s.paidAmount,
      Status: s.status,
      'Payment Mode': s.paymentMode,
      Remarks: s.remarks || '',
    };
  });
  exportToExcel(formatted, 'SR_GROUP_Salary_Register', 'Salaries');
}

export function exportExpensesExcel(expenses: ExpenseEntry[], companies: Company[], projects: Project[]) {
  const formatted = expenses.map((e, index) => {
    const comp = companies.find((c) => c.id === e.companyId)?.name || e.companyId;
    const proj = projects.find((p) => p.id === e.projectId)?.projectName || e.projectId;
    return {
      'S.No': index + 1,
      Date: e.date,
      Company: comp,
      Project: proj,
      Site: e.site,
      Category: e.expenseCategory,
      Description: e.description,
      'Amount (INR)': e.amount,
      'Payment Mode': e.paymentMode,
      'Paid By': e.paidBy,
      Remarks: e.remarks || '',
    };
  });
  exportToExcel(formatted, 'SR_GROUP_Expenses_Report', 'Expenses');
}

export function exportIncomeExcel(income: IncomeEntry[], companies: Company[], projects: Project[]) {
  const formatted = income.map((i, index) => {
    const comp = companies.find((c) => c.id === i.companyId)?.name || i.companyId;
    const proj = projects.find((p) => p.id === i.projectId)?.projectName || i.projectId;
    return {
      'S.No': index + 1,
      Date: i.date,
      Company: comp,
      Project: proj,
      Client: i.client,
      'Invoice No': i.invoiceNumber,
      Description: i.workDescription,
      'Total Work Value (INR)': i.workValue,
      'Amount Received (INR)': i.amountReceived,
      'Amount Pending (INR)': i.amountPending,
      'Payment Date': i.paymentDate || '',
      'Payment Mode': i.paymentMode || '',
      Remarks: i.remarks || '',
    };
  });
  exportToExcel(formatted, 'SR_GROUP_Income_Billing_Report', 'Income');
}

export function exportProjectsExcel(projects: Project[], companies: Company[]) {
  const formatted = projects.map((p, index) => {
    const comp = companies.find((c) => c.id === p.companyId)?.name || p.companyId;
    return {
      'S.No': index + 1,
      'Project ID': p.projectId,
      'Project Name': p.projectName,
      Company: comp,
      Client: p.client,
      Site: p.site,
      Status: p.projectStatus,
      'Contract Value (INR)': p.contractValue,
      'Start Date': p.startDate,
      'End Date': p.endDate,
      Supervisor: p.supervisor,
      Remarks: p.remarks || '',
    };
  });
  exportToExcel(formatted, 'SR_GROUP_Projects_Register', 'Projects');
}

export function exportProfitLossExcel(summary: ProfitLossSummary, companyName: string, projectName: string) {
  const data = [
    { Parameter: 'SR GROUP Daily Profit/Loss Statement', Value: '' },
    { Parameter: 'Report Date', Value: summary.date },
    { Parameter: 'Company', Value: companyName },
    { Parameter: 'Project', Value: projectName },
    { Parameter: '-----------------------------', Value: '-----------------------------' },
    { Parameter: 'Total Work Value', Value: summary.totalWorkValue },
    { Parameter: 'Total Income', Value: summary.totalIncome },
    { Parameter: 'Total Amount Received (Cash)', Value: summary.totalReceived },
    { Parameter: 'Total Pending Inflow', Value: summary.totalPendingIncome },
    { Parameter: 'Total Active Workers', Value: summary.workerCount },
    { Parameter: 'Present Workers', Value: summary.presentWorkers },
    { Parameter: 'Half-Day Workers', Value: summary.halfDayWorkers },
    { Parameter: 'Absent Workers', Value: summary.absentWorkers },
    { Parameter: 'Total Overtime Hours', Value: summary.totalOtHours },
    { Parameter: 'Total Worker Salary & Wages', Value: summary.totalWorkerSalary },
    { Parameter: 'Total Site Expenses', Value: summary.otherExpenses },
    { Parameter: 'TOTAL EXPENSE (Salary + Site)', Value: summary.totalExpense },
    { Parameter: summary.isProfit ? "TODAY'S NET PROFIT" : "TODAY'S NET LOSS", Value: summary.isProfit ? summary.netProfit : summary.netLoss },
    { Parameter: 'Profit Percentage (%)', Value: `${summary.profitPercentage}%` },
  ];

  exportToExcel(data, `SR_GROUP_Profit_Loss_${summary.date}`, 'Profit Loss');
}

// -------------------------------------------------------------
// PDF EXPORTS (jsPDF + autoTable)
// -------------------------------------------------------------

export function generateDailyReportPDF(
  summary: ProfitLossSummary,
  companyName: string,
  projectName: string,
  workEntries: DailyWorkEntry[],
  expenseEntries: ExpenseEntry[],
  action: 'save' | 'print' = 'save'
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(15, 23, 42); // Navy 900
  doc.rect(0, 0, pageWidth, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SR GROUP', 14, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Engineering, Infrastructure, Heavy Fabrication, Erection & Power Solutions', 14, 23);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(251, 191, 36); // Amber
  doc.text('DAILY WORK, WORKER & PROFIT/LOSS REPORT', 14, 32);

  // Meta Info
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Date: ${summary.date}`, 14, 46);
  doc.text(`Company: ${companyName}`, 14, 52);
  doc.text(`Project: ${projectName}`, 14, 58);

  // Financial KPI Table
  autoTable(doc, {
    startY: 64,
    head: [['Parameter', 'Amount / Value (INR)', 'Operational Metric', 'Status / Count']],
    body: [
      ['Total Work Value', formatCurrency(summary.totalWorkValue), 'Total Workers', `${summary.workerCount} Workers`],
      ['Total Income', formatCurrency(summary.totalIncome), 'Present / Half-Day', `${summary.presentWorkers} Pres / ${summary.halfDayWorkers} Half`],
      ['Worker Salary & OT', formatCurrency(summary.totalWorkerSalary), 'Absent Workers', `${summary.absentWorkers} Absent`],
      ['Material & Site Expenses', formatCurrency(summary.otherExpenses), 'Total OT Hours', `${summary.totalOtHours} Hours`],
      ['TOTAL EXPENSE', formatCurrency(summary.totalExpense), 'Calculation Status', summary.isProfit ? 'PROFITABLE' : 'LOSS REPORTED'],
      [
        summary.isProfit ? "TODAY'S PROFIT" : "TODAY'S LOSS",
        formatCurrency(summary.isProfit ? summary.netProfit : summary.netLoss),
        'Profit Percentage',
        `${summary.profitPercentage}%`,
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Daily Work Summary Table
  const lastY = (doc as any).lastAutoTable.finalY || 130;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Completed Daily Work Entries', 14, lastY + 10);

  const workRows = workEntries.slice(0, 8).map((w, i) => [
    i + 1,
    w.workCategory,
    w.workDescription.substring(0, 40),
    `${w.completedQuantity} ${w.unit}`,
    formatCurrency(w.rate),
    formatCurrency(w.workValue),
  ]);

  autoTable(doc, {
    startY: lastY + 14,
    head: [['#', 'Category', 'Description', 'Qty Done', 'Rate', 'Work Value']],
    body: workRows.length > 0 ? workRows : [['-', 'No work logged', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    styles: { fontSize: 8 },
  });

  // Signature Section at Bottom
  const finalY = (doc as any).lastAutoTable.finalY || 220;
  const signatureY = Math.max(finalY + 25, 245);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  doc.line(14, signatureY, 65, signatureY);
  doc.text('Prepared By', 25, signatureY + 5);
  doc.text('(Site Supervisor)', 22, signatureY + 9);

  doc.line(80, signatureY, 130, signatureY);
  doc.text('Checked By', 95, signatureY + 5);
  doc.text('(Accounts / Manager)', 87, signatureY + 9);

  doc.line(145, signatureY, 195, signatureY);
  doc.text('Approved By', 158, signatureY + 5);
  doc.text('(CMD / Director SR GROUP)', 146, signatureY + 9);

  if (action === 'print') {
    printJsPdfDocument(doc, `SR_GROUP_Daily_Report_${summary.date}`);
  } else {
    doc.save(`SR_GROUP_Daily_Report_${summary.date}.pdf`);
  }
}

export function printDailyReportPDF(
  summary: ProfitLossSummary,
  companyName: string,
  projectName: string,
  workEntries: DailyWorkEntry[],
  expenseEntries: ExpenseEntry[]
) {
  generateDailyReportPDF(summary, companyName, projectName, workEntries, expenseEntries, 'print');
}

export function generateSalaryPDF(
  salaries: SalaryPayment[],
  month: string,
  companyName: string,
  action: 'save' | 'print' = 'save'
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('SR GROUP – WORKER SALARY REGISTER & PAYSLIP SUMMARY', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Company: ${companyName} | Month: ${month}`, 14, 25);

  const rows = salaries.map((s, idx) => [
    idx + 1,
    s.workerName,
    s.daysWorked,
    s.otHours,
    formatCurrency(s.basicSalary),
    formatCurrency(s.otSalary),
    formatCurrency(s.advance),
    formatCurrency(s.netSalary),
    s.status,
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['#', 'Worker Name', 'Days', 'OT Hrs', 'Basic Wage', 'OT Wage', 'Advance', 'Net Payable', 'Status']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 8 },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 200;
  const signatureY = Math.max(finalY + 30, 245);

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.line(14, signatureY, 65, signatureY);
  doc.text('Prepared By (Timekeeper)', 16, signatureY + 5);

  doc.line(80, signatureY, 130, signatureY);
  doc.text('Verified By (Accountant)', 85, signatureY + 5);

  doc.line(145, signatureY, 195, signatureY);
  doc.text('Authorized Signatory', 152, signatureY + 5);

  if (action === 'print') {
    printJsPdfDocument(doc, `SR_GROUP_Salary_Register_${month}`);
  } else {
    doc.save(`SR_GROUP_Salary_Register_${month}.pdf`);
  }
}

export function printSalaryPDF(
  salaries: SalaryPayment[],
  month: string,
  companyName: string
) {
  generateSalaryPDF(salaries, month, companyName, 'print');
}
