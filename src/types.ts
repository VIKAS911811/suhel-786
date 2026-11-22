export type UserRole = 'ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'ACCOUNTANT' | 'VIEWER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  status?: 'Active' | 'Inactive';
  companyId?: string;
  createdAt?: string;
}

export interface Company {
  id: string;
  name: string;
  tagline?: string;
  code?: string;
  specialties?: string[];
  gstNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPhone?: string;
  contactEmail?: string;
  logo?: string;
  createdAt?: string;
}

export type ProjectStatus = 'Planning' | 'Running' | 'Completed' | 'On Hold' | 'Cancelled';

export interface Project {
  id: string;
  projectId: string; // e.g. PRJ-2026-01
  projectName: string;
  companyId: string;
  client: string;
  clientName?: string; // alias
  site: string;
  startDate: string;
  endDate?: string;
  expectedEndDate?: string; // alias
  contractValue: number;
  totalContractValue?: number; // alias
  projectStatus: ProjectStatus;
  supervisor?: string;
  remarks?: string;
  createdAt?: string;
}

export type WorkerCategory = 
  | 'Welder'
  | 'Fitter'
  | 'Fabricator'
  | 'Helper'
  | 'Rigger'
  | 'Electrician'
  | 'Supervisor'
  | 'Operator'
  | 'Other';

export interface Worker {
  id: string;
  workerId: string; // e.g. SR-W001
  workerName: string;
  name?: string; // alias
  mobileNumber?: string;
  mobile?: string; // alias
  skill?: string;
  designation?: string; // alias
  category: WorkerCategory;
  dailyWage?: number; // alias
  dailyRate: number;
  overtimeRate: number; // hourly rate
  joiningDate: string;
  companyId: string;
  projectId: string;
  status: 'Active' | 'Inactive' | 'On Leave';
  remarks?: string;
  createdAt?: string;
}

export type AttendanceStatus = 'Full Day' | 'Half Day' | 'Absent' | 'Leave';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  workerId: string;
  workerName: string;
  companyId: string;
  projectId: string;
  status: AttendanceStatus;
  overtimeHours: number;
  dailyRate: number;
  overtimeRate: number;
  basicWage: number;
  overtimeWage: number;
  netDailyWage: number;
  remarks?: string;
  createdAt?: string;
}

export type PaymentMode = 'Cash' | 'Bank' | 'UPI' | 'Cheque' | 'NEFT/RTGS' | 'Other';
export type SalaryStatus = 'Paid' | 'Pending' | 'Partial';
export type PaymentStatus = 'Received' | 'Pending' | 'Partial';

export interface SalaryPayment {
  id: string;
  workerId: string;
  workerName: string;
  companyId: string;
  projectId: string;
  month: string; // YYYY-MM
  paymentDate: string;
  daysWorked: number;
  otHours: number;
  basicSalary: number;
  otSalary: number;
  advance: number;
  deduction?: number;
  netSalary: number;
  paidAmount: number;
  status: SalaryStatus;
  paymentMode: PaymentMode;
  remarks?: string;
  createdAt?: string;
}

export type WorkCategory =
  | 'Structural Fabrication'
  | 'Structural Erection'
  | 'Pipeline'
  | 'Piping'
  | 'Welding'
  | 'Mechanical Work'
  | 'Equipment Installation'
  | 'Dismantling'
  | 'Power Work'
  | 'Other';

export interface DailyWorkEntry {
  id: string;
  date: string;
  companyId: string;
  projectId: string;
  site: string;
  workCategory: WorkCategory;
  workDescription: string;
  quantity: number;
  unit: string;
  completedQuantity: number;
  remainingQuantity: number;
  rate: number;
  workValue: number; // completedQuantity * rate
  supervisor: string;
  attachment?: string;
  remarks?: string;
  createdAt?: string;
}

export type ExpenseCategory =
  | 'Salary'
  | 'Worker Salary'
  | 'Overtime'
  | 'Material'
  | 'Material Expense'
  | 'Transport'
  | 'Transport Expense'
  | 'Crane'
  | 'Crane/Hydra'
  | 'Machinery'
  | 'Machinery Expense'
  | 'Welding'
  | 'Gas'
  | 'Food'
  | 'Food/Mess'
  | 'Accommodation'
  | 'Room Rent'
  | 'Electricity'
  | 'Tools'
  | 'Maintenance'
  | 'Fuel'
  | 'Diesel/Fuel'
  | 'Site Consumables'
  | 'Safety Equipment'
  | 'Other';

export interface ExpenseEntry {
  id: string;
  date: string;
  companyId: string;
  projectId: string;
  site: string;
  expenseCategory: ExpenseCategory;
  category?: ExpenseCategory; // alias
  description: string;
  amount: number;
  paymentMode: PaymentMode;
  paidBy: string;
  vendor?: string;
  billNumber?: string;
  receiptBillNo?: string;
  attachment?: string;
  remarks?: string;
  createdAt?: string;
}

export interface IncomeEntry {
  id: string;
  date: string;
  companyId: string;
  projectId: string;
  client?: string;
  clientName?: string; // alias
  workDescription?: string;
  invoiceNumber: string;
  workValue: number;
  billAmount?: number; // alias
  amountReceived: number;
  receivedAmount?: number; // alias
  amountPending: number;
  pendingAmount?: number; // alias
  paymentStatus?: PaymentStatus;
  status?: string;
  paymentDate?: string;
  paymentMode?: PaymentMode;
  remarks?: string;
  createdAt?: string;
}

// -------------------------------------------------------------
// MEASUREMENT & MUSTER BILL TYPES
// -------------------------------------------------------------

export type MeasurementType =
  | 'Plate'
  | 'Structural Section'
  | 'TMT'
  | 'Pipe'
  | 'Square Tube'
  | 'Labour Muster'
  | 'Custom';

export type ColumnType =
  | 'Text'
  | 'Number'
  | 'Decimal'
  | 'Date'
  | 'Dropdown'
  | 'Quantity'
  | 'Measurement'
  | 'Rate'
  | 'Formula'
  | 'Remark'
  | 'Attachment';

export interface DynamicColumn {
  id: string;
  key: string;
  label: string;
  type: ColumnType;
  mandatory?: boolean;
  decimalPlaces?: number;
  dropdownOptions?: string[];
  formula?: string; // expression, e.g. "length * width * thickness * 7.85 * quantity / 1000000"
  hidden?: boolean;
  order: number;
  width?: string;
  align?: 'left' | 'center' | 'right';
  unit?: string;
}

export interface MeasurementItem {
  id: string;
  slNo: number;
  itemCode?: string;
  descriptionItem: string;
  measurementType: MeasurementType;
  // Standard geometric dimensions
  thickness?: number; // mm
  length?: number;    // mm or m
  width?: number;     // mm or m
  height?: number;    // mm or m
  depth?: number;     // mm or m
  diameter?: number;  // mm
  quantity: number;
  unit: string;       // KG, MT, MTR, SQM, SQFT, NOS, DAYS
  unitWeight?: number;// kg/m, kg/sqm, etc.
  kg?: number;
  mtr?: number;
  sqm?: number;
  sqft?: number;
  rate: number;
  rateBasis?: string; // KG, MT, NOS, MTR, SQM, SQFT, etc.
  amount: number;
  remark?: string;
  // Manual override indicators
  isManualKgOverride?: boolean;
  manualKgValue?: number;
  // Labour Muster specifics
  workerName?: string;
  musterDate?: string;
  fullDay?: boolean;
  halfDay?: boolean;
  otHours?: number;
  dailyWage?: number;
  // Dynamic columns key-value map
  customFields?: Record<string, any>;
}

export interface MeasurementGroup {
  id: string;
  groupName: string;
  area?: string;
  location?: string;
  machine?: string;
  equipment?: string;
  building?: string;
  floor?: string;
  grid?: string;
  elevation?: string;
  workFront?: string;
  department?: string;
  remarks?: string;
  items: MeasurementItem[];
  groupTotalKg?: number;
  groupTotalAmount: number;
}

export type BillStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Verification'
  | 'Approved'
  | 'Rejected'
  | 'Partially Paid'
  | 'Paid'
  | 'Cancelled';

export interface BillDeductions {
  subtotal: number;
  gstRate: number; // e.g. 18%
  gstAmount: number;
  otherCharges: number;
  grossBill: number;
  tdsRate?: number; // e.g. 2%
  tdsAmount: number;
  retentionRate?: number; // e.g. 5%
  retentionAmount: number;
  advanceRecovery: number;
  materialRecovery: number;
  otherDeduction: number;
  totalDeduction: number;
  netBill: number;
  amountReceived: number;
  balanceAmount: number;
}

export interface BillStatusHistory {
  id: string;
  status: BillStatus;
  changedBy: string;
  timestamp: string;
  remarks?: string;
}

export interface BillRevision {
  id: string;
  revisionNumber: number;
  createdAt: string;
  createdBy: string;
  summaryOfChanges: string;
  snapshotData: string; // JSON stringified bill snapshot
}

export interface BillPayment {
  id: string;
  paymentDate: string;
  amount: number;
  paymentMode: PaymentMode;
  transactionRef?: string;
  receivedBy?: string;
  remarks?: string;
}

export interface MeasurementBill {
  id: string;
  // Header Info
  companyId: string;
  companyName: string;
  companyLogo?: string;
  client: string;
  projectId: string;
  projectName: string;
  site: string;
  workOrderNo?: string;
  poNo?: string;
  contractNo?: string;
  billNo: string;
  billType: 'Measurement Bill' | 'Labour Muster Bill' | 'Final Bill' | 'RA Bill' | 'Advance Bill' | 'Client Measurement Sheet';
  billDate: string;
  measurementDate: string;
  workPeriodFrom?: string;
  workPeriodTo?: string;
  department?: string;
  area?: string;
  supervisor?: string;
  preparedBy: string;
  checkedBy?: string;
  verifiedBy?: string;
  approvedBy?: string;
  remarks?: string;
  attachments?: string[];

  // Cumulative tracking
  contractQuantity?: number;
  previousQuantity?: number;
  currentQuantity: number;
  cumulativeQuantity: number;
  rate?: number;
  previousAmount?: number;
  currentAmount: number;
  cumulativeAmount: number;
  balanceQuantity?: number;
  completionPercentage?: number;

  // Measurement Groups & Items
  groups: MeasurementGroup[];
  dynamicColumns?: DynamicColumn[];

  // Calculation Snapshot
  formulaSnapshot?: Record<string, string>;

  // Linked IDMs
  linkedIdmNos?: string[];

  // Deductions & Financials
  deductions: BillDeductions;

  // Status & Revisions
  status: BillStatus;
  statusHistory: BillStatusHistory[];
  revisions: BillRevision[];
  payments: BillPayment[];

  createdAt: string;
  updatedAt?: string;
}

// -------------------------------------------------------------
// IDM MANAGEMENT TYPES
// -------------------------------------------------------------

export interface IDMRecord {
  id: string;
  idmNo: string; // e.g. IDM-2026-001
  idmDate: string;
  idmReference?: string;
  projectId: string;
  projectName?: string;
  billNo?: string;
  description: string;
  quantity: number;
  unit: string;
  status: 'Draft' | 'Submitted' | 'Verified' | 'Approved' | 'Closed';
  attachment?: string;
  remarks?: string;
  createdAt: string;
}

// -------------------------------------------------------------
// ITEM MASTER & TEMPLATES
// -------------------------------------------------------------

export interface ItemMaster {
  id: string;
  itemCode: string; // e.g. PL-10, BEAM-ISMB-250
  description: string;
  category: string;
  unit: string;
  unitWeight?: number; // standard kg/m or kg/sqm
  defaultRate: number;
  measurementType: MeasurementType;
  specifications?: string;
  defaultLength?: number;
  defaultThickness?: number;
  defaultWidth?: number;
  defaultDiameter?: number;
  createdAt?: string;
}

export interface MeasurementTemplate {
  id: string;
  name: string; // Structural Fabrication, Piping, Plate Measurement, etc.
  category: string;
  description: string;
  measurementType: MeasurementType;
  defaultColumns: DynamicColumn[];
  defaultDeductions?: Partial<BillDeductions>;
  formulaSettings?: Record<string, string>;
  isSystem?: boolean;
  createdAt?: string;
}

export interface FormulaSetting {
  id: string;
  name: string;
  measurementType: MeasurementType;
  formulaExpression: string; // e.g. "length * width * thickness * 0.00000785 * quantity"
  description: string;
  variables: string[];
  unit: string;
}

// -------------------------------------------------------------
// AUDIT & SETTINGS
// -------------------------------------------------------------

export interface AuditLog {
  id: string;
  user: string;
  userRole: UserRole;
  action: 'Created' | 'Updated' | 'Deleted' | 'Exported' | 'Reset' | 'Approved' | 'Rejected' | 'Submitted';
  module:
    | 'Work'
    | 'Worker'
    | 'Attendance'
    | 'Salary'
    | 'Expense'
    | 'Income'
    | 'Project'
    | 'Company'
    | 'Measurement Bill'
    | 'IDM'
    | 'Item Master'
    | 'Template'
    | 'System';
  recordId?: string;
  recordDescription: string;
  timestamp: string;
  date?: string;
  time?: string;
}

export interface SystemSettings {
  appName: string;
  companyGroup: string;
  defaultCurrency: string;
  standardWorkHours: number;
  defaultOvertimeMultiplier: number;
  autoCalculateSalaryInExpenses: boolean;
  enableAuditLogging: boolean;
  defaultGstPercentage: number;
  defaultTdsPercentage: number;
  defaultRetentionPercentage: number;
  steelDensity: number; // 7.85 g/cm3
}

export interface FilterState {
  date: string;
  datePreset?: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
  startDate?: string;
  endDate?: string;
  companyId: string; // 'all' or company id
  projectId: string; // 'all' or project id
  viewMode: 'work_value' | 'cash_received' | 'received_income';
  searchTerm?: string;
  categoryFilter?: string;
  workerFilter?: string;
  statusFilter?: string;
}

export interface ProfitLossSummary {
  date: string;
  totalWorkValue: number;
  totalIncome: number;
  totalReceived: number;
  totalPendingIncome: number;
  workerCount: number;
  presentWorkers: number;
  halfDayWorkers: number;
  absentWorkers: number;
  totalOtHours: number;
  totalWorkerSalary: number;
  otherExpenses: number;
  totalExpense: number;
  netProfit: number;
  netLoss: number;
  isProfit: boolean;
  profitPercentage: number;
  categoryExpenses: Record<string, number>;
  // Measurement Bill metrics
  approvedBillsCount: number;
  pendingBillsCount: number;
  totalBilledAmount: number;
  totalBillReceived: number;
  totalBillBalance: number;
  projectProgressPct: number;
}

export type NavTab =
  | 'dashboard'
  | 'measurement_bills'
  | 'bill_register'
  | 'idm'
  | 'item_master'
  | 'templates'
  | 'daily_work'
  | 'projects'
  | 'workers'
  | 'attendance'
  | 'salary'
  | 'expenses'
  | 'income'
  | 'charts'
  | 'reports'
  | 'companies'
  | 'users'
  | 'settings'
  | 'audit_log';

