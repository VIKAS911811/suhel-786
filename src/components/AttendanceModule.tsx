import React, { useState, useEffect } from 'react';
import {
  CalendarCheck2,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Save,
  Check,
  Building2,
  Briefcase,
  Layers,
  Sparkles,
  Calendar,
} from 'lucide-react';
import {
  AttendanceRecord,
  AttendanceStatus,
  Company,
  FilterState,
  Project,
  User,
  Worker,
} from '../types';
import { formatCurrency } from '../lib/calculations';
import { exportAttendanceExcel } from '../lib/exportUtils';

interface AttendanceModuleProps {
  attendanceRecords: AttendanceRecord[];
  workers: Worker[];
  companies: Company[];
  projects: Project[];
  currentUser: User;
  onSaveBulkAttendance?: (records: AttendanceRecord[]) => Promise<void>;
  onSaveAttendance?: (records: AttendanceRecord[]) => Promise<void>;
  globalFilter?: FilterState;
  globalDate?: string;
  selectedCompanyId?: string;
  selectedProjectId?: string;
}

interface WorkerAttendanceRow {
  workerId: string;
  workerName: string;
  category: string;
  companyId: string;
  projectId: string;
  status: AttendanceStatus;
  overtimeHours: number;
  dailyRate: number;
  overtimeRate: number;
  basicWage: number;
  overtimeWage: number;
  netDailyWage: number;
  remarks: string;
  existingRecordId?: string;
}

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({
  attendanceRecords,
  workers,
  companies,
  projects,
  currentUser,
  onSaveBulkAttendance,
  onSaveAttendance,
  globalFilter,
  globalDate,
  selectedCompanyId,
  selectedProjectId,
}) => {
  const initialDate = globalFilter?.date || globalDate || new Date().toISOString().slice(0, 10);
  const initialCompany = globalFilter?.companyId || selectedCompanyId || 'all';
  const initialProject = globalFilter?.projectId || selectedProjectId || 'all';

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedCompany, setSelectedCompany] = useState<string>(initialCompany);
  const [selectedProject, setSelectedProject] = useState<string>(initialProject);

  const [rows, setRows] = useState<WorkerAttendanceRow[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Sync when filter props change
  useEffect(() => {
    if (globalFilter?.date) setSelectedDate(globalFilter.date);
    else if (globalDate) setSelectedDate(globalDate);
  }, [globalFilter?.date, globalDate]);

  useEffect(() => {
    if (globalFilter?.companyId) setSelectedCompany(globalFilter.companyId);
    else if (selectedCompanyId) setSelectedCompany(selectedCompanyId);
  }, [globalFilter?.companyId, selectedCompanyId]);

  useEffect(() => {
    if (globalFilter?.projectId) setSelectedProject(globalFilter.projectId);
    else if (selectedProjectId) setSelectedProject(selectedProjectId);
  }, [globalFilter?.projectId, selectedProjectId]);

  // Initialize or update rows when date, company, or project changes
  useEffect(() => {
    // Filter active workers eligible for this view
    const eligibleWorkers = (workers || []).filter((w) => {
      if (w.status && w.status !== 'Active') return false;
      if (selectedCompany !== 'all' && w.companyId !== selectedCompany) return false;
      if (selectedProject !== 'all' && w.projectId !== selectedProject) return false;
      return true;
    });

    const newRows: WorkerAttendanceRow[] = eligibleWorkers.map((w) => {
      const workerDisplayName = w.workerName || (w as any).name || 'Worker';

      // Find if an attendance record exists for this worker on selectedDate
      const existing = (attendanceRecords || []).find(
        (a) => a.workerId === w.id && a.date === selectedDate
      );

      if (existing) {
        return {
          workerId: w.id,
          workerName: workerDisplayName,
          category: w.category || 'General',
          companyId: existing.companyId || w.companyId,
          projectId: existing.projectId || w.projectId,
          status: existing.status,
          overtimeHours: existing.overtimeHours || 0,
          dailyRate: existing.dailyRate || w.dailyRate || 0,
          overtimeRate: existing.overtimeRate || w.overtimeRate || 0,
          basicWage: existing.basicWage || 0,
          overtimeWage: existing.overtimeWage || 0,
          netDailyWage: existing.netDailyWage || 0,
          remarks: existing.remarks || '',
          existingRecordId: existing.id,
        };
      }

      // Default: Full Day with 0 OT
      const dailyRate = w.dailyRate || 0;
      const overtimeRate = w.overtimeRate || 0;
      const basicWage = dailyRate;
      const overtimeWage = 0;
      return {
        workerId: w.id,
        workerName: workerDisplayName,
        category: w.category || 'General',
        companyId: w.companyId,
        projectId: w.projectId,
        status: 'Full Day',
        overtimeHours: 0,
        dailyRate,
        overtimeRate,
        basicWage,
        overtimeWage,
        netDailyWage: basicWage + overtimeWage,
        remarks: '',
      };
    });

    setRows(newRows);
    setSavedSuccess(false);
  }, [selectedDate, selectedCompany, selectedProject, workers, attendanceRecords]);

  // Recalculate wage for a row
  const updateRowStatus = (index: number, newStatus: AttendanceStatus) => {
    setRows((prev) => {
      const next = [...prev];
      const r = { ...next[index] };
      r.status = newStatus;

      if (newStatus === 'Full Day') {
        r.basicWage = r.dailyRate;
      } else if (newStatus === 'Half Day') {
        r.basicWage = r.dailyRate / 2;
      } else {
        r.basicWage = 0;
      }

      r.netDailyWage = r.basicWage + r.overtimeWage;
      next[index] = r;
      return next;
    });
  };

  const updateRowOt = (index: number, otHours: number) => {
    const hours = Math.max(0, otHours);
    setRows((prev) => {
      const next = [...prev];
      const r = { ...next[index] };
      r.overtimeHours = hours;
      r.overtimeWage = hours * r.overtimeRate;
      r.netDailyWage = r.basicWage + r.overtimeWage;
      next[index] = r;
      return next;
    });
  };

  const updateRowRemarks = (index: number, remarks: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], remarks };
      return next;
    });
  };

  // Bulk presets
  const applyPresetAll = (status: AttendanceStatus) => {
    setRows((prev) =>
      prev.map((r) => {
        let basic = 0;
        if (status === 'Full Day') basic = r.dailyRate;
        else if (status === 'Half Day') basic = r.dailyRate / 2;
        return {
          ...r,
          status,
          basicWage: basic,
          netDailyWage: basic + r.overtimeWage,
        };
      })
    );
  };

  // Summary figures
  const totalWorkers = rows.length;
  const presentCount = rows.filter((r) => r.status === 'Full Day').length;
  const halfDayCount = rows.filter((r) => r.status === 'Half Day').length;
  const absentCount = rows.filter((r) => r.status === 'Absent').length;
  const totalOtHours = rows.reduce((acc, curr) => acc + curr.overtimeHours, 0);
  const totalSalary = rows.reduce((acc, curr) => acc + curr.netDailyWage, 0);

  const handleSaveAttendance = async () => {
    try {
      setIsSaving(true);
      const recordsToSave: AttendanceRecord[] = rows.map((r) => ({
        id: r.existingRecordId || `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        date: selectedDate,
        workerId: r.workerId,
        workerName: r.workerName,
        companyId: r.companyId,
        projectId: r.projectId,
        status: r.status,
        overtimeHours: r.overtimeHours,
        dailyRate: r.dailyRate,
        overtimeRate: r.overtimeRate,
        basicWage: r.basicWage,
        overtimeWage: r.overtimeWage,
        netDailyWage: r.netDailyWage,
        remarks: r.remarks,
        createdAt: new Date().toISOString(),
      }));

      const saveFn = onSaveBulkAttendance || onSaveAttendance;
      if (saveFn) {
        await saveFn(recordsToSave);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white font-mono uppercase tracking-tight">
              DAILY ATTENDANCE MODULE
            </h2>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-800 text-amber-300 rounded border border-slate-700">
              {totalWorkers} Site Workers
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Rapid multi-worker attendance marking, overtime wage computation and direct expense integration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportAttendanceExcel(attendanceRecords, companies, projects)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export History
          </button>

          {['ADMIN', 'MANAGER', 'SUPERVISOR'].includes(currentUser.role) && (
            <button
              onClick={handleSaveAttendance}
              disabled={isSaving || rows.length === 0}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                savedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {isSaving ? (
                <span>Saving...</span>
              ) : savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Attendance Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Attendance</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Date & Site Filter Controls */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Attendance Date */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-slate-400 font-medium">Marking Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-200 font-mono font-bold focus:outline-none cursor-pointer text-xs"
            />
          </div>

          {/* Company Filter */}
          <div>
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setSelectedProject('all');
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Projects</option>
              {(selectedCompany === 'all'
                ? projects
                : projects.filter((p) => p.companyId === selectedCompany)
              ).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectId} - {p.projectName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Batch Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] font-semibold">Quick 1-Click Presets:</span>
            <button
              onClick={() => applyPresetAll('Full Day')}
              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-medium transition-colors"
            >
              All Full Day
            </button>
            <button
              onClick={() => applyPresetAll('Half Day')}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded text-[11px] font-medium transition-colors"
            >
              All Half Day
            </button>
            <button
              onClick={() => applyPresetAll('Absent')}
              className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded text-[11px] font-medium transition-colors"
            >
              All Absent
            </button>
          </div>

          <div className="text-[11px] text-slate-400">
            Formula: Full Day = Rate, Half Day = Rate/2, OT = Hours × OT Rate
          </div>
        </div>
      </div>

      {/* Attendance KPI Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Total Workers</div>
          <div className="text-lg font-mono font-bold text-white mt-0.5">{totalWorkers}</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase">Present (Full)</div>
          <div className="text-lg font-mono font-bold text-emerald-300 mt-0.5">{presentCount}</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-semibold text-amber-400 uppercase">Half Day</div>
          <div className="text-lg font-mono font-bold text-amber-300 mt-0.5">{halfDayCount}</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-semibold text-red-400 uppercase">Absent</div>
          <div className="text-lg font-mono font-bold text-red-300 mt-0.5">{absentCount}</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-semibold text-blue-400 uppercase">Total OT Hours</div>
          <div className="text-lg font-mono font-bold text-blue-300 mt-0.5">{totalOtHours} hrs</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-semibold text-amber-400 uppercase">Today's Wage</div>
          <div className="text-lg font-mono font-bold text-amber-300 mt-0.5">{formatCurrency(totalSalary)}</div>
        </div>
      </div>

      {/* Bulk Attendance Grid */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b1220] text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Worker Name & Trade</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Daily Rate</th>
                <th className="py-3 px-3 text-center">OT Hours</th>
                <th className="py-3 px-3 text-right">OT Rate</th>
                <th className="py-3 px-3 text-right">Basic Wage</th>
                <th className="py-3 px-3 text-right">OT Wage</th>
                <th className="py-3 px-3 text-right">Net Daily Wage</th>
                <th className="py-3 px-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {rows.length > 0 ? (
                rows.map((r, idx) => (
                  <tr key={r.workerId} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white whitespace-nowrap">{r.workerName}</div>
                      <div className="text-[10px] text-slate-400">{r.category}</div>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex rounded-lg bg-slate-900 border border-slate-700 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => updateRowStatus(idx, 'Full Day')}
                          className={`px-2 py-1 rounded font-bold transition-all ${
                            r.status === 'Full Day'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Full Day
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRowStatus(idx, 'Half Day')}
                          className={`px-2 py-1 rounded font-bold transition-all ${
                            r.status === 'Half Day'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Half Day
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRowStatus(idx, 'Absent')}
                          className={`px-2 py-1 rounded font-bold transition-all ${
                            r.status === 'Absent'
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300 whitespace-nowrap">
                      {formatCurrency(r.dailyRate)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        max="16"
                        step="0.5"
                        value={r.overtimeHours}
                        onChange={(e) => updateRowOt(idx, parseFloat(e.target.value) || 0)}
                        className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-mono text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                      />
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400 whitespace-nowrap">
                      {formatCurrency(r.overtimeRate)}/h
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-200 whitespace-nowrap">
                      {formatCurrency(r.basicWage)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-400 whitespace-nowrap">
                      {formatCurrency(r.overtimeWage)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-400 whitespace-nowrap">
                      {formatCurrency(r.netDailyWage)}
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        placeholder="Notes..."
                        value={r.remarks}
                        onChange={(e) => updateRowRemarks(idx, e.target.value)}
                        className="w-32 sm:w-48 bg-slate-900/80 border border-slate-700 rounded px-2 py-1 text-slate-300 placeholder-slate-600 focus:outline-none text-[11px]"
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500">
                    No active workers found for the selected company/project.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
