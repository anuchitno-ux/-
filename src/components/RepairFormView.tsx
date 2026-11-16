import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Save, ArrowLeft } from 'lucide-react';
import {
  DEPARTMENTS,
  REPAIR_CATEGORIES,
  RepairRequest,
  URGENCY_LEVELS,
  UrgencyLevel,
  getCurrentThaiFiscalYear,
} from '../types/repair';

interface RepairFormViewProps {
  user: User;
  editingRepair: RepairRequest | null;
  onSubmitRepair: (formData: Omit<RepairRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'approvedCost' | 'quotationId'>, existing?: RepairRequest | null) => void;
  onCancel: () => void;
}

export function RepairFormView({
  user,
  editingRepair,
  onSubmitRepair,
  onCancel,
}: RepairFormViewProps) {
  const defaultYear = getCurrentThaiFiscalYear();
  const yearOptions = Array.from(
    new Set([
      String(Number(defaultYear) - 1),
      defaultYear,
      String(Number(defaultYear) + 1),
      editingRepair?.fiscalYear || defaultYear,
    ])
  ).sort((a, b) => Number(b) - Number(a));

  const [fiscalYear, setFiscalYear] = useState(editingRepair?.fiscalYear || defaultYear);
  const [requesterName, setRequesterName] = useState(
    editingRepair?.requesterName || user.displayName || ''
  );
  const [requesterPhone, setRequesterPhone] = useState(editingRepair?.requesterPhone || '');
  const [department, setDepartment] = useState(editingRepair?.department || DEPARTMENTS[0]);
  const [category, setCategory] = useState(editingRepair?.category || REPAIR_CATEGORIES[0]);
  const [assetCode, setAssetCode] = useState(editingRepair?.assetCode || '');
  const [location, setLocation] = useState(editingRepair?.location || '');
  const [title, setTitle] = useState(editingRepair?.title || '');
  const [description, setDescription] = useState(editingRepair?.description || '');
  const [urgency, setUrgency] = useState<UrgencyLevel>(editingRepair?.urgency || 'ปกติ');
  const [estimatedCost, setEstimatedCost] = useState<string>(
    editingRepair?.estimatedCost ? String(editingRepair.estimatedCost) : ''
  );
  const [notes, setNotes] = useState(editingRepair?.notes || '');
  const [scheduledDate, setScheduledDate] = useState(editingRepair?.scheduledDate || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitRepair(
      {
        fiscalYear,
        requesterName: requesterName.trim(),
        requesterEmail: editingRepair?.requesterEmail || user.email || '',
        requesterPhone: requesterPhone.trim(),
        department,
        category,
        assetCode: assetCode.trim(),
        location: location.trim(),
        title: title.trim(),
        description: description.trim(),
        urgency,
        estimatedCost: Number(estimatedCost) || 0,
        notes: notes.trim(),
        scheduledDate: scheduledDate.trim(),
      },
      editingRepair
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้ารายการแจ้งซ่อม</span>
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            {editingRepair
              ? `แก้ไขข้อมูลใบแจ้งซ่อม (${editingRepair.id})`
              : 'แบบฟอร์มแจ้งซ่อมครุภัณฑ์ / อาคารสถานที่'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            คณะสหเวชศาสตร์ มหาวิทยาลัยพะเยา · ข้อมูลจะถูกบันทึกเข้าสู่ Google Sheets ของคณะโดยตรง
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Section 1: Requester */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">1. ข้อมูลผู้แจ้งซ่อมและหน่วยงาน</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  ชื่อ-นามสกุล ผู้แจ้งซ่อม <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="ระบุชื่อ-นามสกุล"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  เบอร์โทรศัพท์ / เบอร์ภายใน
                </label>
                <input
                  type="tel"
                  value={requesterPhone}
                  onChange={(e) => setRequesterPhone(e.target.value)}
                  placeholder="เช่น 054-466666 ต่อ 3800 หรือ 08x-xxx-xxxx"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  สาขาวิชา / หน่วยงาน <span className="text-red-600">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  ปีงบประมาณ (พ.ศ.) <span className="text-red-600">*</span>
                </label>
                <select
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 font-mono"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      ปีงบประมาณ {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Equipment & Problem */}
          <div className="pt-5 border-t border-slate-200 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">2. รายละเอียดงานซ่อมและสถานที่</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  หมวดหมู่งานซ่อม <span className="text-red-600">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                >
                  {REPAIR_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  รหัสครุภัณฑ์ / เลขที่ทรัพย์สิน (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={assetCode}
                  onChange={(e) => setAssetCode(e.target.value)}
                  placeholder="เช่น มพ.65-4120-0012"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                รายการที่ชำรุด / หัวข้อแจ้งซ่อม <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น เครื่องปั่นเหวี่ยง (Centrifuge) ไม่ทำงาน หรือ เครื่องปรับอากาศน้ำรั่ว"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                สถานที่ / อาคาร / หมายเลขห้อง <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="เช่น อาคารคณะสหเวชศาสตร์ (AHS) ชั้น 2 ห้องปฏิบัติการ 204"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                รายละเอียดอาการชำรุด <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="อธิบายอาการที่พบ เวลาที่เริ่มเกิดปัญหา หรือความต้องการซ่อมเพิ่มเติม..."
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  ระดับความเร่งด่วน
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {URGENCY_LEVELS.map((level) => {
                    const active = urgency === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setUrgency(level)}
                        className={`px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors min-h-[42px] ${
                          active
                            ? level === 'เร่งด่วนมาก'
                              ? 'bg-red-700 text-white border-red-700'
                              : level === 'ด่วน'
                                ? 'bg-amber-700 text-white border-amber-700'
                                : 'bg-teal-700 text-white border-teal-700'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  งบประมาณประเมินเบื้องต้น (บาท, ถ้าทราบ)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  กำหนดวันเข้าซ่อมจริง (ถ้ามี)
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  หมายเหตุเพิ่มเติม (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น ช่วงเวลาที่สะดวกให้ช่างเข้าตรวจสอบ"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 min-h-[44px]"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>{editingRepair ? 'บันทึกการแก้ไข' : 'ส่งใบแจ้งซ่อม'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
