import {
  AttendanceRecord,
  AuditLog,
  Company,
  DailyWorkEntry,
  ExpenseEntry,
  FormulaSetting,
  IDMRecord,
  IncomeEntry,
  ItemMaster,
  MeasurementBill,
  MeasurementTemplate,
  Project,
  SalaryPayment,
  SystemSettings,
  User,
  UserRole,
  Worker,
} from '../types';
import {
  INITIAL_ATTENDANCE,
  INITIAL_AUDIT_LOGS,
  INITIAL_COMPANIES,
  INITIAL_DAILY_WORK,
  INITIAL_EXPENSES,
  INITIAL_FORMULA_SETTINGS,
  INITIAL_IDM_RECORDS,
  INITIAL_INCOME,
  INITIAL_ITEM_MASTER,
  INITIAL_MEASUREMENT_BILLS,
  INITIAL_PROJECTS,
  INITIAL_SALARIES,
  INITIAL_SETTINGS,
  INITIAL_TEMPLATES,
  INITIAL_USERS,
  INITIAL_WORKERS,
} from './initialData';

export interface AppDatabaseState {
  companies: Company[];
  projects: Project[];
  workers: Worker[];
  attendance: AttendanceRecord[];
  daily_work: DailyWorkEntry[];
  expenses: ExpenseEntry[];
  income: IncomeEntry[];
  salaries: SalaryPayment[];
  users: User[];
  audit_logs: AuditLog[];
  settings: SystemSettings;
  measurement_bills: MeasurementBill[];
  idm_records: IDMRecord[];
  item_master: ItemMaster[];
  measurement_templates: MeasurementTemplate[];
  formula_settings: FormulaSetting[];
}

const LOCAL_STORAGE_KEY = 'SR_GROUP_DB_CACHE';

export function getUserStorageKey(email?: string): string {
  if (!email || !email.trim()) return LOCAL_STORAGE_KEY;
  return `SR_GROUP_USER_DATA_${email.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '_')}`;
}

export function getLocalCache(email?: string): AppDatabaseState | null {
  try {
    const key = getUserStorageKey(email);
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    if (email) {
      const fallback = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (fallback) return JSON.parse(fallback);
    }
  } catch (e) {
    console.error('Failed reading local cache:', e);
  }
  return null;
}

export function saveLocalCache(state: AppDatabaseState, email?: string) {
  try {
    const key = getUserStorageKey(email);
    localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed saving local cache:', e);
  }
}

export const initialFullState: AppDatabaseState = {
  companies: INITIAL_COMPANIES,
  projects: INITIAL_PROJECTS,
  workers: INITIAL_WORKERS,
  attendance: INITIAL_ATTENDANCE,
  daily_work: INITIAL_DAILY_WORK,
  expenses: INITIAL_EXPENSES,
  income: INITIAL_INCOME,
  salaries: INITIAL_SALARIES,
  users: INITIAL_USERS,
  audit_logs: INITIAL_AUDIT_LOGS,
  settings: INITIAL_SETTINGS,
  measurement_bills: INITIAL_MEASUREMENT_BILLS,
  idm_records: INITIAL_IDM_RECORDS,
  item_master: INITIAL_ITEM_MASTER,
  measurement_templates: INITIAL_TEMPLATES,
  formula_settings: INITIAL_FORMULA_SETTINGS,
};

// API Client with fallbacks and per-user email isolation
export async function syncFromServer(email?: string): Promise<AppDatabaseState> {
  try {
    const url = email && email.trim() ? `/api/sync?email=${encodeURIComponent(email.trim())}` : '/api/sync';
    const res = await fetch(url, {
      headers: email ? { 'x-user-email': email } : {},
    });
    if (res.ok) {
      const data = await res.json();
      if (!data.companies || data.companies.length === 0) {
        saveLocalCache(initialFullState, email);
        return initialFullState;
      }
      saveLocalCache(data, email);
      return data;
    }
  } catch (err) {
    console.warn('Server sync failed, checking local cache:', err);
  }

  const cached = getLocalCache(email);
  if (cached) return cached;

  saveLocalCache(initialFullState, email);
  return initialFullState;
}

export async function saveUserFullStateToServer(email: string, state: AppDatabaseState): Promise<void> {
  saveLocalCache(state, email);
  try {
    await fetch('/api/user-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': email,
      },
      body: JSON.stringify({ email, data: state }),
    });
  } catch (e) {
    console.warn('Server sync background save error:', e);
  }
}

export async function apiSaveRecord<T>(collection: string, record: Partial<T> & { id?: string }): Promise<T> {
  try {
    if (record.id && !record.id.startsWith('temp-')) {
      const res = await fetch(`/api/${collection}/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (res.ok) return await res.json();
    } else {
      const res = await fetch(`/api/${collection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (res.ok) return await res.json();
    }
  } catch (err) {
    console.warn(`Failed saving to server for ${collection}:`, err);
  }
  // Fallback return
  return {
    ...record,
    id: record.id || `${collection.slice(0, 3)}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  } as unknown as T;
}

export async function apiDeleteRecord(collection: string, id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/${collection}/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn(`Failed deleting ${collection}/${id}:`, err);
    return false;
  }
}

export async function apiBulkAttendance(records: AttendanceRecord[]): Promise<boolean> {
  try {
    const res = await fetch('/api/attendance/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(records),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed bulk attendance save:', err);
    return false;
  }
}

export async function apiResetDatabase(state: AppDatabaseState): Promise<boolean> {
  try {
    const res = await fetch('/api/reset-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    saveLocalCache(state);
    return res.ok;
  } catch (err) {
    saveLocalCache(state);
    return false;
  }
}

export function createAuditLog(
  action: AuditLog['action'],
  module: AuditLog['module'],
  description: string,
  user: string = 'S.R. Khan',
  userRole: UserRole = 'ADMIN',
  recordId?: string
): AuditLog {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    user,
    userRole,
    action,
    module,
    recordId,
    recordDescription: description,
    timestamp: now.toISOString(),
    date: dateStr,
    time: timeStr,
  };
}
