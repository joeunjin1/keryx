# KERYX 솔루션 마스터 보고서

본 문서는 KERYX B2B 무역 솔루션의 전체 사이트맵, 사용 설명서, 외부 서비스 연동 정보 및 개발자/서버 관리자를 위한 기술 문서를 종합한 마스터 가이드입니다.

---

## 1. 사이트맵 (Sitemap)

KERYX 솔루션은 사용자 역할(Role)에 따라 4개의 주요 포털과 공통 페이지로 구성되어 있습니다.

### 1.1 공통 페이지 (Public)
| 경로 | 설명 | 접근 권한 |
|---|---|---|
| `/` | 메인 랜딩 페이지 | 모두 |
| `/login` | 로그인 | 모두 |
| `/signup` | 회원가입 | 모두 |
| `/register` | 셀러/공장 등록 신청 | 모두 |
| `/membership` | 멤버십 안내 및 가격 | 모두 |
| `/shop` | 공개 상품 카탈로그 | 모두 |
| `/faq`, `/support` | 고객 지원 및 자주 묻는 질문 | 모두 |
| `/terms`, `/privacy` | 이용약관 및 개인정보처리방침 | 모두 |

### 1.2 관리자 포털 (Admin)
**접근 권한:** `internal_users` 테이블의 `role = 'admin'`

| 경로 | 설명 |
|---|---|
| `/admin` | 관리자 대시보드 홈 |
| `/admin/members/sellers` | 바이어(셀러) 회원 관리 |
| `/admin/members/factories` | 공장 회원 관리 |
| `/admin/members/staff` | 내부 직원(MD) 관리 |
| `/admin/products` | 전체 상품 마스터 데이터 관리 |
| `/admin/products/price-approvals` | 상품 단가 변경 승인 |
| `/admin/orders` | 전체 주문 현황 관리 |
| `/admin/subscriptions` | 멤버십 구독 현황 및 결제 관리 |
| `/admin/ip-studio` | IP 캐릭터 및 디자인 자산 관리 |
| `/admin/ip-approvals` | IP 라이선스 사용 승인 |
| `/admin/health` | 시스템 상태 및 에러 로그 모니터링 |

### 1.3 MD 포털 (Staff)
**접근 권한:** `internal_users` 테이블의 `role = 'md'` (또는 admin)

| 경로 | 설명 |
|---|---|
| `/md` | MD 대시보드 홈 |
| `/md/sellers` | 담당 바이어(셀러) 목록 및 관리 |
| `/md/factory` | 담당 공장 목록 및 소통 |
| `/md/products` | 담당 상품 데이터 관리 |
| `/md/orders` | 담당 주문 처리 및 발주 |
| `/md/briefs` | 바이어의 소싱/디자인 의뢰(Brief) 처리 |
| `/md/chat` | 바이어 및 공장과의 실시간 채팅 |
| `/md/inspections` | 상품 검수 및 사진 업로드 |
| `/md/performance` | MD 개인 실적 및 KPI |

### 1.4 셀러 포털 (Buyer)
**접근 권한:** `sellers` 테이블에 등록된 사용자 (또는 admin)

| 경로 | 설명 |
|---|---|
| `/seller` | 셀러 대시보드 홈 |
| `/seller/catalog` | 전용 상품 카탈로그 (B2B 단가 적용) |
| `/seller/orders` | 발주 내역 및 배송 조회 |
| `/seller/research` | 시장 조사 및 소싱 의뢰 |
| `/seller/inspections` | 검수 결과 및 사진 확인 |
| `/seller/messages` | 전담 MD와의 실시간 채팅 |
| `/seller/membership` | 현재 구독 중인 멤버십 현황 및 업그레이드 |
| `/seller/payments` | 결제 내역 및 인보이스 |

### 1.5 공장 포털 (Factory)
**접근 권한:** `factories` 테이블에 등록된 사용자 (또는 admin)

| 경로 | 설명 |
|---|---|
| `/factory` | 공장 대시보드 홈 |
| `/factory/products` | 생산 가능한 상품 등록 및 단가 관리 |
| `/factory/orders` | 수주 내역 및 생산 일정 관리 |
| `/factory/briefs` | MD가 요청한 소싱/견적 의뢰 확인 |
| `/factory/messages` | 담당 MD와의 실시간 채팅 |
| `/factory/profile` | 공장 정보 및 인증서 관리 |

---

## 2. 외부 서비스 연동 정보 (Credentials & APIs)

KERYX 솔루션은 안정적인 운영을 위해 다양한 외부 SaaS 및 API를 사용합니다. 모든 API 키는 Vercel 환경변수에 안전하게 저장되어 있습니다.

### 2.1 데이터베이스 및 인증 (Supabase)
- **용도:** PostgreSQL 데이터베이스, 사용자 인증(Auth), 파일 스토리지(Storage), 실시간 통신(Realtime)
- **URL:** `https://iqfcfpkztoyuzbeqodbq.supabase.co`
- **환경변수:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (클라이언트용 공개 키)
  - `SUPABASE_SERVICE_ROLE_KEY` (서버 전용 관리자 키 - **절대 노출 금지**)
- **관리자 대시보드:** [Supabase Dashboard](https://supabase.com/dashboard)

### 2.2 AI 및 번역 (Anthropic Claude & OpenAI)
- **용도:** 다국어 자동 번역(한/중/영), 상품 매칭 추천, 시장 조사 보고서 초안 작성
- **환경변수:**
  - `ANTHROPIC_API_KEY` (Claude 3.5 Sonnet 등 사용)
  - `OPENAI_API_KEY` (보조 AI 모델용)

### 2.3 환율 정보 (Exchange Rate API)
- **용도:** CNY(위안화) ↔ KRW(원화) ↔ USD(달러) 실시간 환율 동기화 (매일 자정 크론 잡 실행)
- **환경변수:** `EXCHANGE_RATE_API_KEY`

### 2.4 호스팅 및 배포 (Vercel)
- **용도:** Next.js 애플리케이션 호스팅, CI/CD 자동 배포, 서버리스 함수 실행
- **프로젝트 URL:** `https://vercel.com/joeunjin1s-projects/keryx`
- **연결 도메인:** `keryx.kr`, `keryx.kr`, `www.keryx.kr`

---

## 3. 개발자 및 서버 관리자 가이드

### 3.1 기술 스택 (Tech Stack)
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, `clsx`, `tailwind-merge`
- **Database/Backend:** Supabase (PostgreSQL, Row Level Security)
- **i18n:** `next-intl` (한국어, 중국어, 영어, 일본어 지원)
- **Icons:** `lucide-react`

### 3.2 데이터베이스 구조 (Core Tables)
주요 테이블은 `src/types/database.ts`에 정의되어 있으며, Supabase 마이그레이션 파일(`supabase/migrations/`)을 통해 관리됩니다.
- `user_profiles`: 기본 사용자 정보
- `internal_users`: 관리자 및 MD 정보 (`role`: 'admin', 'md')
- `sellers`: 바이어(셀러) 정보 및 멤버십 등급
- `factories`: 공장 정보 및 평가 등급
- `products`: 상품 마스터 데이터
- `orders`: 주문 및 발주 데이터
- `subscriptions`, `subscription_plans`: 멤버십 구독 및 결제 정보
- `messages`, `conversations`: 실시간 채팅 데이터

### 3.3 보안 및 권한 관리 (RLS)
데이터 접근 제어는 애플리케이션 코드가 아닌 **Supabase Row Level Security (RLS)** 정책을 통해 데이터베이스 레벨에서 강제됩니다.
- **원가 격리:** 공장 공급가(`cost_price`)는 Admin과 MD만 볼 수 있으며, Seller에게는 노출되지 않습니다.
- **데이터 분리:** Seller는 자신의 주문과 담당 MD와의 채팅만 볼 수 있으며, 다른 Seller나 Factory의 데이터에 접근할 수 없습니다.
- **Admin 바이패스:** `internal_users` 테이블에 `role = 'admin'`으로 등록된 사용자는 모든 데이터에 접근 가능합니다.

### 3.4 배포 프로세스 (CI/CD)
1. 코드를 GitHub `main` 브랜치에 Push합니다.
2. Vercel이 자동으로 변경 사항을 감지하고 빌드를 시작합니다.
3. 빌드 중 TypeScript 타입 검사와 ESLint 검사가 실행됩니다. (오류 발생 시 배포 중단)
4. 빌드 성공 시 `keryx.kr` 도메인으로 자동 배포됩니다.

### 3.5 크론 잡 (Cron Jobs)
Vercel의 `vercel.json`에 정의된 스케줄에 따라 서버리스 함수가 자동 실행됩니다.
- **환율 동기화:** 매일 자정 (`/api/cron/exchange-rates`)
- **일일 알림 발송:** 매일 새벽 1시 (`/api/cron/daily-alerts`)

---

## 4. 사용자 기본 사용 설명서

### 4.1 관리자 (Admin)
- **로그인:** `jo@keryx.kr` 계정으로 로그인하면 모든 포털에 접근할 수 있습니다.
- **직원 관리:** `/admin/members/staff`에서 새 MD 계정을 생성하고 권한을 부여할 수 있습니다.
- **상품 단가 승인:** MD가 상품의 원가나 판매가를 변경하면 `/admin/products/price-approvals`에서 승인해야 최종 반영됩니다.

### 4.2 MD (Staff)
- **바이어 관리:** 할당된 바이어의 문의에 응답하고, 소싱 요청(`/md/briefs`)을 처리합니다.
- **공장 소통:** 바이어의 요청에 맞는 공장을 찾고, 견적을 받아 시스템에 등록합니다.
- **검수 보고:** 상품 출고 전 `/md/inspections`에서 검수 사진을 업로드하고 상태를 보고합니다.

### 4.3 바이어 (Seller)
- **상품 소싱:** `/seller/catalog`에서 상품을 검색하거나, `/seller/research`에서 원하는 상품의 소싱을 의뢰합니다.
- **주문 및 결제:** 장바구니에 상품을 담아 발주하고, 인보이스를 확인하여 결제를 진행합니다.
- **멤버십 관리:** `/seller/membership`에서 현재 구독 등급을 확인하고, 필요시 상위 티어로 업그레이드할 수 있습니다.

### 4.4 공장 (Factory)
- **상품 등록:** 생산 가능한 상품의 스펙과 단가를 `/factory/products`에 등록합니다.
- **견적 제출:** MD가 요청한 소싱 의뢰(`/factory/briefs`)에 대해 생산 단가와 일정을 회신합니다.
- **생산 현황 업데이트:** 수주받은 주문의 생산 진행 상황을 시스템에 업데이트합니다.
