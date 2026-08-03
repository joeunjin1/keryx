# KERYX 플랫폼 전체 개선 작업 로그
**날짜**: 2026-05-12  
**커밋**: `7c046d6`, `4a1316c`  
**배포 URL**: https://keryx-one.vercel.app

---

## 1. 수정된 문제 목록

### [CRITICAL] 관리자 주문 승인 오류 - order_status enum 불일치
**문제**: `invalid input value for enum order_status: "confirmed"` 오류로 주문 승인 불가  
**원인**: 코드에서 `confirmed`, `qc_pending`, `shipped` 등 임의 상태값을 사용했으나 DB enum은 완전히 다른 체계  
**해결**: 전체 코드를 DB enum 기준으로 통일

| 코드 상태값 (구) | DB enum 값 (신) |
|---|---|
| `buyer_pending` | `pending_admin_approval` |
| `confirmed` | `awaiting_deposit` |
| `in_production` | `in_production` |
| `qc_pending` | `inspecting` |
| `qc_passed` | `inspection_seller_review` |
| `shipped` | `shipping_to_korea` |
| `delivered` | `delivered` |

**DB 전체 enum 값 (확인됨)**:
`draft`, `pending_admin_approval`, `awaiting_deposit`, `in_production`, `production_completed`, `arrived_warehouse`, `inspecting`, `inspection_admin_review`, `inspection_seller_review`, `awaiting_balance`, `shipping_to_korea`, `arrived_korea`, `delivered`, `disputed`, `cancelled`

**수정 파일**:
- `src/app/api/buyer/orders/[orderId]/status/route.ts`
- `src/app/admin/orders/page.tsx` (완전 재작성)
- `src/app/seller/orders/page.tsx` (ORDER_STATUS_META 수정)

---

### [FIX] 중국어 번역 누락 페이지 일괄 수정
**문제**: 75개 페이지에 `useLangContext` 미적용으로 중국어 전환 시 한국어 그대로 표시  
**해결**: 모든 Client 컴포넌트에 `useLangContext` 추가 및 한국어/중국어 텍스트 이중화  
**영향 범위**: admin(17), factory(11), md(28), seller(19) 페이지

---

## 2. 신규 기능 및 구조 변경

### [FEAT] 바이어 대시보드 구조 개선

#### 주문하기 페이지 (`/seller/orders/new`)
- **변경 전**: 전체 상품 목록 표시
- **변경 후**: 매칭공장 상품만 표시 + "더 많은 상품 보기 → Shop" 버튼
- **로직**: `factory_matching_requests` 테이블에서 `approved` 상태 공장의 상품만 필터링

#### 거래 관리 통합 (`/seller/orders`)
- **변경 전**: 거래센터(`/seller/trade`)와 주문관리(`/seller/orders`) 분리
- **변경 후**: 견적서 탭 + 주문 탭으로 통합된 1페이지
- `/seller/trade` → `/seller/orders`로 리다이렉트 처리

#### 결제 현황 개선 (`/seller/payments`)
- **변경 전**: 단순 결제 내역 목록
- **변경 후**: 주문별 선수금(30%)/잔금(70%)/검수비/샘플비 항목 상태 표시
- 주문 상태에 따라 자동으로 입금완료/입금대기/해당없음 표시
- 관리자가 `order_payments` 테이블에 입력한 데이터 기반으로 실시간 반영

#### 통합 서비스 의뢰 관리 (`/seller/service-center`) - 신규
- **통합 대상**: `/seller/service-requests` + `/seller/unified-request`
- 서비스 신청 내역과 통합 의뢰를 탭으로 구분하여 1페이지에서 관리

---

## 3. 삭제/비활성화 처리

### 메시지 페이지 삭제 (리다이렉트 처리)
| 경로 | 처리 |
|---|---|
| `/seller/messages` | 홈(`/seller`)으로 리다이렉트 |
| `/factory/messages` | 홈(`/factory`)으로 리다이렉트 |
| `/md/chat` | 홈(`/md`)으로 리다이렉트 |
| `/md/chat/factory` | 홈(`/md`)으로 리다이렉트 |
| `/md/chat/seller` | 홈(`/md`)으로 리다이렉트 |

### navigation.ts 메뉴 정리
- 셀러: 제품카탈로그, 거래센터, 관심상품, 메시지 제거
- MD: 통합채팅 제거
- 공장: 메시지 제거

---

## 4. API 분석 결과

| API 경로 | 역할 | 상태 |
|---|---|---|
| `POST /api/buyer/orders` | 주문 접수 | ✅ 정상 |
| `PATCH /api/buyer/orders/[id]/status` | 주문 상태 변경 (DB enum 기준으로 수정됨) | ✅ 수정완료 |
| `POST /api/buyer/orders/[id]/payment-info` | 결제정보 전송 | ✅ 정상 |
| `GET /api/public/products` | 전체 상품 조회 | ✅ 정상 |
| `POST /api/matching/direct` | 즉시 매칭 처리 | ✅ 정상 |
| `GET /api/matching/requests` | 매칭 요청 목록 | ✅ 정상 |
| `GET /api/trade/quotations` | 견적서 목록 | ✅ 정상 |
| `GET /api/unified-request` | 통합의뢰 목록 | ✅ 정상 |
| `GET /api/messages` | 메시지 (메시지 페이지 삭제로 미사용) | ⚠️ 미사용 |

---

## 5. DB 주요 테이블 현황

| 테이블 | 역할 |
|---|---|
| `orders` | 주문 (order_status enum 사용) |
| `order_items` | 주문 상품 항목 |
| `order_payments` | 결제 내역 (payment_type: deposit/balance/inspection_fee/sample_fee) |
| `quotations` | 견적서 |
| `factory_matching_requests` | 공장 매칭 요청 |
| `products` | 상품 마스터 |
| `sellers` | 바이어(셀러) 정보 |
| `user_profiles` | 사용자 프로필 (kind: admin/seller/factory/md) |

---

## 6. 다음 권장 작업

1. **관리자 결제 관리 페이지 개선**: 주문별 선수금/잔금 입금 확인 처리 기능 추가
2. **주문 상태 전체 플로우 테스트**: `pending_admin_approval` → `awaiting_deposit` → `in_production` → ... → `delivered`
3. **매칭공장 없는 셀러 UX**: 매칭공장이 없을 때 안내 메시지 및 매칭 신청 CTA
4. **테스트 주문 데이터 정리**: DB에 남아있는 테스트 주문 13건 삭제 필요
