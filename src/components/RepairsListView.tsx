import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Plus,
  FileSpreadsheet,
  Wrench,
  CheckCircle2,
  Pencil,
  Trash2,
  X,
  ArrowRight,
  Clock,
  CheckSquare,
  RotateCcw,
  PieChart as PieChartIcon,
  Printer,
  Download,
  Building2,
  QrCode,
  Copy,
  Check,
  Star,
  MessageSquare,
  Send,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import * as XLSX from 'xlsx';
import { QRCodeCanvas } from 'qrcode.react';
import {
  ApprovalRecord,
  AuditLog,
  DEPARTMENTS,
  Quotation,
  REPAIR_STATUSES,
  RepairFeedback,
  RepairRequest,
  RepairStatus,
  formatThaiCurrency,
  formatThaiDate,
  formatThaiDateTime,
  getCurrentThaiFiscalYear,
} from '../types/repair';
import { RepairStatusLabel, UrgencyText } from './StatusBadge';

interface RepairsListViewProps {
  repairs: RepairRequest[];
  quotations: Quotation[];
  approvals: ApprovalRecord[];
  feedbacks: RepairFeedback[];
  logs: AuditLog[];
  isLoading: boolean;
  spreadsheetId: string;
  deepLinkRepairId?: string | null;
  onClearDeepLinkRepairId?: () => void;
  onNewRepair: () => void;
  onEditRepair: (repair: RepairRequest) => void;
  onDeleteRepair: (repair: RepairRequest) => void;
  onUpdateRepairStatus: (repair: RepairRequest, nextStatus: RepairStatus) => void;
  onCreateQuotationForRepair: (repair: RepairRequest) => void;
  onNavigateToApprovals: () => void;
  onOpenFeedbackForm: (repair: RepairRequest) => void;
  onSendFeedbackLineNotify: (repair: RepairRequest) => void;
}

export function RepairsListView({
  repairs,
  quotations,
  approvals,
  feedbacks,
  logs,
  isLoading,
  spreadsheetId,
  deepLinkRepairId,
  onClearDeepLinkRepairId,
  onNewRepair,
  onEditRepair,
  onDeleteRepair,
  onUpdateRepairStatus,
  onCreateQuotationForRepair,
  onNavigateToApprovals,
  onOpenFeedbackForm,
  onSendFeedbackLineNotify,
}: RepairsListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ทั้งหมด');
  const [yearFilter, setYearFilter] = useState<string>('ทั้งหมด');
  const [deptFilter, setDeptFilter] = useState<string>('ทั้งหมด');
  const [selectedRepair, setSelectedRepair] = useState<RepairRequest | null>(null);
  const [qrModalRepair, setQrModalRepair] = useState<RepairRequest | null>(null);
  const [qrCopied, setQrCopied] = useState<boolean>(false);
  const [feedbackLinkCopied, setFeedbackLinkCopied] = useState<boolean>(false);
  const qrCanvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const [showReportPreview, setShowReportPreview] = useState<boolean>(false);
  const [showMonthlyExportModal, setShowMonthlyExportModal] = useState<boolean>(false);
  const [exportMonthKey, setExportMonthKey] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [exportOnlySelectedDept, setExportOnlySelectedDept] = useState<boolean>(false);

  useEffect(() => {
    if (!deepLinkRepairId || repairs.length === 0) return;
    const matched = repairs.find((r) => r.id === deepLinkRepairId);
    if (matched) {
      setSelectedRepair(matched);
    }
  }, [deepLinkRepairId, repairs]);

  const closeRepairDetail = () => {
    setSelectedRepair(null);
    onClearDeepLinkRepairId?.();
  };

  const buildRepairQrUrl = (repairId: string) => {
    const url = new URL(window.location.origin + window.location.pathname);
    if (spreadsheetId) {
      url.searchParams.set('sheetId', spreadsheetId);
    }
    url.searchParams.set('repairId', repairId);
    return url.toString();
  };

  const buildRepairFeedbackUrl = (repairId: string) => {
    const url = new URL(window.location.origin + window.location.pathname);
    if (spreadsheetId) {
      url.searchParams.set('sheetId', spreadsheetId);
    }
    url.searchParams.set('feedbackRepairId', repairId);
    return url.toString();
  };

  const handleCopyFeedbackLink = async (repairId: string) => {
    try {
      await navigator.clipboard.writeText(buildRepairFeedbackUrl(repairId));
      setFeedbackLinkCopied(true);
      window.setTimeout(() => setFeedbackLinkCopied(false), 2500);
    } catch {
      setFeedbackLinkCopied(false);
    }
  };

  const handleCopyQrLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setQrCopied(true);
      window.setTimeout(() => setQrCopied(false), 2500);
    } catch {
      setQrCopied(false);
    }
  };

  const handleDownloadQrPng = (repair: RepairRequest) => {
    const qrCanvas = qrCanvasWrapperRef.current?.querySelector('canvas');
    if (!qrCanvas) return;

    const exportCanvas = document.createElement('canvas');
    const width = 420;
    const height = 470;
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, width - 24, height - 24);

    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ระบบแจ้งซ่อม คณะสหเวชศาสตร์ ม.พะเยา', width / 2, 46);

    const qrSize = 240;
    ctx.drawImage(qrCanvas, (width - qrSize) / 2, 68, qrSize, qrSize);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(repair.id, width / 2, 342);

    ctx.fillStyle = '#334155';
    ctx.font = '14px sans-serif';
    const titleLine =
      repair.title.length > 36 ? `${repair.title.slice(0, 36)}...` : repair.title;
    ctx.fillText(titleLine, width / 2, 372);

    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    const metaLine = `${repair.location || '-'} · ${repair.department || '-'}`;
    const trimmedMeta = metaLine.length > 48 ? `${metaLine.slice(0, 48)}...` : metaLine;
    ctx.fillText(trimmedMeta, width / 2, 400);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText('สแกน QR Code เพื่อเปิดดูรายละเอียดใบแจ้งซ่อม', width / 2, 434);

    const link = document.createElement('a');
    link.download = `QR_${repair.id}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const availableYears = useMemo(() => {
    const years = new Set<string>([getCurrentThaiFiscalYear()]);
    repairs.forEach((r) => {
      if (r.fiscalYear) years.add(r.fiscalYear);
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [repairs]);

  const availableDepartments = useMemo(() => {
    const depts = new Set<string>(DEPARTMENTS);
    repairs.forEach((r) => {
      if (r.department) depts.add(r.department);
    });
    return Array.from(depts);
  }, [repairs]);

  const statusCounts = useMemo(() => {
    const base = repairs.filter((r) => {
      if (yearFilter !== 'ทั้งหมด' && r.fiscalYear !== yearFilter) return false;
      if (deptFilter !== 'ทั้งหมด' && r.department !== deptFilter) return false;
      return true;
    });
    const counts: Record<string, number> = { ทั้งหมด: base.length };
    REPAIR_STATUSES.forEach((st) => {
      counts[st] = 0;
    });
    base.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [repairs, yearFilter, deptFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'ทั้งหมด' ||
    yearFilter !== 'ทั้งหมด' ||
    deptFilter !== 'ทั้งหมด';

  const resetAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('ทั้งหมด');
    setYearFilter('ทั้งหมด');
    setDeptFilter('ทั้งหมด');
  };

  const filteredRepairs = useMemo(() => {
    return repairs.filter((r) => {
      if (yearFilter !== 'ทั้งหมด' && r.fiscalYear !== yearFilter) return false;
      if (statusFilter !== 'ทั้งหมด' && r.status !== statusFilter) return false;
      if (deptFilter !== 'ทั้งหมด' && r.department !== deptFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const hay = `${r.id} ${r.title} ${r.description} ${r.assetCode} ${r.location} ${r.requesterName} ${r.department} ${r.category} ${r.quotationId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [repairs, yearFilter, statusFilter, deptFilter, searchQuery]);

  const metrics = useMemo(() => {
    const targetList =
      yearFilter === 'ทั้งหมด'
        ? repairs
        : repairs.filter((r) => r.fiscalYear === yearFilter);

    const totalCount = targetList.length;
    const pendingCount = targetList.filter((r) =>
      ['รอดำเนินการ', 'รอใบเสนอราคา', 'รออนุมัติงบ', 'ส่งกลับแก้ไข'].includes(r.status)
    ).length;
    const activeRepairCount = targetList.filter((r) =>
      ['อนุมัติแล้ว', 'กำลังดำเนินการซ่อม'].includes(r.status)
    ).length;
    const completedCount = targetList.filter((r) => r.status === 'ซ่อมเสร็จสิ้น').length;
    const rejectedCount = targetList.filter((r) => r.status === 'ไม่อนุมัติ').length;
    const approvedBudgetSum = targetList
      .filter((r) => ['อนุมัติแล้ว', 'กำลังดำเนินการซ่อม', 'ซ่อมเสร็จสิ้น'].includes(r.status))
      .reduce((sum, r) => sum + (r.approvedCost || 0), 0);

    return {
      totalCount,
      pendingCount,
      activeRepairCount,
      completedCount,
      rejectedCount,
      approvedBudgetSum,
    };
  }, [repairs, yearFilter]);

  const statusChartSummary = useMemo(() => {
    const baseItems = [
      {
        key: 'pending',
        name: 'รออนุมัติ',
        subtitle: 'รอดำเนินการ · รอใบเสนอราคา · รออนุมัติงบ · ส่งกลับแก้ไข',
        value: metrics.pendingCount,
        color: '#D97706',
        filterTarget: 'รออนุมัติงบ',
      },
      {
        key: 'active',
        name: 'กำลังซ่อม',
        subtitle: 'อนุมัติแล้ว · กำลังดำเนินการซ่อม',
        value: metrics.activeRepairCount,
        color: '#0284C7',
        filterTarget: 'กำลังดำเนินการซ่อม',
      },
      {
        key: 'completed',
        name: 'ซ่อมเสร็จแล้ว',
        subtitle: 'ตรวจรับงานและซ่อมเสร็จสิ้น',
        value: metrics.completedCount,
        color: '#0F766E',
        filterTarget: 'ซ่อมเสร็จสิ้น',
      },
    ];

    if (metrics.rejectedCount > 0) {
      baseItems.push({
        key: 'rejected',
        name: 'ไม่อนุมัติ',
        subtitle: 'รายการที่ไม่ได้รับอนุมัติ',
        value: metrics.rejectedCount,
        color: '#DC2626',
        filterTarget: 'ไม่อนุมัติ',
      });
    }

    const activeSlices = baseItems.filter((item) => item.value > 0);
    return { allItems: baseItems, activeSlices };
  }, [metrics]);

  const activeRepairDetail = useMemo(() => {
    if (!selectedRepair) return null;
    return repairs.find((r) => r.id === selectedRepair.id) || selectedRepair;
  }, [repairs, selectedRepair]);

  const linkedQuotations = useMemo(() => {
    if (!activeRepairDetail) return [];
    return quotations.filter((q) => q.repairId === activeRepairDetail.id);
  }, [quotations, activeRepairDetail]);

  const linkedApprovals = useMemo(() => {
    if (!activeRepairDetail) return [];
    return approvals.filter((a) => a.repairId === activeRepairDetail.id);
  }, [approvals, activeRepairDetail]);

  const linkedFeedback = useMemo(() => {
    if (!activeRepairDetail) return null;
    return feedbacks.find((f) => f.repairId === activeRepairDetail.id) || null;
  }, [feedbacks, activeRepairDetail]);

  const linkedLogs = useMemo(() => {
    if (!activeRepairDetail) return [];
    return logs.filter((l) => l.targetId === activeRepairDetail.id);
  }, [logs, activeRepairDetail]);

  const feedbackDashboardSummary = useMemo(() => {
    const targetRepairs =
      yearFilter === 'ทั้งหมด'
        ? repairs
        : repairs.filter((r) => r.fiscalYear === yearFilter);
    const targetFeedbacks =
      yearFilter === 'ทั้งหมด'
        ? feedbacks
        : feedbacks.filter((f) => f.fiscalYear === yearFilter);

    const completedRepairs = targetRepairs.filter((r) => r.status === 'ซ่อมเสร็จสิ้น');
    const feedbackRepairIds = new Set(feedbacks.map((f) => f.repairId));
    const awaitingRepairs = completedRepairs.filter((r) => !feedbackRepairIds.has(r.id));

    const count = targetFeedbacks.length;
    const avgOverall =
      count > 0
        ? targetFeedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / count
        : 0;
    const avgSpeed =
      count > 0
        ? targetFeedbacks.reduce((sum, f) => sum + (f.speedRating || f.rating || 0), 0) / count
        : 0;
    const avgQuality =
      count > 0
        ? targetFeedbacks.reduce((sum, f) => sum + (f.qualityRating || f.rating || 0), 0) / count
        : 0;
    const avgService =
      count > 0
        ? targetFeedbacks.reduce((sum, f) => sum + (f.serviceRating || f.rating || 0), 0) / count
        : 0;

    const evaluatedCompletedCount = completedRepairs.filter((r) =>
      feedbackRepairIds.has(r.id)
    ).length;
    const responseRatePct =
      completedRepairs.length > 0
        ? (evaluatedCompletedCount / completedRepairs.length) * 100
        : 0;

    const repairMap = new Map(repairs.map((r) => [r.id, r]));
    const recentFeedbacks = targetFeedbacks.slice(0, 3).map((fb) => ({
      ...fb,
      repair: repairMap.get(fb.repairId) || null,
    }));

    return {
      count,
      completedCount: completedRepairs.length,
      responseRatePct,
      avgOverall,
      avgSpeed,
      avgQuality,
      avgService,
      recentFeedbacks,
      awaitingRepairs: awaitingRepairs.slice(0, 3),
      awaitingCount: awaitingRepairs.length,
    };
  }, [repairs, feedbacks, yearFilter]);

  const filteredReportSummary = useMemo(() => {
    const totalCount = filteredRepairs.length;
    const pendingCount = filteredRepairs.filter((r) =>
      ['รอดำเนินการ', 'รอใบเสนอราคา', 'รออนุมัติงบ', 'ส่งกลับแก้ไข'].includes(r.status)
    ).length;
    const activeCount = filteredRepairs.filter((r) =>
      ['อนุมัติแล้ว', 'กำลังดำเนินการซ่อม'].includes(r.status)
    ).length;
    const completedCount = filteredRepairs.filter((r) => r.status === 'ซ่อมเสร็จสิ้น').length;
    const rejectedCount = filteredRepairs.filter((r) => r.status === 'ไม่อนุมัติ').length;
    const totalEstimated = filteredRepairs.reduce(
      (sum, r) => sum + (r.estimatedCost || 0),
      0
    );
    const totalApproved = filteredRepairs
      .filter((r) => ['อนุมัติแล้ว', 'กำลังดำเนินการซ่อม', 'ซ่อมเสร็จสิ้น'].includes(r.status))
      .reduce((sum, r) => sum + (r.approvedCost || 0), 0);

    return {
      totalCount,
      pendingCount,
      activeCount,
      completedCount,
      rejectedCount,
      totalEstimated,
      totalApproved,
    };
  }, [filteredRepairs]);

  const handleExportCsv = () => {
    const headers = [
      'เลขที่แจ้งซ่อม',
      'ปีงบประมาณ',
      'วันที่แจ้ง',
      'รายการที่ชำรุด',
      'หน่วยงาน',
      'หมวดหมู่',
      'รหัสครุภัณฑ์',
      'สถานที่/ห้อง',
      'ผู้แจ้งซ่อม',
      'ความเร่งด่วน',
      'สถานะ',
      'วงเงินประเมิน(บาท)',
      'งบอนุมัติจริง(บาท)',
      'เลขที่ใบเสนอราคา',
    ];
    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };
    const rows = filteredRepairs.map((r) =>
      [
        r.id,
        r.fiscalYear,
        formatThaiDate(r.createdAt),
        r.title,
        r.department,
        r.category,
        r.assetCode,
        r.location,
        r.requesterName,
        r.urgency,
        r.status,
        r.estimatedCost || 0,
        r.approvedCost || 0,
        r.quotationId,
      ]
        .map(escapeCsv)
        .join(',')
    );
    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const yearSuffix = yearFilter === 'ทั้งหมด' ? 'all' : yearFilter;
    link.download = `รายงานแจ้งซ่อม_สหเวชศาสตร์_${yearSuffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const availableMonths = useMemo(() => {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const set = new Set<string>([currentKey]);
    repairs.forEach((r) => {
      if (!r.createdAt) return;
      const d = new Date(r.createdAt);
      if (!Number.isNaN(d.getTime())) {
        set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [repairs]);

  const formatThaiMonthYearLabel = (monthKey: string) => {
    const [yStr, mStr] = monthKey.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const thaiMonths = [
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
    if (!y || !m || !thaiMonths[m - 1]) return monthKey;
    return `${thaiMonths[m - 1]} ${y + 543}`;
  };

  const monthlyReportData = useMemo(() => {
    const items = repairs.filter((r) => {
      if (!r.createdAt) return false;
      const d = new Date(r.createdAt);
      if (Number.isNaN(d.getTime())) return false;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key !== exportMonthKey) return false;
      if (exportOnlySelectedDept && deptFilter !== 'ทั้งหมด' && r.department !== deptFilter) {
        return false;
      }
      return true;
    });

    const totalCount = items.length;
    const pendingItems = items.filter((r) =>
      ['รอดำเนินการ', 'รอใบเสนอราคา', 'รออนุมัติงบ', 'ส่งกลับแก้ไข'].includes(r.status)
    );
    const activeItems = items.filter((r) =>
      ['อนุมัติแล้ว', 'กำลังดำเนินการซ่อม'].includes(r.status)
    );
    const completedItems = items.filter((r) => r.status === 'ซ่อมเสร็จสิ้น');
    const rejectedItems = items.filter((r) => r.status === 'ไม่อนุมัติ');

    const totalEstimated = items.reduce((s, r) => s + (r.estimatedCost || 0), 0);
    const totalApproved = items
      .filter((r) => ['อนุมัติแล้ว', 'กำลังดำเนินการซ่อม', 'ซ่อมเสร็จสิ้น'].includes(r.status))
      .reduce((s, r) => s + (r.approvedCost || 0), 0);

    const byDepartment: Record<string, { count: number; estimated: number; approved: number }> =
      {};
    const byCategory: Record<string, { count: number; approved: number }> = {};

    items.forEach((r) => {
      const dept = r.department || 'ไม่ระบุหน่วยงาน';
      if (!byDepartment[dept]) byDepartment[dept] = { count: 0, estimated: 0, approved: 0 };
      byDepartment[dept].count += 1;
      byDepartment[dept].estimated += r.estimatedCost || 0;
      if (['อนุมัติแล้ว', 'กำลังดำเนินการซ่อม', 'ซ่อมเสร็จสิ้น'].includes(r.status)) {
        byDepartment[dept].approved += r.approvedCost || 0;
      }

      const cat = r.category || 'งานซ่อมบำรุงทั่วไป';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, approved: 0 };
      byCategory[cat].count += 1;
      if (['อนุมัติแล้ว', 'กำลังดำเนินการซ่อม', 'ซ่อมเสร็จสิ้น'].includes(r.status)) {
        byCategory[cat].approved += r.approvedCost || 0;
      }
    });

    return {
      items,
      totalCount,
      pendingCount: pendingItems.length,
      activeCount: activeItems.length,
      completedCount: completedItems.length,
      rejectedCount: rejectedItems.length,
      totalEstimated,
      totalApproved,
      byDepartment: Object.entries(byDepartment).sort((a, b) => b[1].count - a[1].count),
      byCategory: Object.entries(byCategory).sort((a, b) => b[1].count - a[1].count),
    };
  }, [repairs, exportMonthKey, exportOnlySelectedDept, deptFilter]);

  const handleExportMonthlyExcel = () => {
    const monthLabel = formatThaiMonthYearLabel(exportMonthKey);
    const scopeLabel =
      exportOnlySelectedDept && deptFilter !== 'ทั้งหมด'
        ? deptFilter
        : 'ทุกสาขาวิชา / ทุกหน่วยงาน';

    const summaryRows: (string | number)[][] = [
      ['รายงานสรุปการแจ้งซ่อมประจำเดือน — คณะสหเวชศาสตร์ มหาวิทยาลัยพะเยา'],
      [`ประจำเดือน: ${monthLabel}`],
      [`ขอบเขตหน่วยงาน: ${scopeLabel}`],
      [`วันที่ออกรายงาน: ${formatThaiDateTime(new Date().toISOString())}`],
      [],
      ['1. สรุปภาพรวมตามสถานะงานซ่อม'],
      ['กลุ่มสถานะ', 'จำนวน (รายการ)', 'สัดส่วน (%)'],
      [
        'รอดำเนินการ / รออนุมัติ',
        monthlyReportData.pendingCount,
        monthlyReportData.totalCount > 0
          ? Number(((monthlyReportData.pendingCount / monthlyReportData.totalCount) * 100).toFixed(1))
          : 0,
      ],
      [
        'อนุมัติแล้ว / กำลังดำเนินการซ่อม',
        monthlyReportData.activeCount,
        monthlyReportData.totalCount > 0
          ? Number(((monthlyReportData.activeCount / monthlyReportData.totalCount) * 100).toFixed(1))
          : 0,
      ],
      [
        'ซ่อมเสร็จสิ้นแล้ว',
        monthlyReportData.completedCount,
        monthlyReportData.totalCount > 0
          ? Number(
              ((monthlyReportData.completedCount / monthlyReportData.totalCount) * 100).toFixed(1)
            )
          : 0,
      ],
      [
        'ไม่อนุมัติ',
        monthlyReportData.rejectedCount,
        monthlyReportData.totalCount > 0
          ? Number(
              ((monthlyReportData.rejectedCount / monthlyReportData.totalCount) * 100).toFixed(1)
            )
          : 0,
      ],
      ['รวมรายการทั้งหมด', monthlyReportData.totalCount, 100],
      [],
      ['สรุปงบประมาณประจำเดือน', 'จำนวนเงิน (บาท)'],
      ['ยอดประเมินเบื้องต้นรวม', monthlyReportData.totalEstimated],
      ['ยอดงบประมาณอนุมัติซ่อมรวม', monthlyReportData.totalApproved],
      [],
      ['2. สรุปแยกตามสาขาวิชา / หน่วยงาน'],
      ['สาขาวิชา / หน่วยงาน', 'จำนวน (รายการ)', 'ยอดประเมิน (บาท)', 'งบอนุมัติจริง (บาท)'],
      ...monthlyReportData.byDepartment.map(([dept, st]) => [
        dept,
        st.count,
        st.estimated,
        st.approved,
      ]),
      [],
      ['3. สรุปแยกตามหมวดหมู่งานซ่อม'],
      ['หมวดหมู่งานซ่อม', 'จำนวน (รายการ)', 'งบอนุมัติจริง (บาท)'],
      ...monthlyReportData.byCategory.map(([cat, st]) => [cat, st.count, st.approved]),
    ];

    const detailRows: (string | number)[][] = [
      [
        'ลำดับ',
        'เลขที่แจ้งซ่อม',
        'ปีงบประมาณ',
        'วันที่แจ้งซ่อม',
        'กำหนดวันซ่อมจริง',
        'รายการที่ชำรุด',
        'รายละเอียดอาการ',
        'หมวดหมู่',
        'รหัสครุภัณฑ์',
        'สถานที่/ห้อง',
        'หน่วยงาน',
        'ผู้แจ้งซ่อม',
        'เบอร์ติดต่อ',
        'ความเร่งด่วน',
        'สถานะ',
        'วงเงินประเมิน (บาท)',
        'งบอนุมัติจริง (บาท)',
        'เลขที่ใบเสนอราคา',
        'หมายเหตุ',
      ],
      ...monthlyReportData.items.map((r, idx) => [
        idx + 1,
        r.id,
        r.fiscalYear,
        formatThaiDate(r.createdAt),
        r.scheduledDate || '-',
        r.title,
        r.description,
        r.category,
        r.assetCode || '-',
        r.location,
        r.department,
        r.requesterName,
        r.requesterPhone || '-',
        r.urgency,
        r.status,
        r.estimatedCost || 0,
        r.approvedCost || 0,
        r.quotationId || '-',
        r.notes || '-',
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 20 }, { wch: 22 }];

    const wsDetails = XLSX.utils.aoa_to_sheet(detailRows);
    wsDetails['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 30 },
      { wch: 34 },
      { wch: 26 },
      { wch: 18 },
      { wch: 26 },
      { wch: 28 },
      { wch: 22 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 24 },
    ];

    XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปรายงานประจำเดือน');
    XLSX.utils.book_append_sheet(wb, wsDetails, 'รายละเอียดการแจ้งซ่อม');

    const safeFileMonth = monthLabel.replace(/\s+/g, '_');
    XLSX.writeFile(wb, `รายงานแจ้งซ่อมประจำเดือน_สหเวชศาสตร์_${safeFileMonth}.xlsx`);
    setShowMonthlyExportModal(false);
  };

  const renderPrintableReportContent = () => (
    <div className="space-y-6 text-slate-900 bg-white">
      {/* Institutional Report Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b-2 border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              รายงานสรุปรายการแจ้งซ่อมครุภัณฑ์และอาคารสถานที่
            </h2>
            <p className="text-xs text-slate-600">
              คณะสหเวชศาสตร์ มหาวิทยาลัยพะเยา · งานอาคารสถานที่และพัสดุ
            </p>
          </div>
        </div>
        <div className="sm:text-right text-xs text-slate-600 space-y-0.5 tabular-nums">
          <p className="font-semibold text-slate-900">
            วันที่พิมพ์รายงาน: {formatThaiDateTime(new Date().toISOString())}
          </p>
          <p>
            จำนวนที่แสดง: <span className="font-mono font-bold">{filteredReportSummary.totalCount}</span> รายการ
          </p>
        </div>
      </div>

      {/* Active Filter Criteria Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
        <div>
          <span className="text-slate-500 block">ปีงบประมาณ</span>
          <span className="font-semibold text-slate-900">
            {yearFilter === 'ทั้งหมด' ? 'ทุกปีงบประมาณ' : `พ.ศ. ${yearFilter}`}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">สาขาวิชา / หน่วยงาน</span>
          <span className="font-semibold text-slate-900">{deptFilter}</span>
        </div>
        <div>
          <span className="text-slate-500 block">สถานะงานซ่อม</span>
          <span className="font-semibold text-slate-900">{statusFilter}</span>
        </div>
        <div>
          <span className="text-slate-500 block">คำค้นหา</span>
          <span className="font-semibold text-slate-900">{searchQuery.trim() || 'ไม่มี'}</span>
        </div>
      </div>

      {/* Summary Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-slate-200 rounded-lg p-4 text-xs">
        <div>
          <p className="text-slate-500">รออนุมัติ / ดำเนินการ</p>
          <p className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
            {filteredReportSummary.pendingCount} รายการ
          </p>
        </div>
        <div>
          <p className="text-slate-500">กำลังซ่อม / เสร็จสิ้น</p>
          <p className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
            {filteredReportSummary.activeCount} / {filteredReportSummary.completedCount} รายการ
          </p>
        </div>
        <div>
          <p className="text-slate-500">ยอดประเมินเบื้องต้นรวม</p>
          <p className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
            ฿{formatThaiCurrency(filteredReportSummary.totalEstimated)}
          </p>
        </div>
        <div>
          <p className="text-slate-500">ยอดงบอนุมัติซ่อมรวม</p>
          <p className="text-base font-bold font-mono tabular-nums text-teal-800 mt-0.5">
            ฿{formatThaiCurrency(filteredReportSummary.totalApproved)}
          </p>
        </div>
      </div>

      {/* Clean Print-Ready Table */}
      <div className="border border-slate-300 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 font-semibold text-slate-800">
              <th className="py-2.5 px-3 whitespace-nowrap">ที่</th>
              <th className="py-2.5 px-3 whitespace-nowrap">เลขที่แจ้งซ่อม</th>
              <th className="py-2.5 px-3">รายการที่ชำรุด / สถานที่</th>
              <th className="py-2.5 px-3">หน่วยงาน / ผู้แจ้ง</th>
              <th className="py-2.5 px-3 whitespace-nowrap">สถานะ</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">งบประมาณ (บาท)</th>
              <th className="py-2.5 px-3 whitespace-nowrap">วันที่แจ้ง</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredRepairs.map((item, idx) => {
              const amount = item.approvedCost || item.estimatedCost || 0;
              return (
                <tr key={item.id} className="break-inside-avoid">
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                    {item.id}
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-[11px] text-slate-600">
                      {item.location}
                      {item.assetCode ? ` · ครุภัณฑ์ ${item.assetCode}` : ''}
                    </p>
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="text-slate-900">{item.department}</p>
                    <p className="text-[11px] text-slate-600">{item.requesterName}</p>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-800">
                    {item.status}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                    {amount > 0 ? formatThaiCurrency(amount) : '-'}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap tabular-nums text-slate-600">
                    {formatThaiDate(item.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
              <td colSpan={5} className="py-2.5 px-3 text-right">
                รวมงบประมาณที่อนุมัติแล้วทั้งหมด ({filteredReportSummary.totalCount} รายการ)
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-teal-800">
                ฿{formatThaiCurrency(filteredReportSummary.totalApproved)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-6 print:hidden">
      {/* KPI Overview Strip */}
      <section className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 space-y-1">
          <p className="text-xs font-medium text-slate-500">รายการแจ้งซ่อมทั้งหมด</p>
          <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {metrics.totalCount}
          </p>
          <p className="text-xs text-slate-500">
            {yearFilter === 'ทั้งหมด' ? 'ทุกปีงบประมาณ' : `ปีงบประมาณ ${yearFilter}`}
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-1 border-l border-slate-200 lg:border-l-0">
          <p className="text-xs font-medium text-slate-500">รอเสนอราคา / รออนุมัติ</p>
          <p className="text-2xl font-bold text-amber-700 font-mono tabular-nums">
            {metrics.pendingCount}
          </p>
          <p className="text-xs text-slate-500">อยู่ระหว่างพิจารณา</p>
        </div>

        <div className="p-4 sm:p-5 space-y-1">
          <p className="text-xs font-medium text-slate-500">กำลังซ่อม / ซ่อมเสร็จสิ้น</p>
          <p className="text-2xl font-bold text-teal-700 font-mono tabular-nums">
            {metrics.activeRepairCount} <span className="text-slate-300 font-normal">/</span>{' '}
            {metrics.completedCount}
          </p>
          <p className="text-xs text-slate-500">อนุมัติแล้วและปิดงาน</p>
        </div>

        <div className="p-4 sm:p-5 space-y-1 border-l border-slate-200 lg:border-l-0">
          <p className="text-xs font-medium text-slate-500">ยอดงบอนุมัติซ่อมรวม</p>
          <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            ฿{formatThaiCurrency(metrics.approvedBudgetSum)}
          </p>
          <p className="text-xs text-slate-500">เฉพาะรายการที่ผ่านอนุมัติ</p>
        </div>
      </section>

      {/* Dashboard Status Pie Chart Section */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              แดชบอร์ดสรุปสถานะการแจ้งซ่อมทั้งหมด
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              สัดส่วนงานแจ้งซ่อมแบ่งตามกลุ่มสถานะหลัก ({yearFilter === 'ทั้งหมด' ? 'ทุกปีงบประมาณ' : `ปีงบประมาณ ${yearFilter}`})
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-slate-600 tabular-nums">
            รวมทั้งหมด {metrics.totalCount} รายการ
          </span>
        </div>

        {metrics.totalCount === 0 ? (
          <div className="py-10 text-center space-y-2">
            <div className="w-11 h-11 mx-auto rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <PieChartIcon className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-800">
              ยังไม่มีข้อมูลสำหรับแสดงกราฟสถานะ
            </p>
            <p className="text-xs text-slate-500">
              กราฟวงกลมสรุปสถานะ รออนุมัติ · กำลังซ่อม · ซ่อมเสร็จแล้ว จะแสดงอัตโนมัติเมื่อมีรายการแจ้งซ่อม
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-5">
            {/* Recharts Pie Chart */}
            <div className="lg:col-span-5 relative h-[230px] min-w-0">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={statusChartSummary.activeSlices}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={statusChartSummary.activeSlices.length > 1 ? 2 : 0}
                    dataKey="value"
                    nameKey="name"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {statusChartSummary.activeSlices.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => {
                      const num = Number(value) || 0;
                      const pct =
                        metrics.totalCount > 0
                          ? ((num / metrics.totalCount) * 100).toFixed(1)
                          : '0.0';
                      return [`${num} รายการ (${pct}%)`, String(name)];
                    }}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.08)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  {metrics.totalCount}
                </span>
                <span className="text-[11px] text-slate-500">รายการ</span>
              </div>
            </div>

            {/* Structured Status Breakdown */}
            <div className="lg:col-span-7 divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {statusChartSummary.allItems.map((item) => {
                const pct =
                  metrics.totalCount > 0 ? (item.value / metrics.totalCount) * 100 : 0;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        statusFilter === item.filterTarget ? 'ทั้งหมด' : item.filterTarget
                      )
                    }
                    className="w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className="w-3 h-3 rounded-sm mt-1 shrink-0"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pl-6 sm:pl-0 shrink-0">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                      <div className="text-right font-mono tabular-nums min-w-[92px]">
                        <span className="text-sm font-bold text-slate-900">
                          {item.value}
                        </span>{' '}
                        <span className="text-xs text-slate-500">
                          ({pct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Dashboard Satisfaction Rating Summary */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              แดชบอร์ดสรุปความพึงพอใจหลังงานซ่อมเสร็จสิ้น
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              คะแนนประเมินเฉลี่ยจากผู้แจ้งซ่อมผ่านระบบ Feedback Form ({yearFilter === 'ทั้งหมด' ? 'ทุกปีงบประมาณ' : `ปีงบประมาณ ${yearFilter}`})
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-slate-600 tabular-nums">
            ประเมินแล้ว {feedbackDashboardSummary.count} รายการ · อัตราตอบกลับ{' '}
            {feedbackDashboardSummary.responseRatePct.toFixed(0)}%
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Overall Average & Dimension Breakdown */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">คะแนนความพึงพอใจเฉลี่ยรวม</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                    {feedbackDashboardSummary.count > 0
                      ? feedbackDashboardSummary.avgOverall.toFixed(2)
                      : '-'}
                  </span>
                  <span className="text-xs font-mono text-slate-500">/ 5.00</span>
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="flex items-center justify-end gap-0.5" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        feedbackDashboardSummary.count > 0 &&
                        star <= Math.round(feedbackDashboardSummary.avgOverall)
                          ? 'fill-amber-400 text-amber-500'
                          : 'fill-transparent text-slate-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500 font-mono tabular-nums">
                  จากงานซ่อมเสร็จ {feedbackDashboardSummary.completedCount} งาน
                </p>
              </div>
            </div>

            <div className="space-y-3 border border-slate-200 rounded-xl p-4">
              {[
                { label: 'ความรวดเร็วในการดำเนินการ', val: feedbackDashboardSummary.avgSpeed },
                { label: 'คุณภาพงานซ่อมบำรุง', val: feedbackDashboardSummary.avgQuality },
                { label: 'การให้บริการและประสานงาน', val: feedbackDashboardSummary.avgService },
              ].map((dim) => {
                const pct = feedbackDashboardSummary.count > 0 ? (dim.val / 5) * 100 : 0;
                return (
                  <div key={dim.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium">{dim.label}</span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {feedbackDashboardSummary.count > 0 ? `${dim.val.toFixed(2)} / 5.0` : '-'}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-700 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Feedbacks & Pending Evaluation Queue */}
          <div className="lg:col-span-7 space-y-4">
            {feedbackDashboardSummary.recentFeedbacks.length === 0 ? (
              <div className="border border-slate-200 rounded-xl p-6 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  ยังไม่มีผลประเมินความพึงพอใจ
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  เมื่องานซ่อมเสร็จสิ้น ระบบจะส่งลิงก์ประเมินผ่าน LINE Notify ให้ผู้แจ้งซ่อมโดยอัตโนมัติ หรือเจ้าหน้าที่สามารถส่งลิงก์/ประเมินได้จากรายการด้านล่าง
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 text-xs font-semibold text-slate-700">
                  ข้อเสนอแนะและผลประเมินล่าสุด
                </div>
                {feedbackDashboardSummary.recentFeedbacks.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (fb.repair) setSelectedRepair(fb.repair);
                          }}
                          className="font-mono font-semibold text-teal-800 hover:underline"
                        >
                          {fb.repairId}
                        </button>
                        <span className="text-slate-300">·</span>
                        <span className="font-medium text-slate-900 truncate">
                          {fb.repair?.title || 'รายการแจ้งซ่อม'}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        {fb.comment || 'ไม่มีข้อเสนอแนะเพิ่มเติม'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        ผู้ประเมิน: {fb.evaluatorName} · {formatThaiDate(fb.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 font-mono font-bold text-amber-600 tabular-nums">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span>{fb.rating.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {feedbackDashboardSummary.awaitingCount > 0 && (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">
                    งานซ่อมเสร็จสิ้นที่รอการประเมิน ({feedbackDashboardSummary.awaitingCount} รายการ)
                  </span>
                  <span className="text-slate-500">ส่งลิงก์ผ่าน LINE Notify หรือประเมินทันที</span>
                </div>
                {feedbackDashboardSummary.awaitingRepairs.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        <span className="font-mono text-teal-800 mr-1.5">{item.id}</span>
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.department} · ผู้แจ้ง {item.requesterName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSendFeedbackLineNotify(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 min-h-[34px] whitespace-nowrap"
                      >
                        <Send className="w-3 h-3" />
                        <span>ส่ง LINE</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenFeedbackForm(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 min-h-[34px] whitespace-nowrap"
                      >
                        <Star className="w-3 h-3" />
                        <span>ประเมิน</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">ค้นหาและกรองรายการแจ้งซ่อม</h2>
            <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
              แสดง {filteredRepairs.length} จากทั้งหมด {repairs.length} รายการ
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors min-h-[38px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ล้างตัวกรองทั้งหมด</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowMonthlyExportModal(true)}
              disabled={repairs.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50 min-h-[38px] whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export Monthly Report (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => setShowReportPreview(true)}
              disabled={filteredRepairs.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg transition-colors disabled:opacity-50 min-h-[38px] whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>ออกรายงาน / พิมพ์ PDF</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหารหัสแจ้งซ่อม, รายการ, ครุภัณฑ์, ห้อง, ผู้แจ้ง..."
              aria-label="ค้นหารายการแจ้งซ่อม"
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

          {/* Department Filter */}
          <div className="md:col-span-3">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              aria-label="กรองตามสาขาวิชา/หน่วยงาน"
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 min-h-[42px]"
            >
              <option value="ทั้งหมด">หน่วยงาน: ทั้งหมด</option>
              {availableDepartments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="กรองตามสถานะงานซ่อม"
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 min-h-[42px]"
            >
              <option value="ทั้งหมด">สถานะ: ทั้งหมด</option>
              {REPAIR_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st} ({statusCounts[st] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Fiscal Year Filter */}
          <div className="md:col-span-2">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              aria-label="กรองตามปีงบประมาณ"
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 min-h-[42px]"
            >
              <option value="ทั้งหมด">ทุกปีงบประมาณ</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  ปีงบฯ {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Segmented Tabs with Live Counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['ทั้งหมด', ...REPAIR_STATUSES].map((st) => {
            const active = statusFilter === st;
            const count = statusCounts[st] ?? 0;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors min-h-[36px] ${
                  active
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{st}</span>
                <span
                  className={`font-mono tabular-nums text-[11px] ${
                    active ? 'text-teal-100' : 'text-slate-400'
                  }`}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main List Section */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-12 bg-slate-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filteredRepairs.length === 0 ? (
          <div className="px-6 py-14 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <Wrench className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900">
                {repairs.length === 0
                  ? 'ยังไม่มีรายการแจ้งซ่อมในฐานข้อมูล Google Sheets'
                  : 'ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา'}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                {repairs.length === 0
                  ? 'เริ่มต้นบันทึกใบแจ้งซ่อมรายการแรกของคณะสหเวชศาสตร์ ระบบจะบันทึกลงในแผ่นงาน Repairs ทันที'
                  : 'ลองปรับเปลี่ยนคำค้นหา ปีงบประมาณ หรือตัวกรองสถานะ'}
              </p>
            </div>
            {repairs.length === 0 ? (
              <button
                type="button"
                onClick={onNewRepair}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>แจ้งซ่อมรายการแรก</span>
              </button>
            ) : (
              hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors min-h-[44px]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>ล้างตัวกรองทั้งหมด</span>
                </button>
              )
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4 whitespace-nowrap">เลขที่แจ้งซ่อม</th>
                    <th className="py-3 px-4">รายการที่ชำรุด / สถานที่</th>
                    <th className="py-3 px-4 whitespace-nowrap">หน่วยงาน</th>
                    <th className="py-3 px-4 whitespace-nowrap">ความเร่งด่วน</th>
                    <th className="py-3 px-4 whitespace-nowrap">สถานะ</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">งบประมาณ (บาท)</th>
                    <th className="py-3 px-4 whitespace-nowrap">วันที่แจ้ง</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">QR Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredRepairs.map((item) => {
                    const displayAmount = item.approvedCost || item.estimatedCost || 0;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedRepair(item)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-teal-800 whitespace-nowrap tabular-nums">
                          {item.id}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-medium text-slate-900 truncate">{item.title}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {item.location}
                            {item.assetCode ? ` · ครุภัณฑ์ ${item.assetCode}` : ''}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-700 whitespace-nowrap">
                          {item.department}
                        </td>
                        <td className="py-3.5 px-4">
                          <UrgencyText urgency={item.urgency} />
                        </td>
                        <td className="py-3.5 px-4">
                          <RepairStatusLabel status={item.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-xs font-medium text-slate-900 tabular-nums whitespace-nowrap">
                          {displayAmount > 0 ? formatThaiCurrency(displayAmount) : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap tabular-nums">
                          {formatThaiDate(item.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQrCopied(false);
                              setQrModalRepair(item);
                            }}
                            title={`สร้าง QR Code สำหรับ ${item.id}`}
                            aria-label={`สร้าง QR Code สำหรับ ${item.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors min-h-[34px] whitespace-nowrap"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>QR Code</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-200">
              {filteredRepairs.map((item) => {
                const displayAmount = item.approvedCost || item.estimatedCost || 0;
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedRepair(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedRepair(item);
                      }
                    }}
                    className="w-full text-left p-4 space-y-2.5 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-teal-800 tabular-nums">
                        {item.id} · ปี {item.fiscalYear}
                      </span>
                      <RepairStatusLabel status={item.status} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 leading-snug">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {item.department} · {item.location}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UrgencyText urgency={item.urgency} />
                        <span className="text-slate-300">·</span>
                        <span className="font-mono tabular-nums font-medium text-slate-900 truncate">
                          {displayAmount > 0 ? `฿${formatThaiCurrency(displayAmount)}` : 'ยังไม่ระบุวงเงิน'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrCopied(false);
                          setQrModalRepair(item);
                        }}
                        aria-label={`สร้าง QR Code สำหรับ ${item.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 shrink-0 min-h-[38px] whitespace-nowrap"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR Code</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Repair Detail Slide-Over / Modal */}
      {activeRepairDetail && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-slate-900/45 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label="รายละเอียดการแจ้งซ่อม"
        >
          <div className="w-full max-w-2xl bg-white h-full overflow-y-auto border-l border-slate-200 flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                  <span className="font-semibold text-teal-800">{activeRepairDetail.id}</span>
                  <span>·</span>
                  <span>ปีงบประมาณ {activeRepairDetail.fiscalYear}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 truncate mt-0.5">
                  {activeRepairDetail.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeRepairDetail}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="ปิดรายละเอียด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-5 sm:p-6 space-y-6">
              {/* Status & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <RepairStatusLabel status={activeRepairDetail.status} />
                  <UrgencyText urgency={activeRepairDetail.urgency} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQrCopied(false);
                      setQrModalRepair(activeRepairDetail);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 min-h-[38px]"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>สร้าง QR Code</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeRepairDetail;
                      closeRepairDetail();
                      onEditRepair(target);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 min-h-[38px]"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>แก้ไขข้อมูล</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeRepairDetail;
                      closeRepairDetail();
                      onDeleteRepair(target);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 min-h-[38px]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบรายการ</span>
                  </button>
                </div>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">สาขาวิชา / หน่วยงาน</p>
                  <p className="font-medium text-slate-900 mt-0.5">{activeRepairDetail.department}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">หมวดหมู่งานซ่อม</p>
                  <p className="font-medium text-slate-900 mt-0.5">{activeRepairDetail.category}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">สถานที่ / อาคาร / ห้อง</p>
                  <p className="font-medium text-slate-900 mt-0.5">{activeRepairDetail.location}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">รหัสครุภัณฑ์ / เลขทรัพย์สิน</p>
                  <p className="font-mono text-sm font-medium text-slate-900 mt-0.5 tabular-nums">
                    {activeRepairDetail.assetCode || 'ไม่ระบุ'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">ผู้แจ้งซ่อม</p>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {activeRepairDetail.requesterName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {activeRepairDetail.requesterEmail}
                    {activeRepairDetail.requesterPhone ? ` · โทร ${activeRepairDetail.requesterPhone}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">วันที่แจ้งซ่อม</p>
                  <p className="font-medium text-slate-900 mt-0.5 tabular-nums">
                    {formatThaiDateTime(activeRepairDetail.createdAt)}
                  </p>
                </div>
              </div>

              {/* Problem Description */}
              <div className="space-y-1.5 pt-4 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-600">รายละเอียดอาการชำรุด</p>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                  {activeRepairDetail.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                </p>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs text-slate-500">วงเงินประเมิน / ใบเสนอราคา</p>
                  <p className="text-base font-bold text-slate-900 font-mono tabular-nums mt-1">
                    ฿{formatThaiCurrency(activeRepairDetail.estimatedCost)}
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs text-slate-500">งบประมาณที่อนุมัติจริง</p>
                  <p className="text-base font-bold text-teal-800 font-mono tabular-nums mt-1">
                    ฿{formatThaiCurrency(activeRepairDetail.approvedCost)}
                  </p>
                </div>
              </div>

              {/* Workflow Action Bar */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <p className="text-xs font-semibold text-slate-700">ดำเนินการขั้นถัดไป</p>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeRepairDetail;
                      closeRepairDetail();
                      onCreateQuotationForRepair(target);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 min-h-[42px]"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>จัดทำ / เพิ่มใบเสนอราคา</span>
                  </button>

                  {activeRepairDetail.status === 'รออนุมัติงบ' && (
                    <button
                      type="button"
                      onClick={() => {
                        closeRepairDetail();
                        onNavigateToApprovals();
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-amber-900 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 min-h-[42px]"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>ไปที่หน้าพิจารณาอนุมัติ</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {activeRepairDetail.status === 'อนุมัติแล้ว' && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateRepairStatus(activeRepairDetail, 'กำลังดำเนินการซ่อม')
                      }
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-sky-900 bg-sky-50 border border-sky-300 rounded-lg hover:bg-sky-100 min-h-[42px]"
                    >
                      <Wrench className="w-4 h-4" />
                      <span>อัปเดตสถานะ: กำลังดำเนินการซ่อม</span>
                    </button>
                  )}

                  {['อนุมัติแล้ว', 'กำลังดำเนินการซ่อม'].includes(activeRepairDetail.status) && (
                    <button
                      type="button"
                      onClick={() => onUpdateRepairStatus(activeRepairDetail, 'ซ่อมเสร็จสิ้น')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 min-h-[42px]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ตรวจรับงาน: ซ่อมเสร็จสิ้น</span>
                    </button>
                  )}

                  {activeRepairDetail.status === 'รอดำเนินการ' && (
                    <button
                      type="button"
                      onClick={() => onUpdateRepairStatus(activeRepairDetail, 'รอใบเสนอราคา')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 min-h-[42px]"
                    >
                      <Clock className="w-4 h-4" />
                      <span>เปลี่ยนสถานะ: รอใบเสนอราคา</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Linked Quotations */}
              <div className="pt-4 border-t border-slate-200 space-y-2.5">
                <p className="text-xs font-semibold text-slate-700">
                  ใบเสนอราคาที่เกี่ยวข้อง ({linkedQuotations.length})
                </p>
                {linkedQuotations.length === 0 ? (
                  <p className="text-xs text-slate-500">ยังไม่มีใบเสนอราคาสำหรับงานซ่อมนี้</p>
                ) : (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                    {linkedQuotations.map((q) => (
                      <div key={q.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-mono font-semibold text-slate-900">
                            {q.id} · {q.vendorName}
                          </p>
                          <p className="text-slate-500 mt-0.5">
                            วันที่ {formatThaiDate(q.quoteDate)} · สถานะ: {q.status}
                          </p>
                        </div>
                        <p className="font-mono font-bold text-slate-900 tabular-nums">
                          ฿{formatThaiCurrency(q.totalAmount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Linked Approval Logs */}
              <div className="pt-4 border-t border-slate-200 space-y-2.5">
                <p className="text-xs font-semibold text-slate-700">
                  ประวัติการพิจารณาอนุมัติ ({linkedApprovals.length})
                </p>
                {linkedApprovals.length === 0 ? (
                  <p className="text-xs text-slate-500">ยังไม่มีประวัติการพิจารณาอนุมัติ</p>
                ) : (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                    {linkedApprovals.map((a) => (
                      <div key={a.id} className="p-3 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900">
                            {a.decision} ({a.approverName})
                          </span>
                          <span className="font-mono text-slate-500 tabular-nums">
                            {formatThaiDateTime(a.decisionDate)}
                          </span>
                        </div>
                        <p className="text-slate-600">
                          {a.approverRole} · วงเงินอนุมัติ ฿{formatThaiCurrency(a.approvedAmount)}
                        </p>
                        {a.remark && (
                          <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                            ความเห็น: {a.remark}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Post-Repair Satisfaction Feedback Section */}
              {(activeRepairDetail.status === 'ซ่อมเสร็จสิ้น' || linkedFeedback) && (
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <p className="text-xs font-semibold text-slate-700">
                    การประเมินความพึงพอใจหลังงานซ่อมเสร็จสิ้น
                  </p>
                  {linkedFeedback ? (
                    <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">
                          ประเมินโดย {linkedFeedback.evaluatorName}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-600 tabular-nums">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          {linkedFeedback.rating.toFixed(1)} / 5.0
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600 font-mono tabular-nums">
                        <span>ความรวดเร็ว: {linkedFeedback.speedRating}/5</span>
                        <span>คุณภาพงาน: {linkedFeedback.qualityRating}/5</span>
                        <span>การให้บริการ: {linkedFeedback.serviceRating}/5</span>
                      </div>
                      {linkedFeedback.comment && (
                        <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                          ข้อเสนอแนะ: {linkedFeedback.comment}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 tabular-nums">
                        บันทึกเมื่อ {formatThaiDateTime(linkedFeedback.createdAt)}
                      </p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 bg-slate-50 rounded-xl p-4 space-y-3">
                      <p className="text-xs text-slate-600">
                        งานซ่อมเสร็จสิ้นแล้วและยังไม่ได้รับแบบประเมินความพึงพอใจจากผู้แจ้งซ่อม
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenFeedbackForm(activeRepairDetail)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 min-h-[38px]"
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span>ประเมินความพึงพอใจตอนนี้</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSendFeedbackLineNotify(activeRepairDetail)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 min-h-[38px]"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>ส่งลิงก์ประเมินผ่าน LINE Notify</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyFeedbackLink(activeRepairDetail.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 min-h-[38px]"
                        >
                          {feedbackLinkCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              <span className="text-emerald-700">คัดลอกลิงก์แล้ว</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>คัดลอกลิงก์ประเมิน</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Per-Repair Audit Trail (Logs) */}
              <div className="pt-4 border-t border-slate-200 space-y-2.5">
                <p className="text-xs font-semibold text-slate-700">
                  ประวัติการดำเนินการและแก้ไขข้อมูล ({linkedLogs.length})
                </p>
                {linkedLogs.length === 0 ? (
                  <p className="text-xs text-slate-500">ยังไม่มีประวัติการดำเนินการสำหรับรายการนี้</p>
                ) : (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                    {linkedLogs.map((log) => (
                      <div key={`${log.id}-${log.rowIndex ?? log.timestamp}`} className="p-3 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900">
                            {log.action} · {log.userName}
                          </span>
                          <span className="font-mono text-slate-500 tabular-nums">
                            {formatThaiDateTime(log.timestamp)}
                          </span>
                        </div>
                        <p className="text-slate-600">{log.details || '-'}</p>
                        <p className="text-[11px] font-mono text-slate-400 tabular-nums">
                          {log.id}
                          {log.userEmail ? ` · ${log.userEmail}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {activeRepairDetail.notes && (
                <div className="pt-4 border-t border-slate-200 space-y-1">
                  <p className="text-xs font-semibold text-slate-600">หมายเหตุ</p>
                  <p className="text-xs text-slate-700">{activeRepairDetail.notes}</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-end">
              <button
                type="button"
                onClick={closeRepairDetail}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 min-h-[42px]"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Direct Print Fallback (when Ctrl+P is pressed without opening preview or QR modal) */}
      {!showReportPreview && !qrModalRepair && (
        <div className="hidden print:block">{renderPrintableReportContent()}</div>
      )}

      {/* Repair QR Code Generator & Sticker Modal */}
      {qrModalRepair && (() => {
        const qrUrl = buildRepairQrUrl(qrModalRepair.id);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 overflow-y-auto print:static print:bg-white print:p-0 print:overflow-visible"
            role="dialog"
            aria-modal="true"
            aria-label={`QR Code ประจำใบแจ้งซ่อม ${qrModalRepair.id}`}
          >
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden print:border-0 print:shadow-none print:max-w-sm print:mx-auto">
              <div className="no-print px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <QrCode className="w-5 h-5 text-teal-700 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      QR Code ใบแจ้งซ่อม {qrModalRepair.id}
                    </h3>
                    <p className="text-xs text-slate-500">
                      สแกนเพื่อเปิดหน้าดูรายละเอียดรายการซ่อมนี้โดยตรง
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setQrModalRepair(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg shrink-0"
                  aria-label="ปิดหน้าต่าง QR Code"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 text-center print:p-4">
                {/* Sticker Card */}
                <div className="border border-slate-200 print:border-2 print:border-slate-800 rounded-xl p-5 bg-white space-y-3">
                  <p className="text-xs font-semibold text-teal-800">
                    ระบบแจ้งซ่อม คณะสหเวชศาสตร์ มหาวิทยาลัยพะเยา
                  </p>

                  <div
                    ref={qrCanvasWrapperRef}
                    className="inline-flex items-center justify-center p-3 bg-white border border-slate-200 rounded-xl"
                  >
                    <QRCodeCanvas
                      value={qrUrl}
                      size={208}
                      level="M"
                      includeMargin={true}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                      {qrModalRepair.id}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {qrModalRepair.title}
                    </p>
                    <p className="text-xs text-slate-600">
                      {qrModalRepair.department} · {qrModalRepair.location}
                      {qrModalRepair.assetCode ? ` · ครุภัณฑ์ ${qrModalRepair.assetCode}` : ''}
                    </p>
                  </div>
                </div>

                {/* Direct URL Copy Box */}
                <div className="no-print text-left space-y-1.5">
                  <p className="text-xs font-medium text-slate-700">ลิงก์ปลายทางของ QR Code</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={qrUrl}
                      aria-label="ลิงก์ปลายทางของ QR Code"
                      className="flex-1 min-w-0 px-3 py-2 text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyQrLink(qrUrl)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 shrink-0 min-h-[36px]"
                    >
                      {qrCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          <span className="text-emerald-700">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอกลิงก์</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="no-print px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setQrModalRepair(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 min-h-[40px]"
                >
                  ปิดหน้าต่าง
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadQrPng(qrModalRepair)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 min-h-[40px]"
                  >
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลด PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 min-h-[40px]"
                  >
                    <Printer className="w-4 h-4" />
                    <span>พิมพ์ป้าย QR Code</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Report Preview & Print / Export Modal */}
      {showReportPreview && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-6 bg-slate-900/60 overflow-y-auto print:static print:bg-white print:p-0 print:overflow-visible"
          role="dialog"
          aria-modal="true"
          aria-label="ตัวอย่างรายงานสรุปรายการแจ้งซ่อม"
        >
          <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden my-auto print:border-0 print:shadow-none print:max-w-none print:rounded-none">
            <div className="no-print px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  ตัวอย่างรายงานสรุปรายการแจ้งซ่อม ({filteredRepairs.length} รายการ)
                </h3>
                <p className="text-xs text-slate-500">
                  เมื่อสั่งพิมพ์หรือบันทึก PDF ระบบจะซ่อนปุ่มและแถบนำทางทั้งหมดอัตโนมัติ
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 min-h-[38px]"
                >
                  <Download className="w-4 h-4" />
                  <span>ส่งออก CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 min-h-[38px]"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ / บันทึก PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportPreview(false)}
                  className="p-2 text-slate-500 hover:text-slate-900 rounded-lg"
                  aria-label="ปิดตัวอย่างรายงาน"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-10 print:p-0">{renderPrintableReportContent()}</div>
          </div>
        </div>
      )}

      {/* Monthly Excel (.xlsx) Report Export Modal */}
      {showMonthlyExportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="ส่งออกรายงานสรุปการแจ้งซ่อมประจำเดือน Excel"
        >
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    ส่งออกรายงานสรุปการแจ้งซ่อมรายเดือน (.xlsx)
                  </h3>
                  <p className="text-xs text-slate-500">
                    สร้างไฟล์ Excel สำหรับจัดทำรายงานประจำเดือนของเจ้าหน้าที่
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMonthlyExportModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  เลือกเดือนและปีที่ต้องการออกรายงาน
                </label>
                <select
                  value={exportMonthKey}
                  onChange={(e) => setExportMonthKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                >
                  {availableMonths.map((key) => (
                    <option key={key} value={key}>
                      เดือน {formatThaiMonthYearLabel(key)}
                    </option>
                  ))}
                </select>
              </div>

              {deptFilter !== 'ทั้งหมด' && (
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOnlySelectedDept}
                    onChange={(e) => setExportOnlySelectedDept(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                  />
                  <span>ส่งออกเฉพาะหน่วยงานที่เลือกอยู่ ({deptFilter})</span>
                </label>
              )}

              {/* Live Monthly Preview Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                  <span className="font-semibold text-slate-800">
                    สรุปข้อมูลเดือน {formatThaiMonthYearLabel(exportMonthKey)}
                  </span>
                  <span className="font-mono font-bold text-teal-800 tabular-nums">
                    {monthlyReportData.totalCount} รายการ
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">รออนุมัติ</p>
                    <p className="font-mono font-bold text-amber-700 tabular-nums">
                      {monthlyReportData.pendingCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">กำลังซ่อม</p>
                    <p className="font-mono font-bold text-sky-700 tabular-nums">
                      {monthlyReportData.activeCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">ซ่อมเสร็จแล้ว</p>
                    <p className="font-mono font-bold text-teal-700 tabular-nums">
                      {monthlyReportData.completedCount}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <span className="text-slate-600">ยอดงบประมาณอนุมัติรวม</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    ฿{formatThaiCurrency(monthlyReportData.totalApproved)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                ไฟล์ Excel ที่ส่งออกจะประกอบด้วย 2 แผ่นงาน: <strong>สรุปรายงานประจำเดือน</strong> (แยกตามสถานะ หน่วยงาน และหมวดหมู่) และ <strong>รายละเอียดการแจ้งซ่อม</strong> ครบทุกคอลัมน์
              </p>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowMonthlyExportModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 min-h-[42px]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExportMonthlyExcel}
                disabled={monthlyReportData.totalCount === 0}
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
