export type RepairStatus =
  | 'รอดำเนินการ'
  | 'รอใบเสนอราคา'
  | 'รออนุมัติงบ'
  | 'อนุมัติแล้ว'
  | 'กำลังดำเนินการซ่อม'
  | 'ซ่อมเสร็จสิ้น'
  | 'ไม่อนุมัติ'
  | 'ส่งกลับแก้ไข';

export type UrgencyLevel = 'ปกติ' | 'ด่วน' | 'เร่งด่วนมาก';

export type Department =
  | 'สาขาวิชากายภาพบำบัด'
  | 'สาขาวิชาเทคนิคการแพทย์'
  | 'สาขาวิชารังสีเทคนิค'
  | 'สาขาวิชาโภชนาการและการกำหนดอาหาร'
  | 'สำนักงานคณะสหเวชศาสตร์'
  | 'ห้องปฏิบัติการกลางและเครื่องมือวิทยาศาสตร์'
  | 'ศูนย์บริการสุขภาพและคลินิก';

export type RepairCategory =
  | 'ครุภัณฑ์ห้องปฏิบัติการและวิทยาศาสตร์'
  | 'ครุภัณฑ์ทางการแพทย์และกายภาพบำบัด'
  | 'ระบบปรับอากาศและไฟฟ้า'
  | 'คอมพิวเตอร์และโสตทัศนูปกรณ์'
  | 'อาคารสถานที่และสุขภัณฑ์'
  | 'งานซ่อมบำรุงทั่วไป';

export interface RepairRequest {
  rowIndex?: number; // 1-based row number in Google Sheet
  id: string; // e.g. AHS-2569-001
  fiscalYear: string; // พ.ศ. เช่น "2569"
  createdAt: string; // ISO string
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  department: Department | string;
  category: RepairCategory | string;
  assetCode: string; // รหัสครุภัณฑ์
  location: string; // อาคาร / ห้อง
  title: string; // รายการที่ชำรุด
  description: string; // อาการชำรุดโดยละเอียด
  urgency: UrgencyLevel;
  status: RepairStatus;
  estimatedCost: number;
  approvedCost: number;
  quotationId: string;
  updatedAt: string;
  notes: string;
  scheduledDate?: string; // YYYY-MM-DD กำหนดการซ่อมแซมจริง
}

export interface QuotationItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface Quotation {
  rowIndex?: number;
  id: string; // e.g. QT-2569-001
  repairId: string; // AHS-2569-001
  fiscalYear: string;
  vendorName: string;
  vendorTaxId: string;
  vendorContact: string;
  quoteDate: string; // YYYY-MM-DD
  validDays: number;
  items: QuotationItem[];
  subtotal: number;
  includeVat: boolean;
  vatAmount: number;
  totalAmount: number;
  status: 'ร่าง' | 'เสนอพิจารณา' | 'อนุมัติแล้ว' | 'ส่งกลับแก้ไข' | 'ไม่อนุมัติ';
  createdBy: string;
  createdAt: string;
  notes: string;
}

export interface ApprovalRecord {
  rowIndex?: number;
  id: string; // APR-2569-001
  repairId: string;
  quotationId: string;
  fiscalYear: string;
  decision: 'อนุมัติ' | 'ไม่อนุมัติ' | 'ส่งกลับแก้ไข';
  approvedAmount: number;
  approverName: string;
  approverEmail: string;
  approverRole: string;
  decisionDate: string; // ISO string
  remark: string;
}

export interface AnnualBudget {
  rowIndex?: number;
  fiscalYear: string; // พ.ศ. เช่น "2567", "2568", "2569"
  allocatedAmount: number; // งบประมาณที่ได้รับจัดสรร
  note: string;
  updatedBy: string;
  updatedAt: string;
}

export interface RepairFeedback {
  rowIndex?: number;
  id: string; // FB-2569-001
  repairId: string; // AHS-2569-001
  fiscalYear: string;
  rating: number; // 1-5 คะแนนความพึงพอใจโดยรวม
  speedRating: number; // 1-5 ความรวดเร็วในการดำเนินการ
  qualityRating: number; // 1-5 คุณภาพงานซ่อม
  serviceRating: number; // 1-5 การให้บริการและประสานงาน
  comment: string;
  evaluatorName: string;
  evaluatorEmail: string;
  createdAt: string; // ISO string
}

export type AuditLogAction =
  | 'เข้าสู่ระบบ'
  | 'สร้างใบแจ้งซ่อม'
  | 'แก้ไขข้อมูลซ่อม'
  | 'เปลี่ยนสถานะงานซ่อม'
  | 'กำหนดวันซ่อม'
  | 'ลบใบแจ้งซ่อม'
  | 'บันทึกใบเสนอราคา'
  | 'พิจารณาอนุมัติ'
  | 'ประเมินความพึงพอใจ'
  | 'แจ้งเตือน LINE'
  | 'บันทึกงบประมาณ';

export interface AuditLog {
  rowIndex?: number;
  id: string; // LOG-2569-0001
  timestamp: string; // ISO string
  userName: string;
  userEmail: string;
  action: AuditLogAction | string;
  targetId: string; // เช่น AHS-2569-001 หรือ 2569
  details: string;
}

export interface SpreadsheetMeta {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheetIds: Record<string, number>;
}

export type AppPage =
  | 'repairs'
  | 'calendar'
  | 'form'
  | 'quotations'
  | 'approvals'
  | 'budgets'
  | 'logs';

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  details?: string[];
  confirmLabel: string;
  variant?: 'primary' | 'danger' | 'warning';
  onConfirm: () => Promise<void> | void;
}

export const DEPARTMENTS: Department[] = [
  'สาขาวิชากายภาพบำบัด',
  'สาขาวิชาเทคนิคการแพทย์',
  'สาขาวิชารังสีเทคนิค',
  'สาขาวิชาโภชนาการและการกำหนดอาหาร',
  'ห้องปฏิบัติการกลางและเครื่องมือวิทยาศาสตร์',
  'ศูนย์บริการสุขภาพและคลินิก',
  'สำนักงานคณะสหเวชศาสตร์',
];

export const REPAIR_CATEGORIES: RepairCategory[] = [
  'ครุภัณฑ์ห้องปฏิบัติการและวิทยาศาสตร์',
  'ครุภัณฑ์ทางการแพทย์และกายภาพบำบัด',
  'ระบบปรับอากาศและไฟฟ้า',
  'คอมพิวเตอร์และโสตทัศนูปกรณ์',
  'อาคารสถานที่และสุขภัณฑ์',
  'งานซ่อมบำรุงทั่วไป',
];

export const URGENCY_LEVELS: UrgencyLevel[] = ['ปกติ', 'ด่วน', 'เร่งด่วนมาก'];

export const REPAIR_STATUSES: RepairStatus[] = [
  'รอดำเนินการ',
  'รอใบเสนอราคา',
  'รออนุมัติงบ',
  'อนุมัติแล้ว',
  'กำลังดำเนินการซ่อม',
  'ซ่อมเสร็จสิ้น',
  'ส่งกลับแก้ไข',
  'ไม่อนุมัติ',
];

/** คำนวณปีงบประมาณไทย (ต.ค. - ก.ย.) เป็น พ.ศ. */
export function getCurrentThaiFiscalYear(date = new Date()): string {
  const month = date.getMonth() + 1; // 1-12
  const christianYear = date.getFullYear();
  const fiscalAD = month >= 10 ? christianYear + 1 : christianYear;
  return String(fiscalAD + 543);
}

export function formatThaiCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatThaiDateTime(isoOrDate: string): string {
  if (!isoOrDate) return '-';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatThaiDate(isoOrDate: string): string {
  if (!isoOrDate) return '-';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}
