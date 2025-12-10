import { useState, useEffect } from "react";
import { Wallet, Zap, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import CoinFlip from "./CoinFlip";
import { motion, AnimatePresence } from "framer-motion";

interface GameScreenProps {
  betAmount: number;
  balance: number;
  onGameComplete: (result: "win" | "loss", wonAmount?: number) => void;
  playerChoice?: "heads" | "tails" | null;
  opponentInfo?: { id: string; name: string } | null;
}

type CoinSide = "heads" | "tails" | null;

const GameScreen = ({ betAmount, balance, onGameComplete, playerChoice: preSelectedChoice, opponentInfo }: GameScreenProps) => {
  const [playerChoice, setPlayerChoice] = useState<CoinSide>(preSelectedChoice || null);
  const [opponentChoice, setOpponentChoice] = useState<CoinSide>(preSelectedChoice ? (preSelectedChoice === "heads" ? "tails" : "heads") : null);
  const [timeLeft, setTimeLeft] = useState(preSelectedChoice ? 0 : 10); // Skip countdown if choice is pre-selected
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<CoinSide>(null);
  const hasPreSelectedChoice = !!preSelectedChoice;
  // Win amount is double the entry fee
  const winAmount = betAmount * 2;

  useEffect(() => {
    if (playerChoice || opponentChoice) return;

    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Auto-select if time runs out
      const randomChoice: CoinSide = Math.random() > 0.5 ? "heads" : "tails";
      setPlayerChoice(randomChoice);
      setOpponentChoice(randomChoice === "heads" ? "tails" : "heads");
    }
  }, [timeLeft, playerChoice, opponentChoice]);

  useEffect(() => {
    if (playerChoice && !opponentChoice) {
      // Opponent auto-chooses opposite
      setTimeout(() => {
        setOpponentChoice(playerChoice === "heads" ? "tails" : "heads");
      }, 500);
    }
  }, [playerChoice, opponentChoice]);

  const handleFlip = () => {
    setIsFlipping(true);
    
    // Simulate coin flip result after 2 seconds (matching animation)
    setTimeout(() => {
      const flipResult: CoinSide = Math.random() > 0.5 ? "heads" : "tails";
      setResult(flipResult);
      
      setTimeout(() => {
        const didWin = flipResult === playerChoice;
        onGameComplete(didWin ? "win" : "loss", didWin ? winAmount : 0);
      }, 1500);
    }, 2000);
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col p-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3 bg-gradient-to-r from-card to-card/80 px-5 py-3 rounded-full border border-gold/30 shadow-lg">
          <Wallet className="w-5 h-5 text-gold" />
          <span className="text-xl font-bold text-gold">₹ {balance.toLocaleString()}</span>
        </div>
        
        <AnimatePresence mode="wait">
          {!isFlipping && (playerChoice || timeLeft <= 0) && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 px-4 py-2 bg-success/20 border border-success/40 rounded-full"
            >
              <Zap className="w-4 h-4 text-success" />
              <span className="text-success font-semibold">Ready!</span>
            </motion.div>
          )}
          
          {!isFlipping && !playerChoice && timeLeft > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 px-4 py-2 bg-destructive/20 border border-destructive/40 rounded-full"
            >
              <Clock className="w-4 h-4 text-destructive animate-pulse" />
              <motion.span 
                key={timeLeft}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="text-destructive font-bold text-lg"
              >
                {timeLeft}s
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Coin */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 flex items-center justify-center py-8"
      >
        <CoinFlip isFlipping={isFlipping} result={result} />
      </motion.div>

      {/* Player Status */}
      {!isFlipping && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-4 mb-6"
        >
          <div className="text-center p-4 bg-gradient-to-br from-royal/20 to-royal/5 rounded-xl border border-royal/40 shadow-lg">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">You</div>
            <div className="text-xl font-bold text-royal">
              {playerChoice ? playerChoice.toUpperCase() : "Choosing..."}
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-gold/20 to-gold/5 rounded-xl border border-gold/40 shadow-lg">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
              {opponentInfo ? opponentInfo.name : "Opponent"}
            </div>
            <div className="text-xl font-bold text-gold">
              {opponentChoice ? opponentChoice.toUpperCase() : "Waiting..."}
            </div>
          </div>
        </motion.div>
      )}

      {/* Choice Buttons or Flip Button */}
      <AnimatePresence mode="wait">
        {!playerChoice && !isFlipping ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ delay: 0.4 }}
          >
            <div className="text-center mb-4">
              <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                {timeLeft > 0 ? "Choose within 10 seconds" : "Time's up! Auto-selecting..."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => setPlayerChoice("heads")}
                  className="w-full h-24 text-xl font-bold bg-gradient-to-br from-royal via-royal to-royal-dark hover:from-royal-dark hover:via-royal hover:to-royal border-2 border-royal/50 shadow-[var(--shadow-royal)] transition-all duration-300"
                  disabled={timeLeft === 0}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-3xl mb-1">🦁</span>
                    <span>HEADS</span>
                  </div>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => setPlayerChoice("tails")}
                  className="w-full h-24 text-xl font-bold bg-gradient-to-br from-silver/40 via-silver/30 to-silver/20 hover:from-silver/50 hover:via-silver/40 hover:to-silver/30 border-2 border-silver/50 text-foreground transition-all duration-300"
                  disabled={timeLeft === 0}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-3xl mb-1">₹</span>
                    <span>TAILS</span>
                  </div>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        ) : !isFlipping && playerChoice && opponentChoice ? (
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
                className="w-full h-20 text-2xl font-bold bg-gradient-to-r from-gold via-gold-light to-gold hover:from-gold-light hover:via-gold hover:to-gold-light text-navy-light shadow-[var(--shadow-glow)] transition-all duration-300 relative overflow-hidden"
              >
                <Zap className="w-6 h-6 mr-2" />
                FLIP COIN
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </Button>
            </motion.div>
          </motion.div>
        ) : null}
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

export default GameScreen;
