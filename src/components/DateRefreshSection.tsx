import React, { useState } from 'react';
import {
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  HardHat,
  IndianRupee,
  Layers,
  Sparkles,
} from 'lucide-react';
import { FilterState, ProfitLossSummary } from '../types';
import { formatCurrency } from '../lib/calculations';

interface DateRefreshSectionProps {
  filter: FilterState;
  onFilterChange: (newFilter: Partial<FilterState>) => void;
  onRefreshData?: () => Promise<void>;
  summary: ProfitLossSummary;
  isRefreshing?: boolean;
}

export const DateRefreshSection: React.FC<DateRefreshSectionProps> = ({
  filter,
  onFilterChange,
  onRefreshData,
  summary,
  isRefreshing = false,
}) => {
  const [localSpinning, setLocalSpinning] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('Just now');

  // Helper to format today's date in YYYY-MM-DD
  const getTodayDate = (): string => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayDate = (): string => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayDate();
  const yesterdayStr = getYesterdayDate();

  // Step backward or forward by N days
  const stepDate = (deltaDays: number) => {
    try {
      const parts = filter.date.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        d.setDate(d.getDate() + deltaDays);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const newDate = `${year}-${month}-${day}`;
        onFilterChange({
          date: newDate,
          datePreset: newDate === todayStr ? 'today' : newDate === yesterdayStr ? 'yesterday' : 'custom',
          startDate: newDate,
          endDate: newDate,
        });
      }
    } catch (e) {
      console.error('Error stepping date:', e);
    }
  };

  // Trigger full refresh (reset date to today + re-sync backend)
  const handleRefreshToToday = async () => {
    setLocalSpinning(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    onFilterChange({
      date: todayStr,
      datePreset: 'today',
      startDate: todayStr,
      endDate: todayStr,
    });

    if (onRefreshData) {
      await onRefreshData();
    }
    setLastRefreshedAt(timeStr);

    setTimeout(() => {
      setLocalSpinning(false);
    }, 600);
  };

  // Re-sync current date data without changing date
  const handleSyncCurrentDate = async () => {
    setLocalSpinning(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (onRefreshData) {
      await onRefreshData();
    }
    setLastRefreshedAt(timeStr);
    setTimeout(() => {
      setLocalSpinning(false);
    }, 600);
  };

  // Format date display
  const formatDateDisplay = (dateString: string) => {
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const weekday = d.toLocaleDateString('en-IN', { weekday: 'long' });
        const formatted = d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        return { weekday, formatted };
      }
    } catch (e) {
      // fallback
    }
    return { weekday: 'Date', formatted: dateString };
  };

  const { weekday, formatted } = formatDateDisplay(filter.date);

  const isToday = filter.date === todayStr;
  const isYesterday = filter.date === yesterdayStr;
  const isFuture = filter.date > todayStr;

  return (
    <div
      id="date-refresh-section"
      className="no-print bg-gradient-to-r from-[#0d1627] via-[#101b30] to-[#0d1627] border border-amber-500/30 hover:border-amber-500/50 rounded-xl p-3.5 sm:p-4 mb-5 shadow-xl transition-all relative overflow-hidden"
    >
      {/* Background industrial circuit accent */}
      <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Active Date Header & Day Display */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Date Icon Badge */}
          <div className="w-11 h-11 rounded-xl bg-slate-900 border border-amber-500/40 flex flex-col items-center justify-center text-amber-400 shadow-md shadow-amber-500/10 shrink-0">
            <Calendar className="w-5 h-5 text-amber-400" />
            <span className="text-[9px] font-mono font-bold tracking-tight uppercase text-slate-400">
              {filter.date.slice(8, 10)}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-extrabold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                DATE REFRESH & SELECTION CONTROL
              </span>
              
              {/* Date Status Badges */}
              {isToday && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  TODAY
                </span>
              )}
              {isYesterday && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  YESTERDAY
                </span>
              )}
              {!isToday && !isYesterday && !isFuture && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Past Date
                </span>
              )}
              {isFuture && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Future Date
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mt-0.5">
              <h2 className="text-base sm:text-lg font-black text-white font-mono tracking-tight">
                {weekday}, {formatted}
              </h2>
              <span className="text-xs font-mono text-slate-400 font-medium hidden sm:inline">
                [{filter.date}]
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Last updated: {lastRefreshedAt}</span>
              <span>•</span>
              <span className="text-slate-300">
                Mode: {filter.viewMode === 'work_value' ? 'Work Value (Accrual)' : 'Cash Received'}
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right: Date Controls & Quick Refresh Tools */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Stepper Control: Prev Day < Calendar Input > Next Day */}
          <div className="flex items-center bg-slate-900/95 border border-slate-700/80 rounded-lg p-0.5 shadow-inner">
            <button
              id="btn-prev-day"
              onClick={() => stepDate(-1)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md text-xs font-medium flex items-center gap-1 transition-colors"
              title="Previous Day (1 din pehle)"
            >
              <ChevronLeft className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline text-[11px]">Prev</span>
            </button>

            {/* Direct Date Input */}
            <div className="relative px-2 py-0.5 border-x border-slate-800 flex items-center gap-1">
              <input
                id="input-date-refresh"
                type="date"
                value={filter.date}
                onChange={(e) => {
                  if (e.target.value) {
                    onFilterChange({
                      date: e.target.value,
                      datePreset: e.target.value === todayStr ? 'today' : e.target.value === yesterdayStr ? 'yesterday' : 'custom',
                      startDate: e.target.value,
                      endDate: e.target.value,
                    });
                  }
                }}
                className="bg-transparent text-slate-100 text-xs font-mono font-bold focus:outline-none cursor-pointer py-1"
              />
            </div>

            <button
              id="btn-next-day"
              onClick={() => stepDate(1)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md text-xs font-medium flex items-center gap-1 transition-colors"
              title="Next Day (Agla din)"
            >
              <span className="hidden sm:inline text-[11px]">Next</span>
              <ChevronRight className="w-4 h-4 text-amber-400" />
            </button>
          </div>

          {/* Quick Presets: Today / Yesterday / This Week / This Month */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              id="btn-preset-today"
              onClick={() => {
                onFilterChange({
                  date: todayStr,
                  datePreset: 'today',
                  startDate: todayStr,
                  endDate: todayStr,
                });
              }}
              className={`px-2.5 py-1.5 rounded-md font-semibold text-[11px] transition-all ${
                isToday
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Today
            </button>
            <button
              id="btn-preset-yesterday"
              onClick={() => {
                onFilterChange({
                  date: yesterdayStr,
                  datePreset: 'yesterday',
                  startDate: yesterdayStr,
                  endDate: yesterdayStr,
                });
              }}
              className={`px-2.5 py-1.5 rounded-md font-semibold text-[11px] transition-all ${
                isYesterday
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Yesterday
            </button>
            <button
              id="btn-preset-this-week"
              onClick={() => onFilterChange({ datePreset: 'this_week' })}
              className={`px-2.5 py-1.5 rounded-md font-semibold text-[11px] transition-all ${
                filter.datePreset === 'this_week'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              This Week
            </button>
            <button
              id="btn-preset-this-month"
              onClick={() => onFilterChange({ datePreset: 'this_month' })}
              className={`px-2.5 py-1.5 rounded-md font-semibold text-[11px] transition-all ${
                filter.datePreset === 'this_month'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              This Month
            </button>
          </div>

          {/* Core Feature: DATE REFRESH BUTTON (Aaj ki date refresh) */}
          <button
            id="btn-refresh-date"
            onClick={handleRefreshToToday}
            disabled={localSpinning || isRefreshing}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-lg shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all transform active:scale-95 disabled:opacity-50"
            title="Refresh to Today's date and reload live records"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${localSpinning || isRefreshing ? 'animate-spin' : ''}`}
            />
            <span>Refresh Date</span>
          </button>

          {/* Sync Current Date Data Button */}
          <button
            id="btn-sync-data"
            onClick={handleSyncCurrentDate}
            disabled={localSpinning || isRefreshing}
            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            title="Sync live records for the currently selected date"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Sync Data</span>
          </button>
        </div>
      </div>

      {/* Bottom KPI Bar for this selected date */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-slate-900/60 rounded-lg px-2.5 py-1.5 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px]">Work Value:</span>
          </div>
          <span className="font-mono font-bold text-white text-xs">
            {formatCurrency(summary.totalWorkValue)}
          </span>
        </div>

        <div className="bg-slate-900/60 rounded-lg px-2.5 py-1.5 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <HardHat className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px]">Present:</span>
          </div>
          <span className="font-mono font-bold text-emerald-300 text-xs">
            {summary.presentWorkers} / {summary.workerCount}
          </span>
        </div>

        <div className="bg-slate-900/60 rounded-lg px-2.5 py-1.5 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <IndianRupee className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[11px]">Expenses:</span>
          </div>
          <span className="font-mono font-bold text-red-300 text-xs">
            {formatCurrency(summary.totalExpense)}
          </span>
        </div>

        <div className="bg-slate-900/60 rounded-lg px-2.5 py-1.5 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-[11px]">Daily Margin:</span>
          </div>
          <span
            className={`font-mono font-bold text-xs ${
              summary.isProfit ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {summary.isProfit ? '+' : '-'}
            {formatCurrency(summary.isProfit ? summary.netProfit : summary.netLoss)} ({summary.profitPercentage.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
};
