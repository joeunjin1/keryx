// KERYX 이메일 발송 실제 테스트
// 실행: node test-email.mjs

import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env.local') });

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@keryx.kr';

console.log('=== KERYX 이메일 발송 테스트 ===');
console.log(`발신: ${fromEmail}`);
console.log(`수신: gjtrade@naver.com`);
console.log('');

async function testEmail() {
  try {
    const result = await resend.emails.send({
      from: `KERYX 플랫폼 <${fromEmail}>`,
      to: ['gjtrade@naver.com'],
      subject: '[KERYX] 이메일 발송 테스트 - 공장 매칭 보고서',
      html: `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>KERYX 공장 매칭 보고서</title>
        </head>
        <body style="font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            
            <!-- 헤더 -->
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px; text-align: center;">
              <h1 style="color: #FFD700; margin: 0; font-size: 28px; letter-spacing: 4px;">KERYX</h1>
              <p style="color: #aaa; margin: 8px 0 0; font-size: 14px;">Korea-China B2B Trade Platform</p>
            </div>
            
            <!-- 본문 -->
            <div style="padding: 32px;">
              <h2 style="color: #1a1a2e; font-size: 20px; margin: 0 0 16px;">📋 공장 매칭 보고서 테스트</h2>
              
              <div style="background: #f8f9fa; border-left: 4px solid #FFD700; padding: 16px; border-radius: 4px; margin: 16px 0;">
                <p style="margin: 0; color: #333; font-size: 15px;">
                  안녕하세요! KERYX 플랫폼 이메일 발송 테스트입니다.
                </p>
              </div>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background: #1a1a2e; color: white;">
                  <th style="padding: 12px; text-align: left; font-size: 14px;">항목</th>
                  <th style="padding: 12px; text-align: left; font-size: 14px;">내용</th>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 12px; font-size: 14px; color: #666;">발신 주소</td>
                  <td style="padding: 12px; font-size: 14px; font-weight: bold;">${fromEmail}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee; background: #f9f9f9;">
                  <td style="padding: 12px; font-size: 14px; color: #666;">발송 시각</td>
                  <td style="padding: 12px; font-size: 14px; font-weight: bold;">${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 12px; font-size: 14px; color: #666;">테스트 상태</td>
                  <td style="padding: 12px; font-size: 14px; color: #28a745; font-weight: bold;">✅ 정상 발송</td>
                </tr>
                <tr style="background: #f9f9f9;">
                  <td style="padding: 12px; font-size: 14px; color: #666;">플랫폼</td>
                  <td style="padding: 12px; font-size: 14px; font-weight: bold;">KERYX B2B Trade Platform</td>
                </tr>
              </table>
              
              <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                  <strong>📌 안내:</strong> 이 이메일은 KERYX 플랫폼의 이메일 발송 시스템 테스트입니다. 
                  실제 서비스에서는 공장 매칭 보고서, 검수 결과, 알림 등이 이 형식으로 발송됩니다.
                </p>
              </div>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="https://keryx.vercel.app" style="background: #FFD700; color: #1a1a2e; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px;">
                  KERYX 플랫폼 바로가기
                </a>
              </div>
            </div>
            
            <!-- 푸터 -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                © 2026 KERYX - Korea-China B2B Trade Platform<br>
                이 이메일은 자동 발송되었습니다. 문의: ${fromEmail}
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (result.error) {
      console.error('❌ 이메일 발송 실패:', result.error);
      return false;
    }

    console.log('✅ 이메일 발송 성공!');
    console.log('   이메일 ID:', result.data?.id);
    return true;
  } catch (error) {
    console.error('❌ 이메일 발송 오류:', error.message);
    return false;
  }
}

testEmail().then(success => {
  process.exit(success ? 0 : 1);
});
