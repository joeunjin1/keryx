-- ================================================================
-- 4단계 검수 워크플로우 마이그레이션
-- 검수원 입력 → MD 검토 → 관리자 승인 → 자동 published 발송
-- ================================================================

-- 1. complete_inspection_capture RPC 수정: status를 'review'로 변경
CREATE OR REPLACE FUNCTION public.complete_inspection_capture(
  p_inspection_id uuid,
  p_outcome inspection_outcome,
  p_inspector_comment text DEFAULT NULL,
  p_total_minutes integer DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE inspections
    SET outcome              = p_outcome,
        inspector_comment    = p_inspector_comment,
        total_minutes        = COALESCE(p_total_minutes, total_minutes),
        inspection_fee_cny   = ROUND((COALESCE(p_total_minutes, total_minutes, 30)::numeric / 60) * 30, 2),
        inspection_completed_at = NOW(),
        status               = 'review',
        updated_at           = NOW()
    WHERE id = p_inspection_id;

  UPDATE orders o
    SET status = 'inspection_admin_review', updated_at = NOW()
    FROM inspections i
    WHERE i.id = p_inspection_id AND i.order_id = o.id
      AND o.status = 'inspecting';
END;
$$;

-- 2. MD 보고서 초안 저장 함수
CREATE OR REPLACE FUNCTION public.md_save_report_draft(
  p_inspection_id uuid,
  p_summary_ko text DEFAULT NULL,
  p_summary_cn text DEFAULT NULL,
  p_pass_rate numeric DEFAULT NULL,
  p_result text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE inspections
    SET summary_ko  = COALESCE(p_summary_ko, summary_ko),
        summary_cn  = COALESCE(p_summary_cn, summary_cn),
        pass_rate   = COALESCE(p_pass_rate, pass_rate),
        result      = COALESCE(p_result, result),
        updated_at  = NOW()
    WHERE id = p_inspection_id;
END;
$$;

-- 3. MD → 관리자 승인 요청 함수 (status: review → pending_approval)
CREATE OR REPLACE FUNCTION public.md_submit_for_approval(
  p_inspection_id uuid,
  p_md_internal_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE inspections
    SET status      = 'pending_approval',
        updated_at  = NOW()
    WHERE id = p_inspection_id
      AND status IN ('review', 'draft');
END;
$$;

-- 4. admin_approve_inspection 수정: published_at 설정 + status = 'published'
CREATE OR REPLACE FUNCTION public.admin_approve_inspection(
  p_inspection_id uuid,
  p_admin_internal_user_id uuid,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance_id uuid;
BEGIN
  UPDATE inspections
    SET status        = 'published',
        published_at  = NOW(),
        published_by  = p_admin_internal_user_id,
        updated_at    = NOW()
    WHERE id = p_inspection_id;

  SELECT id INTO v_balance_id
    FROM balance_payments
    WHERE inspection_id = p_inspection_id
    LIMIT 1;

  RETURN v_balance_id;
END;
$$;
