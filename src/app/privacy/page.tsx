'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';

export default function PrivacyPage() {
  const [lang, setLang] = useState<'ko' | 'zh' | 'en'>('ko');

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8', fontFamily: 'sans-serif' }}>

      <PublicHeader lang={lang as "ko" | "zh"} onLangChange={setLang as (l: "ko" | "zh") => void} />

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 80px' }}>
        {lang === 'ko' ? (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#09090b', marginBottom: 8 }}>개인정보처리방침</h1>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 40 }}>최종 수정일: 2026년 5월 1일 | 시행일: 2026년 5월 1일</p>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>1. 개인정보의 수집 및 이용 목적</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                가자트레이드(이하 "회사")는 다음의 목적으로 개인정보를 수집·이용합니다.<br/>
                ① 회원 가입 및 서비스 제공<br/>
                ② 공장 매칭 및 소싱 서비스 운영<br/>
                ③ 멤버십 결제 및 구독 관리<br/>
                ④ 고객 문의 응대 및 서비스 개선<br/>
                ⑤ 법령 준수 및 분쟁 해결
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>2. 수집하는 개인정보 항목</h2>
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr className="bg-[#f9fafb]">
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>구분</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>필수 항목</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>선택 항목</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>회원 가입</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>이메일, 비밀번호, 회사명, 담당자명</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>전화번호, 사업자번호</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>결제</td>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>결제 수단, 결제 금액, 거래 ID</td>
                      <td style={{ padding: '10px 12px', color: '#6b7280' }}>-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>3. 개인정보의 보유 및 이용 기간</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                ① 회원 탈퇴 시 즉시 삭제합니다. 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.<br/>
                ② 전자상거래법에 따른 계약·청약 기록: 5년<br/>
                ③ 소비자 불만·분쟁 처리 기록: 3년<br/>
                ④ 접속 로그: 3개월
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>4. 개인정보의 제3자 제공</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 단, 다음의 경우는 예외입니다.<br/>
                ① 이용자가 사전에 동의한 경우<br/>
                ② 법령에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우<br/>
                ③ 공장 매칭 서비스 제공을 위해 필요한 최소한의 정보를 공장 파트너에게 제공하는 경우 (이름, 연락처에 한함)
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>5. 개인정보 처리 위탁</h2>
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr className="bg-[#f9fafb]">
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>수탁업체</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>위탁 업무</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>Supabase Inc.</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>데이터베이스 및 인증 서비스</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>Vercel Inc.</td>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>웹 서비스 호스팅</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>6. 이용자의 권리</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                이용자는 언제든지 다음의 권리를 행사할 수 있습니다.<br/>
                ① 개인정보 열람 요청<br/>
                ② 개인정보 정정·삭제 요청<br/>
                ③ 개인정보 처리 정지 요청<br/>
                ④ 서비스 탈퇴 및 계정 삭제<br/><br/>
                권리 행사는 support@keryx.kr로 이메일 문의 또는 서비스 내 "계정 설정"에서 직접 처리 가능합니다.
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>7. 쿠키 사용</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                회사는 로그인 상태 유지, 서비스 개선을 위해 쿠키를 사용합니다. 브라우저 설정에서 쿠키 허용/거부를 선택할 수 있으나, 거부 시 일부 서비스 이용이 제한될 수 있습니다.
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>8. 개인정보 보호책임자</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                성명: 조은진<br/>
                직위: 대표<br/>
                이메일: support@keryx.kr<br/>
                운영시간: 평일 09:00~18:00 (KST)
              </p>
            </section>

            <section style={{ background: '#fef9c3', borderRadius: 12, padding: 24, border: '1px solid #fde68a' }}>
              <p style={{ color: '#92400e', fontSize: 14, lineHeight: 1.8 }}>
                개인정보 침해 신고는 개인정보보호위원회(privacy.go.kr, 국번없이 182) 또는 한국인터넷진흥원(118)에 문의하실 수 있습니다.
              </p>
            </section>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#09090b', marginBottom: 8 }}>隐私政策</h1>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 40 }}>最后修改日期：2026年5月1日 | 生效日期：2026年5月1日</p>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>1. 个人信息的收集及使用目的</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                가자트레이드（以下简称"公司"）出于以下目的收集和使用个人信息：<br/>
                ① 会员注册及服务提供<br/>
                ② 工厂匹配及采购服务运营<br/>
                ③ 会员资格付款及订阅管理<br/>
                ④ 客户咨询响应及服务改善<br/>
                ⑤ 法律合规及纠纷解决
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>2. 收集的个人信息项目</h2>
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr className="bg-[#f9fafb]">
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>类别</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>必填项目</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>选填项目</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>会员注册</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>邮箱、密码、公司名称、负责人姓名</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>电话号码、营业执照号码</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>付款</td>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>付款方式、付款金额、交易ID</td>
                      <td style={{ padding: '10px 12px', color: '#6b7280' }}>-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>3. 个人信息的保留及使用期限</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                ① 会员注销时立即删除。但根据相关法律法规需要保存的情况除外。<br/>
                ② 合同及申请记录：5年<br/>
                ③ 消费者投诉及纠纷处理记录：3年<br/>
                ④ 访问日志：3个月
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>4. 用户权利</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                用户可随时行使以下权利：<br/>
                ① 申请查阅个人信息<br/>
                ② 申请更正或删除个人信息<br/>
                ③ 申请停止处理个人信息<br/>
                ④ 注销服务及删除账户<br/><br/>
                请发送邮件至 support@keryx.kr 行使上述权利。
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>5. 个人信息处理委托</h2>
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr className="bg-[#f9fafb]">
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>受托方</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>委托业务</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>Supabase Inc.</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>数据库及认证服务</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>Vercel Inc.</td>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>网络服务托管</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section style={{ background: '#f0f9ff', borderRadius: 12, padding: 24, border: '1px solid #bae6fd' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0369a1', marginBottom: 8 }}>个人信息保护负责人</h2>
              <p style={{ color: '#374151', fontSize: 14, lineHeight: 2 }}>
                姓名：조은진<br/>
                职位：代表<br/>
                邮箱：support@keryx.kr<br/>
                运营时间：工作日 09:00~18:00 (KST)
              </p>
            </section>
          </>
        )}

        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <Link href="/terms" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: 600, marginRight: 24 }}>
            {lang === 'ko' ? '← 이용약관' : '← 服务条款'}
          </Link>
          <Link href="/" style={{ color: '#6b7280', textDecoration: 'none' }}>
            {lang === 'ko' ? '홈으로' : '返回首页'}
          </Link>
        </div>
      </main>
    </div>
  );
}
