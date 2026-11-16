import React, { useState } from 'react';
import { Star, X, CheckCircle2, Send } from 'lucide-react';
import {
  RepairFeedback,
  RepairRequest,
  formatThaiDateTime,
} from '../types/repair';

interface FeedbackModalProps {
  repair: RepairRequest;
  existingFeedback?: RepairFeedback | null;
  defaultEvaluatorName: string;
  onClose: () => void;
  onSubmit: (data: {
    rating: number;
    speedRating: number;
    qualityRating: number;
    serviceRating: number;
    comment: string;
    evaluatorName: string;
  }) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'ต้องปรับปรุง',
  2: 'พอใช้',
  3: 'ปานกลาง',
  4: 'ดี',
  5: 'ดีมาก',
};

function StarRatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 border-b border-slate-100 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 font-mono tabular-nums">
          {value} / 5 · {RATING_LABELS[value] || ''}
        </p>
      </div>
      <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= value;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${label} ${star} คะแนน`}
              onClick={() => onChange(star)}
              className="p-1.5 rounded-lg hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  active
                    ? 'fill-amber-400 text-amber-500'
                    : 'fill-transparent text-slate-300'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FeedbackModal({
  repair,
  existingFeedback,
  defaultEvaluatorName,
  onClose,
  onSubmit,
}: FeedbackModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [speedRating, setSpeedRating] = useState<number>(5);
  const [qualityRating, setQualityRating] = useState<number>(5);
  const [serviceRating, setServiceRating] = useState<number>(5);
  const [evaluatorName, setEvaluatorName] = useState<string>(
    defaultEvaluatorName || repair.requesterName || ''
  );
  const [comment, setComment] = useState<string>('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      rating,
      speedRating,
      qualityRating,
      serviceRating,
      comment: comment.trim(),
      evaluatorName: evaluatorName.trim() || repair.requesterName || 'ผู้แจ้งซ่อม',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 overflow-y-auto print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`แบบประเมินความพึงพอใจหลังงานซ่อม ${repair.id}`}
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden my-auto">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900">
              แบบประเมินความพึงพอใจหลังงานซ่อมเสร็จสิ้น
            </h3>
            <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5 truncate">
              {repair.id} · ปีงบประมาณ {repair.fiscalYear}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg shrink-0 min-h-[38px] min-w-[38px] flex items-center justify-center"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Repair Reference Summary */}
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 space-y-1">
          <p className="text-sm font-semibold text-slate-900">{repair.title}</p>
          <p className="text-xs text-slate-600">
            {repair.department} · {repair.location}
          </p>
          <p className="text-xs text-slate-500">
            ผู้แจ้งซ่อม: {repair.requesterName} · สถานะ: {repair.status}
          </p>
        </div>

        {existingFeedback ? (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-emerald-900">
                  รายการนี้ได้รับการประเมินความพึงพอใจแล้ว
                </p>
                <p className="text-xs text-emerald-800">
                  ประเมินโดย {existingFeedback.evaluatorName} ·{' '}
                  {formatThaiDateTime(existingFeedback.createdAt)}
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="font-medium text-slate-700">ความพึงพอใจโดยรวม</span>
                <span className="font-mono font-bold text-amber-600 tabular-nums">
                  {existingFeedback.rating.toFixed(1)} / 5.0 ({RATING_LABELS[existingFeedback.rating] || ''})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-slate-500">ความรวดเร็ว</p>
                  <p className="font-mono font-bold text-slate-900 tabular-nums mt-0.5">
                    {existingFeedback.speedRating} / 5
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">คุณภาพงานซ่อม</p>
                  <p className="font-mono font-bold text-slate-900 tabular-nums mt-0.5">
                    {existingFeedback.qualityRating} / 5
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">การให้บริการ</p>
                  <p className="font-mono font-bold text-slate-900 tabular-nums mt-0.5">
                    {existingFeedback.serviceRating} / 5
                  </p>
                </div>
              </div>
              {existingFeedback.comment && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500">ข้อเสนอแนะ</p>
                  <p className="text-xs text-slate-800 mt-1 whitespace-pre-line">
                    {existingFeedback.comment}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 min-h-[42px]"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
            <div className="border border-slate-200 rounded-xl px-4 py-1 divide-y divide-slate-100">
              <StarRatingRow
                label="ความพึงพอใจโดยรวม"
                value={rating}
                onChange={setRating}
              />
              <StarRatingRow
                label="ความรวดเร็วในการดำเนินการ"
                value={speedRating}
                onChange={setSpeedRating}
              />
              <StarRatingRow
                label="คุณภาพงานซ่อมบำรุง"
                value={qualityRating}
                onChange={setQualityRating}
              />
              <StarRatingRow
                label="การให้บริการและประสานงาน"
                value={serviceRating}
                onChange={setServiceRating}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                ชื่อผู้ประเมิน
              </label>
              <input
                type="text"
                required
                value={evaluatorName}
                onChange={(e) => setEvaluatorName(e.target.value)}
                placeholder="ระบุชื่อผู้ประเมิน"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700 min-h-[42px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                ข้อเสนอแนะเพิ่มเติม (ถ้ามี)
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="ระบุข้อคิดเห็นหรือข้อเสนอแนะเพื่อพัฒนาการให้บริการงานซ่อมบำรุง..."
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700 resize-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 min-h-[42px]"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 min-h-[42px]"
              >
                <Send className="w-4 h-4" />
                <span>ส่งแบบประเมินความพึงพอใจ</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
