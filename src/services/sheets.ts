import {
  AnnualBudget,
  ApprovalRecord,
  AuditLog,
  Quotation,
  QuotationItem,
  RepairFeedback,
  RepairRequest,
  SpreadsheetMeta,
  getCurrentThaiFiscalYear,
} from '../types/repair';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

export const TAB_REPAIRS = 'Repairs';
export const TAB_QUOTATIONS = 'Quotations';
export const TAB_APPROVALS = 'Approvals';
export const TAB_BUDGETS = 'Budgets';
export const TAB_FEEDBACKS = 'Feedbacks';
export const TAB_LOGS = 'Logs';

export const REPAIRS_HEADERS = [
  'ID',
  'ปีงบประมาณ',
  'วันที่แจ้ง',
  'ชื่อผู้แจ้ง',
  'อีเมลผู้แจ้ง',
  'เบอร์ติดต่อ',
  'สาขาวิชา/หน่วยงาน',
  'หมวดหมู่งานซ่อม',
  'รหัสครุภัณฑ์',
  'อาคาร/ห้อง',
  'รายการที่ชำรุด',
  'รายละเอียดอาการ',
  'ความเร่งด่วน',
  'สถานะ',
  'วงเงินประเมิน',
  'งบอนุมัติจริง',
  'เลขที่ใบเสนอราคา',
  'อัปเดตล่าสุด',
  'หมายเหตุ',
  'กำหนดวันซ่อม',
];

export const QUOTATIONS_HEADERS = [
  'เลขที่ใบเสนอราคา',
  'รหัสแจ้งซ่อม',
  'ปีงบประมาณ',
  'ชื่อร้านค้า/ผู้รับจ้าง',
  'เลขผู้เสียภาษี',
  'ผู้ติดต่อ/โทร',
  'วันที่เสนอราคา',
  'ยืนราคา(วัน)',
  'รายการ(JSON)',
  'ยอดก่อนVAT',
  'รวมVAT',
  'ภาษี7%',
  'ยอดสุทธิ',
  'สถานะ',
  'ผู้บันทึก',
  'วันที่บันทึก',
  'หมายเหตุ',
];

export const APPROVALS_HEADERS = [
  'รหัสอนุมัติ',
  'รหัสแจ้งซ่อม',
  'เลขที่ใบเสนอราคา',
  'ปีงบประมาณ',
  'ผลการพิจารณา',
  'งบประมาณที่อนุมัติ',
  'ชื่อผู้อนุมัติ',
  'อีเมลผู้อนุมัติ',
  'ตำแหน่งผู้อนุมัติ',
  'วันที่พิจารณา',
  'ความเห็นเพิ่มเติม',
];

export const BUDGETS_HEADERS = [
  'ปีงบประมาณ',
  'งบประมาณที่ได้รับจัดสรร',
  'หมายเหตุงบประมาณ',
  'ผู้บันทึก',
  'อัปเดตล่าสุด',
];

export const FEEDBACKS_HEADERS = [
  'รหัสประเมิน',
  'รหัสแจ้งซ่อม',
  'ปีงบประมาณ',
  'คะแนนรวม(1-5)',
  'ความรวดเร็ว(1-5)',
  'คุณภาพงานซ่อม(1-5)',
  'การให้บริการ(1-5)',
  'ข้อเสนอแนะ',
  'ผู้ประเมิน',
  'อีเมลผู้ประเมิน',
  'วันที่ประเมิน',
];

export const LOGS_HEADERS = [
  'รหัสLog',
  'วันเวลาที่ทำรายการ',
  'ชื่อผู้ใช้งาน',
  'อีเมลผู้ใช้งาน',
  'การดำเนินการ',
  'รหัสรายการอ้างอิง',
  'รายละเอียดเพิ่มเติม',
];

export class SheetsAuthError extends Error {
  constructor(message = 'สิทธิ์การเชื่อมต่อ Google Sheets หมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง') {
    super(message);
    this.name = 'SheetsAuthError';
  }
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

async function sheetsFetch(url: string, token: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    throw new SheetsAuthError();
  }

  if (!res.ok) {
    let errText = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) {
        errText = errJson.error.message;
      }
    } catch {
      // ignore json parse failure
    }
    throw new Error(`การเชื่อมต่อ Google Sheets ขัดข้อง: ${errText}`);
  }

  return res.json();
}

export async function createFacultySpreadsheet(
  token: string,
  customTitle?: string
): Promise<SpreadsheetMeta> {
  const title =
    customTitle?.trim() ||
    `ระบบแจ้งซ่อม_คณะสหเวชศาสตร์_มหาวิทยาลัยพะเยา_${getCurrentThaiFiscalYear()}`;

  const body = {
    properties: {
      title,
      locale: 'th_TH',
    },
    sheets: [
      { properties: { title: TAB_REPAIRS, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: TAB_QUOTATIONS, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: TAB_APPROVALS, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: TAB_BUDGETS, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: TAB_FEEDBACKS, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: TAB_LOGS, gridProperties: { frozenRowCount: 1 } } },
    ],
  };

  const created = await sheetsFetch(SHEETS_API, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const spreadsheetId: string = created.spreadsheetId;
  const sheetIds: Record<string, number> = {};
  for (const s of created.sheets || []) {
    if (s.properties?.title !== undefined && s.properties?.sheetId !== undefined) {
      sheetIds[s.properties.title] = s.properties.sheetId;
    }
  }

  // Write headers to all 6 tabs in one batchUpdate call
  await sheetsFetch(`${SHEETS_API}/${spreadsheetId}/values:batchUpdate`, token, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `'${TAB_REPAIRS}'!A1`, values: [REPAIRS_HEADERS] },
        { range: `'${TAB_QUOTATIONS}'!A1`, values: [QUOTATIONS_HEADERS] },
        { range: `'${TAB_APPROVALS}'!A1`, values: [APPROVALS_HEADERS] },
        { range: `'${TAB_BUDGETS}'!A1`, values: [BUDGETS_HEADERS] },
        { range: `'${TAB_FEEDBACKS}'!A1`, values: [FEEDBACKS_HEADERS] },
        { range: `'${TAB_LOGS}'!A1`, values: [LOGS_HEADERS] },
      ],
    }),
  });

  // Format header rows cleanly
  const formatRequests = Object.values(sheetIds).map((sheetId) => ({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.06, green: 0.46, blue: 0.43 },
          textFormat: {
            foregroundColor: { red: 1, green: 1, blue: 1 },
            bold: true,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  }));

  if (formatRequests.length > 0) {
    await sheetsFetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, token, {
      method: 'POST',
      body: JSON.stringify({ requests: formatRequests }),
    });
  }

  return {
    spreadsheetId,
    title: created.properties?.title || title,
    spreadsheetUrl:
      created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheetIds,
  };
}

export async function inspectAndEnsureSpreadsheet(
  token: string,
  rawIdOrUrl: string
): Promise<SpreadsheetMeta> {
  const spreadsheetId = extractSpreadsheetId(rawIdOrUrl);
  if (!spreadsheetId) {
    throw new Error('กรุณาระบุลิงก์หรือรหัส Google Sheets ที่ถูกต้อง');
  }

  // Fetch spreadsheet metadata first (never hardcode tab assumptions)
  const meta = await sheetsFetch(
    `${SHEETS_API}/${spreadsheetId}?fields=properties.title,spreadsheetUrl,sheets.properties`,
    token
  );

  const sheetIds: Record<string, number> = {};
  for (const s of meta.sheets || []) {
    if (s.properties?.title && s.properties?.sheetId !== undefined) {
      sheetIds[s.properties.title] = s.properties.sheetId;
    }
  }

  const requiredTabs: Array<{ name: string; headers: string[] }> = [
    { name: TAB_REPAIRS, headers: REPAIRS_HEADERS },
    { name: TAB_QUOTATIONS, headers: QUOTATIONS_HEADERS },
    { name: TAB_APPROVALS, headers: APPROVALS_HEADERS },
    { name: TAB_BUDGETS, headers: BUDGETS_HEADERS },
    { name: TAB_FEEDBACKS, headers: FEEDBACKS_HEADERS },
    { name: TAB_LOGS, headers: LOGS_HEADERS },
  ];

  const missingTabs = requiredTabs.filter((t) => sheetIds[t.name] === undefined);

  if (missingTabs.length > 0) {
    const addRes = await sheetsFetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, token, {
      method: 'POST',
      body: JSON.stringify({
        requests: missingTabs.map((t) => ({
          addSheet: {
            properties: {
              title: t.name,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        })),
      }),
    });

    for (const reply of addRes.replies || []) {
      if (reply.addSheet?.properties) {
        sheetIds[reply.addSheet.properties.title] = reply.addSheet.properties.sheetId;
      }
    }

    await sheetsFetch(`${SHEETS_API}/${spreadsheetId}/values:batchUpdate`, token, {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: missingTabs.map((t) => ({
          range: `'${t.name}'!A1`,
          values: [t.headers],
        })),
      }),
    });
  }

  return {
    spreadsheetId,
    title: meta.properties?.title || 'ฐานข้อมูลแจ้งซ่อม Google Sheets',
    spreadsheetUrl:
      meta.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheetIds,
  };
}

function toNum(val: unknown): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'string') {
    const cleaned = val.replace(/,/g, '').trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function repairToRow(r: RepairRequest): (string | number)[] {
  return [
    r.id,
    r.fiscalYear,
    r.createdAt,
    r.requesterName,
    r.requesterEmail,
    r.requesterPhone,
    r.department,
    r.category,
    r.assetCode,
    r.location,
    r.title,
    r.description,
    r.urgency,
    r.status,
    r.estimatedCost,
    r.approvedCost,
    r.quotationId,
    r.updatedAt,
    r.notes,
    r.scheduledDate || '',
  ];
}

function quotationToRow(q: Quotation): (string | number)[] {
  return [
    q.id,
    q.repairId,
    q.fiscalYear,
    q.vendorName,
    q.vendorTaxId,
    q.vendorContact,
    q.quoteDate,
    q.validDays,
    JSON.stringify(q.items),
    q.subtotal,
    q.includeVat ? 'TRUE' : 'FALSE',
    q.vatAmount,
    q.totalAmount,
    q.status,
    q.createdBy,
    q.createdAt,
    q.notes,
  ];
}

function approvalToRow(a: ApprovalRecord): (string | number)[] {
  return [
    a.id,
    a.repairId,
    a.quotationId,
    a.fiscalYear,
    a.decision,
    a.approvedAmount,
    a.approverName,
    a.approverEmail,
    a.approverRole,
    a.decisionDate,
    a.remark,
  ];
}

function budgetToRow(b: AnnualBudget): (string | number)[] {
  return [b.fiscalYear, b.allocatedAmount, b.note, b.updatedBy, b.updatedAt];
}

function feedbackToRow(f: RepairFeedback): (string | number)[] {
  return [
    f.id,
    f.repairId,
    f.fiscalYear,
    f.rating,
    f.speedRating,
    f.qualityRating,
    f.serviceRating,
    f.comment,
    f.evaluatorName,
    f.evaluatorEmail,
    f.createdAt,
  ];
}

function logToRow(l: AuditLog): (string | number)[] {
  return [l.id, l.timestamp, l.userName, l.userEmail, l.action, l.targetId, l.details];
}

export interface LoadedSheetData {
  repairs: RepairRequest[];
  quotations: Quotation[];
  approvals: ApprovalRecord[];
  budgets: AnnualBudget[];
  feedbacks: RepairFeedback[];
  logs: AuditLog[];
}

export async function loadAllData(
  token: string,
  spreadsheetId: string
): Promise<LoadedSheetData> {
  const ranges = [
    encodeURIComponent(`'${TAB_REPAIRS}'!A2:T`),
    encodeURIComponent(`'${TAB_QUOTATIONS}'!A2:Q`),
    encodeURIComponent(`'${TAB_APPROVALS}'!A2:K`),
    encodeURIComponent(`'${TAB_BUDGETS}'!A2:E`),
    encodeURIComponent(`'${TAB_FEEDBACKS}'!A2:K`),
    encodeURIComponent(`'${TAB_LOGS}'!A2:G`),
  ];

  const query = ranges.map((r) => `ranges=${r}`).join('&');
  const res = await sheetsFetch(`${SHEETS_API}/${spreadsheetId}/values:batchGet?${query}`, token);
  const valueRanges = res.valueRanges || [];

  const repairRows: string[][] = valueRanges[0]?.values || [];
  const quotationRows: string[][] = valueRanges[1]?.values || [];
  const approvalRows: string[][] = valueRanges[2]?.values || [];
  const budgetRows: string[][] = valueRanges[3]?.values || [];
  const feedbackRows: string[][] = valueRanges[4]?.values || [];
  const logRows: string[][] = valueRanges[5]?.values || [];

  const repairs: RepairRequest[] = repairRows
    .map((row, idx): RepairRequest | null => {
      if (!row[0] && !row[10]) return null;
      return {
        rowIndex: idx + 2,
        id: row[0] || '',
        fiscalYear: row[1] || getCurrentThaiFiscalYear(),
        createdAt: row[2] || '',
        requesterName: row[3] || '',
        requesterEmail: row[4] || '',
        requesterPhone: row[5] || '',
        department: row[6] || '',
        category: row[7] || '',
        assetCode: row[8] || '',
        location: row[9] || '',
        title: row[10] || '',
        description: row[11] || '',
        urgency: (row[12] as RepairRequest['urgency']) || 'ปกติ',
        status: (row[13] as RepairRequest['status']) || 'รอดำเนินการ',
        estimatedCost: toNum(row[14]),
        approvedCost: toNum(row[15]),
        quotationId: row[16] || '',
        updatedAt: row[17] || '',
        notes: row[18] || '',
        scheduledDate: row[19] || '',
      };
    })
    .filter((item): item is RepairRequest => item !== null)
    .reverse();

  const quotations: Quotation[] = quotationRows
    .map((row, idx): Quotation | null => {
      if (!row[0]) return null;
      let items: QuotationItem[] = [];
      try {
        items = row[8] ? JSON.parse(row[8]) : [];
      } catch {
        items = [];
      }
      return {
        rowIndex: idx + 2,
        id: row[0] || '',
        repairId: row[1] || '',
        fiscalYear: row[2] || getCurrentThaiFiscalYear(),
        vendorName: row[3] || '',
        vendorTaxId: row[4] || '',
        vendorContact: row[5] || '',
        quoteDate: row[6] || '',
        validDays: toNum(row[7]) || 30,
        items,
        subtotal: toNum(row[9]),
        includeVat: String(row[10]).toUpperCase() === 'TRUE',
        vatAmount: toNum(row[11]),
        totalAmount: toNum(row[12]),
        status: (row[13] as Quotation['status']) || 'เสนอพิจารณา',
        createdBy: row[14] || '',
        createdAt: row[15] || '',
        notes: row[16] || '',
      };
    })
    .filter((item): item is Quotation => item !== null)
    .reverse();

  const approvals: ApprovalRecord[] = approvalRows
    .map((row, idx): ApprovalRecord | null => {
      if (!row[0]) return null;
      return {
        rowIndex: idx + 2,
        id: row[0] || '',
        repairId: row[1] || '',
        quotationId: row[2] || '',
        fiscalYear: row[3] || getCurrentThaiFiscalYear(),
        decision: (row[4] as ApprovalRecord['decision']) || 'อนุมัติ',
        approvedAmount: toNum(row[5]),
        approverName: row[6] || '',
        approverEmail: row[7] || '',
        approverRole: row[8] || '',
        decisionDate: row[9] || '',
        remark: row[10] || '',
      };
    })
    .filter((item): item is ApprovalRecord => item !== null)
    .reverse();

  const budgets: AnnualBudget[] = budgetRows
    .map((row, idx): AnnualBudget | null => {
      if (!row[0]) return null;
      return {
        rowIndex: idx + 2,
        fiscalYear: String(row[0]).trim(),
        allocatedAmount: toNum(row[1]),
        note: row[2] || '',
        updatedBy: row[3] || '',
        updatedAt: row[4] || '',
      };
    })
    .filter((item): item is AnnualBudget => item !== null)
    .sort((a, b) => Number(b.fiscalYear) - Number(a.fiscalYear));

  const feedbacks: RepairFeedback[] = feedbackRows
    .map((row, idx): RepairFeedback | null => {
      if (!row[0] || !row[1]) return null;
      return {
        rowIndex: idx + 2,
        id: row[0] || '',
        repairId: row[1] || '',
        fiscalYear: row[2] || getCurrentThaiFiscalYear(),
        rating: Math.max(1, Math.min(5, toNum(row[3]) || 5)),
        speedRating: Math.max(1, Math.min(5, toNum(row[4]) || toNum(row[3]) || 5)),
        qualityRating: Math.max(1, Math.min(5, toNum(row[5]) || toNum(row[3]) || 5)),
        serviceRating: Math.max(1, Math.min(5, toNum(row[6]) || toNum(row[3]) || 5)),
        comment: row[7] || '',
        evaluatorName: row[8] || '',
        evaluatorEmail: row[9] || '',
        createdAt: row[10] || '',
      };
    })
    .filter((item): item is RepairFeedback => item !== null)
    .reverse();

  const logs: AuditLog[] = logRows
    .map((row, idx): AuditLog | null => {
      if (!row[0] && !row[1]) return null;
      return {
        rowIndex: idx + 2,
        id: row[0] || '',
        timestamp: row[1] || '',
        userName: row[2] || '',
        userEmail: row[3] || '',
        action: row[4] || '',
        targetId: row[5] || '',
        details: row[6] || '',
      };
    })
    .filter((item): item is AuditLog => item !== null)
    .reverse();

  return { repairs, quotations, approvals, budgets, feedbacks, logs };
}

export async function appendRepair(token: string, spreadsheetId: string, repair: RepairRequest) {
  const range = encodeURIComponent(`'${TAB_REPAIRS}'!A:T`);
  return sheetsFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ values: [repairToRow(repair)] }),
    }
  );
}

export async function updateRepair(
  token: string,
  spreadsheetId: string,
  rowIndex: number,
  repair: RepairRequest
) {
  const range = encodeURIComponent(`'${TAB_REPAIRS}'!A${rowIndex}:T${rowIndex}`);
  return sheetsFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({ values: [repairToRow(repair)] }),
    }
  );
}

export async function deleteSheetRow(
  token: string,
  spreadsheetId: string,
  sheetId: number,
  rowIndex: number
) {
  return sheetsFetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, token, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    }),
  });
}

export async function appendQuotation(
  token: string,
  spreadsheetId: string,
  quotation: Quotation
) {
  const range = encodeURIComponent(`'${TAB_QUOTATIONS}'!A:Q`);
  return sheetsFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ values: [quotationToRow(quotation)] }),
    }
  );
}

export async function updateQuotation(
  token: string,
  spreadsheetId: string,
  rowIndex: number,
  quotation: Quotation
) {
  const range = encodeURIComponent(`'${TAB_QUOTATIONS}'!A${rowIndex}:Q${rowIndex}`);
  return sheetsFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({ values: [quotationToRow(quotation)] }),
    }
  );
}

export async function appendApproval(
  token: string,
  spreadsheetId: string,
  approval: ApprovalRecord
) {
  const range = encodeURIComponent(`'${TAB_APPROVALS}'!A:K`);
  return sheetsFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ values: [approvalToRow(approval)] }),
    }
  );
}

export async function upsertBudget(
  token: string,
  spreadsheetId: string,
  budget: AnnualBudget,
  existingRowIndex?: number
) {
  if (existingRowIndex) {
    const range = encodeURIComponent(`'${TAB_BUDGETS}'!A${existingRowIndex}:E${existingRowIndex}`);
    return sheetsFetch(
      `${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [budgetToRow(budget)] }),
      }
    );
  }
  const range = encodeURIComponent(`'${TAB_BUDGETS}'!A:E`);
  return sheetsFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ values: [budgetToRow(budget)] }),
    }
  );
}

export async function appendFeedback(
  token: string,
  spreadsheetId: string,
  feedback: RepairFeedback
) {
  const range = encodeURIComponent(`'${TAB_FEEDBACKS}'!A:K`);
  return sheetsFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ values: [feedbackToRow(feedback)] }),
    }
  );
}

export async function appendAuditLog(
  token: string,
  spreadsheetId: string,
  log: AuditLog
) {
  const range = encodeURIComponent(`'${TAB_LOGS}'!A:G`);
  return sheetsFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ values: [logToRow(log)] }),
    }
  );
}

export function generateNextId(
  prefix: string,
  fiscalYear: string,
  existingIds: string[],
  padLength = 3
): string {
  const yearPrefix = `${prefix}-${fiscalYear}-`;
  let maxSeq = 0;
  for (const id of existingIds) {
    if (id.startsWith(yearPrefix)) {
      const numPart = Number(id.slice(yearPrefix.length));
      if (Number.isFinite(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  }
  return `${yearPrefix}${String(maxSeq + 1).padStart(padLength, '0')}`;
}
