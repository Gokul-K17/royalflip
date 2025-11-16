-- Add referral program table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  reward_claimed BOOLEAN DEFAULT false,
  reward_amount NUMERIC DEFAULT 50.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

-- Enable RLS on referrals table
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (as referrer)
CREATE POLICY "Users can view referrals they made"
  ON public.referrals
  FOR SELECT
  USING (auth.uid() = referrer_id);

-- Users can view referrals where they were referred
CREATE POLICY "Users can view referrals they received"
  ON public.referrals
  FOR SELECT
  USING (auth.uid() = referred_id);

-- Users can insert referrals
CREATE POLICY "Users can create referrals"
  ON public.referrals
  FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

-- Add referral_code to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE DEFAULT substring(md5(random()::text) from 1 for 8);

-- Add referred_by column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID;

-- Update handle_new_user function to generate referral code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_referral_code TEXT;
BEGIN
  -- Generate unique referral code
  v_referral_code := substring(md5(NEW.id::text || random()::text) from 1 for 8);
  
  INSERT INTO public.profiles (id, username, email, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_referral_code
  );
  
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 100.00);
  
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;