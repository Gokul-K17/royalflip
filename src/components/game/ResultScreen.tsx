import { Wallet, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

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
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [result]);

  const isWin = result === "win";
  const prizeAmount = isWin ? amount * 2 : 0;

  return (
    <div className="min-h-screen flex flex-col p-6 animate-scale-in relative overflow-hidden">
      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                backgroundColor: i % 3 === 0 ? 'hsl(45 93% 47%)' : i % 3 === 1 ? 'hsl(217 91% 60%)' : 'hsl(158 64% 52%)',
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-end mb-8">
        <div className="flex items-center gap-3 bg-card px-4 py-2.5 rounded-full border border-gold/20">
          <Wallet className="w-5 h-5 text-gold" />
          <span className="text-xl font-bold text-foreground">₹ {balance.toLocaleString()}</span>
        </div>
      </div>

      {/* Result */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Icon */}
        <div className={`mb-8 ${isWin ? 'animate-scale-in' : ''}`}>
          {isWin ? (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-[var(--shadow-glow)] animate-glow-pulse">
              <Trophy className="w-16 h-16 text-navy-light" />
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 border-4 border-destructive/30 flex items-center justify-center">
              <X className="w-16 h-16 text-destructive" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className={`text-5xl font-bold mb-4 ${isWin ? 'text-gold' : 'text-destructive'}`}>
          {isWin ? 'YOU WIN!' : 'OPPONENT WIN'}
        </h2>

        {/* Amount */}
        {isWin && (
          <div className="mb-2">
            <div className="text-6xl font-bold text-foreground mb-2">
              ₹{prizeAmount}
            </div>
            <p className="text-muted-foreground">Added to your wallet</p>
          </div>
        )}

        {!isWin && (
          <p className="text-muted-foreground text-lg">Better luck next time!</p>
        )}

        {/* Celebration */}
        {isWin && (
          <div className="text-4xl mb-4 animate-scale-in">
            🎉 💐 🎊
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 max-w-md mx-auto w-full">
        <Button
          onClick={onRematch}
          className="w-full h-16 text-xl font-bold bg-gradient-to-r from-gold to-gold-light hover:from-gold-light hover:to-gold text-navy-light shadow-[var(--shadow-gold)]"
        >
          REMATCH (₹{amount})
        </Button>
        
        <Button
          onClick={onBackToAmount}
          variant="outline"
          className="w-full h-14 text-lg font-semibold border-2 border-border hover:border-gold/50 hover:bg-gold/10"
        >
          Choose Different Amount
        </Button>
      </div>

      {/* Stats */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>{isWin ? 'Congratulations on your win!' : 'Try again to win big!'}</p>
      </div>
    </div>
  );
};

export default ResultScreen;
