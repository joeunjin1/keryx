-- KERYX Manufacturing Execution: Factory, QC, Shipment
-- Applied after 20260901_manufacturing_project_core.sql (already executed in Production).
-- Additive only: does not alter or delete existing buyer, product, order, IP, retail, or project records.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Role helper functions. These functions are used in RLS policies and do not
--    reveal factory or buyer data outside the authenticated user's own scope.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.keryx_is_inspector()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = auth.uid()
      AND profile.kind::text IN ('inspector', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.keryx_is_manufacturing_project_buyer(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.manufacturing_projects project
    INNER JOIN public.sellers seller ON seller.id = project.seller_id
    INNER JOIN public.user_profiles profile
      ON profile.id = auth.uid()
     AND profile.kind::text = 'seller'
    WHERE project.id = p_project_id
      AND seller.user_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- 2. Factory assignment. Only a selected, active factory gets access to a
--    project. Candidate factories are never exposed to one another or a buyer.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manufacturing_project_factory_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.manufacturing_projects(id) ON DELETE RESTRICT,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'active', 'released', 'rejected')),
  selection_note text,
  assigned_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, factory_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_manufacturing_active_factory_per_project
  ON public.manufacturing_project_factory_assignments(project_id)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_manufacturing_factory_assignment_factory_status
  ON public.manufacturing_project_factory_assignments(factory_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_manufacturing_factory_assignment_project
  ON public.manufacturing_project_factory_assignments(project_id, updated_at DESC);

-- This helper must be declared after the table it inspects.
CREATE OR REPLACE FUNCTION public.keryx_is_active_project_factory(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.manufacturing_project_factory_assignments assignment
    WHERE assignment.project_id = p_project_id
      AND assignment.factory_id = public.keryx_current_factory_id()
      AND assignment.status = 'active'
  );
$$;

-- -----------------------------------------------------------------------------
-- 3. Factory execution updates, QC report/evidence, and shipment documents.
--    Files are referenced by manufacturing_project_files and remain in the
--    existing private manufacturing-project-private Storage bucket.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manufacturing_factory_execution_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.manufacturing_projects(id) ON DELETE RESTRICT,
  factory_assignment_id uuid NOT NULL REFERENCES public.manufacturing_project_factory_assignments(id) ON DELETE RESTRICT,
  update_type text NOT NULL CHECK (update_type IN ('material', 'sampling', 'production', 'packing', 'shipment_ready', 'issue')),
  factory_note text NOT NULL CHECK (char_length(trim(factory_note)) > 0),
  buyer_visible_note text,
  buyer_visible boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'revision_requested', 'published')),
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reviewed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_manufacturing_factory_updates_project
  ON public.manufacturing_factory_execution_updates(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manufacturing_factory_updates_assignment
  ON public.manufacturing_factory_execution_updates(factory_assignment_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.manufacturing_qc_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.manufacturing_projects(id) ON DELETE RESTRICT,
  factory_assignment_id uuid REFERENCES public.manufacturing_project_factory_assignments(id) ON DELETE SET NULL,
  round_no integer NOT NULL DEFAULT 1 CHECK (round_no > 0),
  inspection_stage text NOT NULL DEFAULT 'pre_shipment'
    CHECK (inspection_stage IN ('pre_production', 'during_production', 'pre_shipment', 'container_loading')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'revision_requested', 'approved', 'rejected')),
  result text CHECK (result IN ('pass', 'conditional_pass', 'hold', 'reject')),
  inspected_quantity integer CHECK (inspected_quantity IS NULL OR inspected_quantity >= 0),
  defect_summary text,
  buyer_visible_summary_ko text,
  buyer_visible_summary_zh text,
  buyer_visible boolean NOT NULL DEFAULT false,
  assigned_inspector_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  reviewed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, round_no, inspection_stage)
);
CREATE INDEX IF NOT EXISTS idx_manufacturing_qc_reports_project
  ON public.manufacturing_qc_reports(project_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manufacturing_qc_reports_inspector
  ON public.manufacturing_qc_reports(assigned_inspector_user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.manufacturing_qc_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qc_report_id uuid NOT NULL REFERENCES public.manufacturing_qc_reports(id) ON DELETE RESTRICT,
  project_file_id uuid NOT NULL REFERENCES public.manufacturing_project_files(id) ON DELETE RESTRICT,
  evidence_type text NOT NULL DEFAULT 'photo'
    CHECK (evidence_type IN ('photo', 'video', 'document', 'measurement')),
  caption text,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (qc_report_id, project_file_id)
);
CREATE INDEX IF NOT EXISTS idx_manufacturing_qc_evidence_report
  ON public.manufacturing_qc_evidence(qc_report_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.manufacturing_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.manufacturing_projects(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'preparing'
    CHECK (status IN ('preparing', 'documents_pending', 'documents_review', 'buyer_visible', 'shipped', 'delivered', 'closed')),
  shipping_method text CHECK (shipping_method IN ('parcel', 'air', 'sea_lcl', 'sea_fcl', 'rail', 'other')),
  shipment_reference text,
  buyer_visible_summary_ko text,
  buyer_visible_summary_zh text,
  buyer_visible boolean NOT NULL DEFAULT false,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_manufacturing_shipments_project
  ON public.manufacturing_shipments(project_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.manufacturing_shipment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.manufacturing_shipments(id) ON DELETE RESTRICT,
  project_file_id uuid NOT NULL REFERENCES public.manufacturing_project_files(id) ON DELETE RESTRICT,
  document_type text NOT NULL
    CHECK (document_type IN ('bl', 'co', 'inland_freight_invoice', 'ocean_freight_invoice', 'commercial_invoice', 'packing_list', 'other')),
  product_name_ko text,
  product_name_en text,
  product_name_en_source text NOT NULL DEFAULT 'manual'
    CHECK (product_name_en_source IN ('manual', 'translation_pending', 'machine_translated', 'admin_confirmed')),
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'revision_requested', 'approved', 'rejected')),
  buyer_visible boolean NOT NULL DEFAULT false,
  submitted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shipment_id, project_file_id)
);
CREATE INDEX IF NOT EXISTS idx_manufacturing_shipment_documents_shipment
  ON public.manufacturing_shipment_documents(shipment_id, status, created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. Updated-at trigger reused without changing prior project data.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_manufacturing_factory_assignment_updated_at ON public.manufacturing_project_factory_assignments;
CREATE TRIGGER trg_manufacturing_factory_assignment_updated_at
  BEFORE UPDATE ON public.manufacturing_project_factory_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_manufacturing_factory_update_updated_at ON public.manufacturing_factory_execution_updates;
CREATE TRIGGER trg_manufacturing_factory_update_updated_at
  BEFORE UPDATE ON public.manufacturing_factory_execution_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_manufacturing_qc_report_updated_at ON public.manufacturing_qc_reports;
CREATE TRIGGER trg_manufacturing_qc_report_updated_at
  BEFORE UPDATE ON public.manufacturing_qc_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_manufacturing_shipment_updated_at ON public.manufacturing_shipments;
CREATE TRIGGER trg_manufacturing_shipment_updated_at
  BEFORE UPDATE ON public.manufacturing_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_manufacturing_shipment_document_updated_at ON public.manufacturing_shipment_documents;
CREATE TRIGGER trg_manufacturing_shipment_document_updated_at
  BEFORE UPDATE ON public.manufacturing_shipment_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 5. RLS. Admin is the only role that can create assignments, approve QC and
--    publish shipping documents. Factory access is limited to its active work.
-- -----------------------------------------------------------------------------
ALTER TABLE public.manufacturing_project_factory_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturing_factory_execution_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturing_qc_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturing_qc_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturing_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturing_shipment_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS manufacturing_factory_assignment_admin_all ON public.manufacturing_project_factory_assignments;
CREATE POLICY manufacturing_factory_assignment_admin_all ON public.manufacturing_project_factory_assignments
  FOR ALL TO authenticated
  USING (public.keryx_is_admin()) WITH CHECK (public.keryx_is_admin());
DROP POLICY IF EXISTS manufacturing_factory_assignment_factory_read_active ON public.manufacturing_project_factory_assignments;
CREATE POLICY manufacturing_factory_assignment_factory_read_active ON public.manufacturing_project_factory_assignments
  FOR SELECT TO authenticated
  USING (factory_id = public.keryx_current_factory_id() AND status = 'active');

DROP POLICY IF EXISTS manufacturing_factory_updates_admin_all ON public.manufacturing_factory_execution_updates;
CREATE POLICY manufacturing_factory_updates_admin_all ON public.manufacturing_factory_execution_updates
  FOR ALL TO authenticated
  USING (public.keryx_is_admin()) WITH CHECK (public.keryx_is_admin());
DROP POLICY IF EXISTS manufacturing_factory_updates_factory_own ON public.manufacturing_factory_execution_updates;
CREATE POLICY manufacturing_factory_updates_factory_own ON public.manufacturing_factory_execution_updates
  FOR SELECT TO authenticated
  USING (
    created_by_user_id = auth.uid()
    AND public.keryx_is_active_project_factory(project_id)
  );
DROP POLICY IF EXISTS manufacturing_factory_updates_factory_submit ON public.manufacturing_factory_execution_updates;
CREATE POLICY manufacturing_factory_updates_factory_submit ON public.manufacturing_factory_execution_updates
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by_user_id = auth.uid()
    AND public.keryx_is_active_project_factory(project_id)
    AND status = 'submitted'
    AND buyer_visible = false
    AND reviewed_by_user_id IS NULL
    AND reviewed_at IS NULL
  );
DROP POLICY IF EXISTS manufacturing_factory_updates_factory_revise ON public.manufacturing_factory_execution_updates;
CREATE POLICY manufacturing_factory_updates_factory_revise ON public.manufacturing_factory_execution_updates
  FOR UPDATE TO authenticated
  USING (
    created_by_user_id = auth.uid()
    AND public.keryx_is_active_project_factory(project_id)
    AND status = 'revision_requested'
  ) WITH CHECK (
    created_by_user_id = auth.uid()
    AND public.keryx_is_active_project_factory(project_id)
    AND status = 'submitted'
    AND buyer_visible = false
    AND reviewed_by_user_id IS NULL
    AND reviewed_at IS NULL
  );
DROP POLICY IF EXISTS manufacturing_factory_updates_buyer_visible ON public.manufacturing_factory_execution_updates;
CREATE POLICY manufacturing_factory_updates_buyer_visible ON public.manufacturing_factory_execution_updates
  FOR SELECT TO authenticated
  USING (
    buyer_visible = true
    AND status = 'published'
    AND public.keryx_is_manufacturing_project_buyer(project_id)
  );

DROP POLICY IF EXISTS manufacturing_qc_reports_admin_all ON public.manufacturing_qc_reports;
CREATE POLICY manufacturing_qc_reports_admin_all ON public.manufacturing_qc_reports
  FOR ALL TO authenticated
  USING (public.keryx_is_admin()) WITH CHECK (public.keryx_is_admin());
DROP POLICY IF EXISTS manufacturing_qc_reports_inspector_own ON public.manufacturing_qc_reports;
CREATE POLICY manufacturing_qc_reports_inspector_own ON public.manufacturing_qc_reports
  FOR SELECT TO authenticated
  USING (assigned_inspector_user_id = auth.uid() AND public.keryx_is_inspector());
DROP POLICY IF EXISTS manufacturing_qc_reports_factory_active ON public.manufacturing_qc_reports;
CREATE POLICY manufacturing_qc_reports_factory_active ON public.manufacturing_qc_reports
  FOR SELECT TO authenticated
  USING (public.keryx_is_active_project_factory(project_id));
DROP POLICY IF EXISTS manufacturing_qc_reports_buyer_visible ON public.manufacturing_qc_reports;
CREATE POLICY manufacturing_qc_reports_buyer_visible ON public.manufacturing_qc_reports
  FOR SELECT TO authenticated
  USING (
    buyer_visible = true
    AND status = 'approved'
    AND public.keryx_is_manufacturing_project_buyer(project_id)
  );

DROP POLICY IF EXISTS manufacturing_qc_evidence_admin_all ON public.manufacturing_qc_evidence;
CREATE POLICY manufacturing_qc_evidence_admin_all ON public.manufacturing_qc_evidence
  FOR ALL TO authenticated
  USING (public.keryx_is_admin()) WITH CHECK (public.keryx_is_admin());
DROP POLICY IF EXISTS manufacturing_qc_evidence_inspector_own ON public.manufacturing_qc_evidence;
CREATE POLICY manufacturing_qc_evidence_inspector_own ON public.manufacturing_qc_evidence
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.manufacturing_qc_reports report
      WHERE report.id = qc_report_id
        AND report.assigned_inspector_user_id = auth.uid()
        AND public.keryx_is_inspector()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.manufacturing_qc_reports report
      WHERE report.id = qc_report_id
        AND report.assigned_inspector_user_id = auth.uid()
        AND public.keryx_is_inspector()
    )
  );
DROP POLICY IF EXISTS manufacturing_qc_evidence_factory_active_read ON public.manufacturing_qc_evidence;
CREATE POLICY manufacturing_qc_evidence_factory_active_read ON public.manufacturing_qc_evidence
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.manufacturing_qc_reports report
      WHERE report.id = qc_report_id
        AND public.keryx_is_active_project_factory(report.project_id)
    )
  );
DROP POLICY IF EXISTS manufacturing_qc_evidence_buyer_visible_read ON public.manufacturing_qc_evidence;
CREATE POLICY manufacturing_qc_evidence_buyer_visible_read ON public.manufacturing_qc_evidence
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.manufacturing_qc_reports report
      WHERE report.id = qc_report_id
        AND report.buyer_visible = true
        AND report.status = 'approved'
        AND public.keryx_is_manufacturing_project_buyer(report.project_id)
    )
  );

DROP POLICY IF EXISTS manufacturing_shipments_admin_all ON public.manufacturing_shipments;
CREATE POLICY manufacturing_shipments_admin_all ON public.manufacturing_shipments
  FOR ALL TO authenticated
  USING (public.keryx_is_admin()) WITH CHECK (public.keryx_is_admin());
DROP POLICY IF EXISTS manufacturing_shipments_factory_active_read ON public.manufacturing_shipments;
CREATE POLICY manufacturing_shipments_factory_active_read ON public.manufacturing_shipments
  FOR SELECT TO authenticated
  USING (public.keryx_is_active_project_factory(project_id));
DROP POLICY IF EXISTS manufacturing_shipments_buyer_visible_read ON public.manufacturing_shipments;
CREATE POLICY manufacturing_shipments_buyer_visible_read ON public.manufacturing_shipments
  FOR SELECT TO authenticated
  USING (
    buyer_visible = true
    AND public.keryx_is_manufacturing_project_buyer(project_id)
  );

DROP POLICY IF EXISTS manufacturing_shipment_documents_admin_all ON public.manufacturing_shipment_documents;
CREATE POLICY manufacturing_shipment_documents_admin_all ON public.manufacturing_shipment_documents
  FOR ALL TO authenticated
  USING (public.keryx_is_admin()) WITH CHECK (public.keryx_is_admin());
DROP POLICY IF EXISTS manufacturing_shipment_documents_factory_active_read ON public.manufacturing_shipment_documents;
CREATE POLICY manufacturing_shipment_documents_factory_active_read ON public.manufacturing_shipment_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.manufacturing_shipments shipment
      WHERE shipment.id = shipment_id
        AND public.keryx_is_active_project_factory(shipment.project_id)
    )
  );
DROP POLICY IF EXISTS manufacturing_shipment_documents_buyer_visible_read ON public.manufacturing_shipment_documents;
CREATE POLICY manufacturing_shipment_documents_buyer_visible_read ON public.manufacturing_shipment_documents
  FOR SELECT TO authenticated
  USING (
    buyer_visible = true
    AND status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.manufacturing_shipments shipment
      WHERE shipment.id = shipment_id
        AND shipment.buyer_visible = true
        AND public.keryx_is_manufacturing_project_buyer(shipment.project_id)
    )
  );

-- Base tables are not writable from a normal authenticated browser session.
-- Verified server APIs and the controlled RPCs below are the only change paths.
REVOKE ALL ON TABLE public.manufacturing_project_factory_assignments FROM anon, authenticated;
REVOKE ALL ON TABLE public.manufacturing_factory_execution_updates FROM anon, authenticated;
REVOKE ALL ON TABLE public.manufacturing_qc_reports FROM anon, authenticated;
REVOKE ALL ON TABLE public.manufacturing_qc_evidence FROM anon, authenticated;
REVOKE ALL ON TABLE public.manufacturing_shipments FROM anon, authenticated;
REVOKE ALL ON TABLE public.manufacturing_shipment_documents FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. Controlled RPC: factory activation and QC completion cannot be made by
--    changing raw tables, and QC requires at least one evidence record.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.keryx_activate_manufacturing_factory(
  p_project_id uuid,
  p_factory_id uuid,
  p_selection_note text DEFAULT NULL
)
RETURNS public.manufacturing_project_factory_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.manufacturing_project_factory_assignments;
BEGIN
  IF NOT public.keryx_is_admin() THEN
    RAISE EXCEPTION 'Only an administrator can activate a manufacturing factory assignment.';
  END IF;

  UPDATE public.manufacturing_project_factory_assignments
  SET status = 'released', released_at = now(), updated_at = now()
  WHERE project_id = p_project_id AND status = 'active';

  INSERT INTO public.manufacturing_project_factory_assignments (
    project_id, factory_id, status, selection_note, assigned_by_user_id, assigned_at
  ) VALUES (
    p_project_id, p_factory_id, 'active', nullif(trim(p_selection_note), ''), auth.uid(), now()
  ) ON CONFLICT (project_id, factory_id) DO UPDATE
    SET status = 'active', selection_note = excluded.selection_note,
        assigned_by_user_id = auth.uid(), assigned_at = now(), released_at = NULL, updated_at = now()
  RETURNING * INTO result;

  INSERT INTO public.manufacturing_project_events (project_id, event_type, detail, created_by_user_id)
  VALUES (p_project_id, 'factory_activated', jsonb_build_object('factory_assignment_id', result.id), auth.uid());

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.keryx_submit_manufacturing_qc_report(
  p_qc_report_id uuid
)
RETURNS public.manufacturing_qc_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.manufacturing_qc_reports;
BEGIN
  SELECT * INTO result
  FROM public.manufacturing_qc_reports
  WHERE id = p_qc_report_id
  FOR UPDATE;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'QC report not found.';
  END IF;

  IF NOT public.keryx_is_admin()
     AND NOT (public.keryx_is_inspector() AND result.assigned_inspector_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the assigned inspector or an administrator can submit this QC report.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.manufacturing_qc_evidence evidence
    WHERE evidence.qc_report_id = result.id
  ) THEN
    RAISE EXCEPTION 'At least one QC evidence file is required before submission.';
  END IF;

  UPDATE public.manufacturing_qc_reports
  SET status = 'submitted', completed_by_user_id = auth.uid(), completed_at = now(), updated_at = now()
  WHERE id = result.id
  RETURNING * INTO result;

  INSERT INTO public.manufacturing_project_events (project_id, event_type, detail, created_by_user_id)
  VALUES (result.project_id, 'qc_report_submitted', jsonb_build_object('qc_report_id', result.id), auth.uid());

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.keryx_approve_manufacturing_qc_report(
  p_qc_report_id uuid,
  p_buyer_visible boolean,
  p_summary_ko text DEFAULT NULL,
  p_summary_zh text DEFAULT NULL
)
RETURNS public.manufacturing_qc_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.manufacturing_qc_reports;
BEGIN
  IF NOT public.keryx_is_admin() THEN
    RAISE EXCEPTION 'Only an administrator can approve a QC report.';
  END IF;

  UPDATE public.manufacturing_qc_reports
  SET status = 'approved', buyer_visible = p_buyer_visible,
      buyer_visible_summary_ko = nullif(trim(p_summary_ko), ''),
      buyer_visible_summary_zh = nullif(trim(p_summary_zh), ''),
      reviewed_by_user_id = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = p_qc_report_id AND status = 'submitted'
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'Only a submitted QC report can be approved.';
  END IF;

  INSERT INTO public.manufacturing_project_events (project_id, event_type, detail, created_by_user_id)
  VALUES (result.project_id, 'qc_report_approved', jsonb_build_object('qc_report_id', result.id, 'buyer_visible', p_buyer_visible), auth.uid());

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.keryx_is_inspector() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.keryx_is_manufacturing_project_buyer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.keryx_is_active_project_factory(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.keryx_activate_manufacturing_factory(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.keryx_submit_manufacturing_qc_report(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.keryx_approve_manufacturing_qc_report(uuid, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.keryx_is_inspector() TO authenticated;
GRANT EXECUTE ON FUNCTION public.keryx_is_manufacturing_project_buyer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.keryx_is_active_project_factory(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.keryx_activate_manufacturing_factory(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.keryx_submit_manufacturing_qc_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.keryx_approve_manufacturing_qc_report(uuid, boolean, text, text) TO authenticated;

COMMIT;
