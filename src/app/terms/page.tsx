'use client';
import { useState } from 'react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';

export default function TermsPage() {
  const [lang, setLang] = useState<'ko' | 'zh' | 'en'>('ko');

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8', fontFamily: 'sans-serif' }}>
      <PublicHeader lang={lang as "ko" | "zh"} onLangChange={setLang as (l: "ko" | "zh") => void} />

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 80px' }}>
        {lang === 'ko' ? (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#09090b', marginBottom: 8 }}>이용약관</h1>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 40 }}>최종 수정일: 2026년 5월 1일 | 시행일: 2026년 5월 1일</p>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>제1조 (목적)</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                본 약관은 가자트레이드(이하 "회사")가 운영하는 KERYX 플랫폼(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>제2조 (정의)</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                ① "서비스"란 회사가 제공하는 중국 공장 소싱 매칭, B2B 상품 거래, 시장조사, 품질 검수 등 일체의 서비스를 의미합니다.<br/>
                ② "바이어(고객)"란 서비스에 가입하여 중국 공장 상품을 소싱하는 한국 및 해외 사업자를 의미합니다.<br/>
                ③ "공장 파트너"란 서비스에 등록하여 상품을 공급하는 중국 제조 공장을 의미합니다.<br/>
                ④ "서비스 요청"이란 공장 매칭, 샘플 개발, 시장조사, 검수 대행, 물류 대행 등 고객이 신청하는 개별 업무를 의미합니다.
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>제3조 (약관의 효력 및 변경)</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                ① 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.<br/>
                ② 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경 시 7일 전에 공지합니다.<br/>
                ③ 이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>제4조 (서비스 이용)</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                ① 서비스는 연중무휴 24시간 제공함을 원칙으로 합니다. 단, 시스템 점검 등의 사유로 일시 중단될 수 있습니다.<br/>
                ② 공장 매칭 진단 및 초기 상담은 무료로 제공됩니다.<br/>
                ③ 샘플 제작·검수·물류 등 실제 업무가 발생하는 경우, 착수 전 항목별 견적서를 제시하며 고객 동의 후 진행됩니다.<br/>
                ④ 공장 매칭 요청·주문·단가 협의 등은 회원 가입 후 이용 가능합니다.
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>제5조 (IP 보호 및 기밀 유지)</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                ① 회사는 바이어(고객)가 제공하는 디자인, 캐릭터 IP, 상품 기획 정보를 엄격히 보호합니다.<br/>
                ② 공장 파트너는 회사와 비밀유지계약(NDA)을 체결하며, 바이어(고객)의 디자인 자산을 무단으로 사용·공유·복제할 수 없습니다.<br/>
                ③ NDA 위반 시 계약 해지 및 법적 책임을 질 수 있습니다.
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>제6조 (결제 및 환불)</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                ① 서비스 비용은 업무 착수 전 항목별 견적서를 발행하며, 위챗페이·알리페이·계좌이체 등으로 결제할 수 있습니다.<br/>
                ② 착수 전 취소 시 요금이 청구되지 않습니다.<br/>
                ③ 업무 착수 후 취소 시 진행 비율에 따라 환불이 처리됩니다.<br/>
                ④ 공장 귀책 사유로 인한 품질 불량 시 재작업 또는 환불 협의가 가능합니다.
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>제7조 (이용자 의무)</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                이용자는 다음 행위를 하여서는 안 됩니다.<br/>
                ① 타인의 정보 도용 또는 허위 정보 등록<br/>
                ② 서비스를 통해 취득한 공장 정보의 무단 외부 공유<br/>
                ③ 불법 상품 소싱 또는 지식재산권 침해 상품 거래<br/>
                ④ 서비스 시스템 해킹, 크롤링, 자동화 접근
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>제8조 (면책 조항)</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                ① 회사는 공장과 바이어 간의 직접 거래에서 발생하는 분쟁에 대해 중재 역할을 수행하나, 최종 책임은 당사자 간에 있습니다.<br/>
                ② 천재지변, 전쟁, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 회사는 책임을 지지 않습니다.
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>제9조 (준거법 및 관할)</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                ① 본 약관은 대한민국 법률에 따라 해석됩니다.<br/>
                ② 서비스 이용과 관련한 분쟁은 회사 소재지 관할 법원을 제1심 법원으로 합니다.
              </p>
            </section>

            <section style={{ background: '#f0f9ff', borderRadius: 12, padding: 24, border: '1px solid #bae6fd' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0369a1', marginBottom: 8 }}>운영사 정보</h2>
              <p style={{ color: '#374151', fontSize: 14, lineHeight: 2 }}>
                상호: 가자트레이드<br/>
                사업자등록번호: 609-81-63010<br/>
                대표자: 조은진<br/>
                이메일: support@keryx.kr<br/>
                운영시간: 평일 09:00~18:00 (KST)
              </p>
            </section>
          </>
        ) : lang === 'zh' ? (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#09090b', marginBottom: 8 }}>服务条款</h1>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 40 }}>最后修改日期：2026年5月1日 | 生效日期：2026年5月1日</p>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>第一条（目的）</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                本条款旨在规定가자트레이드（以下简称"公司"）运营的KERYX平台（以下简称"服务"）使用过程中，公司与用户之间的权利、义务及责任事项。
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>第二条（定义）</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                ① "服务"是指公司提供的中国工厂采购匹配、B2B商品交易、市场调研、质量检验等全部服务。<br/>
                ② "买家（客户）"是指注册服务以从中国工厂采购商品的韩国及海外经营者。<br/>
                ③ "工厂合作伙伴"是指注册服务并供应商品的中国制造工厂。<br/>
                ④ "服务申请"是指客户委托的工厂匹配、样品开发、市场调研、验货代理、物流代理等个别业务。
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>第三条（IP保护及保密）</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                ① 公司严格保护买家（客户）提供的设计、角色IP及商品企划信息。<br/>
                ② 工厂合作伙伴须与公司签订保密协议（NDA），不得擅自使用、共享或复制买家（客户）的设计资产。<br/>
                ③ 违反NDA可能导致合同终止及承担法律责任。
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>第四条（付款及退款）</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                ① 服务费用在启动前发送逐项报价单，可通过微信支付、支付宝、银行转账等方式支付。<br/>
                ② 启动前取消不收取费用。<br/>
                ③ 启动后取消按进度比例退款处理。<br/>
                ④ 因工厂原因导致质量问题时，可协商返工或退款。
              </p>
            </section>

            <section style={{ background: '#f0f9ff', borderRadius: 12, padding: 24, border: '1px solid #bae6fd' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0369a1', marginBottom: 8 }}>运营商信息</h2>
              <p style={{ color: '#374151', fontSize: 14, lineHeight: 2 }}>
                公司名称：가자트레이드<br/>
                营业执照号：609-81-63010<br/>
                代表：조은진<br/>
                邮箱：support@keryx.kr<br/>
                运营时间：工作日 09:00~18:00 (KST)
              </p>
            </section>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#09090b', marginBottom: 8 }}>Terms of Service</h1>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 40 }}>Last updated: May 1, 2026 | Effective: May 1, 2026</p>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>Article 1 (Purpose)</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                These Terms govern the rights, obligations, and responsibilities between Gaza Trade Co. ("Company") and users of the KERYX platform ("Service").
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>Article 2 (Definitions)</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                ① "Service" means all services provided by the Company including China factory sourcing, B2B trade, market research, and quality inspection.<br/>
                ② "Buyer (Client)" means a Korean or overseas business operator who registers to source products from Chinese factories.<br/>
                ③ "Factory Partner" means a Chinese manufacturer registered to supply products through the Service.<br/>
                ④ "Service Request" means individual tasks requested by clients such as factory matching, sample development, market research, inspection, or logistics.
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>Article 3 (Service Use)</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                ① The Service is available 24/7 in principle, subject to temporary interruptions for maintenance.<br/>
                ② Factory matching diagnosis and initial consultation are provided free of charge.<br/>
                ③ For services involving actual work (samples, inspection, logistics), an itemized quote is provided before commencement and work begins only upon client approval.<br/>
                ④ Factory matching requests, orders, and price negotiations require user registration.
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>Article 4 (IP Protection & Confidentiality)</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                ① The Company strictly protects designs, character IPs, and product planning information provided by clients.<br/>
                ② Factory Partners must sign an NDA with the Company and may not use, share, or copy client design assets without authorization.<br/>
                ③ NDA violations may result in contract termination and legal liability.
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090b', marginBottom: 12 }}>Article 5 (Payment & Refund)</h2>
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
                ① An itemized quote is issued before commencement; payment is accepted via WeChat Pay, Alipay, or bank transfer.<br/>
                ② Cancellation before commencement incurs no charge.<br/>
                ③ Cancellation after commencement is refunded proportionally based on progress.<br/>
                ④ Quality defects attributable to the factory may be resolved through rework or refund negotiation.
              </p>
            </section>

            <section style={{ background: '#f0f9ff', borderRadius: 12, padding: 24, border: '1px solid #bae6fd' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0369a1', marginBottom: 8 }}>Company Information</h2>
              <p style={{ color: '#374151', fontSize: 14, lineHeight: 2 }}>
                Company: Gaza Trade Co.<br/>
                Business Reg. No.: 609-81-63010<br/>
                Representative: Eunjin Cho<br/>
                Email: support@keryx.kr<br/>
                Hours: Weekdays 09:00~18:00 (KST)
              </p>
            </section>
          </>
        )}

        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <a href="/privacy" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: 600, marginRight: 24 }}>
            {lang === 'ko' ? '개인정보처리방침 →' : lang === 'zh' ? '隐私政策 →' : 'Privacy Policy →'}
          </a>
          <a href="/" style={{ color: '#6b7280', textDecoration: 'none' }}>
            {lang === 'ko' ? '홈으로' : lang === 'zh' ? '返回首页' : 'Back to Home'}
          </a>
        </div>
      </main>

      <PublicFooter lang={lang} />
    </div>
  );
}
