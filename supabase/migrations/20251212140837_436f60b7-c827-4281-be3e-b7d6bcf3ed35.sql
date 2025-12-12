-- Fix security: Restrict profiles to own data only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Fix security: Restrict user_stats to own data only  
DROP POLICY IF EXISTS "Users can view all stats" ON public.user_stats;
CREATE POLICY "Users can view their own stats" 
ON public.user_stats 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create admin roles enum
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table for secure role management
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS: Users can view their own roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- RLS: Only admins can insert/update/delete roles
CREATE POLICY "Admins can manage roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin_settings table for game control
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key text NOT NULL UNIQUE,
    setting_value jsonb NOT NULL DEFAULT '{}',
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on admin_settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins can read settings
CREATE POLICY "Admins can view settings" 
ON public.admin_settings 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Only admins can modify settings
CREATE POLICY "Admins can manage settings" 
ON public.admin_settings 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create forced_results table for admin to control outcomes
CREATE TABLE IF NOT EXISTS public.forced_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    result text NOT NULL CHECK (result IN ('heads', 'tails')),
    remaining_flips integer NOT NULL DEFAULT 10,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) NOT NULL,
    is_active boolean NOT NULL DEFAULT true
);

-- Enable RLS on forced_results
ALTER TABLE public.forced_results ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins can manage forced results
CREATE POLICY "Admins can manage forced results" 
ON public.forced_results 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin function to give money to users
CREATE OR REPLACE FUNCTION public.admin_give_money(p_admin_id uuid, p_target_user_id uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if admin has admin role
    IF NOT public.has_role(p_admin_id, 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    
    -- Update target user's wallet
    UPDATE public.wallets
    SET balance = balance + p_amount, last_updated = now()
    WHERE user_id = p_target_user_id;
    
    -- Record transaction
    INSERT INTO public.transactions (user_id, type, amount, balance_after, status, payment_method)
    SELECT p_target_user_id, 'admin_credit', p_amount, w.balance, 'completed', 'admin'
    FROM public.wallets w WHERE w.user_id = p_target_user_id;
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- Allow profiles to be read for admin user list
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Allow user_stats to be read by admins
CREATE POLICY "Admins can view all user stats" 
ON public.user_stats 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default admin (will be updated by user)
-- Initial admin email: admin@coinflip.com
-- Note: The actual admin account needs to be created via auth signup first