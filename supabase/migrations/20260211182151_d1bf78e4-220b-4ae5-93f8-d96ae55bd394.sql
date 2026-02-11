
-- Tighten password_resets INSERT to only authenticated users or service role
DROP POLICY "Authenticated users can insert resets" ON public.password_resets;
CREATE POLICY "Authenticated users can insert their own resets"
  ON public.password_resets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- The UPDATE with true is needed because the edge function (service role) validates/uses tokens
-- for unauthenticated users during password reset. Service role bypasses RLS anyway,
-- so this policy is effectively only for authenticated users updating their own.
DROP POLICY "Service role can update resets" ON public.password_resets;
CREATE POLICY "Users can update their own resets"
  ON public.password_resets FOR UPDATE
  USING (auth.uid() = user_id);
