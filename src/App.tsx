import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Wrench,
  FilePlus2,
  FileSpreadsheet,
  CheckSquare,
  Wallet,
  Menu,
  X,
  RefreshCw,
  LogOut,
  ExternalLink,
  Share2,
  Building2,
  Check,
  AlertCircle,
  Unlink,
  Calendar,
  History,
} from 'lucide-react';
import {
  AnnualBudget,
  AppPage,
  ApprovalRecord,
  AuditLog,
  AuditLogAction,
  ConfirmDialogState,
  Quotation,
  RepairFeedback,
  RepairRequest,
  RepairStatus,
  SpreadsheetMeta,
  getCurrentThaiFiscalYear,
} from './types/repair';
import {
  AuthCancelledError,
  clearCachedToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './services/auth';
import {
  SheetsAuthError,
  TAB_REPAIRS,
  appendApproval,
  appendAuditLog,
  appendFeedback,
  appendQuotation,
  appendRepair,
  createFacultySpreadsheet,
  deleteSheetRow,
  generateNextId,
  inspectAndEnsureSpreadsheet,
  loadAllData,
  updateQuotation,
  updateRepair,
  upsertBudget,
} from './services/sheets';
import { checkLineNotifyStatus, sendLineNotification } from './services/lineNotify';
import { LoginView } from './components/LoginView';
import { SheetSetupView } from './components/SheetSetupView';
import { ConfirmActionModal } from './components/ConfirmActionModal';
import { RepairsListView } from './components/RepairsListView';
import { RepairFormView } from './components/RepairFormView';
import { QuotationsView } from './components/QuotationsView';
import { ApprovalsView } from './components/ApprovalsView';
import { BudgetsView } from './components/BudgetsView';
import { CalendarView } from './components/CalendarView';
import { FeedbackModal } from './components/FeedbackModal';
import { AuditLogsView } from './components/AuditLogsView';

const SHEET_STORAGE_KEY = 'ahs_up_repair_spreadsheet_id';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [existingFirebaseUser, setExistingFirebaseUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('sheetId');
    if (fromUrl) {
      localStorage.setItem(SHEET_STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    return localStorage.getItem(SHEET_STORAGE_KEY);
  });
  const [sheetMeta, setSheetMeta] = useState<SpreadsheetMeta | null>(null);
  const [sheetSetupError, setSheetSetupError] = useState<string | null>(null);

  const [repairs, setRepairs] = useState<RepairRequest[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [budgets, setBudgets] = useState<AnnualBudget[]>([]);
  const [feedbacks, setFeedbacks] = useState<RepairFeedback[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const sessionLoggedRef = useRef<string | null>(null);

  const [activePage, setActivePage] = useState<AppPage>('repairs');
  const [deepLinkRepairId, setDeepLinkRepairId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('repairId');
  });
  const [deepLinkFeedbackRepairId, setDeepLinkFeedbackRepairId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('feedbackRepairId');
  });
  const [feedbackModalRepair, setFeedbackModalRepair] = useState<RepairRequest | null>(null);
  const [lineNotifyConfigured, setLineNotifyConfigured] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [editingRepair, setEditingRepair] = useState<RepairRequest | null>(null);
  const [preselectedRepairForQuote, setPreselectedRepairForQuote] =
    useState<RepairRequest | null>(null);

  const clearDeepLinkRepairId = useCallback(() => {
    setDeepLinkRepairId(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has('repairId')) {
      url.searchParams.delete('repairId');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const clearDeepLinkFeedbackRepairId = useCallback(() => {
    setDeepLinkFeedbackRepairId(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has('feedbackRepairId')) {
      url.searchParams.delete('feedbackRepairId');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const buildFeedbackUrl = useCallback((targetSheetId: string, repairId: string) => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('sheetId', targetSheetId);
    url.searchParams.set('feedbackRepairId', repairId);
    return url.toString();
  }, []);

  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: 'ยืนยัน',
    onConfirm: () => {},
  });

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    window.setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  const handleApiError = useCallback(
    (err: unknown) => {
      if (err instanceof SheetsAuthError) {
        clearCachedToken();
        setNeedsAuth(true);
        setAuthError(err.message);
        return;
      }
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ Google Sheets';
      showToast('error', msg);
    },
    [showToast]
  );

  const recordAuditLog = useCallback(
    async (
      token: string,
      targetSpreadsheetId: string,
      action: AuditLogAction | string,
      targetId: string,
      details: string,
      actor?: { name: string; email: string },
      existingLogsList?: AuditLog[]
    ): Promise<AuditLog> => {
      const fiscalYear = getCurrentThaiFiscalYear();
      const sourceLogs = existingLogsList ?? logs;
      const logId = generateNextId('LOG', fiscalYear, sourceLogs.map((l) => l.id), 4);
      const entry: AuditLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userName: actor?.name || user?.displayName || user?.email || 'ผู้ใช้งาน',
        userEmail: actor?.email || user?.email || '',
        action,
        targetId,
        details,
      };
      await appendAuditLog(token, targetSpreadsheetId, entry);
      return entry;
    },
    [logs, user]
  );

  const syncSheetData = useCallback(
    async (targetSheetId: string, tokenOverride?: string, actorOverride?: User | null) => {
      const token = tokenOverride || getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        return;
      }
      setDataLoading(true);
      setSheetSetupError(null);
      try {
        const meta = await inspectAndEnsureSpreadsheet(token, targetSheetId);
        setSheetMeta(meta);
        const loaded = await loadAllData(token, meta.spreadsheetId);
        setRepairs(loaded.repairs);
        setQuotations(loaded.quotations);
        setApprovals(loaded.approvals);
        setBudgets(loaded.budgets);
        setFeedbacks(loaded.feedbacks);
        setLogs(loaded.logs);

        const activeActor = actorOverride ?? user;
        const sessionKey = activeActor ? `${activeActor.uid}:${meta.spreadsheetId}` : null;
        if (activeActor && sessionKey && sessionLoggedRef.current !== sessionKey) {
          sessionLoggedRef.current = sessionKey;
          try {
            const loginLog = await recordAuditLog(
              token,
              meta.spreadsheetId,
              'เข้าสู่ระบบ',
              meta.spreadsheetId,
              `เข้าสู่ระบบและเชื่อมต่อฐานข้อมูล "${meta.title}"`,
              {
                name: activeActor.displayName || activeActor.email || 'ผู้ใช้งาน',
                email: activeActor.email || '',
              },
              loaded.logs
            );
            setLogs((prev) => [loginLog, ...prev]);
          } catch {
            // Do not block primary data load if initial session log fails transiently
          }
        }
      } catch (err) {
        if (err instanceof SheetsAuthError) {
          clearCachedToken();
          setNeedsAuth(true);
          setAuthError(err.message);
        } else {
          const msg =
            err instanceof Error ? err.message : 'ไม่สามารถเปิดไฟล์ Google Sheets นี้ได้';
          setSheetSetupError(msg);
          setSheetMeta(null);
        }
      } finally {
        setDataLoading(false);
      }
    },
    [recordAuditLog, user]
  );

  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, token) => {
        setUser(authedUser);
        setExistingFirebaseUser(null);
        setNeedsAuth(false);
        setAuthError(null);
        if (spreadsheetId) {
          syncSheetData(spreadsheetId, token, authedUser);
        }
      },
      (existing) => {
        setExistingFirebaseUser(existing);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, [spreadsheetId, syncSheetData]);

  useEffect(() => {
    checkLineNotifyStatus().then(setLineNotifyConfigured);
  }, []);

  useEffect(() => {
    if (!deepLinkFeedbackRepairId || repairs.length === 0) return;
    const matched = repairs.find((r) => r.id === deepLinkFeedbackRepairId);
    if (matched) {
      setActivePage('repairs');
      setFeedbackModalRepair(matched);
    }
  }, [deepLinkFeedbackRepairId, repairs]);

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      setExistingFirebaseUser(null);
      setNeedsAuth(false);
      if (spreadsheetId) {
        await syncSheetData(spreadsheetId, result.accessToken, result.user);
      }
    } catch (err) {
      if (err instanceof AuthCancelledError) {
        setAuthNotice(err.message);
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้ กรุณาลองใหม่อีกครั้ง';
        setAuthError(msg);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    sessionLoggedRef.current = null;
    setUser(null);
    setExistingFirebaseUser(null);
    setNeedsAuth(true);
    setSheetMeta(null);
    setLogs([]);
  };

  const handleCreateNewSheet = async (customTitle: string) => {
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setSheetSetupError(null);
    try {
      const meta = await createFacultySpreadsheet(token, customTitle);
      localStorage.setItem(SHEET_STORAGE_KEY, meta.spreadsheetId);
      setSpreadsheetId(meta.spreadsheetId);
      setSheetMeta(meta);
      const loaded = await loadAllData(token, meta.spreadsheetId);
      setRepairs(loaded.repairs);
      setQuotations(loaded.quotations);
      setApprovals(loaded.approvals);
      setBudgets(loaded.budgets);
      setFeedbacks(loaded.feedbacks);
      setLogs(loaded.logs);
      if (user) {
        sessionLoggedRef.current = `${user.uid}:${meta.spreadsheetId}`;
        try {
          const loginLog = await recordAuditLog(
            token,
            meta.spreadsheetId,
            'เข้าสู่ระบบ',
            meta.spreadsheetId,
            `สร้างและเชื่อมต่อฐานข้อมูลใหม่ "${meta.title}"`,
            {
              name: user.displayName || user.email || 'ผู้ใช้งาน',
              email: user.email || '',
            },
            loaded.logs
          );
          setLogs((prev) => [loginLog, ...prev]);
        } catch {
          // non-fatal
        }
      }
      showToast('success', 'สร้างฐานข้อมูล Google Sheets ใหม่เรียบร้อยแล้ว');
    } catch (err) {
      if (err instanceof SheetsAuthError) {
        clearCachedToken();
        setNeedsAuth(true);
      } else {
        setSheetSetupError(err instanceof Error ? err.message : 'ไม่สามารถสร้างไฟล์ได้');
      }
    }
  };

  const handleConnectExistingSheet = async (idOrUrl: string) => {
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setSheetSetupError(null);
    try {
      const meta = await inspectAndEnsureSpreadsheet(token, idOrUrl);
      localStorage.setItem(SHEET_STORAGE_KEY, meta.spreadsheetId);
      setSpreadsheetId(meta.spreadsheetId);
      setSheetMeta(meta);
      const loaded = await loadAllData(token, meta.spreadsheetId);
      setRepairs(loaded.repairs);
      setQuotations(loaded.quotations);
      setApprovals(loaded.approvals);
      setBudgets(loaded.budgets);
      setFeedbacks(loaded.feedbacks);
      setLogs(loaded.logs);
      if (user) {
        sessionLoggedRef.current = `${user.uid}:${meta.spreadsheetId}`;
        try {
          const loginLog = await recordAuditLog(
            token,
            meta.spreadsheetId,
            'เข้าสู่ระบบ',
            meta.spreadsheetId,
            `เข้าสู่ระบบและเชื่อมต่อฐานข้อมูล "${meta.title}"`,
            {
              name: user.displayName || user.email || 'ผู้ใช้งาน',
              email: user.email || '',
            },
            loaded.logs
          );
          setLogs((prev) => [loginLog, ...prev]);
        } catch {
          // non-fatal
        }
      }
      showToast('success', `เชื่อมต่อฐานข้อมูล "${meta.title}" สำเร็จ`);
    } catch (err) {
      if (err instanceof SheetsAuthError) {
        clearCachedToken();
        setNeedsAuth(true);
      } else {
        setSheetSetupError(
          err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อ Google Sheets ได้'
        );
      }
    }
  };

  const handleDisconnectSheet = () => {
    localStorage.removeItem(SHEET_STORAGE_KEY);
    sessionLoggedRef.current = null;
    const url = new URL(window.location.href);
    url.searchParams.delete('sheetId');
    url.searchParams.delete('repairId');
    url.searchParams.delete('feedbackRepairId');
    window.history.replaceState({}, '', url.toString());
    setDeepLinkRepairId(null);
    setDeepLinkFeedbackRepairId(null);
    setFeedbackModalRepair(null);
    setSpreadsheetId(null);
    setSheetMeta(null);
    setRepairs([]);
    setQuotations([]);
    setApprovals([]);
    setBudgets([]);
    setFeedbacks([]);
    setLogs([]);
  };

  const handleCopyShareLink = async () => {
    if (!sheetMeta) return;
    const url = new URL(window.location.href);
    url.searchParams.set('sheetId', sheetMeta.spreadsheetId);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      showToast('success', 'คัดลอกลิงก์ระบบสำหรับแชร์ให้บุคลากรคณะแล้ว');
      window.setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast('error', 'ไม่สามารถคัดลอกลิงก์ได้');
    }
  };

  // --- Confirmed Google Sheets Mutations ---

  const handleSubmitRepairForm = (
    formData: Omit<
      RepairRequest,
      'id' | 'createdAt' | 'updatedAt' | 'status' | 'approvedCost' | 'quotationId'
    >,
    existing?: RepairRequest | null
  ) => {
    if (!sheetMeta) return;
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    if (existing && existing.rowIndex) {
      setConfirmDialog({
        isOpen: true,
        title: `ยืนยันการแก้ไขใบแจ้งซ่อม ${existing.id}`,
        description: `ต้องการบันทึกการเปลี่ยนแปลงข้อมูลใบแจ้งซ่อม "${formData.title}" ลงใน Google Sheets หรือไม่`,
        details: [
          `หน่วยงาน: ${formData.department}`,
          `สถานที่: ${formData.location}`,
          `ปีงบประมาณ: ${formData.fiscalYear}`,
        ],
        confirmLabel: 'ยืนยันการแก้ไข',
        variant: 'primary',
        onConfirm: async () => {
          try {
            const updated: RepairRequest = {
              ...existing,
              ...formData,
              updatedAt: new Date().toISOString(),
            };
            await updateRepair(token, sheetMeta.spreadsheetId, existing.rowIndex!, updated);
            await recordAuditLog(
              token,
              sheetMeta.spreadsheetId,
              'แก้ไขข้อมูลซ่อม',
              existing.id,
              `แก้ไขข้อมูลรายการแจ้งซ่อม "${formData.title}" (${formData.department}, ${formData.location})`
            );
            await syncSheetData(sheetMeta.spreadsheetId, token);
            setEditingRepair(null);
            setActivePage('repairs');
            showToast('success', `บันทึกการแก้ไข ${existing.id} ลง Google Sheets แล้ว`);
          } catch (err) {
            handleApiError(err);
          }
        },
      });
      return;
    }

    const newId = generateNextId(
      'AHS',
      formData.fiscalYear,
      repairs.map((r) => r.id)
    );

    setConfirmDialog({
      isOpen: true,
      title: `ยืนยันการส่งใบแจ้งซ่อม (${newId})`,
      description: `ต้องการบันทึกใบแจ้งซ่อมรายการ "${formData.title}" ลงใน Google Sheets หรือไม่`,
      details: [
        `เลขที่แจ้งซ่อม: ${newId}`,
        `หน่วยงาน: ${formData.department}`,
        `สถานที่: ${formData.location}`,
        `ความเร่งด่วน: ${formData.urgency}`,
        ...(lineNotifyConfigured
          ? ['การแจ้งเตือน: ส่งข้อความแจ้งเตือนผ่าน LINE Notify อัตโนมัติ']
          : []),
      ],
      confirmLabel: 'ยืนยันส่งใบแจ้งซ่อม',
      variant: 'primary',
      onConfirm: async () => {
        try {
          const now = new Date().toISOString();
          const newRecord: RepairRequest = {
            ...formData,
            id: newId,
            createdAt: now,
            updatedAt: now,
            status: 'รอดำเนินการ',
            approvedCost: 0,
            quotationId: '',
          };
          await appendRepair(token, sheetMeta.spreadsheetId, newRecord);
          await recordAuditLog(
            token,
            sheetMeta.spreadsheetId,
            'สร้างใบแจ้งซ่อม',
            newId,
            `สร้างใบแจ้งซ่อม "${formData.title}" (${formData.department}, ความเร่งด่วน: ${formData.urgency})`
          );
          await syncSheetData(sheetMeta.spreadsheetId, token);
          const notifyRes = await sendLineNotification({
            eventType: 'new_repair',
            repairId: newId,
            title: formData.title,
            department: formData.department,
            location: formData.location,
            urgency: formData.urgency,
            fiscalYear: formData.fiscalYear,
            requesterName: formData.requesterName,
          });
          setActivePage('repairs');
          if (notifyRes.ok) {
            showToast('success', `ส่งใบแจ้งซ่อม ${newId} และแจ้งเตือน LINE Notify สำเร็จแล้ว`);
          } else if (notifyRes.error) {
            showToast(
              'success',
              `ส่งใบแจ้งซ่อม ${newId} สำเร็จแล้ว (แจ้งเตือน LINE ไม่สำเร็จ: ${notifyRes.error})`
            );
          } else {
            showToast('success', `ส่งใบแจ้งซ่อม ${newId} สำเร็จแล้ว`);
          }
        } catch (err) {
          handleApiError(err);
        }
      },
    });
  };

  const handleDeleteRepair = (repair: RepairRequest) => {
    if (!sheetMeta || !repair.rowIndex) return;
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    const repairSheetId = sheetMeta.sheetIds[TAB_REPAIRS];
    if (repairSheetId === undefined) {
      showToast('error', 'ไม่พบรหัสแผ่นงาน Repairs ใน Google Sheets');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `ยืนยันการลบรายการแจ้งซ่อม ${repair.id}`,
      description: `การลบจะนำแถวข้อมูล "${repair.title}" ออกจากแผ่นงาน Repairs ใน Google Sheets อย่างถาวร`,
      details: [`รหัส: ${repair.id}`, `สถานที่: ${repair.location}`, `ผู้แจ้ง: ${repair.requesterName}`],
      confirmLabel: 'ยืนยันลบข้อมูล',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteSheetRow(token, sheetMeta.spreadsheetId, repairSheetId, repair.rowIndex!);
          await recordAuditLog(
            token,
            sheetMeta.spreadsheetId,
            'ลบใบแจ้งซ่อม',
            repair.id,
            `ลบรายการแจ้งซ่อม "${repair.title}" (${repair.department}) ออกจากระบบ`
          );
          await syncSheetData(sheetMeta.spreadsheetId, token);
          showToast('success', `ลบรายการ ${repair.id} ออกจาก Google Sheets แล้ว`);
        } catch (err) {
          handleApiError(err);
        }
      },
    });
  };

  const handleUpdateRepairStatus = (repair: RepairRequest, nextStatus: RepairStatus) => {
    if (!sheetMeta || !repair.rowIndex) return;
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `ยืนยันเปลี่ยนสถานะเป็น "${nextStatus}"`,
      description: `ต้องการอัปเดตสถานะของใบแจ้งซ่อม ${repair.id} (${repair.title}) ใน Google Sheets หรือไม่`,
      details: [
        `สถานะเดิม: ${repair.status}`,
        `สถานะใหม่: ${nextStatus}`,
        ...(lineNotifyConfigured
          ? [
              nextStatus === 'ซ่อมเสร็จสิ้น'
                ? 'การแจ้งเตือน: ส่งแจ้งเตือนพร้อมลิงก์แบบประเมินความพึงพอใจผ่าน LINE Notify อัตโนมัติ'
                : 'การแจ้งเตือน: ส่งข้อความอัปเดตสถานะผ่าน LINE Notify อัตโนมัติ',
            ]
          : []),
      ],
      confirmLabel: 'ยืนยันอัปเดตสถานะ',
      variant: 'primary',
      onConfirm: async () => {
        try {
          await updateRepair(token, sheetMeta.spreadsheetId, repair.rowIndex!, {
            ...repair,
            status: nextStatus,
            updatedAt: new Date().toISOString(),
          });
          await recordAuditLog(
            token,
            sheetMeta.spreadsheetId,
            'เปลี่ยนสถานะงานซ่อม',
            repair.id,
            `เปลี่ยนสถานะ "${repair.title}" จาก "${repair.status}" เป็น "${nextStatus}"`
          );
          await syncSheetData(sheetMeta.spreadsheetId, token);
          const feedbackUrl =
            nextStatus === 'ซ่อมเสร็จสิ้น'
              ? buildFeedbackUrl(sheetMeta.spreadsheetId, repair.id)
              : undefined;
          const notifyRes = await sendLineNotification({
            eventType: 'status_update',
            repairId: repair.id,
            title: repair.title,
            department: repair.department,
            location: repair.location,
            requesterName: repair.requesterName,
            newStatus: nextStatus,
            feedbackUrl,
          });
          if (notifyRes.ok) {
            showToast(
              'success',
              nextStatus === 'ซ่อมเสร็จสิ้น'
                ? `อัปเดตสถานะ ${repair.id} เสร็จสิ้นและส่งลิงก์แบบประเมินผ่าน LINE Notify แล้ว`
                : `อัปเดตสถานะ ${repair.id} เป็น "${nextStatus}" และแจ้งเตือน LINE Notify แล้ว`
            );
          } else {
            showToast('success', `อัปเดตสถานะ ${repair.id} เป็น "${nextStatus}" แล้ว`);
          }
        } catch (err) {
          handleApiError(err);
        }
      },
    });
  };

  const handleSaveQuotation = (
    data: Omit<Quotation, 'id' | 'createdAt' | 'createdBy'>,
    existing?: Quotation | null
  ) => {
    if (!sheetMeta || !user) return;
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    const qId =
      existing?.id ||
      generateNextId(
        'QT',
        data.fiscalYear,
        quotations.map((q) => q.id)
      );

    setConfirmDialog({
      isOpen: true,
      title: existing
        ? `ยืนยันแก้ไขใบเสนอราคา ${qId}`
        : `ยืนยันบันทึกใบเสนอราคา ${qId}`,
      description: `ต้องการบันทึกใบเสนอราคาจาก "${data.vendorName}" สำหรับใบแจ้งซ่อม ${data.repairId} ลง Google Sheets หรือไม่`,
      details: [
        `เลขที่ใบเสนอราคา: ${qId}`,
        `ยอดรวมสุทธิ: ฿${data.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
        `สถานะใบเสนอราคา: ${data.status}`,
      ],
      confirmLabel: 'ยืนยันบันทึกใบเสนอราคา',
      variant: 'primary',
      onConfirm: async () => {
        try {
          const now = new Date().toISOString();
          const record: Quotation = {
            ...data,
            id: qId,
            createdBy: existing?.createdBy || user.displayName || user.email || '',
            createdAt: existing?.createdAt || now,
          };

          if (existing && existing.rowIndex) {
            await updateQuotation(token, sheetMeta.spreadsheetId, existing.rowIndex, record);
          } else {
            await appendQuotation(token, sheetMeta.spreadsheetId, record);
          }

          // Update linked repair request quotation reference & status
          const linkedRepair = repairs.find((r) => r.id === data.repairId);
          if (linkedRepair && linkedRepair.rowIndex) {
            const nextRepairStatus: RepairStatus =
              data.status === 'เสนอพิจารณา' ? 'รออนุมัติงบ' : linkedRepair.status;
            await updateRepair(token, sheetMeta.spreadsheetId, linkedRepair.rowIndex, {
              ...linkedRepair,
              quotationId: qId,
              estimatedCost: data.totalAmount,
              status: nextRepairStatus,
              updatedAt: now,
            });
          }

          await recordAuditLog(
            token,
            sheetMeta.spreadsheetId,
            'บันทึกใบเสนอราคา',
            data.repairId,
            `${existing ? 'แก้ไข' : 'บันทึก'}ใบเสนอราคา ${qId} ร้านค้า "${data.vendorName}" ยอดสุทธิ ฿${data.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (${data.status})`
          );

          await syncSheetData(sheetMeta.spreadsheetId, token);
          showToast('success', `บันทึกใบเสนอราคา ${qId} ลง Google Sheets แล้ว`);
        } catch (err) {
          handleApiError(err);
        }
      },
    });
  };

  const handleSubmitApprovalDecision = ({
    repair,
    quotation,
    decision,
    approvedAmount,
    approverRole,
    remark,
  }: {
    repair: RepairRequest;
    quotation: Quotation | null;
    decision: 'อนุมัติ' | 'ไม่อนุมัติ' | 'ส่งกลับแก้ไข';
    approvedAmount: number;
    approverRole: string;
    remark: string;
  }) => {
    if (!sheetMeta || !user || !repair.rowIndex) return;
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    const aprId = generateNextId(
      'APR',
      repair.fiscalYear,
      approvals.map((a) => a.id)
    );

    const nextRepairStatus: RepairStatus =
      decision === 'อนุมัติ'
        ? 'อนุมัติแล้ว'
        : decision === 'ส่งกลับแก้ไข'
          ? 'ส่งกลับแก้ไข'
          : 'ไม่อนุมัติ';

    setConfirmDialog({
      isOpen: true,
      title: `ยืนยันผลการพิจารณา: ${decision} (${repair.id})`,
      description: `ต้องการบันทึกผลการพิจารณาสำหรับ "${repair.title}" ลงใน Google Sheets หรือไม่`,
      details: [
        `ผลการพิจารณา: ${decision}`,
        `วงเงินอนุมัติ: ฿${approvedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
        `ผู้อนุมัติ: ${user.displayName} (${approverRole})`,
        ...(lineNotifyConfigured
          ? ['การแจ้งเตือน: ส่งแจ้งผลการพิจารณาผ่าน LINE Notify อัตโนมัติ']
          : []),
      ],
      confirmLabel: `ยืนยัน${decision}`,
      variant: decision === 'ไม่อนุมัติ' ? 'danger' : decision === 'ส่งกลับแก้ไข' ? 'warning' : 'primary',
      onConfirm: async () => {
        try {
          const now = new Date().toISOString();
          const approvalRec: ApprovalRecord = {
            id: aprId,
            repairId: repair.id,
            quotationId: quotation?.id || repair.quotationId || '',
            fiscalYear: repair.fiscalYear,
            decision,
            approvedAmount,
            approverName: user.displayName || user.email || '',
            approverEmail: user.email || '',
            approverRole,
            decisionDate: now,
            remark,
          };

          await appendApproval(token, sheetMeta.spreadsheetId, approvalRec);

          await updateRepair(token, sheetMeta.spreadsheetId, repair.rowIndex!, {
            ...repair,
            status: nextRepairStatus,
            approvedCost: decision === 'อนุมัติ' ? approvedAmount : repair.approvedCost,
            updatedAt: now,
          });

          if (quotation && quotation.rowIndex) {
            const nextQuoteStatus: Quotation['status'] =
              decision === 'อนุมัติ'
                ? 'อนุมัติแล้ว'
                : decision === 'ส่งกลับแก้ไข'
                  ? 'ส่งกลับแก้ไข'
                  : 'ไม่อนุมัติ';
            await updateQuotation(token, sheetMeta.spreadsheetId, quotation.rowIndex, {
              ...quotation,
              status: nextQuoteStatus,
            });
          }

          await recordAuditLog(
            token,
            sheetMeta.spreadsheetId,
            'พิจารณาอนุมัติ',
            repair.id,
            `ผลการพิจารณา (${aprId}): ${decision} วงเงิน ฿${approvedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}${remark ? ` · ${remark}` : ''}`
          );

          await syncSheetData(sheetMeta.spreadsheetId, token);
          const notifyRes = await sendLineNotification({
            eventType: 'approval_decision',
            repairId: repair.id,
            title: repair.title,
            department: repair.department,
            decision,
            approvedAmount,
            approverName: user.displayName || user.email || '',
            approverRole,
            remark,
          });
          if (notifyRes.ok) {
            showToast(
              'success',
              `บันทึกผลการพิจารณา ${aprId} และแจ้งเตือน LINE Notify เรียบร้อยแล้ว`
            );
          } else if (notifyRes.error) {
            showToast(
              'success',
              `บันทึกผลการพิจารณา ${aprId} เรียบร้อยแล้ว (แจ้งเตือน LINE ไม่สำเร็จ: ${notifyRes.error})`
            );
          } else {
            showToast('success', `บันทึกผลการพิจารณา ${aprId} เรียบร้อยแล้ว`);
          }
        } catch (err) {
          handleApiError(err);
        }
      },
    });
  };

  const handleSaveBudget = (
    fiscalYear: string,
    allocatedAmount: number,
    note: string,
    existing?: AnnualBudget
  ) => {
    if (!sheetMeta || !user) return;
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    const matchedExisting = existing || budgets.find((b) => b.fiscalYear === fiscalYear);

    setConfirmDialog({
      isOpen: true,
      title: `ยืนยันบันทึกงบประมาณปี ${fiscalYear}`,
      description: `ต้องการบันทึกวงเงินงบประมาณซ่อมบำรุงประจำปี ${fiscalYear} ลงใน Google Sheets หรือไม่`,
      details: [
        `ปีงบประมาณ: พ.ศ. ${fiscalYear}`,
        `วงเงินที่จัดสรร: ฿${allocatedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
      ],
      confirmLabel: 'ยืนยันบันทึกงบประมาณ',
      variant: 'primary',
      onConfirm: async () => {
        try {
          await upsertBudget(
            token,
            sheetMeta.spreadsheetId,
            {
              fiscalYear,
              allocatedAmount,
              note,
              updatedBy: user.displayName || user.email || '',
              updatedAt: new Date().toISOString(),
            },
            matchedExisting?.rowIndex
          );
          await recordAuditLog(
            token,
            sheetMeta.spreadsheetId,
            'บันทึกงบประมาณ',
            `ปี ${fiscalYear}`,
            `บันทึกงบประมาณซ่อมบำรุงปี พ.ศ. ${fiscalYear} วงเงิน ฿${allocatedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
          );
          await syncSheetData(sheetMeta.spreadsheetId, token);
          showToast('success', `บันทึกงบประมาณปี ${fiscalYear} ลง Google Sheets แล้ว`);
        } catch (err) {
          handleApiError(err);
        }
      },
    });
  };

  const handleUpdateScheduledDate = (repair: RepairRequest, scheduledDate: string) => {
    if (!sheetMeta || !repair.rowIndex) return;
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `ยืนยันกำหนดวันซ่อม ${repair.id}`,
      description: scheduledDate
        ? `ต้องการบันทึกกำหนดการซ่อมแซมสำหรับ "${repair.title}" เป็นวันที่ ${scheduledDate} ลงใน Google Sheets หรือไม่`
        : `ต้องการล้างกำหนดวันซ่อมของ "${repair.title}" ใน Google Sheets หรือไม่`,
      details: [
        `เลขที่แจ้งซ่อม: ${repair.id}`,
        `สถานที่: ${repair.location}`,
        `วันเข้าซ่อมจริง: ${scheduledDate || 'ไม่ระบุ'}`,
      ],
      confirmLabel: 'ยืนยันกำหนดวันซ่อม',
      variant: 'primary',
      onConfirm: async () => {
        try {
          await updateRepair(token, sheetMeta.spreadsheetId, repair.rowIndex!, {
            ...repair,
            scheduledDate,
            updatedAt: new Date().toISOString(),
          });
          await recordAuditLog(
            token,
            sheetMeta.spreadsheetId,
            'กำหนดวันซ่อม',
            repair.id,
            scheduledDate
              ? `กำหนดวันเข้าซ่อม "${repair.title}" เป็นวันที่ ${scheduledDate}`
              : `ล้างกำหนดวันเข้าซ่อม "${repair.title}"`
          );
          await syncSheetData(sheetMeta.spreadsheetId, token);
          showToast(
            'success',
            scheduledDate
              ? `บันทึกกำหนดวันซ่อม ${repair.id} เป็น ${scheduledDate} แล้ว`
              : `อัปเดตกำหนดวันซ่อม ${repair.id} แล้ว`
          );
        } catch (err) {
          handleApiError(err);
        }
      },
    });
  };

  const handleSendFeedbackLineNotify = (repair: RepairRequest) => {
    if (!sheetMeta) return;
    if (!lineNotifyConfigured) {
      showToast(
        'error',
        'ยังไม่ได้ตั้งค่า LINE_NOTIFY_TOKEN ใน Environment Secrets (สามารถคัดลอกลิงก์ประเมินจากหน้ารายละเอียดแทนได้)'
      );
      return;
    }
    const feedbackUrl = buildFeedbackUrl(sheetMeta.spreadsheetId, repair.id);
    setConfirmDialog({
      isOpen: true,
      title: `ส่งลิงก์แบบประเมินความพึงพอใจ (${repair.id})`,
      description: `ต้องการส่งข้อความแจ้งเตือนพร้อมลิงก์แบบประเมินหลังงานซ่อมสำหรับ "${repair.title}" ผ่าน LINE Notify หรือไม่`,
      details: [
        `ผู้แจ้งซ่อม: ${repair.requesterName}`,
        `หน่วยงาน: ${repair.department}`,
        `ลิงก์แบบประเมิน: ${feedbackUrl}`,
      ],
      confirmLabel: 'ส่งผ่าน LINE Notify',
      variant: 'primary',
      onConfirm: async () => {
        const token = getAccessToken();
        const res = await sendLineNotification({
          eventType: 'feedback_request',
          repairId: repair.id,
          title: repair.title,
          department: repair.department,
          requesterName: repair.requesterName,
          feedbackUrl,
        });
        if (res.ok) {
          if (token) {
            try {
              await recordAuditLog(
                token,
                sheetMeta.spreadsheetId,
                'แจ้งเตือน LINE',
                repair.id,
                `ส่งลิงก์แบบประเมินความพึงพอใจสำหรับ "${repair.title}" ผ่าน LINE Notify`
              );
              await syncSheetData(sheetMeta.spreadsheetId, token);
            } catch {
              // non-fatal
            }
          }
          showToast('success', `ส่งลิงก์แบบประเมินสำหรับ ${repair.id} ผ่าน LINE Notify สำเร็จแล้ว`);
        } else {
          showToast('error', res.error || 'ไม่สามารถส่ง LINE Notify ได้');
        }
      },
    });
  };

  const handleSubmitFeedback = (
    repair: RepairRequest,
    data: {
      rating: number;
      speedRating: number;
      qualityRating: number;
      serviceRating: number;
      comment: string;
      evaluatorName: string;
    }
  ) => {
    if (!sheetMeta || !user) return;
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    const fbId = generateNextId(
      'FB',
      repair.fiscalYear,
      feedbacks.map((f) => f.id)
    );

    setConfirmDialog({
      isOpen: true,
      title: `ยืนยันส่งแบบประเมินความพึงพอใจ (${repair.id})`,
      description: `ต้องการบันทึกคะแนนความพึงพอใจ ${data.rating}/5 สำหรับงานซ่อม "${repair.title}" ลงใน Google Sheets หรือไม่`,
      details: [
        `รหัสแบบประเมิน: ${fbId}`,
        `คะแนนรวม: ${data.rating} / 5 ดาว`,
        `ผู้ประเมิน: ${data.evaluatorName}`,
      ],
      confirmLabel: 'ยืนยันส่งแบบประเมิน',
      variant: 'primary',
      onConfirm: async () => {
        try {
          const newFeedback: RepairFeedback = {
            id: fbId,
            repairId: repair.id,
            fiscalYear: repair.fiscalYear,
            rating: data.rating,
            speedRating: data.speedRating,
            qualityRating: data.qualityRating,
            serviceRating: data.serviceRating,
            comment: data.comment,
            evaluatorName: data.evaluatorName,
            evaluatorEmail: user.email || '',
            createdAt: new Date().toISOString(),
          };
          await appendFeedback(token, sheetMeta.spreadsheetId, newFeedback);
          await recordAuditLog(
            token,
            sheetMeta.spreadsheetId,
            'ประเมินความพึงพอใจ',
            repair.id,
            `บันทึกผลประเมินความพึงพอใจ ${fbId} คะแนนรวม ${data.rating}/5 ดาว โดย ${data.evaluatorName}`
          );
          await syncSheetData(sheetMeta.spreadsheetId, token);
          setFeedbackModalRepair(null);
          clearDeepLinkFeedbackRepairId();
          showToast('success', `บันทึกผลประเมินความพึงพอใจ ${fbId} เรียบร้อยแล้ว`);
        } catch (err) {
          handleApiError(err);
        }
      },
    });
  };

  const pendingApprovalsCount = useMemo(
    () =>
      repairs.filter((r) =>
        ['รออนุมัติงบ', 'รอใบเสนอราคา', 'รอดำเนินการ'].includes(r.status)
      ).length,
    [repairs]
  );

  // --- Gate 1: Google Sign-In ---
  if (needsAuth || !user) {
    return (
      <LoginView
        onLogin={handleLogin}
        isLoading={authLoading}
        errorMessage={authError}
        noticeMessage={authNotice}
        existingEmail={existingFirebaseUser?.email}
      />
    );
  }

  // --- Gate 2: Google Sheets Connection ---
  if (!spreadsheetId || !sheetMeta) {
    return (
      <SheetSetupView
        user={user}
        onCreateNewSheet={handleCreateNewSheet}
        onConnectExistingSheet={handleConnectExistingSheet}
        onLogout={handleLogout}
        error={sheetSetupError}
      />
    );
  }

  const navItems: Array<{
    id: AppPage;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    count?: number;
  }> = [
    {
      id: 'repairs',
      label: 'รายการแจ้งซ่อม',
      shortLabel: 'แจ้งซ่อม',
      icon: <Wrench className="w-4 h-4 shrink-0" />,
      count: repairs.length,
    },
    {
      id: 'calendar',
      label: 'ปฏิทินงานซ่อม',
      shortLabel: 'ปฏิทิน',
      icon: <Calendar className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'form',
      label: 'แบบฟอร์มแจ้งซ่อม',
      shortLabel: 'แบบฟอร์ม',
      icon: <FilePlus2 className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'quotations',
      label: 'ใบเสนอราคา',
      shortLabel: 'ใบเสนอราคา',
      icon: <FileSpreadsheet className="w-4 h-4 shrink-0" />,
      count: quotations.length,
    },
    {
      id: 'approvals',
      label: 'การอนุมัติ',
      shortLabel: 'อนุมัติ',
      icon: <CheckSquare className="w-4 h-4 shrink-0" />,
      count: pendingApprovalsCount,
    },
    {
      id: 'budgets',
      label: 'งบประมาณแต่ละปี',
      shortLabel: 'งบประมาณ',
      icon: <Wallet className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'logs',
      label: 'ประวัติระบบ (Logs)',
      shortLabel: 'ประวัติ',
      icon: <History className="w-4 h-4 shrink-0" />,
      count: logs.length,
    },
  ];

  const pageTitles: Record<AppPage, string> = {
    repairs: 'การแจ้งซ่อมและรายละเอียด',
    calendar: 'ปฏิทินรายการแจ้งซ่อมและกำหนดการซ่อม',
    form: editingRepair ? 'แก้ไขใบแจ้งซ่อม' : 'แบบฟอร์มแจ้งซ่อม',
    quotations: 'ใบเสนอราคาซ่อมบำรุง',
    approvals: 'การพิจารณาอนุมัติ',
    budgets: 'รวมงบประมาณการซ่อมแต่ละปี',
    logs: 'ประวัติการเข้าใช้งานและแก้ไขข้อมูล (Audit Trail)',
  };

  const navigateTo = (page: AppPage) => {
    if (page !== 'form') {
      setEditingRepair(null);
    }
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Desktop Sidebar (260px) */}
      <aside className="no-print hidden lg:flex lg:w-[264px] lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 z-30">
        <div className="px-5 py-5 border-b border-slate-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">คณะสหเวชศาสตร์</p>
            <p className="text-xs text-slate-500 truncate">ระบบแจ้งซ่อม ม.พะเยา</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="เมนูหลัก">
          {navItems.map((item) => {
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </span>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      active ? 'text-teal-100' : 'text-slate-500'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Connected Google Sheet Info */}
        <div className="p-3.5 m-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-800 truncate">
              {sheetMeta.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={sheetMeta.spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-teal-800 bg-white border border-slate-200 rounded-md hover:bg-slate-100"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิด Sheets</span>
            </a>
            <button
              type="button"
              onClick={handleDisconnectSheet}
              title="เปลี่ยนไฟล์ Google Sheets"
              className="p-1.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-100"
            >
              <Unlink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* User Profile */}
        <div className="px-4 py-3.5 border-t border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'ผู้ใช้งาน'}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-slate-200 object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold shrink-0">
                {(user.displayName || user.email || 'U')[0]}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user.displayName || 'บุคลากร'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="ออกจากระบบ"
            className="p-2 text-slate-500 hover:text-red-700 rounded-lg hover:bg-slate-100 shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:pl-[264px] print:pl-0 flex flex-col min-w-0">
        {/* Top Bar (Compact 56px on mobile, <=15% viewport height) */}
        <header className="no-print sticky top-0 z-20 bg-white border-b border-slate-200 h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="เปิดเมนูนำทาง"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {pageTitles[activePage]}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 whitespace-nowrap min-h-[38px]"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>{copiedLink ? 'คัดลอกแล้ว' : 'แชร์ลิงก์'}</span>
            </button>

            <button
              type="button"
              onClick={() => syncSheetData(sheetMeta.spreadsheetId)}
              disabled={dataLoading}
              aria-label="รีเฟรชข้อมูลจาก Google Sheets"
              className="inline-flex items-center justify-center p-2 sm:px-3 sm:py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 min-h-[38px] min-w-[38px]"
            >
              <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin text-teal-700' : ''}`} />
              <span className="hidden md:inline ml-1.5">ซิงค์ข้อมูล</span>
            </button>

            {activePage !== 'form' && (
              <button
                type="button"
                onClick={() => {
                  setEditingRepair(null);
                  setActivePage('form');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 whitespace-nowrap shrink-0 min-h-[38px]"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>แจ้งซ่อมใหม่</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile Non-Sticky Quick Tab Strip */}
        <div className="no-print lg:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-1.5 overflow-x-auto">
          {navItems.map((item) => {
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 min-h-[38px] ${
                  active
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {item.icon}
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="no-print px-4 sm:px-6 pt-4">
            <div
              className={`max-w-7xl mx-auto px-4 py-3 rounded-lg border text-xs sm:text-sm flex items-center justify-between gap-3 ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <span className="flex items-center gap-2">
                {toastMessage.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{toastMessage.text}</span>
              </span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="p-1 opacity-70 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 print:p-0 max-w-7xl print:max-w-none w-full mx-auto">
          {activePage === 'repairs' && (
            <RepairsListView
              repairs={repairs}
              quotations={quotations}
              approvals={approvals}
              feedbacks={feedbacks}
              logs={logs}
              isLoading={dataLoading}
              spreadsheetId={sheetMeta.spreadsheetId}
              deepLinkRepairId={deepLinkRepairId}
              onClearDeepLinkRepairId={clearDeepLinkRepairId}
              onNewRepair={() => {
                setEditingRepair(null);
                setActivePage('form');
              }}
              onEditRepair={(repair) => {
                setEditingRepair(repair);
                setActivePage('form');
              }}
              onDeleteRepair={handleDeleteRepair}
              onUpdateRepairStatus={handleUpdateRepairStatus}
              onCreateQuotationForRepair={(repair) => {
                setPreselectedRepairForQuote(repair);
                setActivePage('quotations');
              }}
              onNavigateToApprovals={() => setActivePage('approvals')}
              onOpenFeedbackForm={(repair) => setFeedbackModalRepair(repair)}
              onSendFeedbackLineNotify={handleSendFeedbackLineNotify}
            />
          )}

          {activePage === 'calendar' && (
            <CalendarView
              repairs={repairs}
              onUpdateScheduledDate={handleUpdateScheduledDate}
              onEditRepair={(repair) => {
                setEditingRepair(repair);
                setActivePage('form');
              }}
              onNewRepair={() => {
                setEditingRepair(null);
                setActivePage('form');
              }}
            />
          )}

          {activePage === 'form' && (
            <RepairFormView
              user={user}
              editingRepair={editingRepair}
              onSubmitRepair={handleSubmitRepairForm}
              onCancel={() => {
                setEditingRepair(null);
                setActivePage('repairs');
              }}
            />
          )}

          {activePage === 'quotations' && (
            <QuotationsView
              quotations={quotations}
              repairs={repairs}
              preselectedRepair={preselectedRepairForQuote}
              onClearPreselectedRepair={() => setPreselectedRepairForQuote(null)}
              onSaveQuotation={handleSaveQuotation}
            />
          )}

          {activePage === 'approvals' && (
            <ApprovalsView
              user={user}
              repairs={repairs}
              quotations={quotations}
              approvals={approvals}
              budgets={budgets}
              onSubmitDecision={handleSubmitApprovalDecision}
            />
          )}

          {activePage === 'budgets' && (
            <BudgetsView
              repairs={repairs}
              budgets={budgets}
              onSaveBudget={handleSaveBudget}
            />
          )}

          {activePage === 'logs' && (
            <AuditLogsView
              logs={logs}
              repairs={repairs}
              isLoading={dataLoading}
              onInspectRepair={(repairId) => {
                setDeepLinkRepairId(repairId);
                setActivePage('repairs');
              }}
            />
          )}
        </main>
      </div>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col border-r border-slate-200 z-10">
            <div className="px-4 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">คณะสหเวชศาสตร์</p>
                  <p className="text-[11px] text-slate-500">ระบบแจ้งซ่อม ม.พะเยา</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg"
                aria-label="ปิดเมนู"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 text-sm font-medium rounded-lg min-h-[44px] ${
                      active
                        ? 'bg-teal-700 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="font-mono text-xs tabular-nums">{item.count}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50">
              <div className="text-xs">
                <p className="font-semibold text-slate-800 truncate">{sheetMeta.title}</p>
                <p className="text-slate-500 truncate mt-0.5">{user.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={sheetMeta.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-teal-800 bg-white border border-slate-200 rounded-lg min-h-[40px]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิด Sheets</span>
                </a>
                <button
                  type="button"
                  onClick={handleDisconnectSheet}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg min-h-[40px]"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>เปลี่ยนไฟล์</span>
                </button>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg min-h-[42px]"
              >
                <LogOut className="w-4 h-4" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Repair Satisfaction Feedback Modal */}
      {feedbackModalRepair && (
        <FeedbackModal
          repair={feedbackModalRepair}
          existingFeedback={
            feedbacks.find((f) => f.repairId === feedbackModalRepair.id) || null
          }
          defaultEvaluatorName={user.displayName || feedbackModalRepair.requesterName || ''}
          onClose={() => {
            setFeedbackModalRepair(null);
            clearDeepLinkFeedbackRepairId();
          }}
          onSubmit={(data) => handleSubmitFeedback(feedbackModalRepair, data)}
        />
      )}

      {/* Mandatory Confirmation Dialog */}
      <ConfirmActionModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
