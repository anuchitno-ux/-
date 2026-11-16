import React from 'react';
import {
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  AlertTriangle,
  Wrench,
  XCircle,
  RotateCcw,
  Hourglass,
} from 'lucide-react';
import { RepairStatus, UrgencyLevel } from '../types/repair';

export function RepairStatusLabel({ status }: { status: RepairStatus }) {
  const config: Record<
    RepairStatus,
    { icon: React.ReactNode; colorClass: string; bgClass: string }
  > = {
    รอดำเนินการ: {
      icon: <Clock className="w-3.5 h-3.5 shrink-0" />,
      colorClass: 'text-slate-700',
      bgClass: 'bg-slate-100 border-slate-200',
    },
    รอใบเสนอราคา: {
      icon: <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />,
      colorClass: 'text-amber-800',
      bgClass: 'bg-amber-50 border-amber-200',
    },
    รออนุมัติงบ: {
      icon: <Hourglass className="w-3.5 h-3.5 shrink-0" />,
      colorClass: 'text-amber-800',
      bgClass: 'bg-amber-50 border-amber-200',
    },
    อนุมัติแล้ว: {
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
      colorClass: 'text-teal-800',
      bgClass: 'bg-teal-50 border-teal-200',
    },
    กำลังดำเนินการซ่อม: {
      icon: <Wrench className="w-3.5 h-3.5 shrink-0" />,
      colorClass: 'text-sky-800',
      bgClass: 'bg-sky-50 border-sky-200',
    },
    ซ่อมเสร็จสิ้น: {
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
      colorClass: 'text-emerald-800',
      bgClass: 'bg-emerald-50 border-emerald-200',
    },
    ส่งกลับแก้ไข: {
      icon: <RotateCcw className="w-3.5 h-3.5 shrink-0" />,
      colorClass: 'text-orange-800',
      bgClass: 'bg-orange-50 border-orange-200',
    },
    ไม่อนุมัติ: {
      icon: <XCircle className="w-3.5 h-3.5 shrink-0" />,
      colorClass: 'text-red-800',
      bgClass: 'bg-red-50 border-red-200',
    },
  };

  const current = config[status] || config['รอดำเนินการ'];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-md whitespace-nowrap shrink-0 ${current.bgClass} ${current.colorClass}`}
    >
      {current.icon}
      <span>{status}</span>
    </span>
  );
}

export function UrgencyText({ urgency }: { urgency: UrgencyLevel }) {
  if (urgency === 'เร่งด่วนมาก') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>เร่งด่วนมาก</span>
      </span>
    );
  }
  if (urgency === 'ด่วน') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>ด่วน</span>
      </span>
    );
  }
  return <span className="text-xs text-slate-600 whitespace-nowrap">ปกติ</span>;
}
