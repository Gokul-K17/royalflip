-- Create game_sessions table to store shared game state between matched players
CREATE TABLE public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id UUID NOT NULL,
  player1_username TEXT NOT NULL,
  player1_choice TEXT NOT NULL,
  player2_id UUID NOT NULL,
  player2_username TEXT NOT NULL,
  player2_choice TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, flipping, completed
  flip_result TEXT, -- heads or tails
  winner_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  flipped_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Players can view game sessions they are part of
CREATE POLICY "Players can view their game sessions" 
ON public.game_sessions 
FOR SELECT 
USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Only authenticated users can insert game sessions (match maker inserts)
CREATE POLICY "Authenticated users can create game sessions" 
ON public.game_sessions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Players can update game sessions they are part of
CREATE POLICY "Players can update their game sessions" 
ON public.game_sessions 
FOR UPDATE 
USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Enable realtime for game_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;