-- =============================================================================
-- KERYX Manufacturing Project SLA & Alert Queue
-- Purpose: Additive, project-scoped internal/buyer alerts with deduplication.
-- Safety: Does not alter or delete pre-existing B2B, retail, IP or project data.
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.manufacturing_project_sla_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.manufacturing_projects(id) ON DELETE RESTRICT,
  current_action_key text NOT NULL CHECK (current_action_key IN (
    'scoping', 'factory_matching', 'sample_review', 'golden_sample',
    'production_start', 'qc_review', 'shipment_documents', 'delivery_followup'
  )),
  due_at timestamptz NOT NULL,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_role text NOT NULL CHECK (owner_role IN ('admin', 'md', 'factory', 'seller')),
  buyer_notice_enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_manufacturing_sla_due_active
  ON public.manufacturing_project_sla_targets(status, due_at ASC);
CREATE INDEX IF NOT EXISTS idx_manufacturing_sla_owner
  ON public.manufacturing_project_sla_targets(owner_user_id, status, due_at ASC);

CREATE TABLE IF NOT EXISTS public.manufacturing_project_sla_alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sla_target_id uuid NOT NULL REFERENCES public.manufacturing_project_sla_targets(id) ON DELETE RESTRICT,
  recipient_scope text NOT NULL CHECK (recipient_scope IN ('owner', 'buyer', 'admin')),
  threshold_key text NOT NULL CHECK (threshold_key IN ('due_soon_3d', 'due_soon_1d', 'overdue_daily')),
  scheduled_for date NOT NULL,
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  seller_notification_id uuid REFERENCES public.seller_notifications(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sla_target_id, recipient_scope, threshold_key, scheduled_for)
);
CREATE INDEX IF NOT EXISTS idx_manufacturing_sla_alert_log_target
  ON public.manufacturing_project_sla_alert_log(sla_target_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_manufacturing_project_sla_target_updated_at ON public.manufacturing_project_sla_targets;
CREATE TRIGGER trg_manufacturing_project_sla_target_updated_at
  BEFORE UPDATE ON public.manufacturing_project_sla_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.manufacturing_project_sla_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturing_project_sla_alert_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS manufacturing_sla_targets_admin_all ON public.manufacturing_project_sla_targets;
CREATE POLICY manufacturing_sla_targets_admin_all ON public.manufacturing_project_sla_targets
  FOR ALL USING (public.keryx_is_admin()) WITH CHECK (public.keryx_is_admin());
DROP POLICY IF EXISTS manufacturing_sla_targets_owner_read ON public.manufacturing_project_sla_targets;
CREATE POLICY manufacturing_sla_targets_owner_read ON public.manufacturing_project_sla_targets
  FOR SELECT USING (owner_user_id = auth.uid());
DROP POLICY IF EXISTS manufacturing_sla_alert_log_admin_read ON public.manufacturing_project_sla_alert_log;
CREATE POLICY manufacturing_sla_alert_log_admin_read ON public.manufacturing_project_sla_alert_log
  FOR SELECT USING (public.keryx_is_admin());

REVOKE ALL ON TABLE public.manufacturing_project_sla_targets FROM PUBLIC;
REVOKE ALL ON TABLE public.manufacturing_project_sla_alert_log FROM PUBLIC;
GRANT SELECT ON TABLE public.manufacturing_project_sla_targets TO authenticated;
GRANT SELECT ON TABLE public.manufacturing_project_sla_alert_log TO authenticated;

COMMIT;
