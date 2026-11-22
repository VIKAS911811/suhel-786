import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';

import {
  INITIAL_COMPANIES,
  INITIAL_PROJECTS,
  INITIAL_WORKERS,
  INITIAL_ATTENDANCE,
  INITIAL_DAILY_WORK,
  INITIAL_EXPENSES,
  INITIAL_INCOME,
  INITIAL_SALARIES,
  INITIAL_USERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SETTINGS,
  INITIAL_ITEM_MASTER,
  INITIAL_TEMPLATES,
  INITIAL_FORMULA_SETTINGS,
  INITIAL_IDM_RECORDS,
  INITIAL_MEASUREMENT_BILLS,
} from './src/lib/initialData';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));

// Persistent database path with writable fallback for read-only production containers
function resolveWritableDataDir(): string {
  const candidates = [
    path.join(process.cwd(), 'data'),
    path.join(os.tmpdir(), 'sr-group-erp-data'),
  ];
  for (const dir of candidates) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.accessSync(dir, fs.constants.W_OK);
      return dir;
    } catch {
      // Try next candidate
    }
  }
  return os.tmpdir();
}

const DATA_DIR = resolveWritableDataDir();
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  companies: any[];
  projects: any[];
  workers: any[];
  attendance: any[];
  daily_work: any[];
  expenses: any[];
  income: any[];
  salaries: any[];
  users: any[];
  audit_logs: any[];
  settings: any;
  measurement_bills: any[];
  idm_records: any[];
  item_master: any[];
  measurement_templates: any[];
  formula_settings: any[];
}

const defaultSeedData: DatabaseSchema = {
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

// Helper to read DB safely and backfill any missing collections
function readDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed.companies && parsed.companies.length > 0) {
        let changed = false;
        // Backfill new tables if they don't exist yet
        if (!parsed.measurement_bills) {
          parsed.measurement_bills = INITIAL_MEASUREMENT_BILLS;
          changed = true;
        }
        if (!parsed.idm_records) {
          parsed.idm_records = INITIAL_IDM_RECORDS;
          changed = true;
        }
        if (!parsed.item_master) {
          parsed.item_master = INITIAL_ITEM_MASTER;
          changed = true;
        }
        if (!parsed.measurement_templates) {
          parsed.measurement_templates = INITIAL_TEMPLATES;
          changed = true;
        }
        if (!parsed.formula_settings) {
          parsed.formula_settings = INITIAL_FORMULA_SETTINGS;
          changed = true;
        }
        if (changed) {
          writeDb(parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading db.json, falling back to seed state:', err);
  }
  writeDb(defaultSeedData);
  return defaultSeedData;
}

// Helper to write DB atomically
function writeDb(data: DatabaseSchema): void {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing db.json:', err);
  }
}

// User specific data storage directory: data/users/
const USERS_DIR = path.join(DATA_DIR, 'users');
if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR, { recursive: true });
}

function getUserDbPath(email: string): string {
  const safeEmail = email.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '_');
  return path.join(USERS_DIR, `${safeEmail}.json`);
}

function readUserDb(email: string): DatabaseSchema {
  const filePath = getUserDbPath(email);
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && parsed.companies && parsed.companies.length > 0) return parsed;
    } catch (e) {
      console.error(`Error reading data for ${email}:`, e);
    }
  }
  // Initialize with seed data for this specific user
  const initial = JSON.parse(JSON.stringify(defaultSeedData));
  writeUserDb(email, initial);
  return initial;
}

function writeUserDb(email: string, data: DatabaseSchema): void {
  try {
    const filePath = getUserDbPath(email);
    const tempFile = `${filePath}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, filePath);
  } catch (err) {
    console.error(`Error writing data for ${email}:`, err);
  }
}

// Initialize seed data if file does not exist or is empty
if (!fs.existsSync(DB_FILE)) {
  writeDb(defaultSeedData);
} else {
  const current = readDb();
  if (!current.companies || current.companies.length === 0) {
    writeDb(defaultSeedData);
  }
}

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Full state sync (supports per-user isolation when email query or header is present)
app.get('/api/sync', (req, res) => {
  const email = (req.query.email as string) || (req.headers['x-user-email'] as string);
  if (email && email.trim()) {
    const userDb = readUserDb(email);
    return res.json(userDb);
  }
  const db = readDb();
  res.json(db);
});

// Save complete user dataset for persistence
app.post('/api/user-sync', (req, res) => {
  const email = (req.query.email as string) || req.body?.email || (req.headers['x-user-email'] as string);
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'User email is required' });
  }
  const data = req.body?.data || req.body;
  writeUserDb(email, data);
  res.json({ success: true, message: `Data for ${email} saved successfully` });
});

// Seed / Reset Database
app.post('/api/reset-data', (req, res) => {
  const seedData = req.body;
  writeDb(seedData);
  res.json({ success: true, message: 'Database reset and seeded successfully' });
});

// Generic entity route helper
const COLLECTIONS = [
  'companies',
  'projects',
  'workers',
  'attendance',
  'daily_work',
  'expenses',
  'income',
  'salaries',
  'users',
  'audit_logs',
  'measurement_bills',
  'idm_records',
  'item_master',
  'measurement_templates',
  'formula_settings',
];

COLLECTIONS.forEach((collectionName) => {
  // GET all
  app.get(`/api/${collectionName}`, (req, res) => {
    const db = readDb();
    const items = (db as any)[collectionName] || [];
    res.json(items);
  });

  // POST create
  app.post(`/api/${collectionName}`, (req, res) => {
    const db = readDb();
    const items = (db as any)[collectionName] || [];
    const newItem = {
      ...req.body,
      id: req.body.id || `${collectionName.slice(0, 3)}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: req.body.createdAt || new Date().toISOString(),
    };
    items.unshift(newItem);
    (db as any)[collectionName] = items;
    writeDb(db);
    res.status(201).json(newItem);
  });

  // PUT update
  app.put(`/api/${collectionName}/:id`, (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const items = (db as any)[collectionName] || [];
    const index = items.findIndex((i: any) => i.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `${collectionName} record not found` });
    }
    items[index] = { ...items[index], ...req.body, updatedAt: new Date().toISOString() };
    (db as any)[collectionName] = items;
    writeDb(db);
    res.json(items[index]);
  });

  // DELETE
  app.delete(`/api/${collectionName}/:id`, (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const items = (db as any)[collectionName] || [];
    const filtered = items.filter((i: any) => i.id !== id);
    (db as any)[collectionName] = filtered;
    writeDb(db);
    res.json({ success: true, id });
  });
});

// Bulk attendance entry
app.post('/api/attendance/bulk', (req, res) => {
  const records = req.body;
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'Expected array of attendance records' });
  }
  const db = readDb();
  const current = db.attendance || [];
  
  // Replace or append
  const updated = [...current];
  records.forEach((rec) => {
    const existingIndex = updated.findIndex(
      (a: any) => a.workerId === rec.workerId && a.date === rec.date
    );
    if (existingIndex >= 0) {
      updated[existingIndex] = { ...updated[existingIndex], ...rec, updatedAt: new Date().toISOString() };
    } else {
      updated.unshift({
        ...rec,
        id: rec.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        createdAt: new Date().toISOString(),
      });
    }
  });

  db.attendance = updated;
  writeDb(db);
  res.json({ success: true, count: records.length, records: updated });
});

// Settings GET & PUT
app.get('/api/settings', (req, res) => {
  const db = readDb();
  res.json(db.settings || {});
});

app.put('/api/settings', (req, res) => {
  const db = readDb();
  db.settings = { ...db.settings, ...req.body };
  writeDb(db);
  res.json(db.settings);
});

// Database Export / Backup
app.get('/api/backup', (req, res) => {
  const db = readDb();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="SR_GROUP_BACKUP_${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(db);
});

// Database Import / Restore
app.post('/api/restore', (req, res) => {
  const backup = req.body;
  if (!backup || typeof backup !== 'object') {
    return res.status(400).json({ error: 'Invalid backup format' });
  }
  writeDb(backup);
  res.json({ success: true, message: 'Database successfully restored from backup' });
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------
function resolveDistPath(): string {
  const candidates = [
    path.join(process.cwd(), 'dist'),
    typeof __dirname !== 'undefined' ? __dirname : '',
    typeof __dirname !== 'undefined' ? path.resolve(__dirname, 'dist') : '',
  ].filter(Boolean);

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) {
      return dir;
    }
  }
  return path.join(process.cwd(), 'dist');
}

async function startServer() {
  const isBundledCjs = typeof __filename !== 'undefined' && path.basename(__filename) === 'server.cjs';
  const isProduction = process.env.NODE_ENV === 'production' || isBundledCjs;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = resolveDistPath();
    app.use(express.static(distPath, { index: 'index.html' }));
    app.get('*', (req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Production build not found. Please run npm run build.');
      }
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`SR GROUP ERP Server running on http://0.0.0.0:${PORT} (production=${isProduction})`);
  });

  server.on('error', (err: any) => {
    console.error('SR GROUP Server listen error:', err);
  });
}

startServer();
