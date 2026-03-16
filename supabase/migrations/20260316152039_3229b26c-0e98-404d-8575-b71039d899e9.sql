
-- 1. DROP dangerous user-facing UPDATE/INSERT policies

DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can update their own verifications" ON public.email_verifications;
DROP POLICY IF EXISTS "Users can update their own resets" ON public.password_resets;

-- 2. Fix game_sessions policies
DROP POLICY IF EXISTS "Authenticated users can create game sessions" ON public.game_sessions;
CREATE POLICY "Authenticated users can create game sessions"
ON public.game_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = player1_id);

DROP POLICY IF EXISTS "Players can update their game sessions" ON public.game_sessions;

-- 3. Create record_game_result RPC
CREATE OR REPLACE FUNCTION public.record_game_result(
  p_user_id uuid,
  p_amount numeric,
  p_result text,
  p_won_amount numeric,
  p_mode text,
  p_player_choice text DEFAULT NULL,
  p_opponent_info jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance numeric;
  v_new_balance numeric;
  v_stats RECORD;
BEGIN
  IF auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  IF p_result NOT IN ('win', 'loss') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid result');
  END IF;
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF p_result = 'win' THEN
    v_new_balance := v_balance - p_amount + p_won_amount;
  ELSE
    v_new_balance := v_balance - p_amount;
  END IF;

  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  UPDATE public.wallets SET balance = v_new_balance, last_updated = now() WHERE user_id = p_user_id;

  INSERT INTO public.transactions (user_id, type, amount, balance_after, status, game_details)
  VALUES (
    p_user_id, p_result,
    CASE WHEN p_result = 'win' THEN p_won_amount ELSE p_amount END,
    v_new_balance, 'completed',
    jsonb_build_object('mode', p_mode, 'entry_fee', p_amount, 'result', p_result, 'player_choice', p_player_choice, 'opponent', p_opponent_info)
  );

  SELECT * INTO v_stats FROM public.user_stats WHERE user_id = p_user_id FOR UPDATE;
  IF v_stats IS NOT NULL THEN
    UPDATE public.user_stats SET
      total_games = v_stats.total_games + 1,
      games_won = CASE WHEN p_result = 'win' THEN v_stats.games_won + 1 ELSE v_stats.games_won END,
      games_lost = CASE WHEN p_result = 'loss' THEN v_stats.games_lost + 1 ELSE v_stats.games_lost END,
      total_wagered = v_stats.total_wagered + p_amount,
      total_winnings = CASE WHEN p_result = 'win' THEN v_stats.total_winnings + p_won_amount ELSE v_stats.total_winnings END,
      net_profit = CASE WHEN p_result = 'win' THEN v_stats.net_profit + (p_won_amount - p_amount) ELSE v_stats.net_profit - p_amount END,
      win_rate = CASE WHEN (v_stats.total_games + 1) > 0
        THEN ((CASE WHEN p_result = 'win' THEN v_stats.games_won + 1 ELSE v_stats.games_won END)::numeric / (v_stats.total_games + 1)) * 100
        ELSE 0 END,
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

-- 4. Create claim_daily_bonus RPC
CREATE OR REPLACE FUNCTION public.claim_daily_bonus(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last_claim RECORD;
  v_hours_since numeric;
  v_streak integer;
  v_bonus numeric := 10.00;
  v_balance numeric;
  v_new_balance numeric;
BEGIN
  IF auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_last_claim FROM public.daily_bonuses WHERE user_id = p_user_id ORDER BY claimed_at DESC LIMIT 1;

  IF v_last_claim IS NOT NULL THEN
    v_hours_since := EXTRACT(EPOCH FROM (now() - v_last_claim.claimed_at)) / 3600;
    IF v_hours_since < 24 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already claimed today');
    END IF;
    v_streak := CASE WHEN v_hours_since <= 36 THEN v_last_claim.streak_days + 1 ELSE 1 END;
  ELSE
    v_streak := 1;
  END IF;

  INSERT INTO public.daily_bonuses (user_id, bonus_amount, streak_days) VALUES (p_user_id, v_bonus, v_streak);

  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  v_new_balance := v_balance + v_bonus;
  UPDATE public.wallets SET balance = v_new_balance, bonus_balance = bonus_balance + v_bonus, last_updated = now() WHERE user_id = p_user_id;

  INSERT INTO public.transactions (user_id, type, amount, balance_after, status, processed_at) VALUES (p_user_id, 'bonus', v_bonus, v_new_balance, 'completed', now());

  RETURN jsonb_build_object('success', true, 'bonus_amount', v_bonus, 'streak', v_streak, 'new_balance', v_new_balance);
END;
$$;

-- 5. Remove user INSERT policy on user_stats
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_stats;
