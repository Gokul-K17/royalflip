-- Update complete_multiplayer_round to check both sides have players
CREATE OR REPLACE FUNCTION public.complete_multiplayer_round(p_round_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_round RECORD;
  v_winner TEXT;
  v_total_pool NUMERIC;
  v_winner_total NUMERIC;
  v_amount_to_share NUMERIC;
  v_bet RECORD;
  v_payout NUMERIC;
  v_king_players INTEGER;
  v_tail_players INTEGER;
BEGIN
  -- Get round details
  SELECT * INTO v_round
  FROM public.multiplayer_rounds
  WHERE id = p_round_id AND status = 'betting';
  
  IF v_round IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round not found or already completed');
  END IF;
  
  -- Count players on each side
  SELECT COUNT(*) INTO v_king_players
  FROM public.multiplayer_bets
  WHERE round_id = p_round_id AND side = 'king';
  
  SELECT COUNT(*) INTO v_tail_players
  FROM public.multiplayer_bets
  WHERE round_id = p_round_id AND side = 'tail';
  
  -- Check if both sides have at least one player
  IF v_king_players = 0 OR v_tail_players = 0 THEN
    -- Refund all players
    FOR v_bet IN
      SELECT * FROM public.multiplayer_bets
      WHERE round_id = p_round_id
    LOOP
      -- Refund to wallet
      UPDATE public.wallets
      SET balance = balance + v_bet.amount
      WHERE user_id = v_bet.user_id;
      
      -- Mark bet as refunded
      UPDATE public.multiplayer_bets
      SET payout = v_bet.amount
      WHERE id = v_bet.id;
    END LOOP;
    
    -- Mark round as cancelled
    UPDATE public.multiplayer_rounds
    SET status = 'cancelled',
        completed_at = now(),
        winner = NULL
    WHERE id = p_round_id;
    
    RETURN jsonb_build_object('success', true, 'cancelled', true, 'message', 'Round cancelled - both sides need at least one player');
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
  
  RETURN jsonb_build_object('success', true, 'winner', v_winner, 'king_players', v_king_players, 'tail_players', v_tail_players);
END;
$function$;