import React, { useMemo, useState } from 'react';
import { Wallet, Plus, Pencil, Save, X, FileSpreadsheet, Download } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import * as XLSX from 'xlsx';
import {
  AnnualBudget,
  RepairRequest,
  formatThaiCurrency,
  formatThaiDate,
  formatThaiDateTime,
  getCurrentThaiFiscalYear,
} from '../types/repair';

interface BudgetsViewProps {
  repairs: RepairRequest[];
  budgets: AnnualBudget[];
  onSaveBudget: (
    fiscalYear: string,
    allocatedAmount: number,
    note: string,
    existing?: AnnualBudget
  ) => void;
}

export function BudgetsView({ repairs, budgets, onSaveBudget }: BudgetsViewProps) {
  const currentFiscalYear = getCurrentThaiFiscalYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentFiscalYear);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<AnnualBudget | undefined>(undefined);
  const [formYear, setFormYear] = useState(currentFiscalYear);
  const [formAmount, setFormAmount] = useState('');
  const [formNote, setFormNote] = useState('');
  const [showAnnualExportModal, setShowAnnualExportModal] = useState(false);
  const [exportYearScope, setExportYearScope] = useState<string>('all');

  const allYears = useMemo(() => {
    const set = new Set<string>([currentFiscalYear]);
    budgets.forEach((b) => set.add(b.fiscalYear));
    repairs.forEach((r) => {
      if (r.fiscalYear) set.add(r.fiscalYear);
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [budgets, repairs, currentFiscalYear]);

  const yearlySummaries = useMemo(() => {
    return allYears.map((year) => {
      const budgetRec = budgets.find((b) => b.fiscalYear === year);
      const yearRepairs = repairs.filter((r) => r.fiscalYear === year);

      const allocated = budgetRec?.allocatedAmount || 0;
      const approvedSpend = yearRepairs
        .filter((r) =>
          ['อนุมัติแล้ว', 'กำลังดำเนินการซ่อม', 'ซ่อมเสร็จสิ้น'].includes(r.status)
        )
        .reduce((sum, r) => sum + (r.approvedCost || 0), 0);

      const completedSpend = yearRepairs
        .filter((r) => r.status === 'ซ่อมเสร็จสิ้น')
        .reduce((sum, r) => sum + (r.approvedCost || 0), 0);

      const pendingEstimated = yearRepairs
        .filter((r) =>
          ['รอดำเนินการ', 'รอใบเสนอราคา', 'รออนุมัติงบ', 'ส่งกลับแก้ไข'].includes(r.status)
        )
        .reduce((sum, r) => sum + (r.estimatedCost || 0), 0);

      const remaining = allocated - approvedSpend;
      const utilizationPct = allocated > 0 ? Math.min(100, (approvedSpend / allocated) * 100) : 0;

      return {
        year,
        budgetRec,
        allocated,
        approvedSpend,
        completedSpend,
        pendingEstimated,
        remaining,
        utilizationPct,
        requestCount: yearRepairs.length,
      };
    });
  }, [allYears, budgets, repairs]);

  const activeYearSummary = useMemo(() => {
    return (
      yearlySummaries.find((s) => s.year === selectedYear) ||
      yearlySummaries[0] || {
        year: currentFiscalYear,
        allocated: 0,
        approvedSpend: 0,
        completedSpend: 0,
        pendingEstimated: 0,
        remaining: 0,
        utilizationPct: 0,
        requestCount: 0,
      }
    );
  }, [yearlySummaries, selectedYear, currentFiscalYear]);

  const departmentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; approved: number; estimated: number }> = {};
    repairs
      .filter((r) => r.fiscalYear === activeYearSummary.year)
      .forEach((r) => {
        const key = r.department || 'ไม่ระบุหน่วยงาน';
        if (!map[key]) map[key] = { count: 0, approved: 0, estimated: 0 };
        map[key].count += 1;
        if (['อนุมัติแล้ว', 'กำลังดำเนินการซ่อม', 'ซ่อมเสร็จสิ้น'].includes(r.status)) {
          map[key].approved += r.approvedCost || 0;
        } else if (r.status !== 'ไม่อนุมัติ') {
          map[key].estimated += r.estimatedCost || 0;
        }
      });
    return Object.entries(map).sort((a, b) => b[1].approved - a[1].approved);
  }, [repairs, activeYearSummary.year]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { count: number; approved: number }> = {};
    repairs
      .filter((r) => r.fiscalYear === activeYearSummary.year)
      .forEach((r) => {
        const key = r.category || 'งานซ่อมบำรุงทั่วไป';
        if (!map[key]) map[key] = { count: 0, approved: 0 };
        map[key].count += 1;
        if (['อนุมัติแล้ว', 'กำลังดำเนินการซ่อม', 'ซ่อมเสร็จสิ้น'].includes(r.status)) {
          map[key].approved += r.approvedCost || 0;
        }
      });
    return Object.entries(map).sort((a, b) => b[1].approved - a[1].approved);
  }, [repairs, activeYearSummary.year]);

  const barChartData = useMemo(() => {
    return [...yearlySummaries]
      .sort((a, b) => Number(a.year) - Number(b.year))
      .map((s) => ({
        yearLabel: `ปี ${s.year}`,
        fiscalYear: s.year,
        allocated: s.allocated,
        actualUsed: s.approvedSpend,
        completedSpend: s.completedSpend,
        remaining: s.remaining,
      }));
  }, [yearlySummaries]);

  const openBudgetEditor = (existing?: AnnualBudget, presetYear?: string) => {
    setEditingBudget(existing);
    setFormYear(existing?.fiscalYear || presetYear || selectedYear);
    setFormAmount(existing ? String(existing.allocatedAmount) : '');
    setFormNote(existing?.note || '');
    setShowBudgetModal(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveBudget(formYear.trim(), Number(formAmount) || 0, formNote.trim(), editingBudget);
    setShowBudgetModal(false);
  };

  const annualExportData = useMemo(() => {
    const targetSummaries = [...yearlySummaries]
      .filter((s) => exportYearScope === 'all' || s.year === exportYearScope)
      .sort((a, b) => Number(a.year) - Number(b.year));

    const totalAllocated = targetSummaries.reduce((sum, s) => sum + s.allocated, 0);
    const totalApprovedSpend = targetSummaries.reduce((sum, s) => sum + s.approvedSpend, 0);
    const totalCompletedSpend = targetSummaries.reduce((sum, s) => sum + s.completedSpend, 0);
    const totalPendingEstimated = targetSummaries.reduce(
      (sum, s) => sum + s.pendingEstimated,
      0
    );
    const totalRemaining = totalAllocated - totalApprovedSpend;
    const totalRequests = targetSummaries.reduce((sum, s) => sum + s.requestCount, 0);
    const overallUtilizationPct =
      totalAllocated > 0 ? (totalApprovedSpend / totalAllocated) * 100 : 0;

    const targetRepairs = repairs.filter(
      (r) => exportYearScope === 'all' || r.fiscalYear === exportYearScope
    );

    const deptRowsMap: Record<
      string,
      {
        fiscalYear: string;
        department: string;
        count: number;
        approved: number;
        completed: number;
        pendingEstimated: number;
      }
    > = {};

    const catRowsMap: Record<
      string,
      {
        fiscalYear: string;
        category: string;
        count: number;
        approved: number;
        completed: number;
      }
    > = {};

    targetRepairs.forEach((r) => {
      const fy = r.fiscalYear || currentFiscalYear;
      const dept = r.department || 'ไม่ระบุหน่วยงาน';
      const deptKey = `${fy}::${dept}`;
      if (!deptRowsMap[deptKey]) {
        deptRowsMap[deptKey] = {
          fiscalYear: fy,
          department: dept,
          count: 0,
          approved: 0,
          completed: 0,
          pendingEstimated: 0,
        };
      }
      deptRowsMap[deptKey].count += 1;
      if (['อนุมัติแล้ว', 'กำลังดำเนินการซ่อม', 'ซ่อมเสร็จสิ้น'].includes(r.status)) {
        deptRowsMap[deptKey].approved += r.approvedCost || 0;
      } else if (r.status !== 'ไม่อนุมัติ') {
        deptRowsMap[deptKey].pendingEstimated += r.estimatedCost || 0;
      }
      if (r.status === 'ซ่อมเสร็จสิ้น') {
        deptRowsMap[deptKey].completed += r.approvedCost || 0;
      }

      const cat = r.category || 'งานซ่อมบำรุงทั่วไป';
      const catKey = `${fy}::${cat}`;
      if (!catRowsMap[catKey]) {
        catRowsMap[catKey] = {
          fiscalYear: fy,
          category: cat,
          count: 0,
          approved: 0,
          completed: 0,
        };
      }
      catRowsMap[catKey].count += 1;
      if (['อนุมัติแล้ว', 'กำลังดำเนินการซ่อม', 'ซ่อมเสร็จสิ้น'].includes(r.status)) {
        catRowsMap[catKey].approved += r.approvedCost || 0;
      }
      if (r.status === 'ซ่อมเสร็จสิ้น') {
        catRowsMap[catKey].completed += r.approvedCost || 0;
      }
    });

    const deptRows = Object.values(deptRowsMap).sort(
      (a, b) => Number(a.fiscalYear) - Number(b.fiscalYear) || b.approved - a.approved
    );
    const catRows = Object.values(catRowsMap).sort(
      (a, b) => Number(a.fiscalYear) - Number(b.fiscalYear) || b.approved - a.approved
    );

    return {
      targetSummaries,
      targetRepairs,
      deptRows,
      catRows,
      totalAllocated,
      totalApprovedSpend,
      totalCompletedSpend,
      totalPendingEstimated,
      totalRemaining,
      totalRequests,
      overallUtilizationPct,
    };
  }, [yearlySummaries, repairs, exportYearScope, currentFiscalYear]);

  const handleExportAnnualExcel = () => {
    const scopeLabel =
      exportYearScope === 'all'
        ? 'ทุกปีงบประมาณ (เปรียบเทียบรายปี)'
        : `ปีงบประมาณ พ.ศ. ${exportYearScope}`;

    const summarySheetRows: (string | number)[][] = [
      ['รายงานสรุปงบประมาณการซ่อมบำรุงประจำปี — คณะสหเวชศาสตร์ มหาวิทยาลัยพะเยา'],
      [`ขอบเขตรายงาน: ${scopeLabel}`],
      [`วันที่ออกรายงาน: ${formatThaiDateTime(new Date().toISOString())}`],
      [],
      ['1. ตารางสรุปงบประมาณที่ได้รับจัดสรร งบที่ใช้ไปจริง และยอดคงเหลือแต่ละปี'],
      [
        'ปีงบประมาณ (พ.ศ.)',
        'งบประมาณที่ได้รับจัดสรร (บาท)',
        'งบที่ใช้ไปจริง / อนุมัติแล้ว (บาท)',
        'เบิกจ่ายแล้ว / ซ่อมเสร็จสิ้น (บาท)',
        'ยอดคงเหลือสุทธิ (บาท)',
        'สัดส่วนการใช้งบ (%)',
        'วงเงินรออนุมัติ (บาท)',
        'จำนวนงานแจ้งซ่อม (รายการ)',
        'หมายเหตุ / แหล่งงบประมาณ',
      ],
      ...annualExportData.targetSummaries.map((s) => {
        const rawPct = s.allocated > 0 ? (s.approvedSpend / s.allocated) * 100 : 0;
        return [
          s.year,
          s.allocated,
          s.approvedSpend,
          s.completedSpend,
          s.remaining,
          Number(rawPct.toFixed(1)),
          s.pendingEstimated,
          s.requestCount,
          s.budgetRec?.note || '-',
        ];
      }),
      [
        'รวมทั้งหมด',
        annualExportData.totalAllocated,
        annualExportData.totalApprovedSpend,
        annualExportData.totalCompletedSpend,
        annualExportData.totalRemaining,
        Number(annualExportData.overallUtilizationPct.toFixed(1)),
        annualExportData.totalPendingEstimated,
        annualExportData.totalRequests,
        `รวม ${annualExportData.targetSummaries.length} ปีงบประมาณ`,
      ],
    ];

    const breakdownSheetRows: (string | number)[][] = [
      ['รายงานจำแนกการใช้งบประมาณซ่อมบำรุงตามหน่วยงานและหมวดหมู่งานซ่อม'],
      [`ขอบเขตรายงาน: ${scopeLabel}`],
      [],
      ['1. สรุปการใช้งบประมาณแยกตามสาขาวิชา / หน่วยงาน'],
      [
        'ปีงบประมาณ (พ.ศ.)',
        'สาขาวิชา / หน่วยงาน',
        'จำนวนงาน (รายการ)',
        'งบที่ใช้ไปจริง / อนุมัติแล้ว (บาท)',
        'เบิกจ่ายแล้ว / ซ่อมเสร็จสิ้น (บาท)',
        'วงเงินรออนุมัติ (บาท)',
      ],
      ...annualExportData.deptRows.map((d) => [
        d.fiscalYear,
        d.department,
        d.count,
        d.approved,
        d.completed,
        d.pendingEstimated,
      ]),
      [],
      ['2. สรุปการใช้งบประมาณแยกตามหมวดหมู่งานซ่อม'],
      [
        'ปีงบประมาณ (พ.ศ.)',
        'หมวดหมู่งานซ่อม',
        'จำนวนงาน (รายการ)',
        'งบที่ใช้ไปจริง / อนุมัติแล้ว (บาท)',
        'เบิกจ่ายแล้ว / ซ่อมเสร็จสิ้น (บาท)',
      ],
      ...annualExportData.catRows.map((c) => [
        c.fiscalYear,
        c.category,
        c.count,
        c.approved,
        c.completed,
      ]),
    ];

    const detailSheetRows: (string | number)[][] = [
      [
        'ลำดับ',
        'ปีงบประมาณ',
        'เลขที่แจ้งซ่อม',
        'วันที่แจ้งซ่อม',
        'รายการที่ชำรุด',
        'หน่วยงาน',
        'หมวดหมู่',
        'รหัสครุภัณฑ์',
        'สถานที่/ห้อง',
        'สถานะ',
        'วงเงินประเมิน (บาท)',
        'งบที่ใช้ไปจริง / อนุมัติ (บาท)',
        'เลขที่ใบเสนอราคา',
      ],
      ...annualExportData.targetRepairs.map((r, idx) => [
        idx + 1,
        r.fiscalYear,
        r.id,
        formatThaiDate(r.createdAt),
        r.title,
        r.department,
        r.category,
        r.assetCode || '-',
        r.location,
        r.status,
        r.estimatedCost || 0,
        ['อนุมัติแล้ว', 'กำลังดำเนินการซ่อม', 'ซ่อมเสร็จสิ้น'].includes(r.status)
          ? r.approvedCost || 0
          : 0,
        r.quotationId || '-',
      ]),
    ];

    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetRows);
    wsSummary['!cols'] = [
      { wch: 18 },
      { wch: 24 },
      { wch: 26 },
      { wch: 26 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 32 },
    ];

    const wsBreakdown = XLSX.utils.aoa_to_sheet(breakdownSheetRows);
    wsBreakdown['!cols'] = [
      { wch: 18 },
      { wch: 36 },
      { wch: 18 },
      { wch: 26 },
      { wch: 26 },
      { wch: 20 },
    ];

    const wsDetails = XLSX.utils.aoa_to_sheet(detailSheetRows);
    wsDetails['!cols'] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 16 },
      { wch: 15 },
      { wch: 30 },
      { wch: 28 },
      { wch: 24 },
      { wch: 18 },
      { wch: 24 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปงบประมาณแต่ละปี');
    XLSX.utils.book_append_sheet(wb, wsBreakdown, 'แยกตามหน่วยงานและหมวดหมู่');
    XLSX.utils.book_append_sheet(wb, wsDetails, 'รายละเอียดรายการใช้งบ');

    const fileSuffix = exportYearScope === 'all' ? 'ทุกปีงบประมาณ' : `ปี_${exportYearScope}`;
    XLSX.writeFile(wb, `รายงานสรุปงบประมาณประจำปี_สหเวชศาสตร์_${fileSuffix}.xlsx`);
    setShowAnnualExportModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">
            สรุปงบประมาณการซ่อมบำรุงแต่ละปีงบประมาณ
          </h2>
          <p className="text-xs text-slate-500">
            เปรียบเทียบงบประมาณที่ได้รับจัดสรร ยอดอนุมัติซ่อม และยอดเบิกจ่ายจริงรายปี (พ.ศ.)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowAnnualExportModal(true)}
            disabled={yearlySummaries.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 min-h-[44px]"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Annual Report (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => openBudgetEditor(undefined, currentFiscalYear)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>ตั้งค่างบประมาณประจำปี</span>
          </button>
        </div>
      </section>

      {/* Selected Year Summary Cards */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">
            ภาพรวมปีงบประมาณ {activeYearSummary.year}
          </h3>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {allYears.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setSelectedYear(y)}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg whitespace-nowrap shrink-0 min-h-[36px] ${
                  activeYearSummary.year === y
                    ? 'bg-teal-700 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                ปี {y}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 overflow-hidden">
          <div className="p-5 space-y-1">
            <p className="text-xs font-medium text-slate-500">งบประมาณได้รับจัดสรร</p>
            <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              ฿{formatThaiCurrency(activeYearSummary.allocated)}
            </p>
            <p className="text-xs text-slate-500">
              {activeYearSummary.budgetRec?.note || 'วงเงินซ่อมบำรุงประจำปี'}
            </p>
          </div>

          <div className="p-5 space-y-1">
            <p className="text-xs font-medium text-slate-500">ยอดอนุมัติซ่อมสะสม</p>
            <p className="text-2xl font-bold text-teal-700 font-mono tabular-nums">
              ฿{formatThaiCurrency(activeYearSummary.approvedSpend)}
            </p>
            <p className="text-xs text-slate-500 font-mono tabular-nums">
              คิดเป็น {activeYearSummary.utilizationPct.toFixed(1)}% ของงบจัดสรร
            </p>
          </div>

          <div className="p-5 space-y-1">
            <p className="text-xs font-medium text-slate-500">ซ่อมเสร็จสิ้น (เบิกจ่ายแล้ว)</p>
            <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              ฿{formatThaiCurrency(activeYearSummary.completedSpend)}
            </p>
            <p className="text-xs text-slate-500">
              จากทั้งหมด {activeYearSummary.requestCount} รายการ
            </p>
          </div>

          <div className="p-5 space-y-1">
            <p className="text-xs font-medium text-slate-500">งบประมาณคงเหลือสุทธิ</p>
            <p
              className={`text-2xl font-bold font-mono tabular-nums ${
                activeYearSummary.remaining < 0 ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              ฿{formatThaiCurrency(activeYearSummary.remaining)}
            </p>
            <p className="text-xs text-slate-500 font-mono tabular-nums">
              รอพิจารณาอีก ฿{formatThaiCurrency(activeYearSummary.pendingEstimated)}
            </p>
          </div>
        </div>
      </section>

      {/* Multi-Year Comparison Chart + Table */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Recharts BarChart: Allocated vs Actual Used Budget */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">
              กราฟเปรียบเทียบงบประมาณจัดสรรกับงบที่ใช้ไปจริงรายปี
            </h3>
            <p className="text-xs text-slate-500">
              แสดงวงเงินที่ได้รับจัดสรรเทียบกับยอดอนุมัติและเบิกจ่ายซ่อมจริงในแต่ละปีงบประมาณ (บาท)
            </p>
          </div>

          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={barChartData}
                margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
                barGap={6}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="yearLabel"
                  tick={{ fill: '#475569', fontSize: 12 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={68}
                  tickFormatter={(val: number) =>
                    val >= 1_000_000
                      ? `${(val / 1_000_000).toFixed(1)}M`
                      : val >= 1_000
                        ? `${Math.round(val / 1_000)}k`
                        : String(val)
                  }
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const row = payload[0].payload as {
                      fiscalYear: string;
                      allocated: number;
                      actualUsed: number;
                      completedSpend: number;
                      remaining: number;
                    };
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3 text-xs space-y-1.5 min-w-[220px]">
                        <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                          ปีงบประมาณ {row.fiscalYear}
                        </p>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-600">งบที่ได้รับจัดสรร:</span>
                          <span className="font-mono font-semibold text-slate-900 tabular-nums">
                            ฿{formatThaiCurrency(row.allocated)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-teal-800">งบที่ใช้ไปจริง (อนุมัติ):</span>
                          <span className="font-mono font-semibold text-teal-800 tabular-nums">
                            ฿{formatThaiCurrency(row.actualUsed)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">ซ่อมเสร็จสิ้นแล้ว:</span>
                          <span className="font-mono text-slate-700 tabular-nums">
                            ฿{formatThaiCurrency(row.completedSpend)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 pt-1 border-t border-slate-100">
                          <span className="text-slate-600">คงเหลือสุทธิ:</span>
                          <span
                            className={`font-mono font-bold tabular-nums ${
                              row.remaining < 0 ? 'text-red-700' : 'text-emerald-700'
                            }`}
                          >
                            ฿{formatThaiCurrency(row.remaining)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  iconType="square"
                />
                <Bar
                  dataKey="allocated"
                  name="งบประมาณที่ได้รับจัดสรร"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={42}
                />
                <Bar
                  dataKey="actualUsed"
                  name="งบประมาณที่ใช้ไปจริง"
                  fill="#0f766e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Yearly Ledger Table */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              ตารางสรุปงบประมาณการซ่อมรายปี (Google Sheets: Budgets)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">ปีงบประมาณ</th>
                  <th className="py-3 px-4 text-right">งบจัดสรร</th>
                  <th className="py-3 px-4 text-right">อนุมัติแล้ว</th>
                  <th className="py-3 px-4 text-right">คงเหลือ</th>
                  <th className="py-3 px-4 text-right">งาน (รายการ)</th>
                  <th className="py-3 px-4 text-right">แก้ไข</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                {yearlySummaries.map((s) => (
                  <tr
                    key={s.year}
                    onClick={() => setSelectedYear(s.year)}
                    className={`cursor-pointer transition-colors ${
                      activeYearSummary.year === s.year ? 'bg-teal-50/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                      {s.year}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                      {formatThaiCurrency(s.allocated)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-teal-800 font-medium">
                      {formatThaiCurrency(s.approvedSpend)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                        s.remaining < 0 ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {formatThaiCurrency(s.remaining)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {s.requestCount}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openBudgetEditor(s.budgetRec, s.year);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>ตั้งค่า</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Breakdown by Department & Category */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              สรุปการใช้งบตามสาขาวิชา / หน่วยงาน (ปี {activeYearSummary.year})
            </h3>
          </div>
          {departmentBreakdown.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              ยังไม่มีรายการแจ้งซ่อมในปีงบประมาณ {activeYearSummary.year}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {departmentBreakdown.map(([dept, stats]) => (
                <div key={dept} className="px-5 py-3.5 flex items-center justify-between gap-4 text-xs sm:text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{dept}</p>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      {stats.count} รายการ
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-semibold text-slate-900 tabular-nums">
                      ฿{formatThaiCurrency(stats.approved)}
                    </p>
                    {stats.estimated > 0 && (
                      <p className="text-xs text-slate-500 font-mono tabular-nums">
                        รออนุมัติ ฿{formatThaiCurrency(stats.estimated)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              สรุปการใช้งบตามหมวดหมู่งานซ่อม (ปี {activeYearSummary.year})
            </h3>
          </div>
          {categoryBreakdown.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              ยังไม่มีข้อมูลหมวดหมู่งานซ่อมในปีงบประมาณ {activeYearSummary.year}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {categoryBreakdown.map(([cat, stats]) => (
                <div key={cat} className="px-5 py-3.5 flex items-center justify-between gap-4 text-xs sm:text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{cat}</p>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      {stats.count} รายการ
                    </p>
                  </div>
                  <p className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                    ฿{formatThaiCurrency(stats.approved)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Budget Modal */}
      {showBudgetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveForm}
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-5 h-5 text-teal-700" />
                <h3 className="text-base font-bold text-slate-900">
                  กำหนดงบประมาณการซ่อมประจำปี
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBudgetModal(false)}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  ปีงบประมาณ (พ.ศ.) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formYear}
                  onChange={(e) => setFormYear(e.target.value)}
                  disabled={Boolean(editingBudget)}
                  placeholder="เช่น 2569"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  งบประมาณที่ได้รับจัดสรร (บาท) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="เช่น 500000"
                  className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  หมายเหตุ / แหล่งงบประมาณ
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="เช่น งบแผ่นดินและงบรายได้คณะ หมวดค่าซ่อมแซมครุภัณฑ์"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowBudgetModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 min-h-[42px]"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 min-h-[42px]"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกงบประมาณ</span>
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Annual Excel (.xlsx) Report Export Modal */}
      {showAnnualExportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
          aria-label="ส่งออกรายงานสรุปงบประมาณประจำปี Excel"
        >
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    ส่งออกรายงานสรุปงบประมาณประจำปี (.xlsx)
                  </h3>
                  <p className="text-xs text-slate-500">
                    สรุปงบจัดสรร งบที่ใช้ไปจริง และยอดคงเหลือแต่ละปีในรูปแบบ Excel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAnnualExportModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  เลือกขอบเขตปีงบประมาณที่ต้องการออกรายงาน
                </label>
                <select
                  value={exportYearScope}
                  onChange={(e) => setExportYearScope(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700 min-h-[42px]"
                >
                  <option value="all">
                    ทุกปีงบประมาณ (เปรียบเทียบรายปีทั้งหมด {yearlySummaries.length} ปี)
                  </option>
                  {allYears.map((y) => (
                    <option key={y} value={y}>
                      เฉพาะปีงบประมาณ พ.ศ. {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Preview Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                  <span className="font-semibold text-slate-800">
                    {exportYearScope === 'all'
                      ? `สรุปรวม ${annualExportData.targetSummaries.length} ปีงบประมาณ`
                      : `สรุปงบประมาณ ปี พ.ศ. ${exportYearScope}`}
                  </span>
                  <span className="font-mono font-bold text-slate-700 tabular-nums">
                    {annualExportData.totalRequests} รายการซ่อม
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">งบจัดสรรรวม</p>
                    <p className="font-mono font-bold text-slate-900 tabular-nums mt-0.5">
                      ฿{formatThaiCurrency(annualExportData.totalAllocated)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">งบที่ใช้ไปจริง</p>
                    <p className="font-mono font-bold text-teal-700 tabular-nums mt-0.5">
                      ฿{formatThaiCurrency(annualExportData.totalApprovedSpend)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">ยอดคงเหลือสุทธิ</p>
                    <p
                      className={`font-mono font-bold tabular-nums mt-0.5 ${
                        annualExportData.totalRemaining < 0 ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      ฿{formatThaiCurrency(annualExportData.totalRemaining)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <span className="text-slate-600">อัตราการใช้งบประมาณเฉลี่ย</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {annualExportData.overallUtilizationPct.toFixed(1)}%
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                ไฟล์ Excel ประกอบด้วย 3 แผ่นงาน: <strong>สรุปงบประมาณแต่ละปี</strong>,{' '}
                <strong>แยกตามหน่วยงานและหมวดหมู่</strong> และ <strong>รายละเอียดรายการใช้งบ</strong>
              </p>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAnnualExportModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 min-h-[42px]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExportAnnualExcel}
                disabled={annualExportData.targetSummaries.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 disabled:opacity-50 min-h-[42px]"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดไฟล์ Excel (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
