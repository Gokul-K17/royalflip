import { useEffect, useState, useCallback } from "react";
import { Wallet, User, Link2, Clock, X } from "lucide-react";
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
  onMatchFound: (opponentId: string, opponentName: string, queueId: string) => void;
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
        // Found an opponent! Match with them
        const opponent = existingOpponents[0];
        
        // Update opponent's status to matched
        const { error: updateError } = await supabase
          .from("matchmaking_queue")
          .update({ 
            status: "matched", 
            matched_with: userId,
            matched_at: new Date().toISOString()
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
            matched_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setQueueId(myEntry.id);
        setMatchedOpponent({ id: opponent.user_id, name: opponent.username });
        setIsSearching(false);

        // Trigger callback after animation
        setTimeout(() => {
          onMatchFound(opponent.user_id, opponent.username, myEntry.id);
        }, 2000);

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
      // Cleanup on unmount if still waiting
      if (queueId && isSearching) {
        cleanupQueue("cancelled");
      }
    };
  }, []);

  // Listen for matches via realtime
  useEffect(() => {
    if (!queueId || !isSearching) return;

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
        (payload) => {
          const updated = payload.new as QueueEntry;
          if (updated.status === "matched" && updated.matched_with) {
            // Someone matched with us, find their info
            supabase
              .from("matchmaking_queue")
              .select("username, user_id")
              .eq("user_id", updated.matched_with)
              .single()
              .then(({ data }) => {
                if (data) {
                  setMatchedOpponent({ id: data.user_id, name: data.username });
                  setIsSearching(false);
                  setTimeout(() => {
                    onMatchFound(data.user_id, data.username, queueId);
                  }, 2000);
                }
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queueId, isSearching, onMatchFound]);

  // Countdown timer
  useEffect(() => {
    if (!isSearching || matchedOpponent) return;

    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Time's up, no match found
      cleanupQueue("expired");
      onNoMatch();
    }
  }, [timeLeft, isSearching, matchedOpponent, cleanupQueue, onNoMatch]);

  const handleCancel = async () => {
    await cleanupQueue("cancelled");
    onCancel();
  };

  return (
    <div className="min-h-screen flex flex-col p-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Button 
          variant="ghost" 
          onClick={handleCancel}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5 mr-1" /> Cancel
        </Button>
        <div className="flex items-center gap-3 bg-card px-4 py-2.5 rounded-full border border-gold/20">
          <Wallet className="w-5 h-5 text-gold" />
          <span className="text-xl font-bold text-foreground">₹ {balance.toLocaleString()}</span>
        </div>
      </div>

      {/* Title */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-block px-6 py-2 bg-gold/10 border border-gold/30 rounded-full mb-4">
          <span className="text-gold font-semibold uppercase">Your Choice: {playerChoice}</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {matchedOpponent ? "Match Found!" : "Searching for Opponent..."}
        </h2>
        <p className="text-muted-foreground">
          {matchedOpponent 
            ? "Get ready to flip!" 
            : `Looking for someone who chose ${oppositeChoice.toUpperCase()}`
          }
        </p>
      </motion.div>

      {/* Timer */}
      {isSearching && !matchedOpponent && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <div className={`flex items-center gap-2 px-6 py-3 rounded-full ${
            timeLeft <= 10 ? "bg-destructive/20 border border-destructive/40" : "bg-card border border-border"
          }`}>
            <Clock className={`w-5 h-5 ${timeLeft <= 10 ? "text-destructive animate-pulse" : "text-muted-foreground"}`} />
            <span className={`text-2xl font-bold ${timeLeft <= 10 ? "text-destructive" : "text-foreground"}`}>
              {timeLeft}s
            </span>
          </div>
        </motion.div>
      )}

      {/* Player Cards */}
      <div className="flex-1 flex items-center justify-center gap-4 md:gap-8 max-w-2xl mx-auto w-full">
        {/* You */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1"
        >
          <Card className="p-6 md:p-8 bg-gradient-to-br from-card to-card/80 border-2 border-royal/50 shadow-lg">
            <div className="text-center">
              <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-royal to-royal-dark flex items-center justify-center border-4 border-royal/30">
                <User className="w-10 h-10 md:w-12 md:h-12 text-foreground" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-foreground mb-1">{username}</h3>
              <div className="text-sm text-muted-foreground mb-2">You</div>
              <div className="inline-block px-3 py-1 bg-royal/20 border border-royal/40 rounded-full">
                <span className="text-royal font-semibold text-sm uppercase">{playerChoice}</span>
              </div>
              <div className="text-gold font-semibold mt-2">₹{amount}</div>
            </div>
          </Card>
        </motion.div>

        {/* Connection Icon */}
        <div className="relative">
          <motion.div
            animate={isSearching && !matchedOpponent ? { rotate: 360 } : {}}
            transition={{ duration: 2, repeat: isSearching && !matchedOpponent ? Infinity : 0, ease: "linear" }}
          >
            <Link2 className={`w-10 h-10 md:w-12 md:h-12 ${
              matchedOpponent ? "text-gold" : "text-muted-foreground"
            }`} />
          </motion.div>
          {matchedOpponent && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full"
            />
          )}
        </div>

        {/* Opponent */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1"
        >
          <Card className={`p-6 md:p-8 bg-gradient-to-br transition-all duration-500 ${
            matchedOpponent 
              ? "from-gold/20 to-gold/5 border-2 border-gold/50 shadow-[0_0_20px_rgba(212,175,55,0.3)]" 
              : "from-card to-card/80 border-2 border-border"
          }`}>
            <div className="text-center">
              <div className={`w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                matchedOpponent 
                  ? "bg-gradient-to-br from-gold to-gold-light border-gold/30" 
                  : "bg-muted border-border"
              }`}>
                <AnimatePresence mode="wait">
                  {matchedOpponent ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <User className="w-10 h-10 md:w-12 md:h-12 text-navy-light" />
                    </motion.div>
                  ) : (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-4 border-muted-foreground border-t-transparent rounded-full"
                    />
                  )}
                </AnimatePresence>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-foreground mb-1">
                {matchedOpponent ? matchedOpponent.name : "Searching..."}
              </h3>
              <div className="text-sm text-muted-foreground mb-2">Opponent</div>
              {matchedOpponent && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="inline-block px-3 py-1 bg-gold/20 border border-gold/40 rounded-full">
                    <span className="text-gold font-semibold text-sm uppercase">{oppositeChoice}</span>
                  </div>
                  <div className="text-gold font-semibold mt-2">₹{amount}</div>
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
        className="text-center mt-8 p-4 bg-gradient-to-r from-gold/10 via-gold/20 to-gold/10 border border-gold/30 rounded-xl"
      >
        <span className="text-muted-foreground">Prize Pool: </span>
        <span className="text-2xl font-bold text-gold">₹{amount * 2}</span>
      </motion.div>

      {/* Status */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center mt-4"
      >
        <p className="text-sm text-muted-foreground">
          {isSearching && !matchedOpponent 
            ? `Waiting for a player who chose ${oppositeChoice.toUpperCase()}...` 
            : "Starting game..."
          }
        </p>
      </motion.div>
    </div>
  );
};

export default RealTimeMatching;