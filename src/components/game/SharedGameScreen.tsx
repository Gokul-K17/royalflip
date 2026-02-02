import { useState, useEffect, useRef } from "react";
import { Wallet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import CoinFlip from "./CoinFlip";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SharedGameScreenProps {
  gameSessionId: string;
  userId: string;
  betAmount: number;
  balance: number;
  playerChoice: "heads" | "tails";
  opponentInfo: { id: string; name: string };
  onGameComplete: (result: "win" | "loss", wonAmount?: number) => void;
}

interface GameSession {
  id: string;
  player1_id: string;
  player1_username: string;
  player1_choice: string;
  player2_id: string;
  player2_username: string;
  player2_choice: string;
  amount: number;
  status: string;
  flip_result: string | null;
  winner_id: string | null;
}

const SharedGameScreen = ({ 
  gameSessionId, 
  userId, 
  betAmount, 
  balance, 
  playerChoice, 
  opponentInfo,
  onGameComplete 
}: SharedGameScreenProps) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<"heads" | "tails" | null>(null);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [hasFlipped, setHasFlipped] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [countdownStarted, setCountdownStarted] = useState(false);
  const completedRef = useRef(false);

  const winAmount = betAmount * 2;
  const opponentChoice = playerChoice === "heads" ? "tails" : "heads";

  // Fetch initial game session
  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("id", gameSessionId)
        .single();

      if (data && !error) {
        setGameSession(data as GameSession);
        
        // If game is already flipping or completed, sync UI
        if (data.status === "flipping") {
          setIsFlipping(true);
          setHasFlipped(true);
        }
        
        // If game is already completed, show result
        if (data.status === "completed" && data.flip_result && !completedRef.current) {
          completedRef.current = true;
          setResult(data.flip_result as "heads" | "tails");
          setIsFlipping(true);
          setHasFlipped(true);
          
          const didWin = data.winner_id === userId;
          setTimeout(() => {
            onGameComplete(didWin ? "win" : "loss", didWin ? winAmount : 0);
          }, 1500);
        }
      }
    };

    fetchSession();
  }, [gameSessionId, userId, onGameComplete, winAmount]);

  // Listen for game session updates
  useEffect(() => {
    const channel = supabase
      .channel(`game-session-${gameSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_sessions",
          filter: `id=eq.${gameSessionId}`
        },
        (payload) => {
          const updated = payload.new as GameSession;
          setGameSession(updated);

          if (updated.status === "flipping" && !isFlipping) {
            setIsFlipping(true);
            setHasFlipped(true);
          }

          if (updated.status === "completed" && updated.flip_result && !completedRef.current) {
            completedRef.current = true;
            setIsFlipping(true);
            setHasFlipped(true);
            setResult(updated.flip_result as "heads" | "tails");
            const didWin = updated.winner_id === userId;
            setTimeout(() => {
              onGameComplete(didWin ? "win" : "loss", didWin ? winAmount : 0);
            }, 3500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameSessionId, userId, onGameComplete, winAmount, isFlipping]);

  // Start countdown when component mounts
  useEffect(() => {
    if (countdownStarted || hasFlipped || isFlipping) return;
    
    setCountdownStarted(true);
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownStarted, hasFlipped, isFlipping]);

  // Trigger flip when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && !hasFlipped && !isFlipping) {
      handleFlip();
    }
  }, [countdown, hasFlipped, isFlipping]);

  const handleFlip = async () => {
    if (hasFlipped || isFlipping) return;

    setHasFlipped(true);

    // If someone else already flipped, sync from DB and wait for realtime
    const { data: currentSession } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", gameSessionId)
      .single();

    if (
      currentSession &&
      (currentSession.status === "flipping" || currentSession.status === "completed")
    ) {
      setIsFlipping(true);
      if (currentSession.flip_result && !completedRef.current) {
        completedRef.current = true;
        setResult(currentSession.flip_result as "heads" | "tails");
        const didWin = currentSession.winner_id === userId;
        setTimeout(() => {
          onGameComplete(didWin ? "win" : "loss", didWin ? winAmount : 0);
        }, 3500);
      }
      return;
    }

    // Request server to generate result once; both clients get it via realtime
    const { error } = await supabase.functions.invoke("execute-coin-flip", {
      body: { gameSessionId },
    });

    if (error) {
      const msg = (error as { message?: string })?.message ?? String(error);
      const isAlreadyFlipped =
        msg.includes("Already flipped") || msg.includes("409");
      if (isAlreadyFlipped) {
        // Other player flipped; realtime will deliver result
        setIsFlipping(true);
        return;
      }
      toast.error("Flip failed. Try again.");
      setHasFlipped(false);
      return;
    }

    // Success: server will update game_sessions; realtime listener sets result
    setIsFlipping(true);
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col p-4 md:p-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-2 md:gap-3 bg-gradient-to-r from-card to-card/80 px-4 md:px-5 py-2 md:py-3 rounded-full border border-gold/30 shadow-lg">
          <Wallet className="w-4 h-4 md:w-5 md:h-5 text-gold" />
          <span className="text-lg md:text-xl font-bold text-gold">₹ {balance.toLocaleString()}</span>
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-success/20 border border-success/40 rounded-full"
          >
            <Zap className="w-3 h-3 md:w-4 md:h-4 text-success" />
            <span className="text-success font-semibold text-sm md:text-base">Ready!</span>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Coin */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 flex items-center justify-center py-6 md:py-8"
      >
        <CoinFlip isFlipping={isFlipping} result={result} />
      </motion.div>

      {/* Player Status */}
      {!isFlipping && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-3 md:gap-4 mb-6"
        >
          <div className="text-center p-3 md:p-4 bg-gradient-to-br from-royal/20 to-royal/5 rounded-xl border border-royal/40 shadow-lg">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">You</div>
            <div className="text-lg md:text-xl font-bold text-royal">
              {playerChoice.toUpperCase()}
            </div>
          </div>
          <div className="text-center p-3 md:p-4 bg-gradient-to-br from-gold/20 to-gold/5 rounded-xl border border-gold/40 shadow-lg">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider truncate">
              {opponentInfo.name}
            </div>
            <div className="text-lg md:text-xl font-bold text-gold">
              {opponentChoice.toUpperCase()}
            </div>
          </div>
        </motion.div>
      )}

      {/* Countdown / Status */}
      <AnimatePresence mode="wait">
        {!isFlipping && !hasFlipped && countdown > 0 && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center justify-center py-6"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-gold via-gold-light to-gold flex items-center justify-center shadow-[var(--shadow-glow)]"
            >
              <span className="text-5xl md:text-6xl font-bold text-navy-light">{countdown}</span>
            </motion.div>
            <span className="mt-4 text-lg md:text-xl font-semibold text-muted-foreground">
              Flipping in...
            </span>
          </motion.div>
        )}
        
        {isFlipping && !result && (
          <motion.div
            key="flipping"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4"
          >
            <span className="text-lg md:text-xl font-semibold text-gold animate-pulse">Flipping...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bet Info */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center mt-4 p-3 bg-card/50 rounded-xl border border-border"
      >
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Entry:</span>
            <span className="font-bold text-foreground">₹{betAmount}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Win:</span>
            <span className="font-bold text-gold">₹{winAmount}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SharedGameScreen;