-- Trackest v2: allow a user to edit their own display name only.
-- Email and role remain managed by Supabase Auth / database administrators.
-- Run in a controlled session after reviewing the existing profile policies.

BEGIN;

-- Replace broad table-level DML inherited from the general application grant.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.profiles FROM authenticated;

-- The frontend profile editor may only update full_name, not id or role.
GRANT UPDATE (full_name) ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS profiles_update_own_name ON public.profiles;
CREATE POLICY profiles_update_own_name
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

COMMIT;
