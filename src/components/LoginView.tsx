import React, { useState } from 'react';
import { Building2, FileSpreadsheet, ShieldCheck, ClipboardCheck, Loader2 } from 'lucide-react';
import campusLabImage from '../assets/images/ahs_up_campus_lab_1794796315444.jpg';

interface LoginViewProps {
  onLogin: () => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  noticeMessage?: string | null;
  existingEmail?: string | null;
}

export function LoginView({
  onLogin,
  isLoading,
  errorMessage,
  noticeMessage,
  existingEmail,
}: LoginViewProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left: Institutional Login Panel */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-white border-b lg:border-b-0 lg:border-r border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-teal-700">มหาวิทยาลัยพะเยา</p>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              คณะสหเวชศาสตร์
            </h1>
          </div>
        </div>

        <div className="max-w-md w-full mx-auto my-10 lg:my-0 space-y-6">
          <div className="space-y-2.5">
            <p className="text-xs font-medium text-slate-500">
              ระบบสารสนเทศงานอาคารสถานที่และครุภัณฑ์
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug text-balance">
              ระบบแจ้งซ่อมและบริหารงบประมาณซ่อมบำรุง
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              สำหรับคณาจารย์และบุคลากรคณะสหเวชศาสตร์ เข้าสู่ระบบด้วยบัญชี Google
              เพื่อแจ้งซ่อม ติดตามสถานะ จัดทำใบเสนอราคา พิจารณาอนุมัติ และดูสรุปงบประมาณประจำปีบน Google Sheets
            </p>
          </div>

          {existingEmail && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
              บัญชี <span className="font-semibold">{existingEmail}</span>{' '}
              จำเป็นต้องยืนยันสิทธิ์เชื่อมต่อ Google Sheets สำหรับเซสชันนี้ กรุณากดเข้าสู่ระบบอีกครั้ง
            </div>
          )}

          {noticeMessage && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
              {noticeMessage}
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 leading-relaxed">
              {errorMessage}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={onLogin}
              disabled={isLoading}
              className="gsi-material-button"
            >
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-teal-700" />
                  ) : (
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block' }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                  )}
                </div>
                <span className="font-medium text-slate-900">
                  {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google (บุคลากร ม.พะเยา)'}
                </span>
              </div>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <FileSpreadsheet className="w-4 h-4 text-teal-700" />
                <span>จัดเก็บบน Google Sheets</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                ข้อมูลแจ้งซ่อมและงบประมาณถูกจัดเก็บแบบเรียลไทม์
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <ClipboardCheck className="w-4 h-4 text-teal-700" />
                <span>อนุมัติและใบเสนอราคา</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                รองรับการออกใบเสนอราคาและตรวจสอบยอดงบคงเหลือ
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>ปลอดภัยตามสิทธิ์</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                ยืนยันตัวตนผ่านบัญชี Google และขออนุมัติก่อนแก้ไขข้อมูล
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          คณะสหเวชศาสตร์ มหาวิทยาลัยพะเยา · ระบบแจ้งซ่อมออนไลน์
        </p>
      </div>

      {/* Right: Campus Visual Panel */}
      <div className="lg:w-[48%] relative bg-slate-900 flex flex-col justify-end min-h-[260px] lg:min-h-screen overflow-hidden">
        {!imgFailed ? (
          <img
            src={campusLabImage}
            alt="ห้องปฏิบัติการคณะสหเวชศาสตร์ มหาวิทยาลัยพะเยา"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-teal-900 via-slate-900 to-slate-950 flex items-center justify-center">
            <Building2 className="w-16 h-16 text-teal-400/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent" />
        <div className="relative z-10 p-6 sm:p-10 text-white space-y-2 max-w-lg">
          <p className="text-xs font-medium text-teal-200">
            School of Allied Health Sciences · University of Phayao
          </p>
          <p className="text-lg sm:text-xl font-semibold leading-snug">
            บริหารจัดการงานซ่อมบำรุงครุภัณฑ์ ห้องปฏิบัติการ และอาคารสถานที่อย่างเป็นระบบ
          </p>
        </div>
      </div>
    </div>
  );
}
