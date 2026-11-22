import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Building2,
  FileCheck,
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Database,
  History,
  UserCog,
  Settings,
} from 'lucide-react';
import {
  AuditLog,
  Company,
  Project,
  User,
  UserRole,
} from '../types';
import { NavTab } from './Sidebar';

interface AdminModuleProps {
  currentUser: User;
  users: User[];
  companies: Company[];
  projects: Project[];
  auditLogs: AuditLog[];
  onSaveUser: (user: Partial<User>) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onSaveCompany: (company: Partial<Company>) => Promise<void>;
  onDeleteCompany: (companyId: string) => Promise<void>;
  onExportBackup: () => void;
  onImportBackup: (jsonData: string) => Promise<void>;
  onResetDatabase: () => Promise<void>;
  activeSection?: 'companies' | 'users' | 'audit_log' | 'settings';
  onSelectSection?: (section: NavTab) => void;
}

export const AdminModule: React.FC<AdminModuleProps> = ({
  currentUser,
  users,
  companies,
  projects,
  auditLogs,
  onSaveUser,
  onDeleteUser,
  onSaveCompany,
  onDeleteCompany,
  onExportBackup,
  onImportBackup,
  onResetDatabase,
  activeSection,
  onSelectSection,
}) => {
  const mapSectionToSubTab = (sec?: string): 'users' | 'companies' | 'audit' | 'backup' => {
    if (sec === 'companies') return 'companies';
    if (sec === 'audit_log' || sec === 'audit') return 'audit';
    if (sec === 'settings' || sec === 'backup') return 'backup';
    return 'users';
  };

  const [adminTab, setAdminTab] = useState<'users' | 'companies' | 'audit' | 'backup'>(() =>
    mapSectionToSubTab(activeSection)
  );

  // Sync internal subtab when activeSection prop changes from outside (e.g. Sidebar click)
  useEffect(() => {
    if (activeSection) {
      setAdminTab(mapSectionToSubTab(activeSection));
    }
  }, [activeSection]);

  const handleTabClick = (tab: 'users' | 'companies' | 'audit' | 'backup') => {
    setAdminTab(tab);
    if (onSelectSection) {
      const secMap: Record<string, NavTab> = {
        users: 'users',
        companies: 'companies',
        audit: 'audit_log',
        backup: 'settings',
      };
      onSelectSection(secMap[tab]);
    }
  };

  // User Modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('SUPERVISOR');
  const [userStatus, setUserStatus] = useState<'Active' | 'Inactive'>('Active');
  const [userPhone, setUserPhone] = useState('');
  const [userCompanyId, setUserCompanyId] = useState(companies[0]?.id || '');
  const [userError, setUserError] = useState('');

  // Company Modal
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<Company | null>(null);
  const [compName, setCompName] = useState('');
  const [compGst, setCompGst] = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compEmail, setCompEmail] = useState('');
  const [compError, setCompError] = useState('');

  const [confirmReset, setConfirmReset] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [deleteConfirmCompany, setDeleteConfirmCompany] = useState<Company | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // User form open
  const openNewUser = () => {
    setEditingUser(null);
    setUserName('');
    setUserEmail('');
    setUserRole('SUPERVISOR');
    setUserStatus('Active');
    setUserPhone('');
    setUserCompanyId(companies[0]?.id || '');
    setUserError('');
    setIsUserModalOpen(true);
  };

  const openEditUser = (u: User) => {
    setEditingUser(u);
    setUserName(u.name);
    setUserEmail(u.email);
    setUserRole(u.role);
    setUserStatus(u.status);
    setUserPhone(u.phone || '');
    setUserCompanyId(u.companyId || companies[0]?.id || '');
    setUserError('');
    setIsUserModalOpen(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    if (!userName.trim() || !userEmail.trim()) {
      setUserError('Name and Email are required.');
      return;
    }
    try {
      await onSaveUser({
        id: editingUser?.id,
        name: userName.trim(),
        email: userEmail.trim(),
        role: userRole,
        status: userStatus,
        phone: userPhone.trim(),
        companyId: userCompanyId,
      });
      setIsUserModalOpen(false);
    } catch (err) {
      setUserError('Failed to save user.');
    }
  };

  // Company form open
  const openNewCompany = () => {
    setEditingComp(null);
    setCompName('');
    setCompGst('');
    setCompAddress('');
    setCompPhone('');
    setCompEmail('');
    setCompError('');
    setIsCompModalOpen(true);
  };

  const openEditCompany = (c: Company) => {
    setEditingComp(c);
    setCompName(c.name);
    setCompGst(c.gstNumber || '');
    setCompAddress(c.address || '');
    setCompPhone(c.contactPhone || '');
    setCompEmail(c.contactEmail || '');
    setCompError('');
    setIsCompModalOpen(true);
  };

  const handleCompSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompError('');
    if (!compName.trim()) {
      setCompError('Company name is required.');
      return;
    }
    try {
      await onSaveCompany({
        id: editingComp?.id,
        name: compName.trim(),
        gstNumber: compGst.trim(),
        address: compAddress.trim(),
        contactPhone: compPhone.trim(),
        contactEmail: compEmail.trim(),
      });
      setIsCompModalOpen(false);
    } catch (err) {
      setCompError('Failed to save company.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header based on active subtab */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            {adminTab === 'users' && <UserCog className="w-5 h-5 text-amber-400" />}
            {adminTab === 'companies' && <Building2 className="w-5 h-5 text-amber-400" />}
            {adminTab === 'audit' && <History className="w-5 h-5 text-amber-400" />}
            {adminTab === 'backup' && <Settings className="w-5 h-5 text-amber-400" />}
            <h2 className="text-lg font-black text-white font-mono uppercase tracking-tight">
              {adminTab === 'users' && 'USERS & ROLES MANAGEMENT'}
              {adminTab === 'companies' && 'COMPANIES & LEGAL ENTITIES'}
              {adminTab === 'audit' && 'SYSTEM AUDIT TRAIL & LOGS'}
              {adminTab === 'backup' && 'SETTINGS, BACKUP & SYSTEM DATA'}
            </h2>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-purple-500/20 text-purple-400 rounded border border-purple-500/30">
              Role: {currentUser.role}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {adminTab === 'users' && 'Role-based access control, operator provisioning, company scope & system permissions.'}
            {adminTab === 'companies' && 'SR Group parent & subsidiary companies, GSTIN profiles, addresses & divisions.'}
            {adminTab === 'audit' && 'Immutable timestamped operational audit logs for work, attendance, expense & billing.'}
            {adminTab === 'backup' && 'Database snapshots, JSON export/import, server state synchronization & recovery.'}
          </p>
        </div>

        {/* Admin subtabs */}
        <div className="flex items-center bg-slate-900 border border-slate-700 p-1 rounded-lg text-xs overflow-x-auto">
          <button
            onClick={() => handleTabClick('users')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              adminTab === 'users' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCog className="w-3.5 h-3.5" />
            Users & Roles ({users.length})
          </button>
          <button
            onClick={() => handleTabClick('companies')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              adminTab === 'companies' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Companies ({companies.length})
          </button>
          <button
            onClick={() => handleTabClick('audit')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              adminTab === 'audit' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Audit Log ({auditLogs.length})
          </button>
          <button
            onClick={() => handleTabClick('backup')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              adminTab === 'backup' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Settings & Data
          </button>
        </div>
      </div>

      {/* 1. Users Tab (Role-based access control) */}
      {adminTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              System Operators & Assigned Roles
            </h3>
            <button
              onClick={openNewUser}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              + Add User
            </button>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b1220] text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Assigned Role</th>
                  <th className="py-3 px-3">Company Scope</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-850/50">
                    <td className="py-3 px-3 font-semibold text-white">{u.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{u.email}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : u.role === 'MANAGER'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : u.role === 'ACCOUNTANT'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {companies.find((c) => c.id === u.companyId)?.name || 'All Entities'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'Active'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditUser(u)}
                          className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== currentUser.id && (
                          <button
                            onClick={() => setDeleteConfirmUser(u)}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Companies Tab */}
      {adminTab === 'companies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              SR Group Legal Entities & Operating Divisions
            </h3>
            <button
              onClick={openNewCompany}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              + Add Company Entity
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {companies.map((c) => (
              <div
                key={c.id}
                className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-mono text-xs text-amber-400 font-bold">{c.code}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditCompany(c)}
                        className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {companies.length > 1 && (
                        <button
                          onClick={() => setDeleteConfirmCompany(c)}
                          className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className="font-bold text-white text-sm mt-2">{c.name}</h4>
                  <div className="mt-3 space-y-1 text-xs text-slate-400">
                    <div>
                      <span className="text-slate-500">GSTIN: </span>
                      <span className="font-mono text-slate-200">{c.gstNumber || 'Not Specified'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Contact: </span>
                      <span className="text-slate-200">{c.contactPhone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Address: </span>
                      <span className="text-slate-200 line-clamp-1">{c.address || 'Industrial Estate'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-800/60 text-[11px] text-slate-500 flex justify-between">
                  <span>
                    Projects:{' '}
                    <span className="font-bold text-slate-300">
                      {projects.filter((p) => p.companyId === c.id).length}
                    </span>
                  </span>
                  <span>Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Audit Trail Tab (Section 20) */}
      {adminTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              Section 20: System Immutable Audit Log
            </h3>
            <span className="text-xs font-mono text-slate-400">Live Operation Log</span>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b1220] text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Operator Name</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Module</th>
                  <th className="py-3 px-3">Operation Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500 font-mono text-xs">
                      No audit log entries recorded yet. System activities are automatically registered here.
                    </td>
                  </tr>
                ) : (
                  auditLogs.slice(0, 50).map((log) => {
                    let formattedDate = 'Recent';
                    try {
                      const d = new Date(log.timestamp);
                      formattedDate = isNaN(d.getTime()) ? (log.timestamp || 'Recent') : d.toLocaleString();
                    } catch {
                      formattedDate = log.timestamp || 'Recent';
                    }
                    return (
                      <tr key={log.id} className="hover:bg-slate-850/50">
                        <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-3 px-3 font-semibold text-white">{log.user || (log as any).userName || 'System Admin'}</td>
                        <td className="py-3 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                            {log.userRole || 'ADMIN'}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.action === 'Created' || (log.action as any) === 'CREATE'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : log.action === 'Updated' || (log.action as any) === 'UPDATE'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-amber-400">{log.module}</td>
                        <td className="py-3 px-3 text-slate-300">{log.recordDescription || (log as any).details || 'Action completed'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Backup & DB Recovery Tab */}
      {adminTab === 'backup' && (
        <div className="space-y-5 max-w-2xl mx-auto">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-3 text-amber-400 pb-3 border-b border-slate-800">
              <Database className="w-5 h-5" />
              <h3 className="font-bold text-white text-sm font-mono uppercase">
                Database Snapshots & Data Safety
              </h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              SR GROUP ERP records are stored in the server database at <code className="text-amber-300">/data/db.json</code>. You can export a snapshot backup file or restore from a previous JSON payload at any time.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={onExportBackup}
                className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-all text-center"
              >
                <Download className="w-6 h-6 text-emerald-400" />
                <span className="text-xs font-bold text-white">Download JSON Backup</span>
                <span className="text-[10px] text-slate-400">Save full ERP snapshot</span>
              </button>

              <button
                onClick={() => setShowImportModal(true)}
                className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-all text-center"
              >
                <Upload className="w-6 h-6 text-blue-400" />
                <span className="text-xs font-bold text-white">Restore from Backup</span>
                <span className="text-[10px] text-slate-400">Import snapshot JSON</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-red-400">Factory Reset Database</h4>
                  <p className="text-[11px] text-slate-500">
                    Re-initialize with SR Group default master seed companies, workers, and project records.
                  </p>
                </div>
                {!confirmReset ? (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-800 text-red-300 text-xs font-bold rounded-lg transition-colors"
                  >
                    Reset Data...
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        await onResetDatabase();
                        setConfirmReset(false);
                      }}
                      className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded"
                    >
                      Confirm Reset
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white font-mono uppercase text-sm">
                {editingUser ? 'Edit User Access' : 'Create User Account'}
              </h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUserSubmit} className="space-y-3 py-4 text-xs">
              {userError && <div className="text-red-400">{userError}</div>}

              <div>
                <label className="block text-slate-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Role *</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-slate-200"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="ACCOUNTANT">ACCOUNTANT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Status</label>
                  <select
                    value={userStatus}
                    onChange={(e) => setUserStatus(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-slate-200"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Assigned SR Company</label>
                <select
                  value={userCompanyId}
                  onChange={(e) => setUserCompanyId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-slate-200"
                >
                  <option value="">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded text-xs">
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Company Modal */}
      {isCompModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white font-mono uppercase text-sm">
                {editingComp ? 'Edit Company Entity' : 'New SR Company Entity'}
              </h3>
              <button onClick={() => setIsCompModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompSubmit} className="space-y-3 py-4 text-xs">
              {compError && <div className="text-red-400">{compError}</div>}

              <div>
                <label className="block text-slate-400 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="e.g. SR Power Solutions Ltd"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={compGst}
                  onChange={(e) => setCompGst(e.target.value)}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Head Office Address</label>
                <input
                  type="text"
                  value={compAddress}
                  onChange={(e) => setCompAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCompModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded text-xs">
                  Save Entity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-lg w-full p-5 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white font-mono uppercase text-sm">Restore JSON Snapshot</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs">
              <p className="text-slate-400">
                Paste the exported JSON backup text below. This will overwrite current records with the snapshot data.
              </p>
              <textarea
                rows={8}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='{"companies": [...], "workers": [...]}'
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-mono text-[11px] text-slate-300 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (importText) {
                    await onImportBackup(importText);
                    setShowImportModal(false);
                    setImportText('');
                  }
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs"
              >
                Execute Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Delete Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white font-mono uppercase">Confirm User Removal</h3>
            </div>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to delete user account <strong className="text-white">{deleteConfirmUser.name}</strong> ({deleteConfirmUser.email})?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
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
                    await onDeleteUser(deleteConfirmUser.id);
                    setDeleteConfirmUser(null);
                  } catch (e) {
                    console.error('Delete user error:', e);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Delete Modal */}
      {deleteConfirmCompany && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white font-mono uppercase">Confirm Company Entity Deletion</h3>
            </div>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to remove legal entity <strong className="text-white">{deleteConfirmCompany.name}</strong> ({deleteConfirmCompany.code})?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmCompany(null)}
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
                    await onDeleteCompany(deleteConfirmCompany.id);
                    setDeleteConfirmCompany(null);
                  } catch (e) {
                    console.error('Delete company error:', e);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Delete Entity'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
