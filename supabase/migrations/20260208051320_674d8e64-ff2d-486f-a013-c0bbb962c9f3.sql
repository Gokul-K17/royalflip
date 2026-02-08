-- Fix PUBLIC_DATA_EXPOSURE: Restrict multiplayer data to authenticated users only

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view rounds" ON public.multiplayer_rounds;
DROP POLICY IF EXISTS "Anyone can view bets" ON public.multiplayer_bets;

-- Create new restrictive policies requiring authentication
CREATE POLICY "Authenticated users can view rounds"
ON public.multiplayer_rounds FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view bets"
ON public.multiplayer_bets FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix DEFINER_OR_RPC_BYPASS: Add row-level locking to prevent race conditions in place_multiplayer_bet
CREATE OR REPLACE FUNCTION public.place_multiplayer_bet(p_round_id uuid, p_user_id uuid, p_username text, p_side text, p_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet_balance NUMERIC;
  v_round_status TEXT;
  v_round_ends_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Validate inputs
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;
  
  IF p_side NOT IN ('king', 'tail') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid side selection');
  END IF;

  -- Check round is still betting with row lock to prevent race conditions
  SELECT status, ends_at INTO v_round_status, v_round_ends_at
  FROM public.multiplayer_rounds
  WHERE id = p_round_id
  FOR UPDATE;
  
  IF v_round_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round not found');
  END IF;
  
  IF v_round_status != 'betting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round is no longer accepting bets');
  END IF;
  
  -- Verify round hasn't expired
  IF v_round_ends_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round has expired');
  END IF;
  
  -- Check wallet balance with row lock to prevent race conditions
  SELECT balance INTO v_wallet_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_wallet_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  
  IF v_wallet_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Deduct from wallet (atomic with the lock above)
  UPDATE public.wallets
  SET balance = balance - p_amount,
      last_updated = now()
  WHERE user_id = p_user_id;
  
  -- Insert bet
  INSERT INTO public.multiplayer_bets (round_id, user_id, username, side, amount)
  VALUES (p_round_id, p_user_id, p_username, p_side, p_amount);
  
  -- Update round totals
  IF p_side = 'king' THEN
    UPDATE public.multiplayer_rounds
    SET king_total = king_total + p_amount
    WHERE id = p_round_id;
  ELSE
    UPDATE public.multiplayer_rounds
    SET tail_total = tail_total + p_amount
    WHERE id = p_round_id;
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$function$;

-- Add input validation and row locking to create_withdrawal_request
CREATE OR REPLACE FUNCTION public.create_withdrawal_request(p_user_id uuid, p_amount numeric, p_method text, p_payout_identifier text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_available_balance numeric;
  v_min_withdrawal numeric;
  v_daily_total numeric;
  v_max_daily numeric;
  v_pending_count integer;
BEGIN
  -- Validate inputs
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;
  
  IF p_method NOT IN ('upi', 'bank', 'paypal') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid withdrawal method');
  END IF;
  
  IF p_payout_identifier IS NULL OR length(trim(p_payout_identifier)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout identifier is required');
  END IF;
  
  -- Limit payout identifier length to prevent abuse
  IF length(p_payout_identifier) > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout identifier too long');
  END IF;

  -- Get user's available balance with row lock to prevent race conditions
  SELECT balance INTO v_available_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_available_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  
  -- Get settings
  SELECT (setting_value->>'amount')::numeric INTO v_min_withdrawal
  FROM public.withdrawal_settings WHERE setting_key = 'min_withdrawal';
  
  SELECT (setting_value->>'amount')::numeric INTO v_max_daily
  FROM public.withdrawal_settings WHERE setting_key = 'max_daily_withdrawal';
  
  -- Default values if settings not found
  v_min_withdrawal := COALESCE(v_min_withdrawal, 100);
  v_max_daily := COALESCE(v_max_daily, 50000);
  
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
  
  -- Lock the amount (atomic with the lock above)
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
$function$;