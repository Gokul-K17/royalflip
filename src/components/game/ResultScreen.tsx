import { Wallet, Trophy, X, Sparkles, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ResultScreenProps {
  result: "win" | "loss";
  amount: number;
  onRematch: () => void;
  onBackToAmount: () => void;
  balance: number;
}

const ResultScreen = ({ result, amount, onRematch, onBackToAmount, balance }: ResultScreenProps) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (result === "win") {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }
  }, [result]);

  const isWin = result === "win";
  const prizeAmount = isWin ? amount * 2 : 0;

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col p-6 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          className={`absolute inset-0 ${isWin ? 'bg-gradient-to-br from-gold/5 via-transparent to-gold/10' : 'bg-gradient-to-br from-destructive/5 via-transparent to-destructive/10'}`}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>

      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3"
                style={{
                  left: `${Math.random() * 100}%`,
                  backgroundColor: ['hsl(45 93% 47%)', 'hsl(217 91% 60%)', 'hsl(158 64% 52%)', 'hsl(0 84% 60%)'][i % 4],
                  borderRadius: i % 2 === 0 ? '50%' : '0',
                }}
                initial={{ top: -20, rotate: 0, opacity: 1 }}
                animate={{
                  top: '100vh',
                  rotate: 720,
                  opacity: 0,
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  delay: Math.random() * 0.5,
                  ease: 'linear',
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-end mb-8"
      >
        <div className="flex items-center gap-3 bg-gradient-to-r from-card to-card/80 px-5 py-3 rounded-full border border-gold/30 shadow-lg">
          <Wallet className="w-5 h-5 text-gold" />
          <motion.span 
            className="text-xl font-bold text-gold"
            key={balance}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            ₹ {balance.toLocaleString()}
          </motion.span>
        </div>
      </motion.div>

      {/* Result */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Icon */}
        <motion.div 
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="mb-8"
        >
          {isWin ? (
            <div className="relative">
              <motion.div 
                className="w-36 h-36 rounded-full bg-gradient-to-br from-gold via-gold-light to-gold flex items-center justify-center shadow-[var(--shadow-glow)]"
                animate={{
                  boxShadow: [
                    "0 0 40px hsl(45 93% 47% / 0.4)",
                    "0 0 80px hsl(45 93% 47% / 0.6)",
                    "0 0 40px hsl(45 93% 47% / 0.4)",
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Trophy className="w-20 h-20 text-navy-light" />
              </motion.div>
              {/* Sparkles around */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: "50%",
                    top: "50%",
                  }}
                  animate={{
                    x: Math.cos((i * 60 * Math.PI) / 180) * 90,
                    y: Math.sin((i * 60 * Math.PI) / 180) * 90,
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                >
                  <Sparkles className="w-5 h-5 text-gold" />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div 
              className="w-36 h-36 rounded-full bg-gradient-to-br from-destructive/30 to-destructive/10 border-4 border-destructive/40 flex items-center justify-center"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <X className="w-20 h-20 text-destructive" />
            </motion.div>
          )}
        </motion.div>

        {/* Title */}
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`text-5xl font-black mb-4 ${isWin ? 'bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent' : 'text-destructive'}`}
        >
          {isWin ? 'YOU WIN!' : 'OPPONENT WIN'}
        </motion.h2>

        {/* Amount */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          {isWin && (
            <div className="mb-4">
              <motion.div 
                className="text-7xl font-black text-foreground mb-2"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ₹{prizeAmount}
              </motion.div>
              <p className="text-muted-foreground flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-gold" />
                Added to your wallet
                <Sparkles className="w-4 h-4 text-gold" />
              </p>
            </div>
          )}

          {!isWin && (
            <p className="text-muted-foreground text-lg">Better luck next time!</p>
          )}
        </motion.div>

        {/* Celebration emojis */}
        {isWin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-5xl mb-4 flex gap-4"
          >
            <motion.span animate={{ y: [0, -10, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0 }}>🎉</motion.span>
            <motion.span animate={{ y: [0, -10, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }}>💐</motion.span>
            <motion.span animate={{ y: [0, -10, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}>🎊</motion.span>
          </motion.div>
        )}
      </div>

      {/* Action Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-3 max-w-md mx-auto w-full"
      >
        <Button
          onClick={onRematch}
          className="w-full h-16 text-xl font-bold bg-gradient-to-r from-gold via-gold-light to-gold hover:from-gold-light hover:via-gold hover:to-gold-light text-navy-light shadow-[var(--shadow-gold)] hover:shadow-[var(--shadow-glow)] transition-all duration-300"
        >
          <RotateCcw className="w-6 h-6 mr-2" />
          REMATCH (₹{amount})
        </Button>
        
        <Button
          onClick={onBackToAmount}
          variant="outline"
          className="w-full h-14 text-lg font-semibold border-2 border-border hover:border-gold/50 hover:bg-gold/10 transition-all duration-300"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Choose Different Amount
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8 text-center text-sm text-muted-foreground"
      >
        <p>{isWin ? '🏆 Congratulations on your win!' : '💪 Try again to win big!'}</p>
      </motion.div>
    </div>
  );
};

export default ResultScreen;
