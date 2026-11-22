import React, { useEffect, useState } from 'react';
import {
  Company,
  Project,
  Worker,
  AttendanceRecord,
  DailyWorkEntry,
  ExpenseEntry,
  IncomeEntry,
  SalaryPayment,
  User,
  AuditLog,
  FilterState,
  SystemSettings,
  ProfitLossSummary,
  MeasurementBill,
  IDMRecord,
  ItemMaster,
  MeasurementTemplate,
  FormulaSetting,
} from './types';
import {
  syncFromServer,
  apiSaveRecord,
  apiDeleteRecord,
  apiBulkAttendance,
  apiResetDatabase,
  createAuditLog,
  initialFullState,
  saveLocalCache,
  saveUserFullStateToServer,
  AppDatabaseState,
} from './lib/storage';
import { calculateProfitLossSummary } from './lib/calculations';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AuthScreen } from './components/AuthScreen';
import { DailyWorkModule } from './components/DailyWorkModule';
import { WorkerModule } from './components/WorkerModule';
import { AttendanceModule } from './components/AttendanceModule';
import { SalaryModule } from './components/SalaryModule';
import { ExpenseModule } from './components/ExpenseModule';
import { IncomeModule } from './components/IncomeModule';
import { ProjectModule } from './components/ProjectModule';
import { ChartsModule } from './components/ChartsModule';
import { ReportsModule } from './components/ReportsModule';
import { AdminModule } from './components/AdminModule';
import { DateRefreshSection } from './components/DateRefreshSection';
import { MeasurementBillModule } from './components/MeasurementBillModule';
import { ClientMeasurementSheetModule } from './components/ClientMeasurementSheetModule';
import { BillRegisterModule } from './components/BillRegisterModule';
import { IDMModule } from './components/IDMModule';
import { ItemMasterModule } from './components/ItemMasterModule';
import { TemplatesModule } from './components/TemplatesModule';
import { ProfitLossModule } from './components/ProfitLossModule';

export default function App() {
  // Core State
  const [companies, setCompanies] = useState<Company[]>(initialFullState.companies);
  const [projects, setProjects] = useState<Project[]>(initialFullState.projects);
  const [workers, setWorkers] = useState<Worker[]>(initialFullState.workers);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(initialFullState.attendance);
  const [workEntries, setWorkEntries] = useState<DailyWorkEntry[]>(initialFullState.daily_work);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>(initialFullState.expenses);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>(initialFullState.income);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>(initialFullState.salaries);
  const [users, setUsers] = useState<User[]>(initialFullState.users);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialFullState.audit_logs);
  const [settings, setSettings] = useState<SystemSettings>(initialFullState.settings);

  // Measurement & Billing States
  const [measurementBills, setMeasurementBills] = useState<MeasurementBill[]>(
    initialFullState.measurement_bills || []
  );
  const [idmRecords, setIdmRecords] = useState<IDMRecord[]>(initialFullState.idm_records || []);
  const [itemMaster, setItemMaster] = useState<ItemMaster[]>(initialFullState.item_master || []);
  const [templates, setTemplates] = useState<MeasurementTemplate[]>(
    initialFullState.measurement_templates || []
  );
  const [formulaSettings, setFormulaSettings] = useState<FormulaSetting[]>(
    initialFullState.formula_settings || []
  );
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<MeasurementBill | null>(null);

  // Active session and authentication
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const stored = localStorage.getItem('SR_ACTIVE_AUTH_USER');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading auth user cache:', e);
    }
    return (
      initialFullState.users[0] || {
        id: 'usr-admin-1',
        name: 'S.R. Khan',
        email: 'srkhan@srgroup.com',
        role: 'ADMIN',
        status: 'Active',
        createdAt: '2026-01-01',
      }
    );
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('SR_ACTIVE_AUTH_USER');
    } catch {
      return false;
    }
  });

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Global Filter State (Section 4 & 5)
  const [filter, setFilter] = useState<FilterState>({
    date: new Date().toISOString().slice(0, 10),
    datePreset: 'today',
    companyId: 'all',
    projectId: 'all',
    viewMode: 'work_value',
  });

  // Helper to populate React state from loaded DB
  const applyStateToComponents = (fullState: AppDatabaseState) => {
    if (fullState.companies?.length) setCompanies(fullState.companies);
    if (fullState.projects?.length) setProjects(fullState.projects);
    if (fullState.workers?.length) setWorkers(fullState.workers);
    if (fullState.attendance?.length) setAttendanceRecords(fullState.attendance);
    if (fullState.daily_work?.length) setWorkEntries(fullState.daily_work);
    if (fullState.expenses?.length) setExpenseEntries(fullState.expenses);
    if (fullState.income?.length) setIncomeEntries(fullState.income);
    if (fullState.salaries?.length) setSalaryPayments(fullState.salaries);
    if (fullState.users?.length) setUsers(fullState.users);
    if (fullState.audit_logs?.length) setAuditLogs(fullState.audit_logs);
    if (fullState.measurement_bills) setMeasurementBills(fullState.measurement_bills);
    if (fullState.idm_records) setIdmRecords(fullState.idm_records);
    if (fullState.item_master) setItemMaster(fullState.item_master);
    if (fullState.measurement_templates) setTemplates(fullState.measurement_templates);
    if (fullState.formula_settings) setFormulaSettings(fullState.formula_settings);
    if (fullState.settings) setSettings(fullState.settings);
  };

  // Re-sync ERP data from server for the active user
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      const fullState = await syncFromServer(currentUser?.email);
      if (fullState) {
        applyStateToComponents(fullState);
      }
    } catch (err) {
      console.error('Failed refreshing ERP state:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle User Login
  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('SR_ACTIVE_AUTH_USER', JSON.stringify(user));
    } catch (e) {
      console.warn('Failed saving auth user:', e);
    }
    setIsRefreshing(true);
    try {
      const fullState = await syncFromServer(user.email);
      if (fullState) {
        applyStateToComponents(fullState);
      }
    } catch (err) {
      console.error('Failed syncing user data on login:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle User Logout
  const handleLogout = () => {
    try {
      localStorage.removeItem('SR_ACTIVE_AUTH_USER');
    } catch (e) {
      console.warn('Failed clearing auth session:', e);
    }
    setIsAuthenticated(false);
  };

  // Fetch initial data from Express backend on mount
  useEffect(() => {
    async function loadBackendData() {
      try {
        const fullState = await syncFromServer(currentUser?.email);
        if (fullState) {
          applyStateToComponents(fullState);
        }
      } catch (err) {
        console.error('Failed loading ERP state:', err);
      } finally {
        setIsInitialLoading(false);
      }
    }
    loadBackendData();
  }, []);

  // Filter change handler
  const handleFilterChange = (newFilter: Partial<FilterState>) => {
    setFilter((prev) => ({ ...prev, ...newFilter }));
  };

  // Profit/Loss Single Source of Truth Summary calculation
  const summary: ProfitLossSummary = calculateProfitLossSummary(
    workEntries,
    expenseEntries,
    incomeEntries,
    attendanceRecords,
    workers,
    filter
  );

  // Helper to log actions
  const logAudit = async (
    action: AuditLog['action'],
    module: AuditLog['module'],
    desc: string,
    recId?: string
  ) => {
    const log = createAuditLog(action, module, desc, currentUser.name, currentUser.role, recId);
    setAuditLogs((prev) => [log, ...prev]);
    try {
      await apiSaveRecord('audit_logs', log);
    } catch (e) {
      console.warn('Audit log write error:', e);
    }
  };

  // --- CRUD Handlers ---

  // Daily Work
  const handleSaveWork = async (entry: Partial<DailyWorkEntry>) => {
    const isEdit = !!entry.id;
    const workVal = (entry.completedQuantity || 0) * (entry.rate || 0);
    const completeEntry: DailyWorkEntry = {
      id: entry.id || `work-${Date.now()}`,
      date: entry.date || filter.date,
      companyId: entry.companyId || companies[0].id,
      projectId: entry.projectId || projects[0].id,
      site: entry.site || 'Site 1',
      workCategory: entry.workCategory || 'Structural Fabrication',
      workDescription: entry.workDescription || '',
      quantity: entry.quantity || 0,
      unit: entry.unit || 'MT',
      completedQuantity: entry.completedQuantity || 0,
      remainingQuantity: entry.remainingQuantity || 0,
      rate: entry.rate || 0,
      workValue: workVal,
      supervisor: entry.supervisor || currentUser.name,
      remarks: entry.remarks || '',
      createdAt: entry.createdAt || new Date().toISOString(),
    };

    const saved = await apiSaveRecord<DailyWorkEntry>('daily_work', completeEntry);
    setWorkEntries((prev) =>
      isEdit ? prev.map((w) => (w.id === saved.id ? saved : w)) : [saved, ...prev]
    );
    await logAudit(
      isEdit ? 'Updated' : 'Created',
      'Work',
      `${isEdit ? 'Updated' : 'Created'} work entry: ${saved.workCategory} (${saved.completedQuantity} ${saved.unit}) - ₹${saved.workValue}`,
      saved.id
    );
  };

  const handleDeleteWork = async (id: string) => {
    await apiDeleteRecord('daily_work', id);
    setWorkEntries((prev) => prev.filter((w) => w.id !== id));
    await logAudit('Deleted', 'Work', `Deleted work entry ID: ${id}`, id);
  };

  // Worker Directory
  const handleSaveWorker = async (worker: Partial<Worker>) => {
    const isEdit = !!worker.id;
    const saved = await apiSaveRecord<Worker>('workers', worker);
    setWorkers((prev) =>
      isEdit ? prev.map((w) => (w.id === saved.id ? saved : w)) : [...prev, saved]
    );
    await logAudit(
      isEdit ? 'Updated' : 'Created',
      'Worker',
      `${isEdit ? 'Updated' : 'Enrolled'} worker: ${saved.name} (${saved.designation})`,
      saved.id
    );
  };

  const handleDeleteWorker = async (id: string) => {
    await apiDeleteRecord('workers', id);
    setWorkers((prev) => prev.filter((w) => w.id !== id));
    await logAudit('Deleted', 'Worker', `Removed worker ID: ${id}`, id);
  };

  // Attendance
  const handleSaveAttendance = async (records: AttendanceRecord[]) => {
    await apiBulkAttendance(records);
    setAttendanceRecords((prev) => {
      // Remove any existing records matching the date and worker
      const date = records[0]?.date;
      const filtered = prev.filter((r) => r.date !== date);
      return [...records, ...filtered];
    });
    await logAudit(
      'Updated',
      'Attendance',
      `Marked attendance for ${records.length} workers on date ${records[0]?.date}`
    );
  };

  // Salary Payments & Advances
  const handleSaveSalary = async (payment: Partial<SalaryPayment>) => {
    const isEdit = !!payment.id;
    const saved = await apiSaveRecord<SalaryPayment>('salaries', payment);
    setSalaryPayments((prev) =>
      isEdit ? prev.map((s) => (s.id === saved.id ? saved : s)) : [saved, ...prev]
    );
    await logAudit(
      isEdit ? 'Updated' : 'Created',
      'Salary',
      `Processed salary payout of ₹${saved.paidAmount || saved.netSalary} for worker ID: ${saved.workerId}`,
      saved.id
    );
  };

  const handleDeleteSalary = async (id: string) => {
    await apiDeleteRecord('salaries', id);
    setSalaryPayments((prev) => prev.filter((s) => s.id !== id));
    await logAudit('Deleted', 'Salary', `Deleted salary payment record ID: ${id}`, id);
  };

  // Expenses
  const handleSaveExpense = async (expense: Partial<ExpenseEntry>) => {
    const isEdit = !!expense.id;
    const saved = await apiSaveRecord<ExpenseEntry>('expenses', expense);
    setExpenseEntries((prev) =>
      isEdit ? prev.map((e) => (e.id === saved.id ? saved : e)) : [saved, ...prev]
    );
    await logAudit(
      isEdit ? 'Updated' : 'Created',
      'Expense',
      `${isEdit ? 'Updated' : 'Recorded'} ${saved.category} expense of ₹${saved.amount} (${saved.paymentMode})`,
      saved.id
    );
  };

  const handleDeleteExpense = async (id: string) => {
    await apiDeleteRecord('expenses', id);
    setExpenseEntries((prev) => prev.filter((e) => e.id !== id));
    await logAudit('Deleted', 'Expense', `Deleted expense record ID: ${id}`, id);
  };

  // Income & Billing
  const handleSaveIncome = async (income: Partial<IncomeEntry>) => {
    const isEdit = !!income.id;
    const saved = await apiSaveRecord<IncomeEntry>('income', income);
    setIncomeEntries((prev) =>
      isEdit ? prev.map((i) => (i.id === saved.id ? saved : i)) : [saved, ...prev]
    );
    await logAudit(
      isEdit ? 'Updated' : 'Created',
      'Income',
      `${isEdit ? 'Updated' : 'Generated'} client bill/receipt ${saved.invoiceNumber} for ₹${saved.billAmount} (Rec: ₹${saved.receivedAmount})`,
      saved.id
    );
  };

  const handleDeleteIncome = async (id: string) => {
    await apiDeleteRecord('income', id);
    setIncomeEntries((prev) => prev.filter((i) => i.id !== id));
    await logAudit('Deleted', 'Income', `Deleted invoice ID: ${id}`, id);
  };

  // Projects
  const handleSaveProject = async (project: Partial<Project>) => {
    const isEdit = !!project.id;
    const saved = await apiSaveRecord<Project>('projects', project);
    setProjects((prev) =>
      isEdit ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved]
    );
    await logAudit(
      isEdit ? 'Updated' : 'Created',
      'Project',
      `${isEdit ? 'Updated' : 'Created'} project ${saved.projectId}: ${saved.projectName} (Value: ₹${saved.totalContractValue})`,
      saved.id
    );
  };

  const handleDeleteProject = async (id: string) => {
    await apiDeleteRecord('projects', id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    await logAudit('Deleted', 'Project', `Deleted project ID: ${id}`, id);
  };

  // Companies (Admin)
  const handleSaveCompany = async (company: Partial<Company>) => {
    const isEdit = !!company.id;
    const saved = await apiSaveRecord<Company>('companies', company);
    setCompanies((prev) =>
      isEdit ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved]
    );
    await logAudit(
      isEdit ? 'Updated' : 'Created',
      'Company',
      `${isEdit ? 'Updated' : 'Registered'} legal entity: ${saved.name}`,
      saved.id
    );
  };

  const handleDeleteCompany = async (id: string) => {
    await apiDeleteRecord('companies', id);
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    await logAudit('Deleted', 'Company', `Removed company entity ID: ${id}`, id);
  };

  // Users (Admin)
  const handleSaveUser = async (u: Partial<User>) => {
    const isEdit = !!u.id;
    const saved = await apiSaveRecord<User>('users', u);
    setUsers((prev) => (isEdit ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]));
    await logAudit(
      isEdit ? 'Updated' : 'Created',
      'System',
      `${isEdit ? 'Updated' : 'Created'} user account for ${saved.name} (Role: ${saved.role})`,
      saved.id
    );
  };

  const handleDeleteUser = async (id: string) => {
    await apiDeleteRecord('users', id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    await logAudit('Deleted', 'System', `Deleted user account ID: ${id}`, id);
  };

  // Measurement Bills CRUD
  const handleSaveMeasurementBill = async (bill: Partial<MeasurementBill>): Promise<MeasurementBill> => {
    const isEdit = !!bill.id;
    const completeBill: MeasurementBill = {
      id: bill.id || `bill-${Date.now()}`,
      billNo: bill.billNo || `BILL-${Date.now().toString().slice(-4)}`,
      billType: bill.billType || 'Measurement Bill',
      companyId: bill.companyId || companies[0]?.id || '',
      companyName: bill.companyName || companies[0]?.name || '',
      projectId: bill.projectId || projects[0]?.projectId || '',
      projectName: bill.projectName || projects[0]?.projectName || '',
      client: bill.client || projects[0]?.clientName || '',
      site: bill.site || 'Main Site',
      billDate: bill.billDate || new Date().toISOString().slice(0, 10),
      measurementDate: bill.measurementDate || new Date().toISOString().slice(0, 10),
      workPeriodFrom: bill.workPeriodFrom || new Date().toISOString().slice(0, 10),
      workPeriodTo: bill.workPeriodTo || new Date().toISOString().slice(0, 10),
      department: bill.department || 'Civil & Structural',
      area: bill.area || 'Shop Floor',
      groups: bill.groups || [],
      dynamicColumns: bill.dynamicColumns || [],
      currentQuantity: bill.currentQuantity || 0,
      cumulativeQuantity: bill.cumulativeQuantity || 0,
      currentAmount: bill.currentAmount || 0,
      cumulativeAmount: bill.cumulativeAmount || 0,
      deductions: bill.deductions || {
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
      status: bill.status || 'Draft',
      statusHistory: bill.statusHistory || [],
      revisions: bill.revisions || [],
      payments: bill.payments || [],
      preparedBy: bill.preparedBy || currentUser.name,
      createdAt: bill.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...bill,
    };

    const saved = await apiSaveRecord<MeasurementBill>('measurement_bills', completeBill);
    const updatedBills = isEdit ? measurementBills.map((b) => (b.id === saved.id ? saved : b)) : [saved, ...measurementBills];
    setMeasurementBills(updatedBills);
    if (currentUser?.email) {
      saveUserFullStateToServer(currentUser.email, {
        companies,
        projects,
        workers,
        attendance: attendanceRecords,
        daily_work: workEntries,
        expenses: expenseEntries,
        income: incomeEntries,
        salaries: salaryPayments,
        users,
        audit_logs: auditLogs,
        settings,
        measurement_bills: updatedBills,
        idm_records: idmRecords,
        item_master: itemMaster,
        measurement_templates: templates,
        formula_settings: formulaSettings,
      });
    }
    await logAudit(
      isEdit ? 'Updated' : 'Created',
      'Measurement Bill',
      `${isEdit ? 'Updated' : 'Created'} Measurement Bill ${saved.billNo} - ₹${saved.deductions?.netBill || 0}`,
      saved.id
    );
    return saved;
  };

  const handleDeleteMeasurementBill = async (id: string): Promise<boolean> => {
    await apiDeleteRecord('measurement_bills', id);
    const updatedBills = measurementBills.filter((b) => b.id !== id);
    setMeasurementBills(updatedBills);
    if (currentUser?.email) {
      saveUserFullStateToServer(currentUser.email, {
        companies,
        projects,
        workers,
        attendance: attendanceRecords,
        daily_work: workEntries,
        expenses: expenseEntries,
        income: incomeEntries,
        salaries: salaryPayments,
        users,
        audit_logs: auditLogs,
        settings,
        measurement_bills: updatedBills,
        idm_records: idmRecords,
        item_master: itemMaster,
        measurement_templates: templates,
        formula_settings: formulaSettings,
      });
    }
    await logAudit('Deleted', 'Measurement Bill', `Deleted bill ID ${id}`, id);
    return true;
  };

  // IDM CRUD
  const handleSaveIDM = async (rec: Partial<IDMRecord>): Promise<IDMRecord> => {
    const isEdit = !!rec.id;
    const completeRec: IDMRecord = {
      id: rec.id || `idm-${Date.now()}`,
      idmNo: rec.idmNo || `IDM-${Date.now().toString().slice(-4)}`,
      idmDate: rec.idmDate || new Date().toISOString().slice(0, 10),
      projectId: rec.projectId || projects[0]?.projectId || '',
      description: rec.description || '',
      quantity: rec.quantity || 0,
      unit: rec.unit || 'KG',
      status: rec.status || 'Verified',
      createdAt: rec.createdAt || new Date().toISOString(),
      ...rec,
    };
    const saved = await apiSaveRecord<IDMRecord>('idm_records', completeRec);
    setIdmRecords((prev) =>
      isEdit ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev]
    );
    await logAudit(isEdit ? 'Updated' : 'Created', 'IDM', `${isEdit ? 'Updated' : 'Recorded'} IDM clearance ${saved.idmNo}`, saved.id);
    return saved;
  };

  const handleDeleteIDM = async (id: string): Promise<boolean> => {
    await apiDeleteRecord('idm_records', id);
    setIdmRecords((prev) => prev.filter((item) => item.id !== id));
    await logAudit('Deleted', 'IDM', `Deleted IDM clearance ${id}`, id);
    return true;
  };

  // Item Master CRUD
  const handleSaveItemMaster = async (item: Partial<ItemMaster>): Promise<ItemMaster> => {
    const isEdit = !!item.id;
    const completeItem: ItemMaster = {
      id: item.id || `item-${Date.now()}`,
      itemCode: item.itemCode || `ITM-${Date.now().toString().slice(-3)}`,
      description: item.description || '',
      category: item.category || 'Plate',
      unit: item.unit || 'KG',
      defaultRate: item.defaultRate || 0,
      measurementType: item.measurementType || 'Plate',
      createdAt: item.createdAt || new Date().toISOString(),
      ...item,
    };
    const saved = await apiSaveRecord<ItemMaster>('item_master', completeItem);
    setItemMaster((prev) =>
      isEdit ? prev.map((it) => (it.id === saved.id ? saved : it)) : [...prev, saved]
    );
    await logAudit(isEdit ? 'Updated' : 'Created', 'Item Master', `${isEdit ? 'Updated' : 'Added'} Item Master ${saved.itemCode}`, saved.id);
    return saved;
  };

  const handleDeleteItemMaster = async (id: string): Promise<boolean> => {
    await apiDeleteRecord('item_master', id);
    setItemMaster((prev) => prev.filter((it) => it.id !== id));
    await logAudit('Deleted', 'Item Master', `Deleted Item Master ${id}`, id);
    return true;
  };

  // Measurement Templates CRUD
  const handleSaveTemplate = async (tmpl: Partial<MeasurementTemplate>): Promise<MeasurementTemplate> => {
    const isEdit = !!tmpl.id;
    const completeTmpl: MeasurementTemplate = {
      id: tmpl.id || `tmpl-${Date.now()}`,
      name: tmpl.name || 'Custom Template',
      category: tmpl.category || 'Custom',
      description: tmpl.description || '',
      measurementType: tmpl.measurementType || 'Structural Section',
      defaultColumns: tmpl.defaultColumns || [],
      isSystem: false,
      createdAt: tmpl.createdAt || new Date().toISOString(),
      ...tmpl,
    };
    const saved = await apiSaveRecord<MeasurementTemplate>('measurement_templates', completeTmpl);
    setTemplates((prev) =>
      isEdit ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved]
    );
    await logAudit(isEdit ? 'Updated' : 'Created', 'Template', `${isEdit ? 'Updated' : 'Created'} Template ${saved.name}`, saved.id);
    return saved;
  };

  const handleDeleteTemplate = async (id: string): Promise<boolean> => {
    await apiDeleteRecord('measurement_templates', id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    await logAudit('Deleted', 'Template', `Deleted Template ${id}`, id);
    return true;
  };

  // Backup & Reset handlers
  const handleExportBackup = () => {
    const fullState = {
      companies,
      projects,
      workers,
      attendance: attendanceRecords,
      daily_work: workEntries,
      expenses: expenseEntries,
      income: incomeEntries,
      salaries: salaryPayments,
      users,
      audit_logs: auditLogs,
      settings,
    };
    const blob = new Blob([JSON.stringify(fullState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SR_GROUP_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText);
      await apiResetDatabase(parsed);
      setCompanies(parsed.companies || []);
      setProjects(parsed.projects || []);
      setWorkers(parsed.workers || []);
      setAttendanceRecords(parsed.attendance || []);
      setWorkEntries(parsed.daily_work || []);
      setExpenseEntries(parsed.expenses || []);
      setIncomeEntries(parsed.income || []);
      setSalaryPayments(parsed.salaries || []);
      setUsers(parsed.users || []);
      setAuditLogs(parsed.audit_logs || []);
      alert('Backup snapshot restored successfully!');
    } catch (e) {
      alert('Failed to parse JSON backup file. Please ensure it is valid.');
    }
  };

  const handleResetDatabase = async () => {
    await apiResetDatabase(initialFullState);
    setCompanies(initialFullState.companies);
    setProjects(initialFullState.projects);
    setWorkers(initialFullState.workers);
    setAttendanceRecords(initialFullState.attendance);
    setWorkEntries(initialFullState.daily_work);
    setExpenseEntries(initialFullState.expenses);
    setIncomeEntries(initialFullState.income);
    setSalaryPayments(initialFullState.salaries);
    setUsers(initialFullState.users);
    setAuditLogs(initialFullState.audit_logs);
  };

  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Professional Header / Industrial Navbar */}
      <Navbar
        filter={filter}
        onFilterChange={handleFilterChange}
        companies={companies}
        projects={projects}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        users={users}
        onOpenQuickWork={() => setCurrentTab('daily_work')}
        onOpenAttendance={() => setCurrentTab('attendance')}
        onOpenPrintReport={() => setCurrentTab('daily_report')}
        onToggleMobileMenu={() => setIsMobileNavOpen(!isMobileNavOpen)}
        onLogout={handleLogout}
      />

      {/* Main ERP Layout: Sticky Sidebar + Dynamic Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setIsMobileNavOpen(false);
          }}
          userRole={currentUser.role}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        {/* Dynamic Viewport Container */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 bg-[#090d16]/90">
          <div className="max-w-7xl mx-auto pb-16">
            {/* Dedicated Date Refresh & Control Section */}
            <DateRefreshSection
              filter={filter}
              onFilterChange={handleFilterChange}
              onRefreshData={handleRefreshData}
              summary={summary}
              isRefreshing={isRefreshing}
            />

            {/* 1. Dashboard View */}
            {currentTab === 'dashboard' && (
              <Dashboard
                summary={summary}
                filter={filter}
                companies={companies}
                projects={projects}
                workers={workers}
                workEntries={workEntries}
                expenseEntries={expenseEntries}
                salaryPayments={salaryPayments}
                attendanceRecords={attendanceRecords}
                incomeEntries={incomeEntries}
                measurementBills={measurementBills}
                currentUser={currentUser}
                onNavigateTab={(tab) => setCurrentTab(tab as NavTab)}
                onOpenQuickWork={() => setCurrentTab('daily_work')}
                onOpenAttendance={() => setCurrentTab('attendance')}
              />
            )}

            {/* 10. Automatic Profit / Loss Module */}
            {currentTab === 'profit_loss' && (
              <ProfitLossModule
                companies={companies}
                projects={projects}
                workers={workers}
                workEntries={workEntries}
                expenseEntries={expenseEntries}
                salaryPayments={salaryPayments}
                attendanceRecords={attendanceRecords}
                incomeEntries={incomeEntries}
              />
            )}

            {/* 11. Measurement / Muster Bill Major Module */}
            {currentTab === 'measurement_bills' && (
              <MeasurementBillModule
                bills={measurementBills}
                projects={projects}
                companies={companies}
                templates={templates}
                itemMaster={itemMaster}
                idmRecords={idmRecords}
                currentUser={currentUser}
                onSaveBill={handleSaveMeasurementBill}
                onDeleteBill={handleDeleteMeasurementBill}
              />
            )}

            {/* 06. Client Measurement Sheet (Without Rates / Checking Sheet) */}
            {currentTab === 'client_measurement_sheet' && (
              <ClientMeasurementSheetModule
                bills={measurementBills}
                projects={projects}
                companies={companies}
                currentUser={currentUser}
                onSaveBill={handleSaveMeasurementBill}
                onDeleteBill={handleDeleteMeasurementBill}
              />
            )}

            {/* 07. Bill Register Module */}
            {currentTab === 'bill_register' && (
              <BillRegisterModule
                bills={measurementBills}
                projects={projects}
                companies={companies}
                currentUser={currentUser}
                onDeleteBill={handleDeleteMeasurementBill}
                onOpenBillDetails={(bill) => {
                  setSelectedBillForDetails(bill);
                  setCurrentTab('measurement_bills');
                }}
              />
            )}

            {/* 12. IDM Management Module */}
            {currentTab === 'idm' && (
              <IDMModule
                idmRecords={idmRecords}
                projects={projects}
                currentUser={currentUser}
                onSaveIDM={handleSaveIDM}
                onDeleteIDM={handleDeleteIDM}
              />
            )}

            {/* 13. Item Master Catalog Module */}
            {currentTab === 'item_master' && (
              <ItemMasterModule
                items={itemMaster}
                currentUser={currentUser}
                onSaveItem={handleSaveItemMaster}
                onDeleteItem={handleDeleteItemMaster}
              />
            )}

            {/* 14. Measurement Templates Module */}
            {currentTab === 'templates' && (
              <TemplatesModule
                templates={templates}
                currentUser={currentUser}
                onSaveTemplate={handleSaveTemplate}
                onDeleteTemplate={handleDeleteTemplate}
              />
            )}

            {/* 2. Daily Work Module */}
            {currentTab === 'daily_work' && (
              <DailyWorkModule
                workEntries={workEntries}
                companies={companies}
                projects={projects}
                currentUser={currentUser}
                onSaveWork={handleSaveWork}
                onSaveEntry={handleSaveWork}
                onDeleteWork={handleDeleteWork}
                onDeleteEntry={handleDeleteWork}
                globalFilter={filter}
              />
            )}

            {/* 3. Workers Directory Module */}
            {currentTab === 'workers' && (
              <WorkerModule
                workers={workers}
                companies={companies}
                projects={projects}
                currentUser={currentUser}
                onSaveWorker={handleSaveWorker}
                onDeleteWorker={handleDeleteWorker}
              />
            )}

            {/* 4. Daily Attendance Module */}
            {currentTab === 'attendance' && (
              <AttendanceModule
                attendanceRecords={attendanceRecords}
                workers={workers}
                companies={companies}
                projects={projects}
                currentUser={currentUser}
                onSaveBulkAttendance={handleSaveAttendance}
                onSaveAttendance={handleSaveAttendance}
                globalFilter={filter}
                globalDate={filter.date}
                selectedCompanyId={filter.companyId}
                selectedProjectId={filter.projectId}
              />
            )}

            {/* 5. Salary & Advance Module */}
            {currentTab === 'salary' && (
              <SalaryModule
                workers={workers}
                companies={companies}
                projects={projects}
                attendanceRecords={attendanceRecords}
                salaryPayments={salaryPayments}
                currentUser={currentUser}
                onSaveSalary={handleSaveSalary}
                onDeleteSalary={handleDeleteSalary}
              />
            )}

            {/* 6. Site Expenses Module */}
            {currentTab === 'expenses' && (
              <ExpenseModule
                expenseEntries={expenseEntries}
                companies={companies}
                projects={projects}
                currentUser={currentUser}
                onSaveExpense={handleSaveExpense}
                onDeleteExpense={handleDeleteExpense}
                globalFilter={filter}
                workerSalaryExpense={summary.totalWorkerSalary}
              />
            )}

            {/* 7. Income & Billing Module */}
            {currentTab === 'income' && (
              <IncomeModule
                incomeEntries={incomeEntries}
                companies={companies}
                projects={projects}
                currentUser={currentUser}
                onSaveIncome={handleSaveIncome}
                onDeleteIncome={handleDeleteIncome}
                globalFilter={filter}
              />
            )}

            {/* 8. Projects Module */}
            {currentTab === 'projects' && (
              <ProjectModule
                projects={projects}
                companies={companies}
                workEntries={workEntries}
                expenseEntries={expenseEntries}
                incomeEntries={incomeEntries}
                currentUser={currentUser}
                onSaveProject={handleSaveProject}
                onDeleteProject={handleDeleteProject}
              />
            )}

            {/* 9. 10 ERP Visual Charts */}
            {currentTab === 'charts' && (
              <ChartsModule
                summary={summary}
                filter={filter}
                companies={companies}
                projects={projects}
                workers={workers}
                workEntries={workEntries}
                expenseEntries={expenseEntries}
                salaryPayments={salaryPayments}
                attendanceRecords={attendanceRecords}
                incomeEntries={incomeEntries}
              />
            )}

            {/* 10. Reports Module (Daily & Monthly P&L and All 15 ERP Reports) */}
            {(currentTab === 'daily_report' || currentTab === 'monthly_report' || currentTab === 'reports') && (
              <ReportsModule
                companies={companies}
                projects={projects}
                workers={workers}
                workEntries={workEntries}
                expenseEntries={expenseEntries}
                salaryPayments={salaryPayments}
                attendanceRecords={attendanceRecords}
                incomeEntries={incomeEntries}
              />
            )}

            {/* 11. Admin & Governance Modules */}
            {(currentTab === 'companies' ||
              currentTab === 'users' ||
              currentTab === 'audit_log' ||
              currentTab === 'settings') && (
              <AdminModule
                activeSection={currentTab as any}
                onSelectSection={(tab) => setCurrentTab(tab as NavTab)}
                currentUser={currentUser}
                users={users}
                companies={companies}
                projects={projects}
                auditLogs={auditLogs}
                onSaveUser={handleSaveUser}
                onDeleteUser={handleDeleteUser}
                onSaveCompany={handleSaveCompany}
                onDeleteCompany={handleDeleteCompany}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
                onResetDatabase={handleResetDatabase}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
