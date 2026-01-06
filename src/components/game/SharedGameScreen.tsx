import { useState, useEffect } from "react";
import { Wallet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import CoinFlip from "./CoinFlip";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

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
        
        // If game is already completed, show result
        if (data.status === "completed" && data.flip_result) {
          setResult(data.flip_result as "heads" | "tails");
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
          }

          if (updated.status === "completed" && updated.flip_result) {
            // Show the flip animation with the result
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

  const handleFlip = async () => {
    if (hasFlipped || isFlipping) return;
    
    setIsFlipping(true);
    setHasFlipped(true);

    // Determine the flip result (only the flipper determines it)
    const flipResult: "heads" | "tails" = Math.random() > 0.5 ? "heads" : "tails";
    
    // Determine winner based on result
    const winnerId = flipResult === playerChoice ? userId : opponentInfo.id;

    // Update game session with flipping status first
    await supabase
      .from("game_sessions")
      .update({ 
        status: "flipping",
        flipped_at: new Date().toISOString()
      })
      .eq("id", gameSessionId);

    // After 2 seconds, update with the result
    setTimeout(async () => {
      setResult(flipResult);
      
      await supabase
        .from("game_sessions")
        .update({ 
          status: "completed",
          flip_result: flipResult,
          winner_id: winnerId,
          completed_at: new Date().toISOString()
        })
        .eq("id", gameSessionId);

      const didWin = winnerId === userId;
      setTimeout(() => {
        onGameComplete(didWin ? "win" : "loss", didWin ? winAmount : 0);
      }, 1500);
    }, 2000);
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

      {/* Flip Button */}
      <AnimatePresence mode="wait">
        {!isFlipping && !hasFlipped && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleFlip}
                className="w-full h-16 md:h-20 text-xl md:text-2xl font-bold bg-gradient-to-r from-gold via-gold-light to-gold hover:from-gold-light hover:via-gold hover:to-gold-light text-navy-light shadow-[var(--shadow-glow)] transition-all duration-300 relative overflow-hidden"
              >
                <Zap className="w-5 h-5 md:w-6 md:h-6 mr-2" />
                FLIP COIN
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </Button>
            </motion.div>
          </motion.div>
        )}
        
        {isFlipping && !result && (
          <motion.div
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