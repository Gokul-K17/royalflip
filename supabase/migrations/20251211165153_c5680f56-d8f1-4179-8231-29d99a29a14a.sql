-- Create multiplayer rounds table
CREATE TABLE public.multiplayer_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_number SERIAL,
  status TEXT NOT NULL DEFAULT 'betting', -- 'betting', 'flipping', 'completed'
  king_total NUMERIC NOT NULL DEFAULT 0,
  tail_total NUMERIC NOT NULL DEFAULT 0,
  winner TEXT, -- 'king' or 'tail'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '2 minutes'),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create multiplayer bets table
CREATE TABLE public.multiplayer_bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.multiplayer_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('king', 'tail')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payout NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(round_id, user_id, side)
);

-- Enable RLS
ALTER TABLE public.multiplayer_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multiplayer_bets ENABLE ROW LEVEL SECURITY;

-- RLS policies for rounds (public read, system write)
CREATE POLICY "Anyone can view rounds"
ON public.multiplayer_rounds FOR SELECT
USING (true);

-- RLS policies for bets
CREATE POLICY "Anyone can view bets"
ON public.multiplayer_bets FOR SELECT
USING (true);

CREATE POLICY "Users can place their own bets"
ON public.multiplayer_bets FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.multiplayer_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.multiplayer_bets;

-- Function to get or create current round
CREATE OR REPLACE FUNCTION public.get_current_round()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_round_id UUID;
BEGIN
  -- Get active betting round
  SELECT id INTO current_round_id
  FROM public.multiplayer_rounds
  WHERE status = 'betting' AND ends_at > now()
  ORDER BY started_at DESC
  LIMIT 1;
  
  -- If no active round, create one
  IF current_round_id IS NULL THEN
    INSERT INTO public.multiplayer_rounds (status)
    VALUES ('betting')
    RETURNING id INTO current_round_id;
  END IF;
  
  RETURN current_round_id;
END;
$$;

-- Function to place a bet and update totals
CREATE OR REPLACE FUNCTION public.place_multiplayer_bet(
  p_round_id UUID,
  p_user_id UUID,
  p_username TEXT,
  p_side TEXT,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_balance NUMERIC;
  v_round_status TEXT;
BEGIN
  -- Check round is still betting
  SELECT status INTO v_round_status
  FROM public.multiplayer_rounds
  WHERE id = p_round_id;
  
  IF v_round_status != 'betting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round is no longer accepting bets');
  END IF;
  
  -- Check wallet balance
  SELECT balance INTO v_wallet_balance
  FROM public.wallets
  WHERE user_id = p_user_id;
  
  IF v_wallet_balance IS NULL OR v_wallet_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Deduct from wallet
  UPDATE public.wallets
  SET balance = balance - p_amount
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
$$;

-- Function to complete round and distribute payouts
CREATE OR REPLACE FUNCTION public.complete_multiplayer_round(p_round_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round RECORD;
  v_winner TEXT;
  v_total_pool NUMERIC;
  v_winner_total NUMERIC;
  v_amount_to_share NUMERIC;
  v_bet RECORD;
  v_payout NUMERIC;
BEGIN
  -- Get round details
  SELECT * INTO v_round
  FROM public.multiplayer_rounds
  WHERE id = p_round_id AND status = 'betting';
  
  IF v_round IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round not found or already completed');
  END IF;
  
  -- Update status to flipping
  UPDATE public.multiplayer_rounds
  SET status = 'flipping'
  WHERE id = p_round_id;
  
  -- Random winner
  IF random() < 0.5 THEN
    v_winner := 'king';
    v_winner_total := v_round.king_total;
  ELSE
    v_winner := 'tail';
    v_winner_total := v_round.tail_total;
  END IF;
  
  v_total_pool := v_round.king_total + v_round.tail_total;
  v_amount_to_share := v_total_pool * 0.95; -- 5% fee
  
  -- Calculate and distribute payouts to winners
  IF v_winner_total > 0 THEN
    FOR v_bet IN
      SELECT * FROM public.multiplayer_bets
      WHERE round_id = p_round_id AND side = v_winner
    LOOP
      v_payout := (v_bet.amount / v_winner_total) * v_amount_to_share;
      
      -- Update bet with payout
      UPDATE public.multiplayer_bets
      SET payout = v_payout
      WHERE id = v_bet.id;
      
      -- Add to wallet
      UPDATE public.wallets
      SET balance = balance + v_payout
      WHERE user_id = v_bet.user_id;
    END LOOP;
  END IF;
  
  -- Mark round as completed
  UPDATE public.multiplayer_rounds
  SET status = 'completed',
      winner = v_winner,
      completed_at = now()
  WHERE id = p_round_id;
  
  RETURN jsonb_build_object('success', true, 'winner', v_winner);
END;
$$;