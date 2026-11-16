import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Save,
  Wrench,
  FilePlus2,
} from 'lucide-react';
import {
  DEPARTMENTS,
  REPAIR_STATUSES,
  RepairRequest,
  formatThaiCurrency,
} from '../types/repair';
import { RepairStatusLabel, UrgencyText } from './StatusBadge';

interface CalendarViewProps {
  repairs: RepairRequest[];
  onUpdateScheduledDate: (repair: RepairRequest, scheduledDate: string) => void;
  onEditRepair: (repair: RepairRequest) => void;
  onNewRepair: () => void;
}

type DateViewMode = 'created' | 'scheduled';

const THAI_WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKeyFromValue(val?: string): string {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    return val.trim();
  }
  const parsed = new Date(val);
  if (Number.isNaN(parsed.getTime())) return '';
  return toDateKey(parsed);
}

function formatThaiFullDateFromKey(dateKey: string): string {
  if (!dateKey) return '-';
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

function getStatusDotColor(status: RepairRequest['status']): string {
  if (status === 'ซ่อมเสร็จสิ้น') return '#0F766E';
  if (status === 'อนุมัติแล้ว' || status === 'กำลังดำเนินการซ่อม') return '#0284C7';
  if (status === 'ไม่อนุมัติ') return '#DC2626';
  return '#D97706';
}

export function CalendarView({
  repairs,
  onUpdateScheduledDate,
  onEditRepair,
  onNewRepair,
}: CalendarViewProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  const [currentMonth, setCurrentMonth] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
  const [dateMode, setDateMode] = useState<DateViewMode>('created');
  const [deptFilter, setDeptFilter] = useState<string>('ทั้งหมด');
  const [statusFilter, setStatusFilter] = useState<string>('ทั้งหมด');
  const [draftDates, setDraftDates] = useState<Record<string, string>>({});

  const availableDepartments = useMemo(() => {
    const depts = new Set<string>(DEPARTMENTS);
    repairs.forEach((r) => {
      if (r.department) depts.add(r.department);
    });
    return Array.from(depts);
  }, [repairs]);

  const filteredRepairs = useMemo(() => {
    return repairs.filter((r) => {
      if (deptFilter !== 'ทั้งหมด' && r.department !== deptFilter) return false;
      if (statusFilter !== 'ทั้งหมด' && r.status !== statusFilter) return false;
      return true;
    });
  }, [repairs, deptFilter, statusFilter]);

  const repairsByDate = useMemo(() => {
    const map: Record<string, RepairRequest[]> = {};
    for (const r of filteredRepairs) {
      const key =
        dateMode === 'scheduled'
          ? parseDateKeyFromValue(r.scheduledDate)
          : parseDateKeyFromValue(r.createdAt);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [filteredRepairs, dateMode]);

  const unscheduledRepairs = useMemo(() => {
    return filteredRepairs.filter(
      (r) => !parseDateKeyFromValue(r.scheduledDate) && r.status !== 'ไม่อนุมัติ'
    );
  }, [filteredRepairs]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startOffset = firstDayOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    const cells: Array<{
      dateKey: string;
      dayNumber: number;
      inCurrentMonth: boolean;
    }> = [];

    // Leading days from previous month
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDate - i;
      const d = new Date(year, month - 1, dayNum);
      cells.push({
        dateKey: toDateKey(d),
        dayNumber: dayNum,
        inCurrentMonth: false,
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      cells.push({
        dateKey: toDateKey(d),
        dayNumber: dayNum,
        inCurrentMonth: true,
      });
    }

    // Trailing days to complete 5 or 6 weeks
    const totalCells = cells.length <= 35 ? 35 : 42;
    let nextDay = 1;
    while (cells.length < totalCells) {
      const d = new Date(year, month + 1, nextDay);
      cells.push({
        dateKey: toDateKey(d),
        dayNumber: nextDay,
        inCurrentMonth: false,
      });
      nextDay += 1;
    }

    return cells;
  }, [currentMonth]);

  const currentMonthPrefix = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [currentMonth]);

  const monthStats = useMemo(() => {
    let totalInMonth = 0;
    let activeOrDone = 0;
    let pending = 0;
    Object.entries(repairsByDate).forEach(([key, list]) => {
      if (!key.startsWith(currentMonthPrefix)) return;
      totalInMonth += list.length;
      list.forEach((r) => {
        if (['อนุมัติแล้ว', 'กำลังดำเนินการซ่อม', 'ซ่อมเสร็จสิ้น'].includes(r.status)) {
          activeOrDone += 1;
        } else if (r.status !== 'ไม่อนุมัติ') {
          pending += 1;
        }
      });
    });
    return { totalInMonth, activeOrDone, pending };
  }, [repairsByDate, currentMonthPrefix]);

  const selectedDayRepairs = useMemo(() => {
    return repairsByDate[selectedDateKey] || [];
  }, [repairsByDate, selectedDateKey]);

  const goPrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateKey(toDateKey(now));
  };

  const monthTitle = `${THAI_MONTHS[currentMonth.getMonth()]} ${
    currentMonth.getFullYear() + 543
  }`;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              ปฏิทินรายการแจ้งซ่อมและกำหนดการซ่อมบำรุง
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ติดตามงานแจ้งซ่อมรายวันหรือกำหนดวันที่เข้าดำเนินการซ่อมจริงของคณะสหเวชศาสตร์
            </p>
          </div>

          {/* Date Mode Switcher */}
          <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setDateMode('created')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap min-h-[36px] ${
                dateMode === 'created'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ตามวันที่แจ้งซ่อม
            </button>
            <button
              type="button"
              onClick={() => setDateMode('scheduled')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap min-h-[36px] ${
                dateMode === 'scheduled'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ตามกำหนดการซ่อมจริง
            </button>
          </div>
        </div>

        {/* Month Nav + Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrevMonth}
              aria-label="เดือนก่อนหน้า"
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-base font-bold text-slate-900 min-w-[155px] text-center">
              {monthTitle}
            </h3>
            <button
              type="button"
              onClick={goNextMonth}
              aria-label="เดือนถัดไป"
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="px-3 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 min-h-[40px] whitespace-nowrap"
            >
              วันนี้
            </button>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              aria-label="กรองตามหน่วยงาน"
              className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-700 min-h-[40px]"
            >
              <option value="ทั้งหมด">หน่วยงาน: ทั้งหมด</option>
              {availableDepartments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="กรองตามสถานะ"
              className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-700 min-h-[40px]"
            >
              <option value="ทั้งหมด">สถานะ: ทั้งหมด</option>
              {REPAIR_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Month Summary Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 pt-1">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              ในเดือนนี้:{' '}
              <strong className="font-mono text-slate-900 tabular-nums">
                {monthStats.totalInMonth}
              </strong>{' '}
              รายการ
            </span>
            <span className="text-slate-300">·</span>
            <span>
              รออนุมัติ:{' '}
              <strong className="font-mono text-amber-700 tabular-nums">
                {monthStats.pending}
              </strong>
            </span>
            <span className="text-slate-300">·</span>
            <span>
              อนุมัติ/กำลังซ่อม/เสร็จสิ้น:{' '}
              <strong className="font-mono text-teal-700 tabular-nums">
                {monthStats.activeOrDone}
              </strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#D97706]" />
              <span>รออนุมัติ</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0284C7]" />
              <span>กำลังซ่อม</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0F766E]" />
              <span>ซ่อมเสร็จแล้ว</span>
            </span>
          </div>
        </div>
      </section>

      {/* Main Split: Calendar Grid + Selected Day Panel */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Monthly Calendar Grid */}
        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {THAI_WEEKDAYS.map((day, idx) => (
              <div
                key={day}
                className={`py-2.5 text-center text-xs font-semibold ${
                  idx === 0 || idx === 6 ? 'text-slate-500' : 'text-slate-700'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
            {calendarDays.map((cell) => {
              const items = repairsByDate[cell.dateKey] || [];
              const isToday = cell.dateKey === todayKey;
              const isSelected = cell.dateKey === selectedDateKey;

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(cell.dateKey)}
                  className={`text-left align-top p-1.5 sm:p-2 min-h-[64px] md:min-h-[108px] flex flex-col justify-between transition-colors ${
                    !cell.inCurrentMonth ? 'bg-slate-50/70 text-slate-400' : 'bg-white'
                  } ${
                    isSelected
                      ? 'ring-2 ring-inset ring-teal-700 bg-teal-50/30'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-1">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 text-xs font-mono tabular-nums rounded-md ${
                        isToday
                          ? 'bg-teal-700 text-white font-bold'
                          : cell.inCurrentMonth
                            ? 'text-slate-800 font-medium'
                            : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {items.length > 0 && (
                      <span className="md:hidden inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-bold bg-teal-700 text-white rounded">
                        {items.length}
                      </span>
                    )}
                  </div>

                  {/* Desktop event previews inside day cell */}
                  <div className="hidden md:block space-y-1 w-full mt-1.5">
                    {items.slice(0, 2).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-[11px] text-slate-800 truncate"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: getStatusDotColor(r.status) }}
                        />
                        <span className="truncate font-medium">{r.title}</span>
                      </div>
                    ))}
                    {items.length > 2 && (
                      <p className="text-[10px] font-mono text-teal-800 font-semibold px-1">
                        +{items.length - 2} รายการ
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda & Schedule Editor */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50">
              <div className="flex items-center gap-2.5 min-w-0">
                <CalendarIcon className="w-4 h-4 text-teal-700 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {formatThaiFullDateFromKey(selectedDateKey)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {dateMode === 'scheduled' ? 'กำหนดการซ่อมแซม' : 'รายการแจ้งซ่อม'} (
                    {selectedDayRepairs.length})
                  </p>
                </div>
              </div>
              {selectedDateKey === todayKey && (
                <span className="text-xs font-semibold text-teal-700 whitespace-nowrap">
                  วันนี้
                </span>
              )}
            </div>

            {selectedDayRepairs.length === 0 ? (
              <div className="px-5 py-10 text-center space-y-2.5">
                <Wrench className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-medium text-slate-800">
                  ไม่มีรายการในวันที่เลือก
                </p>
                <p className="text-xs text-slate-500">
                  {dateMode === 'scheduled'
                    ? 'ยังไม่มีงานซ่อมที่กำหนดวันซ่อมจริงในวันนี้ สามารถกำหนดวันซ่อมจากรายการด้านล่างได้'
                    : 'เลือกวันอื่นบนปฏิทิน หรือบันทึกใบแจ้งซ่อมใหม่'}
                </p>
                <button
                  type="button"
                  onClick={onNewRepair}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 min-h-[38px]"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>แจ้งซ่อมใหม่</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {selectedDayRepairs.map((r) => {
                  const currentDraft =
                    draftDates[r.id] !== undefined ? draftDates[r.id] : r.scheduledDate || '';
                  const amount = r.approvedCost || r.estimatedCost || 0;
                  return (
                    <div key={r.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono font-semibold text-teal-800 tabular-nums">
                              {r.id}
                            </span>
                            <UrgencyText urgency={r.urgency} />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-0.5 leading-snug">
                            {r.title}
                          </h4>
                        </div>
                        <RepairStatusLabel status={r.status} />
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        <p className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {r.department} · {r.location}
                          </span>
                        </p>
                        <p className="flex items-center justify-between text-slate-500">
                          <span>ผู้แจ้ง: {r.requesterName}</span>
                          <span className="font-mono font-semibold text-slate-800 tabular-nums">
                            {amount > 0 ? `฿${formatThaiCurrency(amount)}` : '-'}
                          </span>
                        </p>
                      </div>

                      {/* Schedule Date Assigner */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <label className="block text-[11px] font-medium text-slate-600">
                          กำหนดวันเข้าซ่อมจริง (Google Sheets)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={currentDraft}
                            onChange={(e) =>
                              setDraftDates((prev) => ({
                                ...prev,
                                [r.id]: e.target.value,
                              }))
                            }
                            className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:border-teal-700 min-h-[36px]"
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateScheduledDate(r, currentDraft)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 whitespace-nowrap min-h-[36px]"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>บันทึก</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditRepair(r)}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 whitespace-nowrap min-h-[36px]"
                          >
                            แก้ไข
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unscheduled Repairs Quick Assign Box */}
          {dateMode === 'scheduled' && unscheduledRepairs.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <h3 className="text-xs font-bold text-slate-900">
                    รายการที่ยังไม่ได้กำหนดวันซ่อม ({unscheduledRepairs.length})
                  </h3>
                </div>
              </div>
              <div className="divide-y divide-slate-200 max-h-[280px] overflow-y-auto">
                {unscheduledRepairs.slice(0, 8).map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-teal-800">{r.id}</p>
                      <p className="font-medium text-slate-900 truncate">{r.title}</p>
                      <p className="text-slate-500 truncate">{r.location}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateScheduledDate(r, selectedDateKey)}
                      className="px-2.5 py-1.5 text-[11px] font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 whitespace-nowrap shrink-0 min-h-[34px]"
                    >
                      ลงวันที่เลือก
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
