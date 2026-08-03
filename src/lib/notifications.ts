/**
 * KERYX 알림 발송 유틸리티
 * - 이메일: Resend (RESEND_API_KEY, RESEND_FROM_EMAIL 환경변수 필요)
 * - 문자: Solapi SDK (SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER 환경변수 필요)
 * - API 키 없으면 시뮬레이션 모드로 동작 (로그만 기록)
 */

// ============================================================
// 이메일 발송 (Resend)
// ============================================================
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

export async function sendEmail(options: SendEmailOptions): Promise<NotificationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'KERYX <noreply@keryx.kr>';

  if (!apiKey) {
    // 시뮬레이션 모드
    console.log('[EMAIL SIMULATION]', {
      to: options.to,
      subject: options.subject,
      from: fromEmail,
    });
    return { success: true, simulated: true, messageId: `sim_${Date.now()}` };
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from: options.from || fromEmail,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[EMAIL ERROR]', message);
    return { success: false, error: message };
  }
}

// ============================================================
// 문자 발송 (Solapi SDK)
// ============================================================
export interface SendSmsOptions {
  to: string;          // 수신자 전화번호 (010-XXXX-XXXX 또는 010XXXXXXXX)
  message: string;     // 문자 내용 (90바이트 이하 SMS, 초과 시 LMS 자동 전환)
  subject?: string;    // LMS 제목 (LMS 전환 시 사용)
}

export async function sendSms(options: SendSmsOptions): Promise<NotificationResult> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const sender = process.env.SOLAPI_SENDER;

  if (!apiKey || !apiSecret || !sender) {
    // 시뮬레이션 모드
    console.log('[SMS SIMULATION]', {
      to: options.to,
      message: options.message,
      sender: sender || 'SOLAPI_SENDER 미설정',
    });
    return { success: true, simulated: true, messageId: `sim_sms_${Date.now()}` };
  }

  try {
    const { SolapiMessageService } = await import('solapi');
    const service = new SolapiMessageService(apiKey, apiSecret);

    // 전화번호 정규화 (하이픈 제거)
    const toPhone = options.to.replace(/-/g, '');
    const fromPhone = sender.replace(/-/g, '');

    // 메시지 타입 자동 감지 (90바이트 초과 시 LMS)
    const byteLength = Buffer.byteLength(options.message, 'utf8');
    const msgType = byteLength > 90 ? 'LMS' : 'SMS';

    const result = await service.send({
      to: toPhone,
      from: fromPhone,
      text: options.message,
      type: msgType,
      ...(msgType === 'LMS' && options.subject ? { subject: options.subject } : {}),
    });

    // Solapi send 결과에서 messageId 추출
    const groupId = (result as { groupId?: string }).groupId;
    return { success: true, messageId: groupId || `solapi_${Date.now()}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SMS ERROR]', message);
    return { success: false, error: message };
  }
}

// ============================================================
// 공장 매칭 보고서 이메일 템플릿
// ============================================================
export function buildFactoryMatchReportEmail(params: {
  buyerName: string;
  reportTitle: string;
  reportUrl: string;
  factoryCount: number;
  senderName: string;
  lang?: 'ko' | 'zh';
}): { subject: string; html: string } {
  const isZh = params.lang === 'zh';

  const subject = isZh
    ? `[KERYX] 工厂匹配报告：${params.reportTitle}`
    : `[KERYX] 공장 매칭 보고서: ${params.reportTitle}`;

  const html = isZh
    ? `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <!-- 헤더 -->
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;">KERYX</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">工厂匹配报告</p>
    </div>
    <!-- 본문 -->
    <div style="padding:40px 32px;">
      <p style="font-size:16px;color:#374151;margin:0 0 16px;">您好，${params.buyerName}，</p>
      <p style="font-size:15px;color:#6b7280;line-height:1.7;margin:0 0 24px;">
        您的专属MD <strong style="color:#374151;">${params.senderName}</strong> 已为您精心准备了工厂匹配报告。<br>
        共为您匹配了 <strong style="color:#6366f1;font-size:18px;">${params.factoryCount}家</strong> 工厂，请登录控制台查看详情。
      </p>
      <!-- 보고서 제목 박스 -->
      <div style="background:#f0f0ff;border-left:4px solid #6366f1;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 32px;">
        <p style="margin:0;font-size:13px;color:#6366f1;font-weight:600;">报告名称</p>
        <p style="margin:4px 0 0;font-size:16px;color:#374151;font-weight:700;">${params.reportTitle}</p>
      </div>
      <!-- CTA 버튼 -->
      <div style="text-align:center;margin:0 0 32px;">
        <a href="${params.reportUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;">
          查看匹配报告 →
        </a>
      </div>
      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;">
        如有疑问，请联系您的专属MD ${params.senderName}
      </p>
    </div>
    <!-- 푸터 -->
    <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 KERYX · YIWU SENKANG DAILY NECESSITIES CO., LTD</p>
    </div>
  </div>
</body>
</html>`
    : `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Apple SD Gothic Neo',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <!-- 헤더 -->
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;">KERYX</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">공장 매칭 보고서</p>
    </div>
    <!-- 본문 -->
    <div style="padding:40px 32px;">
      <p style="font-size:16px;color:#374151;margin:0 0 16px;">안녕하세요, ${params.buyerName}님,</p>
      <p style="font-size:15px;color:#6b7280;line-height:1.7;margin:0 0 24px;">
        담당 MD <strong style="color:#374151;">${params.senderName}</strong>님이 고객님을 위한 공장 매칭 보고서를 작성했습니다.<br>
        총 <strong style="color:#6366f1;font-size:18px;">${params.factoryCount}개</strong> 공장을 매칭했습니다. 대시보드에서 확인해 보세요!
      </p>
      <!-- 보고서 제목 박스 -->
      <div style="background:#f0f0ff;border-left:4px solid #6366f1;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 32px;">
        <p style="margin:0;font-size:13px;color:#6366f1;font-weight:600;">보고서 제목</p>
        <p style="margin:4px 0 0;font-size:16px;color:#374151;font-weight:700;">${params.reportTitle}</p>
      </div>
      <!-- CTA 버튼 -->
      <div style="text-align:center;margin:0 0 32px;">
        <a href="${params.reportUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;">
          매칭 보고서 확인하기 →
        </a>
      </div>
      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;">
        문의사항은 담당 MD ${params.senderName}님께 연락해 주세요.
      </p>
    </div>
    <!-- 푸터 -->
    <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 KERYX · YIWU SENKANG DAILY NECESSITIES CO., LTD</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

// ============================================================
// 공장 매칭 보고서 SMS 메시지 템플릿
// ============================================================
export function buildFactoryMatchReportSms(params: {
  buyerName: string;
  reportTitle: string;
  reportUrl: string;
  factoryCount: number;
  senderName: string;
  lang?: 'ko' | 'zh';
}): string {
  const isZh = params.lang === 'zh';
  if (isZh) {
    return `[KERYX] ${params.buyerName}您好，您的MD ${params.senderName}已为您准备了工厂匹配报告(${params.factoryCount}家)。请登录查看：${params.reportUrl}`;
  }
  return `[KERYX] ${params.buyerName}님, 담당MD ${params.senderName}님이 공장 매칭 보고서(${params.factoryCount}개 공장)를 작성했습니다. 확인: ${params.reportUrl}`;
}

// ============================================================
// 상담 신청 관리자 알림 이메일 템플릿
// ============================================================
export interface ConsultationNotificationParams {
  consultationId: string;
  inquiryType: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  companyName?: string;
  preferredContact?: string;
  requirements?: string;
  wantSample?: boolean;
  wantQuote?: boolean;
  productNames?: string[];
  submittedAt: string;
  adminUrl: string;
}

export function buildConsultationAdminEmail(params: ConsultationNotificationParams): { subject: string; html: string } {
  const typeLabel: Record<string, string> = {
    sample_request: '샘플 신청',
    quote_request: '견적 요청',
    general: '일반 문의',
    factory_match: '공장 매칭 신청',
  };
  const typeLabelZh: Record<string, string> = {
    sample_request: '样品申请',
    quote_request: '报价申请',
    general: '一般咨询',
    factory_match: '工厂匹配申请',
  };

  const typeKo = typeLabel[params.inquiryType] || params.inquiryType;
  const typeZh = typeLabelZh[params.inquiryType] || params.inquiryType;
  const productList = params.productNames?.length
    ? params.productNames.join(', ')
    : '미지정';

  const subject = `[KERYX] 새 상담 신청 - ${typeKo} (${params.contactName})`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Apple SD Gothic Neo','Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:640px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <!-- 헤더 -->
    <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">KERYX</h1>
      <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:13px;">새 상담 신청 알림 · 新咨询申请通知</p>
    </div>
    <!-- 알림 배너 -->
    <div style="background:#fff7ed;border-left:4px solid #f97316;padding:16px 24px;margin:0;">
      <p style="margin:0;font-size:15px;color:#9a3412;font-weight:600;">
        새로운 <strong>${typeKo}</strong> 신청이 접수되었습니다
      </p>
      <p style="margin:4px 0 0;font-size:13px;color:#c2410c;">
        收到新的 <strong>${typeZh}</strong> 申请
      </p>
    </div>
    <!-- 신청 정보 -->
    <div style="padding:32px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="padding:10px 0;color:#6b7280;width:120px;vertical-align:top;">신청 번호</td>
          <td style="padding:10px 0;color:#111827;font-weight:600;font-family:monospace;">${params.consultationId.substring(0, 8).toUpperCase()}</td>
        </tr>
        <tr style="border-top:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;vertical-align:top;">신청 유형</td>
          <td style="padding:10px 0;">
            <span style="background:#fff7ed;color:#ea580c;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">${typeKo} / ${typeZh}</span>
          </td>
        </tr>
        <tr style="border-top:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;vertical-align:top;">신청자</td>
          <td style="padding:10px 0;color:#111827;font-weight:600;">${params.contactName}</td>
        </tr>
        <tr style="border-top:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;vertical-align:top;">이메일</td>
          <td style="padding:10px 0;color:#111827;">
            <a href="mailto:${params.contactEmail}" style="color:#f97316;text-decoration:none;">${params.contactEmail}</a>
          </td>
        </tr>
        ${params.contactPhone ? `
        <tr style="border-top:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;vertical-align:top;">연락처</td>
          <td style="padding:10px 0;color:#111827;">${params.contactPhone}</td>
        </tr>` : ''}
        ${params.companyName ? `
        <tr style="border-top:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;vertical-align:top;">회사명</td>
          <td style="padding:10px 0;color:#111827;">${params.companyName}</td>
        </tr>` : ''}
        <tr style="border-top:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;vertical-align:top;">선호 연락</td>
          <td style="padding:10px 0;color:#111827;">${params.preferredContact || '이메일'}</td>
        </tr>
        <tr style="border-top:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;vertical-align:top;">관심 상품</td>
          <td style="padding:10px 0;color:#111827;">${productList}</td>
        </tr>
        ${params.wantSample ? `
        <tr style="border-top:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;vertical-align:top;">샘플 요청</td>
          <td style="padding:10px 0;"><span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">샘플 요청 있음</span></td>
        </tr>` : ''}
        ${params.requirements ? `
        <tr style="border-top:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;vertical-align:top;">요구사항</td>
          <td style="padding:10px 0;color:#374151;line-height:1.6;">${params.requirements.replace(/\n/g, '<br>')}</td>
        </tr>` : ''}
        <tr style="border-top:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;vertical-align:top;">신청 시각</td>
          <td style="padding:10px 0;color:#6b7280;font-size:13px;">${params.submittedAt}</td>
        </tr>
      </table>
      <!-- CTA 버튼 -->
      <div style="text-align:center;margin:32px 0 0;">
        <a href="${params.adminUrl}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">
          관리자 페이지에서 확인하기 →
        </a>
      </div>
    </div>
    <!-- 푸터 -->
    <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 KERYX · YIWU SENKANG DAILY NECESSITIES CO., LTD</p>
      <p style="margin:4px 0 0;font-size:11px;color:#d1d5db;">이 메일은 자동 발송된 알림입니다. 회신하지 마세요.</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

export function buildConsultationAdminSms(params: ConsultationNotificationParams): string {
  const typeLabel: Record<string, string> = {
    sample_request: '샘플신청',
    quote_request: '견적요청',
    general: '일반문의',
    factory_match: '공장매칭',
  };
  const typeKo = typeLabel[params.inquiryType] || params.inquiryType;
  return `[KERYX] 새 ${typeKo} 접수\n신청자: ${params.contactName}\n연락처: ${params.contactEmail}\n관리자 확인: ${params.adminUrl}`;
}
