// KERYX 문자 발송 실제 테스트
// 실행: node test-sms.mjs

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env.local') });

console.log('=== KERYX 문자 발송 테스트 ===');
console.log(`발신번호: ${process.env.SOLAPI_SENDER}`);
console.log(`수신번호: 01036363551`);
console.log('');

async function testSMS() {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const sender = process.env.SOLAPI_SENDER;

  if (!apiKey || !apiSecret || !sender) {
    console.error('❌ Solapi 환경변수 누락:', { apiKey: !!apiKey, apiSecret: !!apiSecret, sender: !!sender });
    return false;
  }

  try {
    // Solapi SDK 동적 임포트
    const { SolapiMessageService } = await import('solapi');
    const service = new SolapiMessageService(apiKey, apiSecret);

    const message = `[KERYX] 문자 발송 테스트
공장 매칭 보고서가 등록되었습니다.
KERYX 플랫폼에서 확인하세요.
발송시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;

    console.log('발송 메시지:');
    console.log(message);
    console.log('');

    const result = await service.send({
      to: '01036363551',
      from: sender,
      text: message,
    });

    console.log('✅ 문자 발송 성공!');
    console.log('   결과:', JSON.stringify(result, null, 2));
    return true;
  } catch (error) {
    console.error('❌ 문자 발송 오류:', error.message);
    if (error.response) {
      console.error('   응답:', error.response.data);
    }
    return false;
  }
}

testSMS().then(success => {
  process.exit(success ? 0 : 1);
});
