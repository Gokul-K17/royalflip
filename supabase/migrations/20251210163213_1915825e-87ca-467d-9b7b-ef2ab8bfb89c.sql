-- Create matchmaking queue table for real-time player matching
CREATE TABLE public.matchmaking_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  choice TEXT NOT NULL CHECK (choice IN ('heads', 'tails')),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'expired', 'cancelled')),
  matched_with UUID,
  matched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  game_session_id UUID
);

-- Enable RLS
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Users can view all queue entries (needed for matchmaking)
CREATE POLICY "Users can view all queue entries" 
ON public.matchmaking_queue 
FOR SELECT 
USING (true);

-- Users can insert their own queue entries
CREATE POLICY "Users can insert their own queue entries" 
ON public.matchmaking_queue 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own queue entries
CREATE POLICY "Users can update their own queue entries" 
ON public.matchmaking_queue 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = matched_with);

-- Users can delete their own queue entries
CREATE POLICY "Users can delete their own queue entries" 
ON public.matchmaking_queue 
FOR DELETE 
USING (auth.uid() = user_id);

-- Enable realtime for matchmaking queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;

-- Create index for faster matching queries
CREATE INDEX idx_matchmaking_queue_waiting ON public.matchmaking_queue (status, choice, amount) WHERE status = 'waiting';