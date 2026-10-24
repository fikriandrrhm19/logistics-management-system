-- Trackest frontend integration: access policy hardening for existing UTS schema.
-- Review before running in Supabase SQL Editor. This script does not drop data or tables.
-- It enables RLS on reference/audit tables currently reported with RLS disabled.

BEGIN;

-- SECURITY DEFINER helper avoids recursive profile-policy checks when resolving a role.
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT p.role::text
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;

-- Enable row-level security on all application tables.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can see themselves; staff/admin can see names needed for operations.
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_access ON public.profiles;
CREATE POLICY profiles_select_access
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.current_app_role() IN ('staff', 'admin'));

-- Customers: users see their own customer record; staff/admin can operate across customers.
DROP POLICY IF EXISTS customers_select_access ON public.customers;
CREATE POLICY customers_select_access
ON public.customers FOR SELECT TO authenticated
USING (profile_id = auth.uid() OR public.current_app_role() IN ('staff', 'admin'));

-- Couriers: a courier sees their own record; staff/admin can see all courier records.
DROP POLICY IF EXISTS couriers_select_access ON public.couriers;
CREATE POLICY couriers_select_access
ON public.couriers FOR SELECT TO authenticated
USING (profile_id = auth.uid() OR public.current_app_role() IN ('staff', 'admin'));

-- Warehouse names/cities are operational reference data visible to authenticated users.
DROP POLICY IF EXISTS warehouses_select_authenticated ON public.warehouses;
CREATE POLICY warehouses_select_authenticated
ON public.warehouses FOR SELECT TO authenticated
USING (true);
DROP POLICY IF EXISTS warehouses_insert_staff ON public.warehouses;
CREATE POLICY warehouses_insert_staff
ON public.warehouses FOR INSERT TO authenticated
WITH CHECK (public.current_app_role() IN ('staff', 'admin'));
DROP POLICY IF EXISTS warehouses_update_staff ON public.warehouses;
CREATE POLICY warehouses_update_staff
ON public.warehouses FOR UPDATE TO authenticated
USING (public.current_app_role() IN ('staff', 'admin'))
WITH CHECK (public.current_app_role() IN ('staff', 'admin'));
-- No DELETE policy: browser users cannot delete warehouse records.

-- Routes: staff/admin see all; courier sees only routes assigned to their profile.
DROP POLICY IF EXISTS routes_select_access ON public.routes;
CREATE POLICY routes_select_access
ON public.routes FOR SELECT TO authenticated
USING (
  public.current_app_role() IN ('staff', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.couriers AS co
    WHERE co.id = routes.courier_id AND co.profile_id = auth.uid()
  )
);
DROP POLICY IF EXISTS routes_insert_staff ON public.routes;
CREATE POLICY routes_insert_staff
ON public.routes FOR INSERT TO authenticated
WITH CHECK (public.current_app_role() IN ('staff', 'admin'));
DROP POLICY IF EXISTS routes_update_staff ON public.routes;
CREATE POLICY routes_update_staff
ON public.routes FOR UPDATE TO authenticated
USING (public.current_app_role() IN ('staff', 'admin'))
WITH CHECK (public.current_app_role() IN ('staff', 'admin'));
-- No DELETE policy: browser users cannot delete route records.

-- Audit logs: admin-only reads. The trigger is elevated narrowly so status updates
-- can append audit rows without granting direct INSERT/UPDATE/DELETE to browser users.
DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
CREATE POLICY audit_logs_select_admin
ON public.audit_logs FOR SELECT TO authenticated
USING (public.current_app_role() = 'admin');

CREATE OR REPLACE FUNCTION public.audit_shipment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    shipment_id, action, old_status, new_status, changed_by
  ) VALUES (
    NEW.id, 'UPDATE', OLD.status, NEW.status, auth.uid()
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.audit_shipment_status() FROM PUBLIC;

COMMIT;

-- Verify after applying:
-- SELECT n.nspname, c.relname, c.relrowsecurity
-- FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
--   AND c.relname IN ('profiles','customers','couriers','warehouses','routes','shipments','tracking_events','audit_logs')
-- ORDER BY c.relname;
--
-- IMPORTANT:
-- 1) Do not add direct INSERT/UPDATE/DELETE policies to audit_logs.
-- 2) Existing create_shipment/update_shipment_status remain SECURITY INVOKER.
-- 3) Test staff/admin, customer, and courier sessions after applying this script.
