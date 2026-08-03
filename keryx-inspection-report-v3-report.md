# 검수 보고서 작성 기능 전면 개편 보고서 (v3)
**작성일**: 2026-05-13  
**커밋**: `25f8a3b`  
**배포**: Vercel 자동 배포 (keryx.kr)

---

## 1. 개요

관리자/MD 포털의 검수 보고서 작성 기능을 전면 개편하여 아래 요청 기능을 모두 구현하였습니다.

---

## 2. 구현된 기능 목록

### A. 검수 보고서 작성 페이지 (`/admin/inspections/new`)

| 기능 | 상세 내용 |
|------|---------|
| **바이어 선택** | 셀러(바이어) 목록 검색 → 선택 |
| **오더 선택** | 선택한 바이어의 오더 목록 자동 연동 → 선택 |
| **상품명 입력** | 한국어 + 중국어 상품명 별도 입력 |
| **수량 기록** | 발주 수량 / 검수 완료 수량 명확히 구분 (차이 자동 계산) |
| **검수 기본 정보** | 검수일, 검수원, 검수 장소(공장명) |
| **체크리스트** | 10개 기본 항목 + 항목 추가 가능 (한국어/중국어) |
| **불량 처리 방법** | 공장 추가제작(N일 이내) / 쇼티지(반품 금액 차감) 선택 |
| **검수 사진** | 제목 + 사진 세트 등록 (섹션 추가 가능, 최대 20장/섹션) |
| **샘플 vs 현재 비교** | 오더 확정 샘플 사진 + 현재 검수 사진 나란히 비교 |
| **검수원 현장 사진** | 전용 섹션 (사진별 설명 입력 가능) |
| **4단계 폼** | ① 바이어·오더 → ② 검수 항목 → ③ 사진 등록 → ④ 최종 확인 |

### B. 바이어 보고서 조회 페이지 (`/seller/inspections/[id]/report`)

| 추가 탭 | 내용 |
|---------|------|
| **📷 사진 탭** | 검수 사진 그룹별 표시 + 검수원 현장 사진 |
| **🔍 샘플비교 탭** | 오더 확정 샘플 vs 현재 검수 사진 나란히 비교 |
| **✅ 조치 탭** | 불량 처리 방법 (추가제작/쇼티지) 명확히 표시 |
| **라이트박스** | 사진 클릭 시 전체화면 확대 보기 |

---

## 3. DB 마이그레이션 (신규 컬럼)

**파일**: `supabase/migrations/20260513010000_inspection_report_template.sql`

| 테이블 | 신규 컬럼 | 설명 |
|--------|---------|------|
| `inspections` | `defect_action` | `'remanufacture'` (추가제작) \| `'shortage'` (쇼티지) |
| `inspections` | `defect_action_days` | 추가제작 완료 예정 일수 |
| `inspections` | `defect_action_notes` | 불량 처리 메모 |
| `inspections` | `qty_completed` | 검수 완료 수량 |
| `inspections` | `product_name_ko` | 상품명 (한국어) |
| `inspections` | `product_name_cn` | 상품명 (중국어) |
| `inspections` | `inspection_location` | 검수 장소 |
| `inspection_photos` | `photo_category` | `'inspection'` \| `'sample_compare'` \| `'inspector_site'` \| `'checklist'` |
| `inspection_photos` | `photo_title` | 사진 제목 |
| `inspection_photos` | `is_sample_ref` | 샘플 비교 시 샘플 원본 여부 |

> **중요**: Supabase 대시보드에서 마이그레이션 SQL을 실행해야 합니다.  
> 경로: `supabase/migrations/20260513010000_inspection_report_template.sql`

---

## 4. 수정된 파일 목록

| 파일 | 변경 내용 |
|------|---------|
| `src/app/admin/inspections/new/page.tsx` | 전면 개편 (v3) |
| `src/app/seller/inspections/[inspectionId]/report/page.tsx` | 사진 탭, 샘플비교 탭, 라이트박스, 불량처리 표시 추가 |
| `src/app/api/seller/inspections/[inspectionId]/route.ts` | inspection_items, inspection_photos 카테고리별 반환 추가 |
| `supabase/migrations/20260513010000_inspection_report_template.sql` | 신규 컬럼 마이그레이션 SQL |

---

## 5. 사용 흐름

```
[관리자/MD] /admin/inspections/new
  ① 바이어 선택 → 오더 선택
  ② 검수 항목별 수량 입력 + 불량 처리 방법 선택
  ③ 검수 사진 / 샘플 비교 / 검수원 현장 사진 등록
  ④ 최종 확인 → 제출

[관리자 승인] /admin/inspections/dashboard
  → 보고서 검토 → 바이어에게 발송(publish)

[바이어] /seller/inspections/[id]/report
  → 📋 요약 / 🔢 수량 / ⚠️ 결함 / 📷 사진 / 🔍 샘플비교 / 📦 물류 / ✅ 조치
  → 검수 결과 승인
```

---

## 6. 주의사항

1. **DB 마이그레이션 필수**: Supabase 대시보드 SQL Editor에서 마이그레이션 파일 실행 필요
2. **Supabase Storage**: `inspection-photos` 버킷이 존재해야 사진 업로드 가능
3. **기존 데이터**: 기존 검수 보고서는 영향 없음 (신규 컬럼은 nullable)

---

*보고서 작성: KERYX 시스템 | 2026-05-13*
