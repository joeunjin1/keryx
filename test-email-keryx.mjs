import { Resend } from 'resend';

const RESEND_API_KEY = 're_TrWSpN1M_Booqn7nAzhbCdKjr6nPbThGD';
const resend = new Resend(RESEND_API_KEY);

console.log('=== KERYX 이메일 발송 테스트 ===');
console.log('발신: onboarding@resend.dev');
console.log('수신: mireang66@gmail.com');
console.log('');

try {
  const result = await resend.emails.send({
    from: 'KERYX 플랫폼 <onboarding@resend.dev>',
    to: ['mireang66@gmail.com'],
    subject: '[KERYX] 이메일 발송 시스템 테스트 - 공장 매칭 보고서',
    html: `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px; text-align: center;">
      <h1 style="color: #FFD700; margin: 0; font-size: 28px; letter-spacing: 4px;">KERYX</h1>
      <p style="color: #aaa; margin: 8px 0 0; font-size: 14px;">Korea-China B2B Trade Platform</p>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #1a1a2e; font-size: 20px; margin: 0 0 16px;">공장 매칭 보고서 이메일 테스트</h2>
      <p style="color: #333; font-size: 15px; line-height: 1.7;">
        안녕하세요! KERYX 플랫폼 이메일 발송 시스템 테스트입니다.<br>
        이 이메일이 정상적으로 수신되면 이메일 발송 기능이 정상 작동 중입니다.
      </p>
      <div style="background: #f0f0ff; border-left: 4px solid #6366f1; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #374151;"><strong>발신 서비스:</strong> Resend (도쿄 리전)</p>
        <p style="margin: 8px 0 0; font-size: 14px; color: #374151;"><strong>도메인 인증:</strong> keryx.kr DNS 전파 대기 중</p>
        <p style="margin: 8px 0 0; font-size: 14px; color: #374151;"><strong>인증 완료 후:</strong> noreply@keryx.kr 발송 예정</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://keryx.vercel.app" style="background: #6366f1; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px;">
          KERYX 플랫폼 바로가기
        </a>
      </div>
    </div>
    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0; font-size: 12px; color: #999;">© 2026 KERYX - Korea-China B2B Trade Platform</p>
    </div>
  </div>
</body>
</html>`,
  });

  if (result.error) {
    console.error('이메일 발송 실패:', JSON.stringify(result.error, null, 2));
  } else {
    console.log('이메일 발송 성공!');
    console.log('이메일 ID:', result.data?.id);
    console.log('mireang66@gmail.com 받은편지함을 확인해 주세요!');
  }
} catch (err) {
  console.error('오류:', err.message);
}
