/**
 * POST /api/admin/security-alert
 * 보안 이벤트 발생 시 관리자에게 이메일 알림 발송
 * - 보호 계정 비밀번호 재설정 시도
 * - 비밀번호 변경 차단 이벤트
 */
import { NextRequest, NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL ?? 'jo@keryx.kr';

const EVENT_LABELS: Record<string, { ko: string; zh: string; emoji: string }> = {
  password_reset_attempt: {
    ko: '비밀번호 재설정 이메일 발송 시도',
    zh: '尝试发送密码重置邮件',
    emoji: '⚠️',
  },
  password_change_blocked: {
    ko: '비밀번호 변경 시도 차단됨',
    zh: '密码修改尝试已被阻止',
    emoji: '🚫',
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, email, timestamp } = body;

    const label = EVENT_LABELS[type] ?? { ko: '알 수 없는 보안 이벤트', zh: '未知安全事件', emoji: '🔔' };
    const timeStr = new Date(timestamp ?? Date.now()).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    // IP 주소 추출 (가능한 경우)
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '알 수 없음';

    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'KERYX Security <noreply@keryx.kr>',
          to: [ADMIN_NOTIFY_EMAIL],
          subject: `[KERYX 보안 알림] ${label.emoji} ${label.ko}`,
          html: `
            <div style="font-family: 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
              <div style="background: #dc2626; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0; margin-bottom: 0;">
                <h2 style="margin: 0; font-size: 18px;">${label.emoji} KERYX 보안 알림</h2>
              </div>
              <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; width: 140px;">이벤트 유형</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #dc2626;">${label.ko}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">대상 계정</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">발생 시각</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">${timeStr} (KST)</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748b; font-size: 14px;">접속 IP</td>
                    <td style="padding: 10px 0;">${ip}</td>
                  </tr>
                </table>
                <div style="margin-top: 20px; padding: 14px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626;">
                  <p style="margin: 0; font-size: 13px; color: #7f1d1d;">
                    본인이 시도한 경우라면 무시하셔도 됩니다.<br>
                    본인이 아닌 경우 즉시 시스템 관리자에게 연락하세요.
                  </p>
                </div>
              </div>
            </div>
          `,
        }),
      });
    }

    // 서버 로그에도 기록
    console.log(`[SECURITY] ${label.emoji} ${type} | email: ${email} | ip: ${ip} | time: ${timeStr}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[security-alert] error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
