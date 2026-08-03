import { SolapiMessageService } from 'solapi';

const SOLAPI_API_KEY = 'NCSK3CAEWWOGGTIT';
const SOLAPI_API_SECRET = 'JSOEHI0ZYKWGYDVV53FXWTRYFFKHR67V';
const SOLAPI_SENDER = '01036363551';

const service = new SolapiMessageService(SOLAPI_API_KEY, SOLAPI_API_SECRET);

console.log('=== KERYX 문자 발송 테스트 ===');
console.log('발신번호:', SOLAPI_SENDER);
console.log('수신번호: 01036363551');
console.log('');

try {
  const result = await service.send({
    to: '01036363551',
    from: SOLAPI_SENDER,
    text: '[KERYX] 문자발송 테스트. 정상수신확인.',
    type: 'SMS',
  });

  console.log('문자 발송 성공!');
  console.log('결과:', JSON.stringify(result, null, 2));
} catch (err) {
  console.error('문자 발송 실패:', err.message);
  // failedMessageList 확인
  if (err.failedMessageList) {
    console.error('실패 메시지 목록:', JSON.stringify(err.failedMessageList, null, 2));
  }
  // 전체 에러 객체 출력
  const errObj = {};
  Object.getOwnPropertyNames(err).forEach(key => { errObj[key] = err[key]; });
  console.error('전체 에러:', JSON.stringify(errObj, null, 2));
}
