import React, { useState } from 'react';
import { FileSpreadsheet, Plus, Link2, Loader2, LogOut, AlertCircle } from 'lucide-react';
import { User } from 'firebase/auth';

interface SheetSetupViewProps {
  user: User;
  onCreateNewSheet: (customTitle: string) => Promise<void>;
  onConnectExistingSheet: (idOrUrl: string) => Promise<void>;
  onLogout: () => Promise<void>;
  error: string | null;
}

export function SheetSetupView({
  user,
  onCreateNewSheet,
  onConnectExistingSheet,
  onLogout,
  error,
}: SheetSetupViewProps) {
  const [customTitle, setCustomTitle] = useState(
    'ระบบแจ้งซ่อม_คณะสหเวชศาสตร์_มหาวิทยาลัยพะเยา'
  );
  const [existingUrl, setExistingUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await onCreateNewSheet(customTitle);
    } finally {
      setCreating(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingUrl.trim()) return;
    setConnecting(true);
    try {
      await onConnectExistingSheet(existingUrl);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              เชื่อมต่อฐานข้อมูล Google Sheets
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user.displayName} · {user.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 whitespace-nowrap shrink-0 min-h-[40px]"
        >
          <LogOut className="w-4 h-4" />
          <span>ออกจากระบบ</span>
        </button>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            เลือกฐานข้อมูล Google Sheets สำหรับจัดเก็บข้อมูลแจ้งซ่อม
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            ระบบจะจัดเก็บข้อมูลทั้งหมด (รายการแจ้งซ่อม, ใบเสนอราคา, ประวัติการอนุมัติ และงบประมาณประจำปี)
            ไว้ในไฟล์ Google Sheets ของท่านหรือของคณะโดยตรง
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Option 1: Create New Sheet */}
          <form
            onSubmit={handleCreate}
            className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5"
          >
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-slate-900">
                  สร้าง Google Sheet ฐานข้อมูลใหม่
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ระบบจะสร้างไฟล์ Google Sheets ใหม่ในบัญชีของท่าน พร้อมแผ่นงาน 4 แผ่น (Repairs, Quotations, Approvals, Budgets) ให้อัตโนมัติ
                </p>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="sheet-title"
                  className="block text-xs font-medium text-slate-700"
                >
                  ชื่อไฟล์ Google Sheets
                </label>
                <input
                  id="sheet-title"
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creating || connecting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-60 min-h-[44px]"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{creating ? 'กำลังสร้างฐานข้อมูล...' : 'สร้างฐานข้อมูลใหม่อัตโนมัติ'}</span>
            </button>
          </form>

          {/* Option 2: Connect Existing Sheet */}
          <form
            onSubmit={handleConnect}
            className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5"
          >
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
                <Link2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-slate-900">
                  เชื่อมต่อ Google Sheet ของคณะที่มีอยู่แล้ว
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  วางลิงก์ (URL) หรือรหัส Spreadsheet ID ที่แชร์ร่วมกันในคณะสหเวชศาสตร์
                  หากยังไม่มีแท็บระบบ ระบบจะสร้างแท็บที่จำเป็นให้อัตโนมัติ
                </p>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="existing-sheet-url"
                  className="block text-xs font-medium text-slate-700"
                >
                  ลิงก์ Google Sheets หรือ Spreadsheet ID
                </label>
                <input
                  id="existing-sheet-url"
                  type="text"
                  value={existingUrl}
                  onChange={(e) => setExistingUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creating || connecting || !existingUrl.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-800 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-60 min-h-[44px]"
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              <span>{connecting ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อ Google Sheet นี้'}</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
