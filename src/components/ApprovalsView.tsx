import React, { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  AnnualBudget,
  ApprovalRecord,
  Quotation,
  RepairRequest,
  formatThaiCurrency,
  formatThaiDateTime,
} from '../types/repair';
import { RepairStatusLabel, UrgencyText } from './StatusBadge';

interface ApprovalsViewProps {
  user: User;
  repairs: RepairRequest[];
  quotations: Quotation[];
  approvals: ApprovalRecord[];
  budgets: AnnualBudget[];
  onSubmitDecision: (params: {
    repair: RepairRequest;
    quotation: Quotation | null;
    decision: 'อนุมัติ' | 'ไม่อนุมัติ' | 'ส่งกลับแก้ไข';
    approvedAmount: number;
    approverRole: string;
    remark: string;
  }) => void;
}

export function ApprovalsView({
  user,
  repairs,
  quotations,
  approvals,
  budgets,
  onSubmitDecision,
}: ApprovalsViewProps) {
  const [selectedForDecision, setSelectedForDecision] = useState<RepairRequest | null>(null);
  const [approverRole, setApproverRole] = useState('คณบดี / ผู้มีอำนาจอนุมัติ');
  const [approvedAmount, setApprovedAmount] = useState<string>('');
  const [remark, setRemark] = useState('');

  const quotationByRepair = useMemo(() => {
    const map: Record<string, Quotation> = {};
    for (const q of quotations) {
      if (!map[q.repairId]) {
        map[q.repairId] = q;
      }
    }
    return map;
  }, [quotations]);

  const pendingRepairs = useMemo(() => {
    return repairs.filter((r) =>
      ['รออนุมัติงบ', 'รอใบเสนอราคา', 'รอดำเนินการ'].includes(r.status)
    );
  }, [repairs]);

  const getBudgetSummaryForYear = (fiscalYear: string) => {
    const budgetRow = budgets.find((b) => b.fiscalYear === fiscalYear);
    const allocated = budgetRow?.allocatedAmount || 0;
    const spentOrCommitted = repairs
      .filter(
        (r) =>
          r.fiscalYear === fiscalYear &&
          ['อนุมัติแล้ว', 'กำลังดำเนินการซ่อม', 'ซ่อมเสร็จสิ้น'].includes(r.status)
      )
      .reduce((sum, r) => sum + (r.approvedCost || 0), 0);
    return {
      allocated,
      spentOrCommitted,
      remaining: allocated - spentOrCommitted,
      hasBudgetConfig: Boolean(budgetRow),
    };
  };

  const openDecisionBox = (r: RepairRequest) => {
    const linkedQ = quotationByRepair[r.id];
    setSelectedForDecision(r);
    setApprovedAmount(String(linkedQ?.totalAmount || r.estimatedCost || 0));
    setRemark('');
  };

  const handleDecision = (decision: 'อนุมัติ' | 'ไม่อนุมัติ' | 'ส่งกลับแก้ไข') => {
    if (!selectedForDecision) return;
    const linkedQ = quotationByRepair[selectedForDecision.id] || null;
    onSubmitDecision({
      repair: selectedForDecision,
      quotation: linkedQ,
      decision,
      approvedAmount: decision === 'อนุมัติ' ? Number(approvedAmount) || 0 : 0,
      approverRole,
      remark: remark.trim(),
    });
    setSelectedForDecision(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">
            การพิจารณาอนุมัติงานซ่อมและงบประมาณ
          </h2>
          <p className="text-xs text-slate-500">
            ตรวจสอบรายการคำขอซ่อม ใบเสนอราคา และผลกระทบต่องบประมาณคงเหลือประจำปีก่อนลงนามอนุมัติ
          </p>
        </div>
        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2">
          ผู้พิจารณาปัจจุบัน: <span className="font-semibold text-slate-900">{user.displayName}</span>
        </div>
      </section>

      {/* Pending Queue */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            รายการรอดำเนินการพิจารณา ({pendingRepairs.length})
          </h3>
        </div>

        {pendingRepairs.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-2">
            <ShieldCheck className="w-10 h-10 text-teal-700 mx-auto opacity-80" />
            <p className="text-sm font-semibold text-slate-900">
              ไม่มีรายการรออนุมัติในขณะนี้
            </p>
            <p className="text-xs text-slate-500">
              รายการแจ้งซ่อมทั้งหมดได้รับการพิจารณาเรียบร้อยแล้ว
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {pendingRepairs.map((r) => {
              const linkedQ = quotationByRepair[r.id];
              const proposedCost = linkedQ?.totalAmount || r.estimatedCost || 0;
              const yearBudget = getBudgetSummaryForYear(r.fiscalYear);
              const isSelected = selectedForDecision?.id === r.id;

              return (
                <div key={r.id} className="p-5 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs font-semibold text-teal-800 tabular-nums">
                          {r.id}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-600 font-mono">
                          ปีงบประมาณ {r.fiscalYear}
                        </span>
                        <RepairStatusLabel status={r.status} />
                        <UrgencyText urgency={r.urgency} />
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{r.title}</h4>
                      <p className="text-xs text-slate-600">
                        {r.department} · {r.location} · ผู้แจ้ง: {r.requesterName}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                      <div className="sm:text-right">
                        <p className="text-xs text-slate-500">
                          {linkedQ ? `ตามใบเสนอราคา ${linkedQ.id}` : 'งบประมาณประเมินเบื้องต้น'}
                        </p>
                        <p className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                          ฿{formatThaiCurrency(proposedCost)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          isSelected ? setSelectedForDecision(null) : openDecisionBox(r)
                        }
                        className="px-4 py-2.5 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap min-h-[44px]"
                      >
                        {isSelected ? 'ซ่อนหน้าต่างพิจารณา' : 'พิจารณาอนุมัติ'}
                      </button>
                    </div>
                  </div>

                  {/* Inline Decision Panel */}
                  {isSelected && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
                      {/* Fiscal Year Budget Impact */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-white border border-slate-200 rounded-lg text-xs">
                        <div>
                          <p className="text-slate-500">
                            งบซ่อมบำรุงปี {r.fiscalYear} ที่ได้รับจัดสรร
                          </p>
                          <p className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                            {yearBudget.hasBudgetConfig
                              ? `฿${formatThaiCurrency(yearBudget.allocated)}`
                              : 'ยังไม่ตั้งค่างบปีนี้'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">คงเหลือก่อนอนุมัติรายการนี้</p>
                          <p className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                            {yearBudget.hasBudgetConfig
                              ? `฿${formatThaiCurrency(yearBudget.remaining)}`
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">คาดการณ์คงเหลือหลังอนุมัติ</p>
                          {yearBudget.hasBudgetConfig ? (
                            <p
                              className={`font-mono text-sm font-bold tabular-nums mt-0.5 ${
                                yearBudget.remaining - (Number(approvedAmount) || 0) < 0
                                  ? 'text-red-700'
                                  : 'text-teal-700'
                              }`}
                            >
                              ฿
                              {formatThaiCurrency(
                                yearBudget.remaining - (Number(approvedAmount) || 0)
                              )}
                            </p>
                          ) : (
                            <p className="text-amber-700 font-medium mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>กรุณาตั้งค่างบประจำปีในเมนูงบประมาณ</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-slate-700">
                            บทบาท / ตำแหน่งผู้อนุมัติ
                          </label>
                          <select
                            value={approverRole}
                            onChange={(e) => setApproverRole(e.target.value)}
                            className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                          >
                            <option value="คณบดี / ผู้มีอำนาจอนุมัติ">
                              คณบดี / ผู้มีอำนาจอนุมัติ
                            </option>
                            <option value="รองคณบดีฝ่ายบริหาร">รองคณบดีฝ่ายบริหาร</option>
                            <option value="หัวหน้าสำนักงานคณะสหเวชศาสตร์">
                              หัวหน้าสำนักงานคณะสหเวชศาสตร์
                            </option>
                            <option value="เจ้าหน้าที่พัสดุ / ผู้ตรวจสอบ">
                              เจ้าหน้าที่พัสดุ / ผู้ตรวจสอบ
                            </option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-slate-700">
                            วงเงินที่อนุมัติ (บาท)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={approvedAmount}
                            onChange={(e) => setApprovedAmount(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-700">
                          ความเห็น / หมายเหตุการพิจารณา
                        </label>
                        <textarea
                          rows={2}
                          value={remark}
                          onChange={(e) => setRemark(e.target.value)}
                          placeholder="ระบุความเห็นประกอบการอนุมัติ หรือเหตุผลกรณีส่งกลับแก้ไข / ไม่อนุมัติ..."
                          className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => handleDecision('ไม่อนุมัติ')}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 min-h-[42px]"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>ไม่อนุมัติ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecision('ส่งกลับแก้ไข')}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 min-h-[42px]"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>ส่งกลับแก้ไขใบเสนอราคา</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecision('อนุมัติ')}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 min-h-[42px]"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>อนุมัติให้ดำเนินการซ่อม</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Approval History Log */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            ประวัติการอนุมัติย้อนหลัง ({approvals.length})
          </h3>
        </div>

        {approvals.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            ยังไม่มีบันทึกประวัติการพิจารณาอนุมัติ
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">รหัสอนุมัติ</th>
                    <th className="py-3 px-4">เลขที่แจ้งซ่อม / ใบเสนอราคา</th>
                    <th className="py-3 px-4">ผลการพิจารณา</th>
                    <th className="py-3 px-4 text-right">วงเงินอนุมัติ (บาท)</th>
                    <th className="py-3 px-4">ผู้อนุมัติ</th>
                    <th className="py-3 px-4">วันเวลาที่พิจารณา</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {approvals.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-800 tabular-nums">
                        {a.id}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-700">
                        {a.repairId}
                        {a.quotationId ? ` · ${a.quotationId}` : ''}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border ${
                            a.decision === 'อนุมัติ'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : a.decision === 'ส่งกลับแก้ไข'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-red-50 text-red-800 border-red-200'
                          }`}
                        >
                          {a.decision}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {formatThaiCurrency(a.approvedAmount)}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <p className="font-medium text-slate-900">{a.approverName}</p>
                        <p className="text-slate-500">{a.approverRole}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {formatThaiDateTime(a.decisionDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-200">
              {approvals.map((a) => (
                <div key={a.id} className="p-4 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-slate-900">
                      {a.id} · {a.repairId}
                    </span>
                    <span className="font-semibold text-teal-800">{a.decision}</span>
                  </div>
                  <p className="text-slate-600">
                    ผู้อนุมัติ: {a.approverName} ({a.approverRole})
                  </p>
                  <div className="flex justify-between text-slate-500 pt-1">
                    <span>{formatThaiDateTime(a.decisionDate)}</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      ฿{formatThaiCurrency(a.approvedAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
