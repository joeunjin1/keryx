# KERYX B2B 솔루션 기술 문서

> **문서 버전**: v2.0 | **최종 업데이트**: 2026-05-07 | **작성**: Manus AI

본 문서는 KERYX B2B 솔루션의 서버 환경, 데이터베이스, 배포 파이프라인, 인증 시스템, 전체 API 목록 및 사이트맵을 정리한 기술 참조 문서입니다. 서버 관리자와 개발자가 시스템을 이해하고 유지보수하는 데 필요한 핵심 정보를 제공합니다.

---

## 1. 시스템 아키텍처 및 기술 스택

KERYX는 Next.js App Router 기반의 풀스택 웹 애플리케이션으로, 서버 컴포넌트와 API 라우트를 통해 백엔드 기능을 처리하며, Supabase를 데이터베이스 및 인증 서버로 사용합니다.

| 영역 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 14.x |
| UI 라이브러리 | React + Tailwind CSS | 18.x |
| 언어 | TypeScript | 5.x |
| 데이터베이스 | Supabase (PostgreSQL) | 최신 |
| 인증 | Supabase Auth (`@supabase/ssr`) | 0.5.x |
| 배포 | Vercel (Serverless) | 최신 |
| 다국어 | next-intl | 최신 |
| AI 기능 | Anthropic Claude API | claude-3.x |
| 환율 정보 | ExchangeRate-API | v6 |

---

## 2. 환경 변수 및 외부 API 연동

Vercel 프로젝트 설정의 **Environment Variables** 탭에 다음 항목들이 모두 설정되어야 합니다. 누락 시 빌드 또는 런타임 오류가 발생합니다.

| 변수명 | 용도 | 공개 여부 |
|--------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 공개 (클라이언트 노출) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 (RLS 적용) | 공개 (클라이언트 노출) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 키 (RLS 우회) | **비공개** (서버 전용) |
| `ANTHROPIC_API_KEY` | Claude AI 번역 및 AI 기능 | **비공개** |
| `EXCHANGERATE_API_KEY` | 실시간 환율 정보 조회 | **비공개** |
| `OPENAI_API_KEY` | OpenAI 기능 (선택) | **비공개** |
| `NEXT_PUBLIC_APP_URL` | 프로덕션 URL | 공개 |
| `NEXT_PUBLIC_APP_NAME` | 앱 이름 (KERYX) | 공개 |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | 기본 언어 (`ko`) | 공개 |

> **주의**: `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트 코드에 노출되어서는 안 됩니다. 서버 API 라우트에서만 사용합니다.

---

## 3. 인증 및 권한 시스템 (2026-05-07 근본 해결 완료)

### 3.1. 인증 패키지 통일 이력

이전에 사용하던 `@supabase/auth-helpers-nextjs` 패키지는 구버전 쿠키 처리 방식을 사용하여 미들웨어와 세션을 공유하지 못하는 근본적인 문제가 있었습니다. 이 패키지를 완전히 제거하고 최신 표준인 `@supabase/ssr`로 통일하여 미들웨어, 서버 컴포넌트, 클라이언트 컴포넌트 간의 쿠키 동기화 문제를 해결했습니다.

| 파일 경로 | 용도 | 사용 함수 |
|-----------|------|-----------|
| `src/lib/supabase/client.ts` | 브라우저(클라이언트 컴포넌트)용 | `createBrowserClient` |
| `src/lib/supabase/server.ts` | 서버 컴포넌트 + API 라우트용 | `createServerClient` |
| `src/lib/supabase/middleware.ts` | Next.js 미들웨어용 세션 갱신 | `createServerClient` |

### 3.2. 권한 체크 중앙화 (`src/lib/auth/check-role.ts`)

모든 페이지와 API 라우트의 권한 체크는 이 단일 파일의 함수를 통해 수행됩니다. 페이지마다 권한 로직을 직접 작성하는 것은 금지됩니다.

| 함수명 | 허용 역할 | 실패 시 리다이렉트 |
|--------|-----------|-------------------|
| `requireAdmin()` | `admin` | `/login?role=internal` |
| `requireInternal()` | `admin`, `md`, `inspector` | `/login?role=internal` |
| `requireSeller()` | `seller`, `admin` | `/login?role=seller` |
| `requireFactory()` | `factory`, `admin` | `/login?role=factory` |
| `requireDesigner()` | `designer`, `admin` | `/login?role=internal` |
| `getAuthUser()` | 모든 역할 | `null` 반환 (API 라우트용) |

### 3.3. 역할(Role) 정의

`user_profiles` 테이블의 `kind` 컬럼에 저장되는 값입니다.

| 역할 값 | 설명 | 접근 포털 |
|---------|------|-----------|
| `admin` | 최고 관리자 | 모든 포털 |
| `md` | MD 직원 (서비스 요청 처리, 공장 매칭) | `/admin`, `/md` |
| `inspector` | 검수 직원 | `/admin`, `/md/inspections` |
| `seller` | 바이어/셀러 (구매자) | `/seller` |
| `factory` | 공장 파트너 | `/factory` |
| `designer` | 디자이너 | `/designer` |

### 3.4. 401 오류 자동 처리 (`src/lib/auth/api-client.ts`)

클라이언트 컴포넌트에서 API를 호출할 때 `apiFetch()` 함수를 사용하면, 토큰 만료로 인한 401 오류 시 자동으로 토큰 갱신을 시도하고 원래 요청을 재시도합니다. 갱신에 실패할 경우에만 로그아웃 처리 후 로그인 페이지로 이동합니다.

```
API 호출 → 401 응답 → supabase.auth.refreshSession() 시도
                      ├─ 성공 → 원래 요청 재시도
                      └─ 실패 → supabase.auth.signOut() → /login 리다이렉트
```

---

## 4. 데이터베이스 스키마 (Supabase / PostgreSQL)

### 4.1. 주요 테이블 목록

| 테이블명 | 용도 | 주요 컬럼 |
|----------|------|-----------|
| `user_profiles` | 모든 사용자의 기본 프로필 및 역할 | `id`, `kind`, `display_name`, `email`, `preferred_language` |
| `sellers` | 바이어/셀러 상세 정보 | `id`, `user_id`, `business_name`, `current_grade`, `is_active` |
| `factories` | 공장 파트너 상세 정보 | `id`, `factory_code`, `company_name`, `shared_login_user_id`, `approval_status` |
| `internal_users` | 내부 직원 정보 | `id`, `user_id`, `name_ko`, `name_zh`, `role`, `is_active` |
| `products` | 상품 마스터 데이터 | `id`, `factory_id`, `name_ko`, `name_zh`, `category`, `unit_price_cny` |
| `orders` | 주문 정보 | `id`, `seller_id`, `factory_id`, `product_id`, `status`, `quantity`, `total_amount_cny` |
| `briefs` | 서비스 요청 및 제안서 | `id`, `seller_id`, `md_id`, `title_ko`, `title_zh`, `target_price_cny` |
| `brief_recipients` | 제안서 수신 공장 목록 | `id`, `brief_id`, `factory_id`, `responded_at` |
| `conversations` | 채팅 대화방 | `id`, `seller_id`, `factory_id`, `md_id`, `last_message_at` |
| `messages` | 채팅 메시지 | `id`, `conversation_id`, `sender_id`, `sender_role`, `content`, `content_zh` |
| `error_logs` | 시스템 에러 로그 | `id`, `type`, `message`, `url`, `user_id`, `created_at` |

### 4.2. RLS(Row Level Security) 정책

Supabase의 RLS가 활성화되어 있습니다. 일반 `anon_key`를 사용하는 클라이언트는 RLS 정책에 따라 자신의 데이터만 조회/수정할 수 있습니다. 관리자 기능이 필요한 서버 API 라우트는 `SUPABASE_SERVICE_ROLE_KEY`를 사용하여 RLS를 우회합니다.

---

## 5. 배포 파이프라인

### 5.1. 배포 환경 정보

| 항목 | 값 |
|------|----|
| 코드 저장소 | GitHub: `joeunjin1/keryx` |
| 브랜치 | `main` (프로덕션 자동 배포) |
| 배포 플랫폼 | Vercel |
| 프로덕션 URL | https://keryx.kr |
| 커스텀 도메인 | https://www.keryx.kr |

### 5.2. 배포 프로세스

로컬에서 코드를 수정한 후 반드시 `npm run build`로 빌드 오류가 없는지 확인한 다음 GitHub `main` 브랜치에 푸시합니다. Vercel이 변경 사항을 자동으로 감지하여 프로덕션 환경에 배포합니다. 빌드 오류가 있는 코드는 절대 푸시하지 않습니다.

---

## 6. 사이트맵 (전체 페이지 목록)

### 6.1. 공개 페이지 (인증 불필요)

| URL | 설명 |
|-----|------|
| `/` | 메인 랜딩 페이지 |
| `/login` | 로그인 (역할별 분기) |
| `/register` / `/signup` | 회원가입 |
| `/shop` | 공개 상품 쇼룸 |
| `/shop/factory/[factoryId]` | 공장별 상품 페이지 |
| `/products/[id]` | 상품 상세 페이지 |
| `/apply/[type]` | 서비스 신청 (비로그인 가능) |
| `/apply/status` | 신청 현황 조회 |
| `/membership` | 멤버십 소개 |
| `/services` | 서비스 소개 |
| `/faq` | 자주 묻는 질문 |
| `/support` | 고객 지원 |
| `/terms` | 이용약관 |
| `/privacy` | 개인정보처리방침 |
| `/factory-partner` | 공장 파트너 소개 |
| `/factory-visit` | 공장 방문 신청 |
| `/report/market/[reportId]` | 시장조사 보고서 공개 링크 |
| `/report/sample/[reportId]` | 샘플제작 보고서 공개 링크 |
| `/report/factory/[reportId]` | 공장매칭 보고서 공개 링크 |

### 6.2. 관리자 포털 (`/admin/*`) — 역할: admin, md, inspector

| URL | 설명 |
|-----|------|
| `/admin` | 관리자 대시보드 |
| `/admin/members/sellers` | 셀러 회원 관리 |
| `/admin/members/factories` | 공장 회원 관리 |
| `/admin/members/staff` | 직원 관리 |
| `/admin/factories` | 공장 목록 |
| `/admin/factories/approvals` | 공장 승인 대기 |
| `/admin/products` | 상품 관리 |
| `/admin/products/price-approvals` | 가격 승인 |
| `/admin/orders` | 주문 관리 |
| `/admin/service-requests` | 서비스 요청 관리 |
| `/admin/research` | 시장조사 관리 |
| `/admin/samples` | 샘플 관리 |
| `/admin/matching` | 공장 매칭 관리 |
| `/admin/inspections` | 검수 관리 |
| `/admin/inspections/dashboard` | 검수 대시보드 |
| `/admin/inspections/new` | 검수 신규 등록 |
| `/admin/inspections/[id]` | 검수 상세 |
| `/admin/inspections/[id]/report` | 검수 보고서 |
| `/admin/inspections/[id]/workspace` | 검수 작업 공간 |
| `/admin/payments` | 결제 관리 |
| `/admin/subscriptions` | 구독 관리 |
| `/admin/subscriptions/plans` | 구독 플랜 관리 |
| `/admin/trade` | 무역 관리 |
| `/admin/notifications` | 알림 관리 |
| `/admin/md-performance` | MD 성과 관리 |
| `/admin/factory-ratings` | 공장 평점 관리 |
| `/admin/ip-studio` | IP 스튜디오 |
| `/admin/ip-studio/new` | IP 캐릭터 등록 |
| `/admin/ip-studio/[characterId]` | IP 캐릭터 상세 |
| `/admin/ip-approvals` | IP 승인 관리 |
| `/admin/ip-approvals/[approvalId]` | IP 승인 상세 |
| `/admin/ip-license` | IP 라이선스 관리 |
| `/admin/health` | 시스템 상태 확인 |

### 6.3. MD 포털 (`/md/*`) — 역할: admin, md, inspector

| URL | 설명 |
|-----|------|
| `/md` | MD 대시보드 |
| `/md/sellers` | 담당 셀러 목록 |
| `/md/seller/[sellerId]` | 셀러 상세 |
| `/md/service-requests` | 서비스 요청 처리 |
| `/md/mvp` | MVP 서비스 현황 |
| `/md/mvp/market-research` | 시장조사 목록 |
| `/md/mvp/market-research/report/[reportId]` | 시장조사 보고서 작성 |
| `/md/mvp/sample` | 샘플제작 목록 |
| `/md/mvp/sample/report/[reportId]` | 샘플제작 보고서 작성 |
| `/md/mvp/factory-matching` | 공장매칭 목록 |
| `/md/mvp/factory-matching/report/[reportId]` | 공장매칭 보고서 작성 |
| `/md/research` | 시장조사 관리 |
| `/md/research/[requestId]` | 시장조사 상세 |
| `/md/samples` | 샘플 관리 |
| `/md/orders` | 주문 관리 |
| `/md/orders/new` | 주문 신규 등록 |
| `/md/orders/[orderId]` | 주문 상세 |
| `/md/orders/margin-builder` | 마진 계산기 |
| `/md/products` | 상품 관리 |
| `/md/products/price-requests` | 가격 요청 |
| `/md/factory` | 공장 목록 |
| `/md/factory/[factoryId]` | 공장 상세 |
| `/md/briefs` | 브리프 목록 |
| `/md/briefs/new` | 브리프 신규 등록 |
| `/md/briefs/[briefId]` | 브리프 상세 |
| `/md/chat` | 채팅 목록 |
| `/md/chat/seller/[conversationId]` | 셀러 채팅 |
| `/md/chat/factory/[conversationId]` | 공장 채팅 |
| `/md/inspections` | 검수 관리 |
| `/md/inspections/[id]/capture` | 검수 사진 촬영 |
| `/md/inspections/[id]/report` | 검수 보고서 |
| `/md/ai-brief` | AI 브리프 생성 |
| `/md/ai-match` | AI 공장 매칭 |
| `/md/community` | 커뮤니티 |
| `/md/trade` | 무역 관리 |
| `/md/performance` | 성과 관리 |

### 6.4. 바이어/셀러 포털 (`/seller/*`) — 역할: seller, admin

| URL | 설명 |
|-----|------|
| `/seller` | 셀러 대시보드 |
| `/seller/catalog` | 상품 카탈로그 |
| `/seller/interests` | 관심 상품 |
| `/seller/research` | 시장조사 요청 목록 |
| `/seller/research/new` | 시장조사 신규 요청 |
| `/seller/research/[requestId]` | 시장조사 상세 |
| `/seller/matching` | 공장 매칭 현황 |
| `/seller/orders` | 내 주문 목록 |
| `/seller/orders/[orderId]` | 주문 상세 |
| `/seller/orders/[orderId]/design` | 디자인 요청 |
| `/seller/service-requests` | 서비스 요청 |
| `/seller/inspections` | 검수 목록 |
| `/seller/inspections/[inspectionId]` | 검수 상세 |
| `/seller/inspections/[inspectionId]/report` | 검수 보고서 |
| `/seller/messages` | 메시지 |
| `/seller/payments` | 결제 내역 |
| `/seller/membership` | 멤버십 관리 |
| `/seller/trade` | 무역 현황 |
| `/seller/account` | 계정 설정 |

### 6.5. 공장 포털 (`/factory/*`) — 역할: factory, admin

| URL | 설명 |
|-----|------|
| `/factory` | 공장 대시보드 |
| `/factory/products` | 자사 상품 목록 |
| `/factory/products/new` | 상품 신규 등록 |
| `/factory/orders` | 수주 목록 |
| `/factory/samples` | 샘플 요청 목록 |
| `/factory/briefs` | 브리프 목록 |
| `/factory/briefs/[briefId]` | 브리프 상세 |
| `/factory/inspections` | 검수 일정 |
| `/factory/inspections/[inspectionId]/report` | 검수 보고서 |
| `/factory/messages` | 메시지 |
| `/factory/profile` | 공장 프로필 |
| `/factory/ratings` | 평점 현황 |

### 6.6. 디자이너 포털 (`/designer/*`) — 역할: designer, admin

| URL | 설명 |
|-----|------|
| `/designer/tasks` | 디자인 작업 목록 |
| `/designer/tasks/[taskId]` | 디자인 작업 상세 |

### 6.7. 검수원 포털 (`/inspector/*`) — 역할: inspector, admin

| URL | 설명 |
|-----|------|
| `/inspector` | 검수원 대시보드 |
| `/inspector/inspections/[inspectionId]/capture` | 검수 사진 촬영 |

---

## 7. 전체 API 라우트 목록

### 7.1. 인증 및 계정 (`/api/auth/*`)

| 엔드포인트 | 메서드 | 설명 | 인증 |
|------------|--------|------|------|
| `/api/auth/me` | GET | 현재 로그인 사용자 정보 | 필요 |
| `/api/auth/signout` | POST | 로그아웃 | 필요 |
| `/api/auth/register-profile` | POST | 회원가입 후 프로필 생성 | 필요 |
| `/api/auth/link-requests` | POST | 계정 연동 요청 | 필요 |
| `/api/apply/submit` | POST | 비로그인 서비스 신청 | 불필요 |
| `/api/apply/status` | GET | 신청 현황 조회 | 불필요 |
| `/api/apply/upload-image` | POST | 신청서 이미지 업로드 | 불필요 |

### 7.2. 관리자 기능 (`/api/admin/*`)

| 엔드포인트 | 메서드 | 설명 | 권한 |
|------------|--------|------|------|
| `/api/admin/sellers/list` | GET | 셀러 목록 조회 | admin/md |
| `/api/admin/sellers/approve` | POST | 셀러 승인/반려 | admin/md |
| `/api/admin/factories/approve` | POST | 공장 승인/반려 | admin/md |
| `/api/admin/register-seller` | POST | 셀러 신규 등록 | admin |
| `/api/admin/register-factory` | POST | 공장 신규 등록 | admin |
| `/api/admin/service-requests/list` | GET | 서비스 요청 전체 목록 | admin/md/inspector |
| `/api/admin/inspections` | GET/POST | 검수 관리 | admin/md/inspector |
| `/api/admin/inspections/[id]` | GET/PATCH | 검수 상세 | admin/md/inspector |
| `/api/admin/subscriptions` | GET/POST | 구독 관리 | admin |
| `/api/admin/plans` | GET/POST | 구독 플랜 관리 | admin |
| `/api/admin/error-report` | POST | 에러 리포트 수신 | admin |
| `/api/admin/init-db` | POST | DB 초기화 (개발용) | admin |

### 7.3. 공개 API (`/api/public/*`) — 인증 불필요

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/public/products` | GET | 공개 상품 목록 |
| `/api/public/products/[id]` | GET | 상품 상세 |
| `/api/public/factories` | GET | 공개 공장 목록 |
| `/api/public/categories` | GET | 카테고리 목록 |
| `/api/public/plans` | GET | 구독 플랜 목록 |
| `/api/public/stats` | GET | 공개 통계 |

### 7.4. 시장조사 및 MVP 서비스 (`/api/research/*`)

| 엔드포인트 | 메서드 | 설명 | 권한 |
|------------|--------|------|------|
| `/api/research` | GET/POST | 시장조사 요청 목록/생성 | seller/admin/md |
| `/api/research/[requestId]/approve` | PATCH | 시장조사 요청 승인 | admin/md |
| `/api/research/[requestId]/report` | GET/POST | 시장조사 보고서 | admin/md |

### 7.5. 공장 매칭 (`/api/matching/*`)

| 엔드포인트 | 메서드 | 설명 | 권한 |
|------------|--------|------|------|
| `/api/matching/request` | POST | 매칭 요청 생성 | seller/admin |
| `/api/matching/requests` | GET | 매칭 요청 목록 | admin/md |
| `/api/matching/requests/[id]` | GET/PATCH | 매칭 요청 상세 | admin/md |
| `/api/matching/requests/[id]/factories` | GET/POST | 매칭 공장 목록 | admin/md |
| `/api/matching/requests/[id]/status` | PATCH | 매칭 상태 변경 | admin/md |
| `/api/matching/stats` | GET | 매칭 통계 | admin/md |

### 7.6. 주문 관리 (`/api/orders/*`)

| 엔드포인트 | 메서드 | 설명 | 권한 |
|------------|--------|------|------|
| `/api/orders` | GET/POST | 주문 목록/생성 | seller/admin/md |
| `/api/orders/[orderId]` | GET/PATCH | 주문 상세 | seller/admin/md |
| `/api/orders/[orderId]/approve` | POST | 주문 승인 | admin/md |
| `/api/orders/[orderId]/submit` | POST | 주문 제출 | seller |
| `/api/orders/margin` | GET | 마진 계산 | admin/md |

### 7.7. 검수 시스템 (`/api/inspections/*`)

| 엔드포인트 | 메서드 | 설명 | 권한 |
|------------|--------|------|------|
| `/api/inspections/start` | POST | 검수 시작 | admin/md/inspector |
| `/api/inspections/[id]/[action]` | POST | 검수 상태 변경 | admin/md/inspector |
| `/api/inspection-items/[itemId]` | PATCH | 검수 항목 수정 | admin/md/inspector |
| `/api/inspection-photos` | POST | 검수 사진 업로드 | admin/md/inspector |
| `/api/factory/inspections` | GET | 공장 검수 목록 | factory/admin |
| `/api/factory/inspections/[id]` | GET | 공장 검수 상세 | factory/admin |
| `/api/factory/inspections/[id]/approve` | POST | 공장 검수 승인 | factory/admin |
| `/api/seller/inspections` | GET | 셀러 검수 목록 | seller/admin |
| `/api/seller/inspections/[id]` | GET | 셀러 검수 상세 | seller/admin |
| `/api/seller/inspections/[id]/approve` | POST | 셀러 검수 확인 | seller/admin |

### 7.8. 상품 관리 (`/api/products/*`, `/api/factory/products`)

| 엔드포인트 | 메서드 | 설명 | 권한 |
|------------|--------|------|------|
| `/api/products/[productId]/[action]` | POST | 상품 상태 변경 | admin/md |
| `/api/factory/products` | GET/POST | 공장 상품 관리 | factory/admin |

### 7.9. 브리프 및 제안서 (`/api/briefs/*`)

| 엔드포인트 | 메서드 | 설명 | 권한 |
|------------|--------|------|------|
| `/api/briefs` | GET/POST | 브리프 목록/생성 | admin/md |
| `/api/briefs/[briefId]/analyze` | POST | AI 브리프 분석 | admin/md |
| `/api/briefs/[briefId]/match-factories` | POST | AI 공장 매칭 | admin/md |
| `/api/briefs/[briefId]/select-proposal` | POST | 제안서 선택 | admin/md |
| `/api/factory/proposals` | GET/POST | 공장 제안서 | factory/admin |

### 7.10. 결제 및 구독 (`/api/payments/*`, `/api/subscriptions`)

| 엔드포인트 | 메서드 | 설명 | 권한 |
|------------|--------|------|------|
| `/api/payments/[paymentId]/approve` | POST | 결제 승인 | admin |
| `/api/payments/[paymentId]/mark-paid` | POST | 결제 완료 처리 | admin |
| `/api/subscriptions` | GET/POST | 구독 관리 | admin/seller |

### 7.11. AI 기능 (`/api/ai/*`)

| 엔드포인트 | 메서드 | 설명 | 권한 |
|------------|--------|------|------|
| `/api/ai/brief-draft` | POST | AI 브리프 초안 생성 | admin/md |
| `/api/ai/match-products` | POST | AI 상품 매칭 | admin/md |
| `/api/ai/match-products/[matchId]/promote` | POST | 매칭 결과 승격 | admin/md |
| `/api/images/analyze` | POST | 이미지 AI 분석 | admin/md |
| `/api/translate` | POST | 텍스트 번역 (한↔중) | 모든 역할 |

### 7.12. 기타 API

| 엔드포인트 | 메서드 | 설명 | 권한 |
|------------|--------|------|------|
| `/api/exchange-rates` | GET | 현재 환율 정보 | 공개 |
| `/api/conversations` | GET/POST | 채팅 대화방 관리 | 모든 역할 |
| `/api/messages` | GET/POST | 채팅 메시지 | 모든 역할 |
| `/api/interests` | GET/POST | 관심 상품 | seller/admin |
| `/api/trade/quotations` | GET/POST | 무역 견적서 | admin/md/seller |
| `/api/trade/quotations/[quotationId]` | GET/PATCH | 견적서 상세 | admin/md/seller |
| `/api/report/upload-image` | POST | 보고서 이미지 업로드 | admin/md |
| `/api/ip/characters` | GET/POST | IP 캐릭터 관리 | admin |
| `/api/ip/characters/[characterId]/approve` | POST | IP 캐릭터 승인 | admin |
| `/api/ip-approvals/[approvalId]/[action]` | POST | IP 승인 처리 | admin |
| `/api/design-tasks/[taskId]/[action]` | POST | 디자인 작업 상태 변경 | admin/designer |
| `/api/design-tasks/[taskId]/assign` | POST | 디자인 작업 배정 | admin |
| `/api/design-tasks/[taskId]/mockup` | POST | 목업 업로드 | designer |

### 7.13. Cron 작업 (`/api/cron/*`) — Vercel Cron 자동 실행

| 엔드포인트 | 실행 주기 | 설명 |
|------------|-----------|------|
| `/api/cron/exchange-rates` | 매일 1회 | 환율 정보 갱신 |
| `/api/cron/daily-alerts` | 매일 1회 | 일일 알림 발송 |
| `/api/cron/expiry-alerts` | 매일 1회 | 만료 예정 알림 |
| `/api/cron/monthly-reset` | 매월 1일 | 월간 데이터 초기화 |

---

## 8. 다국어 지원

KERYX는 `next-intl`을 사용하여 한국어(`ko`)와 중국어(`zh`) 두 언어를 지원합니다. 모든 페이지는 언어 전환 버튼을 통해 두 언어로 전환할 수 있으며, 신규 페이지 개발 시에도 반드시 두 언어를 모두 지원해야 합니다. 번역 데이터는 `src/lib/translations.json`에 저장됩니다.

---

## 9. 파일 구조 핵심 경로

| 경로 | 설명 |
|------|------|
| `src/app/` | Next.js App Router 페이지 및 API 라우트 |
| `src/lib/supabase/` | Supabase 클라이언트 헬퍼 (client/server/middleware) |
| `src/lib/auth/` | 인증 및 권한 체크 중앙화 모듈 |
| `src/lib/translations.json` | 한국어→중국어 번역 데이터 |
| `src/types/database.ts` | Supabase DB 타입 정의 |
| `src/config/navigation.ts` | 사이드바 네비게이션 단일 소스 |
| `src/components/layout/` | 포털별 레이아웃 컴포넌트 |

---

*본 문서는 시스템 업데이트 시 지속적으로 갱신되어야 합니다. 변경 사항 발생 시 해당 섹션을 업데이트하고 버전 및 날짜를 수정하십시오.*
