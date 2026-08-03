# KERYX 플랫폼 스킬 기반 상세 구현 계획서

본 문서는 새롭게 추가된 스킬 가이드라인을 KERYX 플랫폼에 적용하기 위한 1~4단계의 구체적인 구현 계획입니다.

---

## 1단계: 아키텍처 기반 통합 및 정비 (Foundation & i18n)

**목표**: 코드 헌법(`solution-architecture-foundation`) 준수 및 다국어 시스템 일원화

### 1.1. 잔여 인라인 스타일 및 하드코딩 제거
* **대상 파일**: `src/app/not-found.tsx`, `src/app/error.tsx` 등 이전 작업에서 누락된 파일.
* **구현 방법**:
  * `style={{...}}`로 작성된 하드코딩된 색상, 여백, 폰트 설정을 모두 Tailwind CSS 클래스로 변환.
  * `tailwind.config.ts`에 정의된 디자인 토큰(`brand`, `neutral` 등)을 적극 활용.
  * 동적 값(예: 상태에 따른 색상 변화)만 인라인 스타일 예외로 허용.

### 1.2. 다국어 시스템 일원화
* **대상 파일**: `src/components/layout/LangContext.tsx`, `src/components/layout/MobileLayout.tsx`, `src/app/layout.tsx`
* **구현 방법**:
  * 현재 `next-intl`(서버/클라이언트 전역)과 `LangContext`(로컬 상태)로 이원화된 다국어 시스템을 분석.
  * `keryx-platform-dev` 스킬의 요구사항에 따라, 포털 내 UI 텍스트는 `LangText` 컴포넌트와 `useLangContext`를 기본으로 사용하되, 전역 설정과 충돌하지 않도록 `LangProvider`의 위치를 최상단 레이아웃으로 조정하거나 통합.

### 1.3. 최고 관리자(Admin Bypass) 권한 처리
* **대상 파일**: `src/middleware.ts`
* **구현 방법**:
  * `middleware.ts`에 사용자의 역할을 확인하는 로직 추가.
  * 사용자의 역할이 `admin`인 경우, 셀러, 공장, MD 포털 등 모든 하위 경로에 대한 접근을 허용하는 바이패스 로직 구현.

---

## 2단계: 네비게이션 및 사이트맵 시스템 구축 (Sitemap & Sidebar)

**목표**: 404 에러 원천 차단(`404-error-prevention-system`) 및 사이드바 일관성 확보(`sidebar-design-system`)

### 2.1. 단일 진실 공급원(Sitemap) 구축
* **대상 파일**: `sitemap.yaml` (신규 생성), `scripts/check-sitemap.ts` (신규 생성)
* **구현 방법**:
  * 프로젝트 루트에 `sitemap.yaml`을 생성하여 모든 포털(Admin, Seller, Factory, MD)의 라우트, 필요 권한, 다국어 키, 연결된 DB 테이블을 명시.
  * `check-sitemap.ts` 스크립트를 작성하여 실제 파일 시스템의 라우트와 `sitemap.yaml`이 일치하는지 검증.
  * `package.json`의 빌드 스크립트에 해당 검증 로직을 추가하여 CI/CD 파이프라인에서 404 에러를 사전 차단.

### 2.2. 사이드바 메뉴 리팩토링
* **대상 파일**: `src/config/navigation.ts`, 각 포털의 `layout.tsx`
* **구현 방법**:
  * `src/config/navigation.ts`의 하드코딩된 메뉴 구조를 `sitemap.yaml`과 동기화되도록 구조화.
  * 서버 컴포넌트(`layout.tsx`)에서 사용자의 권한(Tier, Role)을 DB에서 조회한 후, 허용된 메뉴 항목만 클라이언트로 전달하여 렌더링.
  * 사이드바는 기본적으로 닫힌 상태(Collapsed/Drawer)로 시작하도록 `MobileLayout`의 기본 상태 수정.

---

## 3단계: 데이터 아키텍처 및 권한 강제 (Data & Security)

**목표**: 무역 데이터 무결성(`trade-data-architecture`) 및 구독/회원 등급 DB 강제(`subscription-membership-system`)

### 3.1. Supabase RLS 정책 전면 개편
* **대상 파일**: Supabase SQL 마이그레이션 스크립트
* **구현 방법**:
  * **원가 격리**: `products` 테이블에서 `cost` 필드를 분리하거나, RLS를 통해 `admin`과 담당 `md`만 조회 가능하도록 제한.
  * **정보 차단**: `factories` 테이블과 `orders` 테이블에 RLS를 적용하여, 공장은 자신의 데이터만, 바이어는 자신의 데이터만 볼 수 있도록 강제.
  * **회원 등급 강제**: `members` 테이블의 `tier` 컬럼(Enum)을 기준으로 API 및 RLS 접근 권한을 제어. 코드 레벨의 if문 권한 체크를 DB 레벨로 이관.

### 3.2. 다중 승인 워크플로우 및 재고 무결성
* **대상 파일**: 주문 및 상품 관련 API 라우트 (`src/app/api/...`)
* **구현 방법**:
  * 가격, MOQ 등 중요 정보 변경 시 상태를 `pending_approval`로 변경하고 관리자 승인을 요구하는 로직 구현.
  * 주문 마감 시 `ordered_qty = delivered_qty + returned_qty` 공식을 검증하는 DB 트리거 또는 API 단 검증 로직 추가.

---

## 4단계: UI/UX 고도화 및 모바일 최적화 (Mobile-first & Performance)

**목표**: 모든 포털의 모바일 사용성 극대화(`mobile-first-design`) 및 성능 향상(`web-performance-resilience`)

### 4.1. 모바일 우선 레이아웃 및 터치 타겟 최적화
* **대상 파일**: 공통 UI 컴포넌트 (`Button`, `Input`, `Card` 등)
* **구현 방법**:
  * 모든 클릭 가능한 요소(버튼, 링크, 탭)의 최소 크기를 44x44px로 강제 (Tailwind `min-h-[44px] min-w-[44px]` 적용).
  * 모바일 화면(sm 이하)에서는 하단 탭바 또는 햄버거 메뉴를, 데스크톱에서는 사이드바를 제공하도록 반응형 클래스(`md:`, `lg:`) 재정비.

### 4.2. 이미지 최적화 및 로딩 UX 개선
* **대상 파일**: `next.config.mjs`, 이미지 렌더링 컴포넌트
* **구현 방법**:
  * Next.js Image 컴포넌트를 활용하여 WebP 자동 변환 및 리사이징 적용.
  * 데이터 로딩 지연 시 빈 화면 대신 스켈레톤(Skeleton) UI를 표시하도록 주요 데이터 패칭 구간에 Suspense 적용.
  * 버튼 클릭 시 즉각적인 시각적 피드백(Microinteractions) 추가.

---

## 5. 진행 방식 및 승인 요청
위 1~4단계의 상세 구현 계획에 대해 대표님의 승인을 요청합니다. 
승인해 주시면 **1단계: 아키텍처 기반 통합 및 정비** 작업부터 코드를 수정하고, 각 단계가 완료될 때마다 빌드 테스트 후 보고드리겠습니다.
