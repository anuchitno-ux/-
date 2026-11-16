import React, { useMemo, useState } from 'react';
import { History, Search, X, FileSpreadsheet, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { AuditLog, RepairRequest, formatThaiDateTime } from '../types/repair';

interface AuditLogsViewProps {
  logs: AuditLog[];
  repairs: RepairRequest[];
  isLoading: boolean;
  onInspectRepair: (repairId: string) => void;
}

export function AuditLogsView({
  logs,
  repairs,
  isLoading,
  onInspectRepair,
}: AuditLogsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ทั้งหมด');

  const repairIdSet = useMemo(() => new Set(repairs.map((r) => r.id)), [repairs]);

  const availableActions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.action) set.add(l.action);
    });
    return Array.from(set);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (actionFilter !== 'ทั้งหมด' && l.action !== actionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const hay = `${l.id} ${l.userName} ${l.userEmail} ${l.action} ${l.targetId} ${l.details}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, actionFilter, searchQuery]);

  const handleExportLogsExcel = () => {
    const rows: (string | number)[][] = [
      ['รายงานประวัติการใช้งานและแก้ไขข้อมูล (Audit Trail) — คณะสหเวชศาสตร์ มหาวิทยาลัยพะเยา'],
      [`วันที่ออกรายงาน: ${formatThaiDateTime(new Date().toISOString())}`],
      [`จำนวนรายการที่แสดง: ${filteredLogs.length} รายการ`],
      [],
      [
        'ลำดับ',
        'รหัส Log',
        'วันเวลาที่ทำรายการ',
        'ชื่อผู้ใช้งาน',
        'อีเมลผู้ใช้งาน',
        'การดำเนินการ',
        'รหัสรายการอ้างอิง',
        'รายละเอียดการดำเนินการ',
      ],
      ...filteredLogs.map((l, idx) => [
        idx + 1,
        l.id,
        formatThaiDateTime(l.timestamp),
        l.userName,
        l.userEmail || '-',
        l.action,
        l.targetId || '-',
        l.details || '-',
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 },
      { wch: 18 },
      { wch: 24 },
      { wch: 24 },
      { wch: 28 },
      { wch: 22 },
      { wch: 18 },
      { wch: 52 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Audit_Logs');
    XLSX.writeFile(wb, 'รายงานประวัติการใช้งานระบบ_Logs.xlsx');
  };

  const getActionTextClass = (action: string) => {
    if (action.includes('ลบ')) return 'text-red-700';
    if (action.includes('อนุมัติ') || action.includes('ประเมิน')) return 'text-emerald-700';
    if (action.includes('สร้าง') || action.includes('สถานะ') || action.includes('กำหนด')) {
      return 'text-teal-800';
    }
    return 'text-slate-800';
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">
              ประวัติการเข้าใช้งานและแก้ไขข้อมูล (Audit Trail)
            </h2>
            <p className="text-xs text-slate-500">
              บันทึกชื่อผู้ใช้งาน วันเวลา และการดำเนินการรายรายการซ่อมลงในแผ่นงาน Logs บน Google Sheets
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {(searchQuery.trim() !== '' || actionFilter !== 'ทั้งหมด') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActionFilter('ทั้งหมด');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg min-h-[40px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ล้างตัวกรอง</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExportLogsExcel}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 min-h-[42px] whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>ส่งออก Audit Logs (.xlsx)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="relative md:col-span-8">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อผู้ใช้งาน, อีเมล, รหัสรายการแจ้งซ่อม, หรือรายละเอียด..."
              aria-label="ค้นหาประวัติการใช้งาน"
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 min-h-[42px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="ล้างคำค้นหา"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="md:col-span-4">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              aria-label="กรองตามประเภทการดำเนินการ"
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-700 min-h-[42px]"
            >
              <option value="ทั้งหมด">การดำเนินการ: ทั้งหมด ({logs.length})</option>
              {availableActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Logs Table / Empty State */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="px-6 py-14 text-center space-y-2.5">
            <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              {logs.length === 0
                ? 'ยังไม่มีบันทึก Audit Log ในแผ่นงาน Logs'
                : 'ไม่พบบันทึก Log ที่ตรงกับคำค้นหา'}
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              ทุกการเข้าใช้งาน การสร้าง แก้ไข เปลี่ยนสถานะ อนุมัติ หรือประเมินผลรายการซ่อม จะถูกบันทึกไว้ที่นี่โดยอัตโนมัติ
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4 whitespace-nowrap">รหัส Log</th>
                    <th className="py-3 px-4 whitespace-nowrap">วันเวลาที่ทำรายการ</th>
                    <th className="py-3 px-4 whitespace-nowrap">ผู้ใช้งาน</th>
                    <th className="py-3 px-4 whitespace-nowrap">การดำเนินการ</th>
                    <th className="py-3 px-4 whitespace-nowrap">รหัสรายการ</th>
                    <th className="py-3 px-4">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                  {filteredLogs.map((log) => {
                    const isRepairLink = repairIdSet.has(log.targetId);
                    return (
                      <tr key={`${log.id}-${log.rowIndex ?? log.timestamp}`} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                          {log.id}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                          {formatThaiDateTime(log.timestamp)}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">{log.userName || '-'}</p>
                          {log.userEmail && (
                            <p className="text-xs text-slate-500">{log.userEmail}</p>
                          )}
                        </td>
                        <td
                          className={`py-3 px-4 font-semibold whitespace-nowrap ${getActionTextClass(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs whitespace-nowrap tabular-nums">
                          {isRepairLink ? (
                            <button
                              type="button"
                              onClick={() => onInspectRepair(log.targetId)}
                              className="font-semibold text-teal-800 hover:underline"
                            >
                              {log.targetId}
                            </button>
                          ) : (
                            <span className="text-slate-700">{log.targetId || '-'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 max-w-md">
                          {log.details || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-200">
              {filteredLogs.map((log) => {
                const isRepairLink = repairIdSet.has(log.targetId);
                return (
                  <div
                    key={`${log.id}-${log.rowIndex ?? log.timestamp}`}
                    className="p-4 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-semibold ${getActionTextClass(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="font-mono text-slate-500 tabular-nums">
                        {formatThaiDateTime(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-slate-900 font-medium">
                      {log.userName}
                      {log.userEmail ? ` · ${log.userEmail}` : ''}
                    </p>
                    <p className="text-slate-700">{log.details || '-'}</p>
                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 font-mono tabular-nums">
                      <span>{log.id}</span>
                      {isRepairLink ? (
                        <button
                          type="button"
                          onClick={() => onInspectRepair(log.targetId)}
                          className="font-semibold text-teal-800 hover:underline"
                        >
                          ดูรายการ {log.targetId}
                        </button>
                      ) : (
                        <span>{log.targetId || '-'}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
