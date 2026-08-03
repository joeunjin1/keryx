
## 2026-05-05 검수 네비게이션 및 접근 권한 수정

### 수정 내용
1. **navigation.ts**: 관리자/검수원 검수 관리 링크를 `/admin/inspections/dashboard`로 수정
2. **`/api/seller/inspections` API**: 관리자 계정(`admin`, `md`, `inspector`)도 전체 검수 목록 조회 가능하도록 수정 (기존: seller_id 없으면 빈 배열 반환)
3. **`/api/factory/inspections` API**: 신규 생성 (관리자/공장 모두 접근 가능)
4. **`/seller/inspections` 목록 페이지**: 검수 카드 링크를 `/seller/inspections/${id}/report`로 수정
5. **`/factory/inspections` 목록 페이지**: 완료된 검수에 "보고서 보기 →" 링크 버튼 추가

### 원인 분석
- `jo@keryx.kr` (admin)이 셀러 검수 목록 페이지 접근 시 빈 목록 표시
- 원인: `/api/seller/inspections` API가 `sellers` 테이블에서 user_id로 seller를 찾는데, 관리자 계정은 sellers 테이블에 없음
- RLS 정책은 정상 (admin은 `is_internal()` = true로 전체 접근 가능)

### 커밋
- `351e780` fix: 검수 네비게이션 링크 수정 + 셀러/공장 검수 보고서 접근 권한 수정
- 배포: www.keryx.kr (Vercel Ready, 2026-05-05)

---

## [2026-05-05] 검수원 계정 등록 + 4단계 검수 워크플로우 구현

**커밋**: `6a7aab3`
**배포**: Vercel Ready — www.keryx.kr

### 등록된 계정

| 이메일 | 역할 | 이름(한국어) | 이름(중국어) | 스태프코드 |
|--------|------|-------------|-------------|-----------|
| r@keryx.kr | inspector (검수원) | 장국영 | 张国荣 | INS-001 |
| joeumjin@keryx.com | md | 조은진 | 赵恩珍 | MD-001 |
| jo@keryx.kr | admin | 조은진 | 赵恩珍 | ADMIN-001 |

### 4단계 검수 워크플로우

| 단계 | 담당자 | status 변화 | URL |
|------|--------|------------|-----|
| 1단계 | 검수원 (모바일) | draft → in_progress → review | /inspector |
| 2단계 | MD | review → pending_approval | /md/inspections |
| 3단계 | 관리자 | pending_approval → published | /admin/inspections/dashboard |
| 4단계 | 시스템 | published (셀러/공장 자동 열람 가능) | — |

### 신규 생성 파일

- `src/app/inspector/page.tsx` — 검수원 모바일 대시보드
- `src/app/inspector/inspections/[inspectionId]/capture/page.tsx` — 검수원 현장 입력
- `src/app/md/inspections/[inspectionId]/report/page.tsx` — MD 보고서 작성
- `supabase/migrations/20260505020000_inspection_workflow_4step.sql` — 4단계 워크플로우 DB 함수

### DB 함수

- `complete_inspection_capture` — 검수원 현장 데이터 저장 + status → review
- `md_save_report_draft` — MD 보고서 임시 저장
- `md_submit_for_approval` — MD → 관리자 승인 요청 (status → pending_approval)
- `admin_approve_inspection` — 관리자 승인 + 자동 발송 (status → published)

---

## [2026-05-05] 검수 데이터 표시 오류 수정 (커밋 47cc9bf)

### 발견된 문제 (스크린샷 기반)
1. 관리자 대시보드 `/admin/inspections/dashboard` → 전체 검수 0건
2. 셀러 검수 보고서 상세 `/seller/inspections/{id}/report` → "검수 리포트를 찾을 수 없습니다"
3. 공장 검수 목록 `/factory/inspections` → 진행중 0건, 완료 0건

### 근본 원인
- 클라이언트 컴포넌트에서 `createClientComponentClient()`로 Supabase 직접 쿼리 시 RLS 인증 세션 전달 불안정
- API 라우트에서 존재하지 않는 컬럼명 참조 (`factories.name_cn` → 실제는 `company_name_ko`)
- 공장 검수 목록 `STATUS_MAP`에 `in_progress`, `review`, `pending_approval`, `published` 상태 미포함

### 수정 내용
| 파일 | 수정 내용 |
|------|-----------|
| `src/app/api/admin/inspections/route.ts` | 신규 생성 — 관리자 검수 목록 API |
| `src/app/api/admin/inspections/[inspectionId]/route.ts` | 신규 생성 — 관리자 검수 상세 API |
| `src/app/api/seller/inspections/[inspectionId]/route.ts` | 신규 생성 — 셀러 보고서 상세 API |
| `src/app/api/factory/inspections/[inspectionId]/route.ts` | 신규 생성 — 공장 검수 상세 API |
| `src/app/admin/inspections/dashboard/page.tsx` | supabase 직접 쿼리 → `/api/admin/inspections` API 호출로 교체 |
| `src/app/seller/inspections/[inspectionId]/report/page.tsx` | supabase 직접 쿼리 → API 호출로 교체 |
| `src/app/factory/inspections/page.tsx` | STATUS_MAP 확장 + activeList/completedList 필터 수정 |

### DB 변경
- `inspections.inspector_id` = `8d8e75db...` (장국영 검수원 internal_users.id)로 업데이트

### API 응답 확인 (배포 후)
- `/api/admin/inspections` → INS-2026-0501-001 데이터 정상 반환 ✅
- `/api/seller/inspections/a1b2c3d4...` → 전체 검수 데이터 + 결함 4건 정상 반환 ✅
