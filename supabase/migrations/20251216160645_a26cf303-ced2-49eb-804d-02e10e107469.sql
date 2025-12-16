-- Allow admins to view all wallets for admin panel
CREATE POLICY "Admins can view all wallets"
ON public.wallets FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update wallets (for give money feature)
CREATE POLICY "Admins can update all wallets"
ON public.wallets FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));