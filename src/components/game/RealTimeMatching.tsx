import { useEffect, useState, useCallback } from "react";
import { Wallet, User, Link2, Clock, X, UserX, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RealTimeMatchingProps {
  amount: number;
  playerChoice: "heads" | "tails";
  balance: number;
  userId: string;
  username: string;
  onMatchFound: (opponentId: string, opponentName: string, gameSessionId: string) => void;
  onNoMatch: () => void;
  onCancel: () => void;
}

interface QueueEntry {
  id: string;
  user_id: string;
  username: string;
  choice: string;
  amount: number;
  status: string;
  matched_with: string | null;
  game_session_id: string | null;
}

const RealTimeMatching = ({ 
  amount, 
  playerChoice, 
  balance, 
  userId, 
  username,
  onMatchFound, 
  onNoMatch,
  onCancel 
}: RealTimeMatchingProps) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [isSearching, setIsSearching] = useState(true);
  const [showNoMatchMessage, setShowNoMatchMessage] = useState(false);
  const [matchedOpponent, setMatchedOpponent] = useState<{ id: string; name: string } | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const { toast } = useToast();

  const oppositeChoice = playerChoice === "heads" ? "tails" : "heads";

  // Join matchmaking queue
  const joinQueue = useCallback(async () => {
    try {
      // First check for existing waiting opponents with opposite choice
      const { data: existingOpponents, error: searchError } = await supabase
        .from("matchmaking_queue")
        .select("*")
        .eq("status", "waiting")
        .eq("choice", oppositeChoice)
        .eq("amount", amount)
        .neq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1);

      if (searchError) throw searchError;

      if (existingOpponents && existingOpponents.length > 0) {
        // Found an opponent! Create a shared game session
        const opponent = existingOpponents[0];
        
        // Create a game session for both players
        const { data: gameSession, error: sessionError } = await supabase
          .from("game_sessions")
          .insert({
            player1_id: opponent.user_id,
            player1_username: opponent.username,
            player1_choice: opponent.choice,
            player2_id: userId,
            player2_username: username,
            player2_choice: playerChoice,
            amount: amount,
            status: "waiting"
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        // Update opponent's queue entry to matched with game session id
        const { error: updateError } = await supabase
          .from("matchmaking_queue")
          .update({ 
            status: "matched", 
            matched_with: userId,
            matched_at: new Date().toISOString(),
            game_session_id: gameSession.id
          })
          .eq("id", opponent.id);

        if (updateError) throw updateError;

        // Insert our entry as already matched
        const { data: myEntry, error: insertError } = await supabase
          .from("matchmaking_queue")
          .insert({
            user_id: userId,
            username: username,
            choice: playerChoice,
            amount: amount,
            status: "matched",
            matched_with: opponent.user_id,
            matched_at: new Date().toISOString(),
            game_session_id: gameSession.id
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setQueueId(myEntry.id);
        setMatchedOpponent({ id: opponent.user_id, name: opponent.username });
        setIsSearching(false);

        onMatchFound(opponent.user_id, opponent.username, gameSession.id);

        return;
      }

      // No opponent found, join queue and wait
      const { data: entry, error: insertError } = await supabase
        .from("matchmaking_queue")
        .insert({
          user_id: userId,
          username: username,
          choice: playerChoice,
          amount: amount,
          status: "waiting"
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      setQueueId(entry.id);
    } catch (error: any) {
      console.error("Error joining queue:", error);
      toast({
        title: "Error",
        description: "Failed to join matchmaking queue",
        variant: "destructive"
      });
    }
  }, [userId, username, playerChoice, amount, oppositeChoice, onMatchFound, toast]);

  // Cleanup queue entry
  const cleanupQueue = useCallback(async (status: string = "cancelled") => {
    if (queueId) {
      await supabase
        .from("matchmaking_queue")
        .update({ status })
        .eq("id", queueId);
    }
  }, [queueId]);

  // Initialize matchmaking
  useEffect(() => {
    joinQueue();

    return () => {
      // Cleanup on unmount only if user cancels (not if timeout)
    };
  }, []);

  // Listen for matches via realtime - stays active even after timeout
  useEffect(() => {
    if (!queueId) return;

    const channel = supabase
      .channel(`matchmaking-${queueId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matchmaking_queue",
          filter: `id=eq.${queueId}`
        },
        async (payload) => {
          const updated = payload.new as QueueEntry;
          if (updated.status === "matched" && updated.matched_with && updated.game_session_id) {
            // Someone matched with us — navigate to same game session immediately so both connect to same game id
            const { data } = await supabase
              .from("matchmaking_queue")
              .select("username, user_id")
              .eq("user_id", updated.matched_with)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const opponentId = updated.matched_with;
            const opponentName = data?.username ?? "Opponent";
            setMatchedOpponent({ id: opponentId, name: opponentName });
            setIsSearching(false);
            setShowNoMatchMessage(false);
            onMatchFound(opponentId, opponentName, updated.game_session_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queueId, onMatchFound]);

  // Countdown timer - shows "no match" message but keeps listening
  useEffect(() => {
    if (!isSearching || matchedOpponent) return;

    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Time's up, but DON'T cleanup - keep queue entry active for late joins
      // Just show the "no match found" message while still listening
      setShowNoMatchMessage(true);
    }
  }, [timeLeft, isSearching, matchedOpponent]);

  const handleCancel = async () => {
    await cleanupQueue("cancelled");
    onCancel();
  };

  const handleChangeChoice = async () => {
    await cleanupQueue("cancelled");
    onNoMatch();
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <Button 
          variant="ghost" 
          onClick={handleCancel}
          className="text-muted-foreground hover:text-foreground p-2"
        >
          <X className="w-5 h-5 mr-1" /> Cancel
        </Button>
        <div className="flex items-center gap-2 md:gap-3 bg-card px-3 md:px-4 py-2 md:py-2.5 rounded-full border border-gold/20">
          <Wallet className="w-4 h-4 md:w-5 md:h-5 text-gold" />
          <span className="text-lg md:text-xl font-bold text-foreground">₹ {balance.toLocaleString()}</span>
        </div>
      </div>

      {/* Title */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 md:mb-8"
      >
        <div className="inline-block px-4 md:px-6 py-2 bg-gold/10 border border-gold/30 rounded-full mb-4">
          <span className="text-gold font-semibold uppercase text-sm md:text-base">Your Choice: {playerChoice}</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          {matchedOpponent 
            ? "Match Found!" 
            : showNoMatchMessage 
              ? "No player found" 
              : "Searching opponent…"
          }
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">
          {matchedOpponent 
            ? "Get ready to flip!" 
            : showNoMatchMessage
              ? "You can still be matched when someone joins"
              : `Looking for someone who chose ${oppositeChoice.toUpperCase()}`
          }
        </p>
      </motion.div>

      {/* Timer or Waiting Message */}
      {isSearching && !matchedOpponent && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-6 md:mb-8"
        >
          {showNoMatchMessage ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full bg-amber-500/20 border border-amber-500/40">
                <UserX className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
                <span className="text-amber-500 font-semibold text-sm md:text-base">You can still be matched</span>
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full"
              />
            </div>
          ) : (
            <div className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full ${
              timeLeft <= 10 ? "bg-destructive/20 border border-destructive/40" : "bg-card border border-border"
            }`}>
              <Clock className={`w-4 h-4 md:w-5 md:h-5 ${timeLeft <= 10 ? "text-destructive animate-pulse" : "text-muted-foreground"}`} />
              <span className={`text-xl md:text-2xl font-bold ${timeLeft <= 10 ? "text-destructive" : "text-foreground"}`}>
                {timeLeft}s
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Player Cards */}
      <div className="flex-1 flex items-center justify-center gap-3 md:gap-8 max-w-2xl mx-auto w-full px-2">
        {/* You */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 max-w-[160px] md:max-w-none"
        >
          <Card className="p-4 md:p-8 bg-gradient-to-br from-card to-card/80 border-2 border-royal/50 shadow-lg">
            <div className="text-center">
              <div className="w-14 h-14 md:w-24 md:h-24 mx-auto mb-3 md:mb-4 rounded-full bg-gradient-to-br from-royal to-royal-dark flex items-center justify-center border-4 border-royal/30">
                <User className="w-7 h-7 md:w-12 md:h-12 text-foreground" />
              </div>
              <h3 className="text-sm md:text-xl font-bold text-foreground mb-1 truncate">{username}</h3>
              <div className="text-xs md:text-sm text-muted-foreground mb-2">You</div>
              <div className="inline-block px-2 md:px-3 py-1 bg-royal/20 border border-royal/40 rounded-full">
                <span className="text-royal font-semibold text-xs md:text-sm uppercase">{playerChoice}</span>
              </div>
              <div className="text-gold font-semibold mt-2 text-sm md:text-base">₹{amount}</div>
            </div>
          </Card>
        </motion.div>

        {/* Connection Icon */}
        <div className="relative flex-shrink-0">
          <motion.div
            animate={isSearching && !matchedOpponent ? { rotate: 360 } : {}}
            transition={{ duration: 2, repeat: isSearching && !matchedOpponent ? Infinity : 0, ease: "linear" }}
          >
            <Link2 className={`w-8 h-8 md:w-12 md:h-12 ${
              matchedOpponent ? "text-gold" : "text-muted-foreground"
            }`} />
          </motion.div>
          {matchedOpponent && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-success rounded-full"
            />
          )}
        </div>

        {/* Opponent */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 max-w-[160px] md:max-w-none"
        >
          <Card className={`p-4 md:p-8 bg-gradient-to-br transition-all duration-500 ${
            matchedOpponent 
              ? "from-gold/20 to-gold/5 border-2 border-gold/50 shadow-[0_0_20px_rgba(212,175,55,0.3)]" 
              : "from-card to-card/80 border-2 border-border"
          }`}>
            <div className="text-center">
              <div className={`w-14 h-14 md:w-24 md:h-24 mx-auto mb-3 md:mb-4 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                matchedOpponent 
                  ? "bg-gradient-to-br from-gold to-gold-light border-gold/30" 
                  : showNoMatchMessage
                    ? "bg-amber-500/20 border-amber-500/30"
                    : "bg-muted border-border"
              }`}>
                <AnimatePresence mode="wait">
                  {matchedOpponent ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <User className="w-7 h-7 md:w-12 md:h-12 text-navy-light" />
                    </motion.div>
                  ) : showNoMatchMessage ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <UserX className="w-7 h-7 md:w-12 md:h-12 text-amber-500" />
                    </motion.div>
                  ) : (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-6 h-6 md:w-8 md:h-8 border-4 border-muted-foreground border-t-transparent rounded-full"
                    />
                  )}
                </AnimatePresence>
              </div>
              <h3 className="text-sm md:text-xl font-bold text-foreground mb-1 truncate">
                {matchedOpponent ? matchedOpponent.name : showNoMatchMessage ? "No player found" : "Searching…"}
              </h3>
              <div className="text-xs md:text-sm text-muted-foreground mb-2">Opponent</div>
              {matchedOpponent && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="inline-block px-2 md:px-3 py-1 bg-gold/20 border border-gold/40 rounded-full">
                    <span className="text-gold font-semibold text-xs md:text-sm uppercase">{oppositeChoice}</span>
                  </div>
                  <div className="text-gold font-semibold mt-2 text-sm md:text-base">₹{amount}</div>
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Prize Pool */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center mt-6 md:mt-8 p-3 md:p-4 bg-gradient-to-r from-gold/10 via-gold/20 to-gold/10 border border-gold/30 rounded-xl"
      >
        <span className="text-muted-foreground text-sm md:text-base">Prize Pool: </span>
        <span className="text-xl md:text-2xl font-bold text-gold">₹{amount * 2}</span>
      </motion.div>

      {/* Status and Change Choice Button */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center mt-4 space-y-3"
      >
        <p className="text-xs md:text-sm text-muted-foreground">
          {isSearching && !matchedOpponent 
            ? showNoMatchMessage
              ? "You can still be matched when someone joins"
              : `Waiting for a player who chose ${oppositeChoice.toUpperCase()}` 
            : "Starting game..."
          }
        </p>
        
        {showNoMatchMessage && !matchedOpponent && (
          <Button
            onClick={handleChangeChoice}
            variant="outline"
            className="border-2 border-border hover:bg-card"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Change Choice
          </Button>
        )}
      </motion.div>
    </div>
  );
};

export default RealTimeMatching;
