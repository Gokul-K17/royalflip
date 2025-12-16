-- Add locked_balance to wallets if not exists
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS locked_balance numeric NOT NULL DEFAULT 0.00;

-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  method text NOT NULL,
  payout_identifier text NOT NULL,
  payout_identifier_encrypted text, -- For storing encrypted version
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'failed', 'rejected')),
  admin_notes text,
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamp with time zone,
  razorpay_payout_id text,
  failure_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create withdrawal_settings table for business rules
CREATE TABLE IF NOT EXISTS public.withdrawal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default withdrawal settings
INSERT INTO public.withdrawal_settings (setting_key, setting_value) VALUES
  ('min_withdrawal', '{"amount": 100}'::jsonb),
  ('max_daily_withdrawal', '{"amount": 50000}'::jsonb),
  ('max_monthly_withdrawal', '{"amount": 500000}'::jsonb),
  ('platform_fee_percent', '{"percent": 0}'::jsonb),
  ('auto_approve_limit', '{"amount": 5000}'::jsonb),
  ('cooldown_hours', '{"hours": 24}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS on withdrawal_requests
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for withdrawal_requests
CREATE POLICY "Users can view their own withdrawal requests"
ON public.withdrawal_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawal requests"
ON public.withdrawal_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawal requests"
ON public.withdrawal_requests FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update withdrawal requests"
ON public.withdrawal_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Enable RLS on withdrawal_settings
ALTER TABLE public.withdrawal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage withdrawal settings"
ON public.withdrawal_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to process withdrawal request
CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
  p_user_id uuid,
  p_amount numeric,
  p_method text,
  p_payout_identifier text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available_balance numeric;
  v_min_withdrawal numeric;
  v_daily_total numeric;
  v_max_daily numeric;
  v_last_bet timestamp with time zone;
  v_cooldown_hours integer;
  v_pending_count integer;
BEGIN
  -- Get user's available balance
  SELECT balance INTO v_available_balance
  FROM public.wallets
  WHERE user_id = p_user_id;
  
  IF v_available_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  
  -- Get settings
  SELECT (setting_value->>'amount')::numeric INTO v_min_withdrawal
  FROM public.withdrawal_settings WHERE setting_key = 'min_withdrawal';
  
  SELECT (setting_value->>'amount')::numeric INTO v_max_daily
  FROM public.withdrawal_settings WHERE setting_key = 'max_daily_withdrawal';
  
  SELECT (setting_value->>'hours')::integer INTO v_cooldown_hours
  FROM public.withdrawal_settings WHERE setting_key = 'cooldown_hours';
  
  -- Default values if settings not found
  v_min_withdrawal := COALESCE(v_min_withdrawal, 100);
  v_max_daily := COALESCE(v_max_daily, 50000);
  v_cooldown_hours := COALESCE(v_cooldown_hours, 24);
  
  -- Validate minimum amount
  IF p_amount < v_min_withdrawal THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum withdrawal is ₹' || v_min_withdrawal::text);
  END IF;
  
  -- Validate available balance
  IF p_amount > v_available_balance THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient available balance');
  END IF;
  
  -- Check for pending withdrawals
  SELECT COUNT(*) INTO v_pending_count
  FROM public.withdrawal_requests
  WHERE user_id = p_user_id AND status = 'pending';
  
  IF v_pending_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a pending withdrawal request');
  END IF;
  
  -- Check daily withdrawal limit
  SELECT COALESCE(SUM(amount), 0) INTO v_daily_total
  FROM public.withdrawal_requests
  WHERE user_id = p_user_id 
    AND status IN ('pending', 'approved', 'paid')
    AND created_at > now() - interval '24 hours';
  
  IF (v_daily_total + p_amount) > v_max_daily THEN
    RETURN jsonb_build_object('success', false, 'error', 'Daily withdrawal limit exceeded. Max: ₹' || v_max_daily::text);
  END IF;
  
  -- Lock the amount
  UPDATE public.wallets
  SET balance = balance - p_amount,
      locked_balance = locked_balance + p_amount,
      last_updated = now()
  WHERE user_id = p_user_id;
  
  -- Create withdrawal request
  INSERT INTO public.withdrawal_requests (user_id, amount, method, payout_identifier, status)
  VALUES (p_user_id, p_amount, p_method, p_payout_identifier, 'pending');
  
  RETURN jsonb_build_object('success', true, 'message', 'Withdrawal request submitted');
END;
$$;

-- Create function for admin to approve/reject withdrawal
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(
  p_admin_id uuid,
  p_request_id uuid,
  p_action text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_new_status text;
BEGIN
  -- Verify admin role
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Get request details
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id AND status = 'pending';
  
  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or already processed');
  END IF;
  
  IF p_action = 'approve' THEN
    v_new_status := 'approved';
  ELSIF p_action = 'reject' THEN
    v_new_status := 'rejected';
    -- Refund the locked amount
    UPDATE public.wallets
    SET balance = balance + v_request.amount,
        locked_balance = locked_balance - v_request.amount,
        last_updated = now()
    WHERE user_id = v_request.user_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;
  
  -- Update request status
  UPDATE public.withdrawal_requests
  SET status = v_new_status,
      admin_notes = p_notes,
      processed_by = p_admin_id,
      processed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;
  
  RETURN jsonb_build_object('success', true, 'status', v_new_status);
END;
$$;

-- Create function to mark withdrawal as paid
CREATE OR REPLACE FUNCTION public.admin_mark_withdrawal_paid(
  p_admin_id uuid,
  p_request_id uuid,
  p_razorpay_payout_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Verify admin role
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Get request details
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id AND status = 'approved';
  
  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or not approved');
  END IF;
  
  -- Deduct from locked balance
  UPDATE public.wallets
  SET locked_balance = locked_balance - v_request.amount,
      total_withdrawals = total_withdrawals + v_request.amount,
      last_updated = now()
  WHERE user_id = v_request.user_id;
  
  -- Create transaction record
  INSERT INTO public.transactions (user_id, type, amount, balance_after, status, payment_method, payment_details)
  SELECT 
    v_request.user_id, 
    'withdrawal', 
    -v_request.amount, 
    w.balance,
    'completed',
    v_request.method,
    jsonb_build_object('payout_id', p_razorpay_payout_id, 'request_id', p_request_id)
  FROM public.wallets w WHERE w.user_id = v_request.user_id;
  
  -- Update request status
  UPDATE public.withdrawal_requests
  SET status = 'paid',
      razorpay_payout_id = p_razorpay_payout_id,
      processed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Create function to mark withdrawal as failed and refund
CREATE OR REPLACE FUNCTION public.admin_mark_withdrawal_failed(
  p_admin_id uuid,
  p_request_id uuid,
  p_failure_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Verify admin role
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Get request details
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id AND status = 'approved';
  
  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or not approved');
  END IF;
  
  -- Refund to available balance
  UPDATE public.wallets
  SET balance = balance + v_request.amount,
      locked_balance = locked_balance - v_request.amount,
      last_updated = now()
  WHERE user_id = v_request.user_id;
  
  -- Update request status
  UPDATE public.withdrawal_requests
  SET status = 'failed',
      failure_reason = p_failure_reason,
      processed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Enable realtime for withdrawal_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;