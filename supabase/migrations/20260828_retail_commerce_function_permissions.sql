-- ============================================================================
-- KERYX 소매 쇼핑몰 결제 함수 실행 권한 보강
-- 작성일: 2026-08-28
-- 선행 조건: 20260828_retail_commerce_toss_samples.sql 및 integrity_patch 적용 완료
-- 목적: SECURITY DEFINER 결제 함수를 클라이언트에서 직접 호출하지 못하도록 차단한다.
-- ============================================================================

BEGIN;

-- 기본 PUBLIC 실행 권한을 모두 제거한다. 결제 승인과 재고 예약은 서버의 service_role만 수행한다.
REVOKE ALL ON FUNCTION public.create_retail_checkout(uuid, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_retail_payment(text, text, text, numeric, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_retail_order_reservation(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_expired_retail_reservations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.advance_retail_order_status(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_retail_product_settings(uuid, uuid, boolean, numeric, integer, text, numeric, text, text, text) FROM PUBLIC;

-- 서버 API에서 사용하는 권한만 부여한다.
GRANT EXECUTE ON FUNCTION public.create_retail_checkout(uuid, jsonb, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_retail_payment(text, text, text, numeric, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_retail_order_reservation(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_retail_reservations() TO service_role;
GRANT EXECUTE ON FUNCTION public.advance_retail_order_status(uuid, uuid, text, text) TO service_role;

-- 소매 상품 설정은 로그인한 관리자만 호출할 수 있으며, 함수 내부에서도 admin 역할을 다시 검증한다.
GRANT EXECUTE ON FUNCTION public.update_retail_product_settings(uuid, uuid, boolean, numeric, integer, text, numeric, text, text, text) TO authenticated;

COMMIT;
