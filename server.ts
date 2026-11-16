import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DEFAULT_LINE_NOTIFY_URL = 'https://notify-api.line.me/api/notify';

interface NotifyPayload {
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

function formatThaiAmount(amount?: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function buildLineMessage(payload: NotifyPayload): string {
  if (payload.eventType === 'new_repair') {
    const lines = [
      '',
      '[แจ้งซ่อมใหม่] คณะสหเวชศาสตร์ ม.พะเยา',
      `เลขที่: ${payload.repairId} (ปีงบฯ ${payload.fiscalYear || '-'})`,
      `รายการ: ${payload.title}`,
      `หน่วยงาน: ${payload.department || '-'}`,
      `สถานที่: ${payload.location || '-'}`,
      `ความเร่งด่วน: ${payload.urgency || 'ปกติ'}`,
      `ผู้แจ้ง: ${payload.requesterName || '-'}`,
    ];
    return lines.join('\n');
  }

  if (payload.eventType === 'approval_decision') {
    const lines = [
      '',
      `[ผลการพิจารณาอนุมัติ: ${payload.decision || '-'}]`,
      `เลขที่: ${payload.repairId}`,
      `รายการ: ${payload.title}`,
      `หน่วยงาน: ${payload.department || '-'}`,
      `วงเงินอนุมัติ: ฿${formatThaiAmount(payload.approvedAmount)}`,
      `ผู้พิจารณา: ${payload.approverName || '-'} (${payload.approverRole || '-'})`,
    ];
    if (payload.remark) {
      lines.push(`ความเห็น: ${payload.remark}`);
    }
    return lines.join('\n');
  }

  if (payload.eventType === 'feedback_request') {
    const lines = [
      '',
      '[แบบประเมินความพึงพอใจหลังงานซ่อม] คณะสหเวชศาสตร์ ม.พะเยา',
      `เลขที่: ${payload.repairId}`,
      `รายการ: ${payload.title}`,
      `หน่วยงาน: ${payload.department || '-'}`,
      `ผู้แจ้ง: ${payload.requesterName || '-'}`,
      'เรียนเชิญผู้แจ้งซ่อมประเมินคะแนนความพึงพอใจและข้อเสนอแนะ:',
    ];
    if (payload.feedbackUrl) {
      lines.push(payload.feedbackUrl);
    }
    return lines.join('\n');
  }

  const lines = [
    '',
    `[อัปเดตสถานะงานซ่อม: ${payload.newStatus || '-'}]`,
    `เลขที่: ${payload.repairId}`,
    `รายการ: ${payload.title}`,
    `หน่วยงาน: ${payload.department || '-'}`,
    `สถานที่: ${payload.location || '-'}`,
  ];
  if (payload.newStatus === 'ซ่อมเสร็จสิ้น' && payload.feedbackUrl) {
    lines.push(`ผู้แจ้ง: ${payload.requesterName || '-'}`);
    lines.push('กรุณาประเมินความพึงพอใจและข้อเสนอแนะหลังงานซ่อมเสร็จสิ้น:');
    lines.push(payload.feedbackUrl);
  }
  return lines.join('\n');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/notify-line/status', (_req: Request, res: Response) => {
    const token = process.env.LINE_NOTIFY_TOKEN?.trim();
    res.json({ configured: Boolean(token) });
  });

  app.post('/api/notify-line', async (req: Request, res: Response) => {
    try {
      const payload = req.body as NotifyPayload;
      if (
        !payload ||
        !payload.repairId ||
        !payload.title ||
        !['new_repair', 'approval_decision', 'status_update', 'feedback_request'].includes(
          payload.eventType
        )
      ) {
        res.status(400).json({ ok: false, error: 'ข้อมูลสำหรับส่งการแจ้งเตือนไม่ครบถ้วน' });
        return;
      }

      const token = process.env.LINE_NOTIFY_TOKEN?.trim();
      if (!token) {
        res.status(200).json({
          ok: false,
          skipped: true,
          message: 'ยังไม่ได้ตั้งค่า LINE_NOTIFY_TOKEN ใน Secrets',
        });
        return;
      }

      const endpoint = process.env.LINE_NOTIFY_API_URL?.trim() || DEFAULT_LINE_NOTIFY_URL;
      const message = buildLineMessage(payload);

      const lineResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ message }).toString(),
      });

      if (!lineResponse.ok) {
        const errBody = await lineResponse.text().catch(() => '');
        res.status(502).json({
          ok: false,
          error: `LINE Notify ตอบกลับ HTTP ${lineResponse.status}${errBody ? `: ${errBody}` : ''}`,
        });
        return;
      }

      res.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการส่ง LINE Notify';
      res.status(500).json({ ok: false, error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
