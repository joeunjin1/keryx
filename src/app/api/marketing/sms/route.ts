import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/check-role';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const SOLAPI_API_KEY = process.env.SOLAPI_API_KEY!;
const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET!;
const SOLAPI_SENDER = process.env.SOLAPI_SENDER!;

function getSolapiSignature() {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString('hex');
  const hmac = crypto.createHmac('sha256', SOLAPI_API_SECRET);
  hmac.update(`${date}${salt}`);
  const signature = hmac.digest('hex');
  return { date, salt, signature };
}

async function sendSolapi(to: string, text: string, type: 'SMS' | 'LMS') {
  const { date, salt, signature } = getSolapiSignature();
  const res = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`,
    },
    body: JSON.stringify({
      message: {
        to,
        from: SOLAPI_SENDER,
        text,
        type,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errorMessage ?? 'Solapi 오류');
  return data;
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(['admin', 'marketing']);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { recipient_ids, message, type = 'SMS' } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 });
  }
  if (!recipient_ids || recipient_ids.length === 0) {
    return NextResponse.json({ error: '수신자를 선택해주세요.' }, { status: 400 });
  }

  const supabase = createClient();

  // 수신자 전화번호 조회
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, display_name, phone')
    .in('id', recipient_ids)
    .not('phone', 'is', null);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const recipients = (profiles ?? []).filter(p => p.phone?.trim());
  if (recipients.length === 0) {
    return NextResponse.json({ error: '전화번호가 등록된 수신자가 없습니다.' }, { status: 400 });
  }

  let successCount = 0;
  let failedCount = 0;
  const results: { id: string; phone: string; success: boolean; error?: string }[] = [];

  for (const recipient of recipients) {
    try {
      await sendSolapi(recipient.phone!, message, type as 'SMS' | 'LMS');
      successCount++;
      results.push({ id: recipient.id, phone: recipient.phone!, success: true });
    } catch (err) {
      failedCount++;
      results.push({ id: recipient.id, phone: recipient.phone!, success: false, error: String(err) });
    }
  }

  // 발송 이력 저장
  try {
    const { data: campaign } = await supabase
      .from('sms_campaigns')
      .insert({
        sender_id: user.id,
        message,
        type,
        total_count: recipients.length,
        success_count: successCount,
        failed_count: failedCount,
        status: failedCount === 0 ? 'completed' : successCount === 0 ? 'failed' : 'partial',
      })
      .select('id')
      .single();

    if (campaign) {
      await supabase.from('sms_campaign_recipients').insert(
        results.map(r => ({
          campaign_id: campaign.id,
          recipient_id: r.id,
          phone: r.phone,
          status: r.success ? 'sent' : 'failed',
          error_message: r.error,
        }))
      );
    }
  } catch (historyErr) {
    console.error('이력 저장 실패:', historyErr);
  }

  return NextResponse.json({
    success: successCount,
    failed: failedCount,
    message: successCount > 0
      ? `${successCount}명에게 문자를 발송했습니다.${failedCount > 0 ? ` (${failedCount}건 실패)` : ''}`
      : '문자 발송에 실패했습니다.',
  });
}
