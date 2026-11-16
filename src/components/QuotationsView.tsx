import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Printer,
  FileSpreadsheet,
  X,
  Save,
  Eye,
  Building2,
} from 'lucide-react';
import {
  Quotation,
  QuotationItem,
  RepairRequest,
  formatThaiCurrency,
  formatThaiDate,
} from '../types/repair';

interface QuotationsViewProps {
  quotations: Quotation[];
  repairs: RepairRequest[];
  preselectedRepair: RepairRequest | null;
  onClearPreselectedRepair: () => void;
  onSaveQuotation: (
    data: Omit<Quotation, 'id' | 'createdAt' | 'createdBy'>,
    existing?: Quotation | null
  ) => void;
}

export function QuotationsView({
  quotations,
  repairs,
  preselectedRepair,
  onClearPreselectedRepair,
  onSaveQuotation,
}: QuotationsViewProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);

  const [repairId, setRepairId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorTaxId, setVendorTaxId] = useState('');
  const [vendorContact, setVendorContact] = useState('');
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [validDays, setValidDays] = useState(30);
  const [includeVat, setIncludeVat] = useState(true);
  const [status, setStatus] = useState<Quotation['status']>('เสนอพิจารณา');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<QuotationItem[]>([
    { description: '', quantity: 1, unit: 'งาน', unitPrice: 0 },
  ]);

  const repairMap = useMemo(() => {
    const map: Record<string, RepairRequest> = {};
    repairs.forEach((r) => {
      map[r.id] = r;
    });
    return map;
  }, [repairs]);

  const openNewEditor = (targetRepair?: RepairRequest | null) => {
    setEditingQuotation(null);
    const chosen = targetRepair || repairs[0];
    setRepairId(chosen?.id || '');
    setVendorName('');
    setVendorTaxId('');
    setVendorContact('');
    setQuoteDate(new Date().toISOString().slice(0, 10));
    setValidDays(30);
    setIncludeVat(true);
    setStatus('เสนอพิจารณา');
    setNotes('');
    setItems([
      {
        description: chosen ? `ค่าซ่อมบำรุง: ${chosen.title}` : '',
        quantity: 1,
        unit: 'งาน',
        unitPrice: chosen?.estimatedCost || 0,
      },
    ]);
    setShowEditor(true);
  };

  useEffect(() => {
    if (preselectedRepair) {
      openNewEditor(preselectedRepair);
      onClearPreselectedRepair();
    }
  }, [preselectedRepair]);

  const openEditEditor = (q: Quotation) => {
    setEditingQuotation(q);
    setRepairId(q.repairId);
    setVendorName(q.vendorName);
    setVendorTaxId(q.vendorTaxId);
    setVendorContact(q.vendorContact);
    setQuoteDate(q.quoteDate || new Date().toISOString().slice(0, 10));
    setValidDays(q.validDays || 30);
    setIncludeVat(q.includeVat);
    setStatus(q.status);
    setNotes(q.notes);
    setItems(
      q.items.length > 0
        ? q.items
        : [{ description: '', quantity: 1, unit: 'งาน', unitPrice: 0 }]
    );
    setShowEditor(true);
  };

  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
      0
    );
  }, [items]);

  const vatAmount = useMemo(() => {
    return includeVat ? Math.round(subtotal * 0.07 * 100) / 100 : 0;
  }, [subtotal, includeVat]);

  const totalAmount = useMemo(() => {
    return Math.round((subtotal + vatAmount) * 100) / 100;
  }, [subtotal, vatAmount]);

  const updateItem = (idx: number, patch: Partial<QuotationItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { description: '', quantity: 1, unit: 'ชิ้น', unitPrice: 0 }]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const linkedRepair = repairMap[repairId];
    onSaveQuotation(
      {
        repairId,
        fiscalYear: linkedRepair?.fiscalYear || editingQuotation?.fiscalYear || '2569',
        vendorName: vendorName.trim(),
        vendorTaxId: vendorTaxId.trim(),
        vendorContact: vendorContact.trim(),
        quoteDate,
        validDays: Number(validDays) || 30,
        items: items.filter((it) => it.description.trim() !== ''),
        subtotal,
        includeVat,
        vatAmount,
        totalAmount,
        status,
        notes: notes.trim(),
      },
      editingQuotation
    );
    setShowEditor(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">จัดการใบเสนอราคาซ่อมบำรุง</h2>
          <p className="text-xs text-slate-500">
            บันทึกใบเสนอราคาจากผู้รับจ้าง/ร้านค้า เพื่อส่งเข้าสู่ขั้นตอนพิจารณาอนุมัติงบประมาณ
          </p>
        </div>
        <button
          type="button"
          onClick={() => openNewEditor(null)}
          disabled={repairs.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างใบเสนอราคาใหม่</span>
        </button>
      </div>

      {/* Quotation Builder Form */}
      {showEditor && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50">
            <h3 className="text-base font-bold text-slate-900">
              {editingQuotation
                ? `แก้ไขใบเสนอราคา (${editingQuotation.id})`
                : 'จัดทำใบเสนอราคาใหม่'}
            </h3>
            <button
              type="button"
              onClick={() => setShowEditor(false)}
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
              aria-label="ปิดฟอร์ม"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-medium text-slate-700">
                  อ้างอิงใบแจ้งซ่อม <span className="text-red-600">*</span>
                </label>
                <select
                  value={repairId}
                  onChange={(e) => setRepairId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                >
                  <option value="">-- เลือกรายการแจ้งซ่อม --</option>
                  {repairs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id} · {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  ชื่อร้านค้า / บริษัทผู้เสนอราคา <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="เช่น หจก. พะเยา เมดิคอล เซอร์วิส"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  เลขประจำตัวผู้เสียภาษี
                </label>
                <input
                  type="text"
                  value={vendorTaxId}
                  onChange={(e) => setVendorTaxId(e.target.value)}
                  placeholder="13 หลัก (ถ้ามี)"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  ผู้ติดต่อ / เบอร์โทรร้านค้า
                </label>
                <input
                  type="text"
                  value={vendorContact}
                  onChange={(e) => setVendorContact(e.target.value)}
                  placeholder="เบอร์โทรหรืออีเมลผู้เสนอราคา"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  วันที่ใบเสนอราคา
                </label>
                <input
                  type="date"
                  value={quoteDate}
                  onChange={(e) => setQuoteDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  สถานะใบเสนอราคา
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Quotation['status'])}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                >
                  <option value="ร่าง">ร่าง (ยังไม่ส่งอนุมัติ)</option>
                  <option value="เสนอพิจารณา">เสนอพิจารณา (ส่งขออนุมัติงบ)</option>
                </select>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">รายการค่าซ่อมและอะไหล่</h4>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 min-h-[36px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มรายการ</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {items.map((item, idx) => {
                  const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2.5 items-center p-3 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <div className="col-span-12 sm:col-span-5">
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => updateItem(idx, { description: e.target.value })}
                          placeholder="รายการอะไหล่ / ค่าบริการซ่อม"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-teal-700"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(idx, { quantity: Number(e.target.value) || 0 })
                          }
                          placeholder="จำนวน"
                          className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:border-teal-700"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-1">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateItem(idx, { unit: e.target.value })}
                          placeholder="หน่วย"
                          className="w-full px-2.5 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-teal-700"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(idx, { unitPrice: Number(e.target.value) || 0 })
                          }
                          placeholder="ราคา/หน่วย"
                          className="w-full px-3 py-2 text-sm font-mono tabular-nums text-right bg-white border border-slate-300 rounded-md focus:outline-none focus:border-teal-700"
                        />
                      </div>
                      <div className="col-span-10 sm:col-span-1 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        ฿{formatThaiCurrency(lineTotal)}
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          disabled={items.length <= 1}
                          className="p-2 text-slate-400 hover:text-red-700 disabled:opacity-30"
                          aria-label="ลบรายการนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals Box */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-3">
                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeVat}
                      onChange={(e) => setIncludeVat(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                    />
                    <span>คำนวณภาษีมูลค่าเพิ่ม 7% (VAT)</span>
                  </label>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span>ยืนยันราคาภายใน</span>
                    <input
                      type="number"
                      min="1"
                      value={validDays}
                      onChange={(e) => setValidDays(Number(e.target.value) || 30)}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-center font-mono"
                    />
                    <span>วัน</span>
                  </div>
                </div>

                <div className="w-full sm:w-72 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>รวมเป็นเงิน</span>
                    <span className="font-mono tabular-nums">฿{formatThaiCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>ภาษีมูลค่าเพิ่ม 7%</span>
                    <span className="font-mono tabular-nums">฿{formatThaiCurrency(vatAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-base">
                    <span>ยอดรวมสุทธิ</span>
                    <span className="font-mono tabular-nums text-teal-800">
                      ฿{formatThaiCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                เงื่อนไขการรับประกัน / หมายเหตุ
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เช่น รับประกันงานซ่อม 90 วัน กำหนดส่งมอบภายใน 7 วันทำการ"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowEditor(false)}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 min-h-[44px]"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกใบเสนอราคา</span>
            </button>
          </div>
        </form>
      )}

      {/* Quotations List */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {quotations.length === 0 ? (
          <div className="px-6 py-14 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900">
                ยังไม่มีใบเสนอราคาในระบบ
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                เมื่อมีรายการแจ้งซ่อมที่ต้องจัดจ้างซ่อม สามารถสร้างใบเสนอราคาเพื่อส่งเข้าสู่กระบวนการอนุมัติงบประมาณได้ที่นี่
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">เลขที่ใบเสนอราคา</th>
                    <th className="py-3 px-4">อ้างอิงแจ้งซ่อม</th>
                    <th className="py-3 px-4">ผู้เสนอราคา / ร้านค้า</th>
                    <th className="py-3 px-4">วันที่</th>
                    <th className="py-3 px-4">สถานะ</th>
                    <th className="py-3 px-4 text-right">ยอดสุทธิ (บาท)</th>
                    <th className="py-3 px-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {quotations.map((q) => {
                    const linked = repairMap[q.repairId];
                    return (
                      <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-teal-800 whitespace-nowrap tabular-nums">
                          {q.id}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-mono text-xs text-slate-600">{q.repairId}</p>
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {linked?.title || 'รายการแจ้งซ่อม'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-sm font-medium text-slate-900">{q.vendorName}</p>
                          {q.vendorContact && (
                            <p className="text-xs text-slate-500">{q.vendorContact}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {formatThaiDate(q.quoteDate)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-1 text-xs font-medium bg-slate-100 border border-slate-200 text-slate-800 rounded-md whitespace-nowrap">
                            {q.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-sm font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {formatThaiCurrency(q.totalAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewQuotation(q)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>ดู / พิมพ์</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditEditor(q)}
                              className="px-2.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100"
                            >
                              แก้ไข
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-200">
              {quotations.map((q) => {
                const linked = repairMap[q.repairId];
                return (
                  <div key={q.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-teal-800 tabular-nums">
                        {q.id} · {q.repairId}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 border border-slate-200 rounded text-slate-700">
                        {q.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{q.vendorName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {linked?.title || '-'} · {formatThaiDate(q.quoteDate)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                        ฿{formatThaiCurrency(q.totalAmount)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewQuotation(q)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg min-h-[36px]"
                        >
                          ดูเอกสาร
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditEditor(q)}
                          className="px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg min-h-[36px]"
                        >
                          แก้ไข
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Formal Printable Quotation Modal */}
      {previewQuotation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden my-auto">
            <div className="no-print px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-slate-900">
                ตัวอย่างเอกสารใบเสนอราคา ({previewQuotation.id})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 min-h-[38px]"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ / บันทึก PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewQuotation(null)}
                  className="p-2 text-slate-500 hover:text-slate-900 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-10 space-y-6 text-slate-900">
              <div className="flex flex-col sm:flex-row justify-between gap-4 pb-6 border-b border-slate-300">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">ใบเสนอราคาซ่อมบำรุง</h2>
                    <p className="text-xs text-slate-600">
                      คณะสหเวชศาสตร์ มหาวิทยาลัยพะเยา · งานซ่อมบำรุงและพัสดุ
                    </p>
                  </div>
                </div>
                <div className="sm:text-right text-xs space-y-1 font-mono tabular-nums">
                  <p className="font-bold text-sm">เลขที่: {previewQuotation.id}</p>
                  <p>อ้างอิงใบแจ้งซ่อม: {previewQuotation.repairId}</p>
                  <p>วันที่: {formatThaiDate(previewQuotation.quoteDate)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <p className="font-semibold text-slate-700">ผู้เสนอราคา / ผู้รับจ้าง</p>
                  <p className="text-sm font-bold text-slate-900">{previewQuotation.vendorName}</p>
                  {previewQuotation.vendorTaxId && (
                    <p className="font-mono">เลขผู้เสียภาษี: {previewQuotation.vendorTaxId}</p>
                  )}
                  {previewQuotation.vendorContact && <p>ติดต่อ: {previewQuotation.vendorContact}</p>}
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <p className="font-semibold text-slate-700">ข้อมูลงานแจ้งซ่อม</p>
                  <p className="text-sm font-bold text-slate-900">
                    {repairMap[previewQuotation.repairId]?.title || '-'}
                  </p>
                  <p>
                    หน่วยงาน: {repairMap[previewQuotation.repairId]?.department || '-'}
                  </p>
                  <p>สถานที่: {repairMap[previewQuotation.repairId]?.location || '-'}</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2.5 px-3 w-12 text-center">ลำดับ</th>
                      <th className="py-2.5 px-3">รายการซ่อม / อะไหล่</th>
                      <th className="py-2.5 px-3 text-right">จำนวน</th>
                      <th className="py-2.5 px-3 text-right">ราคา/หน่วย</th>
                      <th className="py-2.5 px-3 text-right">จำนวนเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewQuotation.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums">{idx + 1}</td>
                        <td className="py-2.5 px-3">{it.description}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {formatThaiCurrency(it.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-medium">
                          {formatThaiCurrency(it.quantity * it.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-4 pt-2">
                <div className="text-xs text-slate-600 space-y-1">
                  <p>กำหนดยืนราคา: {previewQuotation.validDays} วัน</p>
                  {previewQuotation.notes && <p>หมายเหตุ: {previewQuotation.notes}</p>}
                </div>
                <div className="w-full sm:w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">รวมเป็นเงิน</span>
                    <span className="font-mono tabular-nums">
                      ฿{formatThaiCurrency(previewQuotation.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">ภาษีมูลค่าเพิ่ม 7%</span>
                    <span className="font-mono tabular-nums">
                      ฿{formatThaiCurrency(previewQuotation.vatAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-1.5 border-t border-slate-300">
                    <span>ยอดรวมสุทธิ</span>
                    <span className="font-mono tabular-nums text-teal-800">
                      ฿{formatThaiCurrency(previewQuotation.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
