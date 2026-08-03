# 2026-05-12 작업 로그: 주문하기/매칭 즉시완료/매칭공장상품목록 구현

## 배포 정보
- GitHub: 4b74aa2 (main 브랜치)
- Vercel: https://keryx-one.vercel.app
- Supabase DB 마이그레이션: 완료 (2026-05-12)

## 구현 내용
1. 이미지 사이즈 제한 (MatchingModal 참고사진 max-h-20 object-contain)
2. 대시보드 헤더 주문하기/공장매칭 버튼 추가
3. /seller/orders/new 주문 페이지 (결제 없음, 관리자가 결제정보 전송)
4. /api/matching/direct 즉시 매칭 완료 API
5. /seller/matched-factories 나의 매칭 공장 페이지
6. 사이드바 메뉴: 주문하기, 나의 매칭 공장
7. /api/buyer/orders/* 바이어 주문 API 일체

## DB 변경사항
- orders: buyer_order_note, packaging_request, payment_info, source 컬럼 추가
- order_status ENUM: buyer_pending, in_production, qc_pending, qc_passed 추가
- seller_notifications: order_id 컬럼, payment_info 타입 추가
- RLS 정책: orders, order_items 바이어 접근 허용
