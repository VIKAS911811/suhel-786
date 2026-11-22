import React from 'react';
import {
  Calendar,
  Building2,
  Briefcase,
  UserCheck,
  Shield,
  Printer,
  PlusCircle,
  Menu,
  Eye,
  CheckCircle2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { Company, FilterState, Project, User, UserRole } from '../types';

interface NavbarProps {
  filter: FilterState;
  onFilterChange: (newFilter: Partial<FilterState>) => void;
  companies: Company[];
  projects: Project[];
  currentUser: User;
  onUserChange: (user: User) => void;
  users: User[];
  onOpenQuickWork: () => void;
  onOpenAttendance: () => void;
  onOpenPrintReport: () => void;
  onToggleMobileMenu: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  filter,
  onFilterChange,
  companies,
  projects,
  currentUser,
  onUserChange,
  users,
  onOpenQuickWork,
  onOpenAttendance,
  onOpenPrintReport,
  onToggleMobileMenu,
  onLogout,
}) => {
  // Filter projects based on selected company
  const availableProjects = filter.companyId === 'all'
    ? projects
    : projects.filter((p) => p.companyId === filter.companyId);

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MANAGER':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'SUPERVISOR':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'ACCOUNTANT':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    }
  };

  return (
    <header className="no-print bg-[#0b1322] border-b border-slate-800/80 sticky top-0 z-30 shadow-xl">
      {/* Top Brand Bar */}
      <div className="px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white bg-slate-800/70 rounded-lg border border-slate-700"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-extrabold text-slate-950 shadow-md shadow-amber-500/20 text-sm tracking-wider">
              SR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight font-mono">
                  SR GROUP
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded bg-slate-800 text-amber-400 border border-amber-500/30">
                  Industrial ERP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden md:block">
                Daily Work, Worker & Profit/Loss Management System
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons & User Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* Work Value vs Cash Received Toggle */}
          <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => onFilterChange({ viewMode: 'work_value' })}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                filter.viewMode === 'work_value'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Calculate profit based on total work completion value"
            >
              <Eye className="w-3.5 h-3.5" />
              Work Value View
            </button>
            <button
              onClick={() => onFilterChange({ viewMode: 'cash_received' })}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                filter.viewMode === 'cash_received'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Calculate profit based on actual realized cash received"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Cash Received View
            </button>
          </div>

          {/* Quick Print Daily Report */}
          <button
            onClick={onOpenPrintReport}
            className="px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Print Official Daily Work & Financial Report"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Daily Report</span>
          </button>

          {/* Quick Work Entry (Admin, Manager, Supervisor) */}
          {['ADMIN', 'MANAGER', 'SUPERVISOR'].includes(currentUser.role) && (
            <button
              onClick={onOpenQuickWork}
              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-amber-500/10"
              title="Log Daily Work Entry"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ Log Work</span>
            </button>
          )}

          {/* User Role Switcher (Multi-role demo & administration) */}
          <div className="relative group">
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
                  {currentUser.name.split(' ')[0]}
                </div>
                <div className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5" />
                  {currentUser.role}
                </div>
              </div>
              <select
                aria-label="Switch User Role"
                value={currentUser.id}
                onChange={(e) => {
                  const u = users.find((item) => item.id === e.target.value);
                  if (u) onUserChange(u);
                }}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.role}: {u.name.split(' ')[0]}
                  </option>
                ))}
              </select>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition border border-transparent hover:border-red-500/30 flex items-center gap-1"
                  title="Log Out of Session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline text-[11px] font-semibold">Logout</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global Filter Bar (Date Selector, Company Selector, Project Selector) */}
      <div className="px-4 sm:px-6 py-2 bg-[#0d1627] flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
        {/* Date Selector & Stepper */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => {
              try {
                const parts = filter.date.split('-');
                if (parts.length === 3) {
                  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                  d.setDate(d.getDate() - 1);
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  const newDate = `${y}-${m}-${day}`;
                  onFilterChange({ date: newDate, datePreset: 'custom', startDate: newDate, endDate: newDate });
                }
              } catch (e) {}
            }}
            className="p-1 text-slate-400 hover:text-amber-400 rounded transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1.5 px-2 py-1">
            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <input
              type="date"
              value={filter.date}
              onChange={(e) => onFilterChange({ date: e.target.value, datePreset: 'custom', startDate: e.target.value, endDate: e.target.value })}
              className="bg-transparent text-slate-200 text-xs font-mono font-medium focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => {
              try {
                const parts = filter.date.split('-');
                if (parts.length === 3) {
                  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                  d.setDate(d.getDate() + 1);
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  const newDate = `${y}-${m}-${day}`;
                  onFilterChange({ date: newDate, datePreset: 'custom', startDate: newDate, endDate: newDate });
                }
              } catch (e) {}
            }}
            className="p-1 text-slate-400 hover:text-amber-400 rounded transition-colors"
            title="Next Day"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Date Presets + Quick Refresh */}
        <div className="flex items-center gap-1 bg-slate-900/60 p-0.5 rounded-lg border border-slate-800/80">
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              const yDate = d.toISOString().slice(0, 10);
              onFilterChange({ date: yDate, datePreset: 'yesterday', startDate: yDate, endDate: yDate });
            }}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              filter.datePreset === 'yesterday'
                ? 'bg-slate-700 text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Yesterday
          </button>
          <button
            onClick={() => {
              const todayStr = new Date().toISOString().slice(0, 10);
              onFilterChange({ date: todayStr, datePreset: 'today', startDate: todayStr, endDate: todayStr });
            }}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              filter.datePreset === 'today'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => onFilterChange({ datePreset: 'this_week' })}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              filter.datePreset === 'this_week'
                ? 'bg-slate-700 text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => onFilterChange({ datePreset: 'this_month' })}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              filter.datePreset === 'this_month'
                ? 'bg-slate-700 text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            This Month
          </button>

          {/* Quick Refresh Icon Button */}
          <button
            onClick={() => {
              const todayStr = new Date().toISOString().slice(0, 10);
              onFilterChange({ date: todayStr, datePreset: 'today', startDate: todayStr, endDate: todayStr });
            }}
            className="p-1 text-amber-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-colors ml-0.5"
            title="Refresh Date to Today"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Company Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
          <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-slate-400 font-medium text-[11px]">Company:</span>
          <select
            value={filter.companyId}
            onChange={(e) => onFilterChange({ companyId: e.target.value, projectId: 'all' })}
            className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer max-w-[160px] truncate"
          >
            <option value="all" className="bg-slate-900 text-slate-200">
              [ All Companies ]
            </option>
            {companies.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
          <Briefcase className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-slate-400 font-medium text-[11px]">Project:</span>
          <select
            value={filter.projectId}
            onChange={(e) => onFilterChange({ projectId: e.target.value })}
            className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer max-w-[200px] truncate"
          >
            <option value="all" className="bg-slate-900 text-slate-200">
              [ All Projects ]
            </option>
            {availableProjects.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                {p.projectId} - {p.projectName}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Filter shortcut if not defaults */}
        {(filter.companyId !== 'all' || filter.projectId !== 'all' || filter.datePreset !== 'today') && (
          <button
            onClick={() => onFilterChange({ companyId: 'all', projectId: 'all', datePreset: 'today', date: '2026-09-14' })}
            className="text-[11px] text-amber-400/90 hover:text-amber-300 underline font-medium ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>
    </header>
  );
};
