
-- Add email_verified column to profiles
ALTER TABLE public.profiles ADD COLUMN email_verified boolean NOT NULL DEFAULT false;

-- Create email_verifications table
CREATE TABLE public.email_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verifications"
  ON public.email_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verifications"
  ON public.email_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verifications"
  ON public.email_verifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create password_resets table
CREATE TABLE public.password_resets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '1 hour'),
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

-- Password resets need to be accessible without auth (for the reset flow)
-- The edge function uses service role, so we need a policy for service role access
-- For regular users, they can view their own
CREATE POLICY "Users can view their own resets"
  ON public.password_resets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert resets"
  ON public.password_resets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update resets"
  ON public.password_resets FOR UPDATE
  USING (true);
