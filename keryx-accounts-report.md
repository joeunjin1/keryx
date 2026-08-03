# KERYX 솔루션 대시보드별 계정 정보 안내

현재 KERYX 솔루션(https://www.keryx.kr/)에 등록되어 있는 각 역할별(관리자, MD, 검수원, 바이어, 공장) 주요 테스트 계정 아이디와 비밀번호를 정리해 드립니다.

모든 계정의 기본 비밀번호는 시스템 초기화 시 설정된 공통 비밀번호인 **`Keryx1234!`** 로 설정되어 있습니다. (일부 자동 생성된 임시 비밀번호 계정 제외)

---

## 1. 관리자 (Admin) 대시보드
모든 권한을 가진 최고 관리자 계정입니다. 직원 관리, 공장 관리, 전체 상품 및 주문 관리가 가능합니다.

| 이름 | 아이디 (이메일) | 비밀번호 | 스태프 코드 |
| :--- | :--- | :--- | :--- |
| 조은진 | **`jo@keryx.kr`** | `15448932` | ADMIN-001 |

## 2. MD (Merchandiser) 워크스페이스
바이어의 요청을 처리하고, 공장을 매칭하며, 상품을 소싱하는 MD 전용 계정입니다.

| 이름 | 아이디 (이메일) | 비밀번호 | 스태프 코드 |
| :--- | :--- | :--- | :--- |
| 조은진 | **`joeumjin@keryx.com`** | `Keryx1234!` | MD-001 |
| 박지훈 | **`park.jihoon.md@keryx.kr`** | `Keryx1234!` | MD-002 |

## 3. 검수원 (Inspector) 대시보드
공장 현장에서 상품의 품질을 검수하고 사진/영상을 업로드하는 검수원 전용 계정입니다.

| 이름 | 아이디 (이메일) | 비밀번호 | 스태프 코드 |
| :--- | :--- | :--- | :--- |
| 장국영 (张国荣) | **`r@keryx.kr`** | `Keryx1234!` | INS-001 |

## 4. 바이어 (Seller/Buyer) 포털
상품을 소싱하고 주문을 관리하는 한국 바이어 계정입니다.

| 회사명 (이름) | 아이디 (이메일) | 비밀번호 | 멤버십 상태 |
| :--- | :--- | :--- | :--- |
| 핑크걸즈샵 | **`seller-test@suivea.com`** | `Keryx1234!` | Trial |
| 미래상사 | **`gjtrade@naver.com`** | `Keryx1234!` | Trial |
| 김수진 | **`kim.sujin.buyer@keryx-test.com`** | `Keryx1234!` | Trial |
| TANGYUAN | **`cfy20031213@qq.com`** | `Keryx1234!` | Trial |

## 5. 공장 (Factory) 포털
상품을 등록하고 주문을 접수하며, MD와 소통하는 중국 공장 전용 계정입니다.

| 공장명 | 아이디 (이메일) | 비밀번호 | 공장 코드 |
| :--- | :--- | :--- | :--- |
| 광저우 테스트 공장 | **`factory-test@suivea.com`** | `Keryx1234!` | F001 |
| 广州无纺布制品厂 | **`guangzhou.nonwoven@keryx-factory.com`** | `Keryx1234!` | F002 |

---

---

## 개발자 노트 (Developer Notes)

| 날짜 | 항목 | 내용 |
| :--- | :--- | :--- |
| 2026-05-11 | 관리자 비밀번호 확인 | `jo@keryx.kr` 실제 비밀번호는 `Keryx1234` (느낌표 없음). 기존 보고서의 `Keryx1234!`는 오기였음. |
| 2026-05-11 | 관리자 비밀번호 변경 | 사용자 요청으로 `jo@keryx.kr` 비밀번호를 `15448932`로 변경. Supabase Admin API로 직접 변경 완료. |
| 2026-05-11 | MD 계정 비밀번호 변경 | `joeumjin@keryx.com` 비밀번호를 `15448932`로 동일하게 변경. |
| 2026-05-11 | 로그인 역할 기반 리다이렉트 수정 | 로그인 후 `user_profiles.kind` 기반으로 admin→`/admin`, md→`/md`, factory→`/factory`, seller→`/seller` 자동 이동하도록 수정. |
| 2026-05-11 | MD 사이드바 랜딩 페이지 메뉴 추가 | `navigation.ts`의 `mdNavItems`에 `📣 랜딩 페이지` 그룹(문의 관리, 페이지 설정, 수납용품 페이지, 여행·캠핑 페이지) 추가. |
| 2026-05-11 | 미들웨어 공개 경로 추가 | `middleware.ts`에 `/landing` 경로를 비로그인 공개 경로로 등록. |
| 2026-05-11 | 랜딩 페이지 FAQ·신뢰 콘텐츠 추가 | `LandingPageTemplate.tsx` 전면 업그레이드. 진행 프로세스(5단계), 100% 전수 검수 섹션, FAQ 아코디언(8개 Q&A), 헤더 네비게이션 6개 메뉴, 통계 카드 4개 추가. 한국어/중국어 완전 지원. |
| 2026-05-11 | 무료 상담 페이지 고도화 (ConsultationWizard) | 5단계 대화식 멀티스텝 상담 폼 구축. 유형선택→상품선택/사진업로드→요구사항→주문옵션(포장·인쇄·색상·사이즈)→연락처 순서. DB 테이블: `consultations`, `consultation_messages`. 스토리지 버킷: `consultation-images`. |
| 2026-05-11 | 상담 관리 API 구축 | `POST /api/public/consultation` (상담 저장), `POST /api/public/consultation/upload` (이미지 업로드), `GET/PATCH /api/admin/consultations` (목록·상태변경), `GET /api/admin/consultations/[id]` (상세), `POST /api/admin/consultations/[id]/reply` (MD 답변). |
| 2026-05-11 | 관리자/MD 상담 관리 페이지 구축 | `/admin/consultations` (관리자), `/md/consultations` (MD) 페이지 생성. 상태 필터(신규·검토중·견적발송·완료·보류), 상세 보기, MD 답변 전송 기능 포함. |
| 2026-05-11 | navigation.ts 상담 관리 메뉴 추가 | `adminNavItems` 및 `mdNavItems`에 `💬 상담 관리` 메뉴 추가. |
| 2026-05-11 | 상담 신청 테스트 완료 | 수납용품 랜딩 페이지에서 5단계 전체 진행 후 상담 신청 완료 확인. 성공 화면 정상 표시. DB 저장 확인 대기 중 (Supabase 로그인 필요). |
| 2026-05-11 | 랜딩 페이지 관리자 페이지 전면 업데이트 | (1) 페이지 설정 UI 고도화: 공장 검색·연결 UI (공장명/도시 검색 → 체크박스 선택 → 저장 시 랜딩 페이지 즉시 반영), 연결된 공장 이름 태그 표시 (X 버튼으로 제거), 배너 제목/부제목 한국어·중국어 편집 기능. (2) 사이드바 정리: admin/md 사이드바에서 수납용품/여행캠핑 직접 링크 메뉴 제거 (페이지 설정에서 통합 관리). (3) 상담 관리 답변 템플릿 시스템: 3가지 템플릿 (상품 문의 기본 답변, 가격 안내, 일반 문의 답변) 클릭 시 자동 입력, 사진 첨부 기능, 견적 데이터 입력 폼 (단가·수량·납기·유효기간). (4) 상품 샘플 가격 노출: 랜딩 페이지 API에 sample_cost_cny 컬럼 추가, 상품 카드에 샘플 가격 배지 표시. (5) ConsultationWizard 전면 재작성: Step 1을 체크박스 다중 선택으로 변경 (상품 문의+샘플 요청+견적 요청 동시 선택), 샘플 요청 시 상품 카드에 샘플 가격 자동 표시, 견적 요청 시 수량+요구사항 간소화 경로. 모든 변경사항 GitHub 배포 및 Vercel 자동 배포 완료. |

---

### 💡 참고 사항
- **로그인 주소**: 모든 사용자는 동일한 로그인 페이지(`https://www.keryx.kr/login`)를 통해 접속하며, 시스템이 계정의 역할(Role)을 자동으로 인식하여 해당 대시보드로 리다이렉트합니다.
- **비밀번호 변경**: 관리자 계정(`jo@keryx.kr`)으로 로그인 후 **[직원 관리]** 또는 **[회원 관리]** 메뉴에서 각 계정의 비밀번호를 재설정할 수 있습니다.
- **새 계정 생성**: 관리자 대시보드에서 새로운 MD, 바이어, 공장 계정을 생성할 수 있으며, 생성 시 임시 비밀번호가 발급되거나 직접 지정할 수 있습니다.

---

## 2026-05-12 작업 이력: 랜딩 페이지 설정 아코디언 방식 전환

### 변경 내용
- **파일**: `src/app/admin/landing/settings/page.tsx`
- **커밋**: `585c776` — feat: refactor landing settings page to accordion layout with factory management buttons

### 주요 변경 사항
1. **UX 방식 전환**: 카드 클릭 시 오른쪽에 편집 패널이 나타나는 방식 → 버튼 클릭 시 카드 바로 아래로 펼쳐지는 아코디언 방식으로 전면 변경
2. **명확한 버튼 추가**:
   - `🏭 공장 연결 관리` 버튼 (보라색 테두리, 클릭 시 파란 배경으로 활성화)
   - `✏️ 배너 설정` 버튼 (초록색 테두리, 클릭 시 초록 배경으로 활성화)
   - 두 버튼 모두 `▼/▲` 화살표로 열림/닫힘 상태 표시
3. **독립 상태 관리**: 각 페이지별로 openSection, editData, saving, saveMsg, factorySearch 상태를 독립적으로 관리
4. **공장 연결 관리 아코디언**: 현재 연결된 공장 태그 + 검색 + 체크박스 선택 + 저장 버튼
5. **배너 설정 아코디언**: 한국어/중국어 제목·부제목 입력 + 활성화 체크박스 + 저장 버튼
6. **중국어 번역**: 모든 텍스트 완전 적용

### 배포 확인
- URL: https://keryx-one.vercel.app/admin/landing/settings
- TypeScript 빌드: 오류 없음
- 실제 접속 테스트: 공장 연결 관리 아코디언 정상 동작 확인, 배너 설정 아코디언 정상 동작 확인
- 배포 시각: 2026-05-12

## 자주 발생하는 오류 및 해결법 (Troubleshooting Guide)

| 오류 현상 | 원인 | 해결 방법 |
| :--- | :--- | :--- |
| **공장 포털 상품 클릭 시 이동 안 됨** | 상품 카드에 `onClick` 이벤트나 `Link` 컴포넌트가 누락됨 | `src/app/factory/products/page.tsx`의 상품 카드 div에 `onClick={() => router.push('/factory/products/' + product.id)}` 추가 및 `[id]/page.tsx` 상세 페이지 생성 |
| **MD 소통 센터 500 오류 (메시지 전송 실패)** | `messages` 테이블이 파티셔닝되어 있어 `extension` 등 일부 컬럼이 스키마 캐시에 없음 | API에서 `extension` 컬럼을 직접 INSERT하지 말고, `payload` JSONB 컬럼을 활용하거나 실제 public 스키마에 존재하는 컬럼만 INSERT 하도록 수정 |
| **MD 소통 센터 400 오류 (셀러 정보 없음)** | API에서 `seller_id`를 `auth.users.id`로 잘못 매핑함 | `conversations.seller_id`는 `sellers.id`를 참조하므로, `sellers` 테이블에서 `user_id = auth.uid()`로 조회한 `id` 값을 사용해야 함 |
| **MD 소통 센터 500 오류 (새 대화 생성 실패)** | `conversations` 테이블에 `INSERT` RLS 정책이 누락되었거나, API에서 필수 컬럼(`topic`, `extension` 등) 누락 | API에서 `createAdminClient()` (Service Role Key)를 사용하여 RLS를 우회하거나, 테이블 스키마에 맞게 필수 컬럼 기본값을 설정/제거 |
| **TypeScript 빌드 오류 (Cannot find module)** | 파일 확장자가 `.js` 또는 `.jsx`로 작성되었거나, 타입 정의가 누락됨 | 파일을 `.ts` 또는 `.tsx`로 변경하고, `interface`나 `type`을 명확히 정의하여 `npx tsc --noEmit`으로 검증 |
| **Vercel 배포 후 변경사항 미반영** | 브라우저 캐시 또는 Vercel Edge Cache 문제 | 브라우저 강력 새로고침(Ctrl+Shift+R)을 하거나, Vercel 대시보드에서 Redeploy 실행 |
