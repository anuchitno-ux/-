export interface LineNotifyRequest {
  eventType: 'new_repair' | 'approval_decision' | 'status_update' | 'feedback_request';
  repairId: string;
  title: string;
  department?: string;
  location?: string;
  urgency?: string;
  fiscalYear?: string;
  requesterName?: string;
  decision?: string;
  newStatus?: string;
  approvedAmount?: number;
  approverName?: string;
  approverRole?: string;
  remark?: string;
  feedbackUrl?: string;
}

export interface LineNotifyResult {
  ok: boolean;
  skipped?: boolean;
  message?: string;
  error?: string;
}

export async function checkLineNotifyStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/notify-line/status');
    if (!res.ok) return false;
    const data = (await res.json()) as { configured?: boolean };
    return Boolean(data.configured);
  } catch {
    return false;
  }
}

export async function sendLineNotification(
  payload: LineNotifyRequest
): Promise<LineNotifyResult> {
  try {
    const res = await fetch('/api/notify-line', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as LineNotifyResult;
    return data;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'ไม่สามารถติดต่อเซิร์ฟเวอร์แจ้งเตือน LINE ได้',
    };
  }
}
