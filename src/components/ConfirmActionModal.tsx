import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { ConfirmDialogState } from '../types/repair';

interface ConfirmActionModalProps {
  dialog: ConfirmDialogState;
  onClose: () => void;
}

export function ConfirmActionModal({ dialog, onClose }: ConfirmActionModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!dialog.isOpen) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await dialog.onConfirm();
      onClose();
    } catch {
      // Error handling is performed by the caller callback
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const isDanger = dialog.variant === 'danger';
  const isWarning = dialog.variant === 'warning';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isDanger
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : isWarning
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-teal-50 text-teal-700 border border-teal-200'
              }`}
            >
              {isDanger || isWarning ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <h3
              id="confirm-modal-title"
              className="text-base font-semibold text-slate-900 leading-snug"
            >
              {dialog.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-slate-700 leading-relaxed">{dialog.description}</p>
          {dialog.details && dialog.details.length > 0 && (
            <ul className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs text-slate-700">
              {dialog.details.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-slate-400 select-none">•</span>
                  <span className="break-words">{item}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-500">
            การดำเนินการนี้จะบันทึกการเปลี่ยนแปลงลงในฐานข้อมูล Google Sheets ของคณะโดยตรง
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors min-h-[44px]"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors min-h-[44px] ${
              isDanger
                ? 'bg-red-700 hover:bg-red-800'
                : isWarning
                  ? 'bg-amber-700 hover:bg-amber-800'
                  : 'bg-teal-700 hover:bg-teal-800'
            } disabled:opacity-60`}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{submitting ? 'กำลังบันทึก...' : dialog.confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
