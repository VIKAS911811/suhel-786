import React from 'react';
import {
  LayoutDashboard,
  HardHat,
  Briefcase,
  Users,
  CalendarCheck2,
  Wallet,
  Receipt,
  CreditCard,
  BarChart3,
  CalendarDays,
  Printer,
  Building2,
  UserCog,
  Settings,
  History,
  X,
  Zap,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  FileCheck,
  Boxes,
  Sliders,
  Scale,
  FileText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { UserRole } from '../types';

export type NavTab =
  | 'dashboard'
  | 'charts'
  | 'profit_loss'
  | 'reports'
  | 'measurement_bills'
  | 'client_measurement_sheet'
  | 'bill_register'
  | 'idm'
  | 'item_master'
  | 'templates'
  | 'daily_work'
  | 'companies'
  | 'projects'
  | 'workers'
  | 'attendance'
  | 'salary'
  | 'expenses'
  | 'income'
  | 'monthly_report'
  | 'daily_report'
  | 'users'
  | 'audit_log'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  userRole: UserRole;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: NavTab;
  serial: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles?: UserRole[];
  badge?: string;
  section?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userRole,
  isMobileOpen,
  onCloseMobile,
}) => {
  // Logical, sequential numbering 01 to 21 across all functional modules
  const navItems: NavItem[] = [
    {
      section: 'DASHBOARD & ANALYTICS',
      id: 'dashboard',
      serial: '01',
      label: 'Dashboard Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'charts',
      serial: '02',
      label: 'ERP Analytics Charts',
      icon: BarChart3,
      badge: 'Live',
    },
    {
      id: 'profit_loss',
      serial: '03',
      label: 'Automatic Profit & Loss',
      icon: Scale,
    },
    {
      id: 'reports',
      serial: '04',
      label: 'Comprehensive Reports',
      icon: FileText,
    },

    {
      section: 'MEASUREMENT & BILLING (MAJOR)',
      id: 'measurement_bills',
      serial: '05',
      label: 'Measurement / Muster Bill',
      icon: FileSpreadsheet,
      badge: 'Major',
    },
    {
      id: 'client_measurement_sheet',
      serial: '06',
      label: 'Client Measurement Sheet',
      icon: FileCheck,
      badge: 'No Rates',
    },
    {
      id: 'bill_register',
      serial: '07',
      label: 'Bill Register',
      icon: Receipt,
    },
    {
      id: 'idm',
      serial: '08',
      label: 'IDM Management',
      icon: FileText,
    },
    {
      id: 'item_master',
      serial: '09',
      label: 'Item Master Catalog',
      icon: Boxes,
    },
    {
      id: 'templates',
      serial: '10',
      label: 'Measurement Templates',
      icon: Sliders,
    },

    {
      section: 'SITE & WORKFORCE OPERATIONS',
      id: 'daily_work',
      serial: '11',
      label: 'Daily Work Report',
      icon: HardHat,
    },
    {
      id: 'companies',
      serial: '12',
      label: 'Company Management',
      icon: Building2,
    },
    {
      id: 'projects',
      serial: '13',
      label: 'Project Management',
      icon: Briefcase,
    },
    {
      id: 'workers',
      serial: '14',
      label: 'Worker Management',
      icon: Users,
    },
    {
      id: 'attendance',
      serial: '15',
      label: 'Attendance Muster',
      icon: CalendarCheck2,
    },

    {
      section: 'FINANCIAL MANAGEMENT',
      id: 'salary',
      serial: '16',
      label: 'Worker Salary / Wages',
      icon: Wallet,
      allowedRoles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
    },
    {
      id: 'expenses',
      serial: '17',
      label: 'Site Expenses & Fuel',
      icon: Receipt,
      allowedRoles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
    },
    {
      id: 'income',
      serial: '18',
      label: 'Income & RA Billings',
      icon: CreditCard,
      allowedRoles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
    },

    {
      section: 'ADMINISTRATION & SECURITY',
      id: 'users',
      serial: '19',
      label: 'User Roles & Access',
      icon: UserCog,
      allowedRoles: ['ADMIN', 'MANAGER'],
    },
    {
      id: 'settings',
      serial: '20',
      label: 'Settings & Database',
      icon: Settings,
      allowedRoles: ['ADMIN', 'MANAGER'],
    },
    {
      id: 'audit_log',
      serial: '21',
      label: 'System Audit Logs',
      icon: History,
      allowedRoles: ['ADMIN', 'MANAGER'],
    },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Futuristic Sidebar Container */}
      <aside
        className={`no-print fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#090d18] border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-10 shadow-2xl ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header with Cyber Accents */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-gradient-to-r from-[#0d1527] to-[#090d18] relative">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center font-black text-slate-950 text-xs shadow-md shadow-amber-500/30">
              SR
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-white text-sm tracking-tight leading-tight">
                  SR GROUP
                </h1>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-amber-400/90 font-mono tracking-wider font-semibold">
                ENGINEERING ERP 2026
              </p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items List with Sequential Badges */}
        <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          {navItems.map((item, index) => {
            // Check role permissions
            if (item.allowedRoles && !item.allowedRoles.includes(userRole)) {
              return null;
            }

            const isActive = currentTab === item.id;
            const Icon = item.icon;

            return (
              <React.Fragment key={item.id}>
                {item.section && (
                  <div
                    className={`px-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-400 font-mono uppercase ${
                      index > 0 ? 'pt-4 pb-1.5' : 'pb-1.5'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70" />
                    <span>{item.section}</span>
                  </div>
                )}

                <button
                  onClick={() => handleNavClick(item.id)}
                  className={`group w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 relative ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-300 border-l-2 border-amber-400 shadow-[inset_0_0_15px_rgba(245,158,11,0.08)]'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-850/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`font-mono text-[10px] w-5 h-5 flex items-center justify-center rounded-md font-bold transition-all shrink-0 ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/40'
                          : 'bg-slate-800/80 text-slate-400 group-hover:text-amber-300 group-hover:bg-slate-750 border border-slate-700/50'
                      }`}
                    >
                      {item.serial}
                    </span>
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 text-[9px] rounded-md font-mono font-bold shrink-0 ml-1.5 border ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : item.badge === 'Live'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Futuristic Status Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#070b14]">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 shadow-inner">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>ALL ENGINES ONLINE</span>
              </div>
              <span className="font-mono text-[9px] text-slate-500">v2.6</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Heavy Structural Fabrication • Measurement & Bills
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
