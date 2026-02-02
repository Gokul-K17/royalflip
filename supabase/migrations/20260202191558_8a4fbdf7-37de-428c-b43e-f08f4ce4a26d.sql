-- Allow the joining user (User2) to update the waiting user's (User1) queue row
-- so that User1 receives realtime UPDATE and both navigate to the same game session.

CREATE POLICY "Authenticated users can update waiting queue entries for matching"
ON public.matchmaking_queue
FOR UPDATE
USING (status = 'waiting')
WITH CHECK (status = 'matched' AND matched_with IS NOT NULL AND game_session_id IS NOT NULL);