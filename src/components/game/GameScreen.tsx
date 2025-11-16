import { useState, useEffect } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import CoinFlip from "./CoinFlip";

interface GameScreenProps {
  betAmount: number;
  balance: number;
  onGameComplete: (result: "win" | "loss", wonAmount?: number) => void;
}

type CoinSide = "heads" | "tails" | null;

const GameScreen = ({ betAmount, balance, onGameComplete }: GameScreenProps) => {
  const [playerChoice, setPlayerChoice] = useState<CoinSide>(null);
  const [opponentChoice, setOpponentChoice] = useState<CoinSide>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<CoinSide>(null);

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
        onGameComplete(didWin ? "win" : "loss", didWin ? betAmount * 2 : 0);
      }, 1500);
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col p-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 bg-card px-4 py-2.5 rounded-full border border-gold/20">
          <Wallet className="w-5 h-5 text-gold" />
          <span className="text-xl font-bold text-foreground">₹ {balance.toLocaleString()}</span>
        </div>
        
        {!isFlipping && (playerChoice || timeLeft <= 0) && (
          <div className="text-center px-4 py-2 bg-muted rounded-full">
            <span className="text-foreground font-semibold">Ready!</span>
          </div>
        )}
        
        {!isFlipping && !playerChoice && timeLeft > 0 && (
          <div className="text-center px-4 py-2 bg-destructive/20 border border-destructive rounded-full">
            <span className="text-destructive font-bold">{timeLeft}s</span>
          </div>
        )}
      </div>

      {/* Coin */}
      <div className="flex-1 flex items-center justify-center">
        <CoinFlip isFlipping={isFlipping} result={result} />
      </div>

      {/* Player Status */}
      {!isFlipping && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-card rounded-lg border border-royal/30">
            <div className="text-sm text-muted-foreground mb-1">You</div>
            <div className="text-lg font-bold text-royal">
              {playerChoice ? playerChoice.toUpperCase() : "Choosing..."}
            </div>
          </div>
          <div className="text-center p-4 bg-card rounded-lg border border-gold/30">
            <div className="text-sm text-muted-foreground mb-1">Opponent</div>
            <div className="text-lg font-bold text-gold">
              {opponentChoice ? opponentChoice.toUpperCase() : "Waiting..."}
            </div>
          </div>
        </div>
      )}

      {/* Choice Buttons or Flip Button */}
      {!playerChoice && !isFlipping ? (
        <>
          <div className="text-center mb-4">
            <p className="text-muted-foreground text-sm">
              {timeLeft > 0 ? "Choose within 10 seconds" : "Time's up! Auto-selecting..."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Button
              onClick={() => setPlayerChoice("heads")}
              className="h-20 text-xl font-bold bg-gradient-to-r from-royal to-royal-dark hover:from-royal-dark hover:to-royal border-2 border-royal/30 shadow-[var(--shadow-royal)]"
              disabled={timeLeft === 0}
            >
              🦁 HEADS
            </Button>
            <Button
              onClick={() => setPlayerChoice("tails")}
              className="h-20 text-xl font-bold bg-gradient-to-r from-silver/30 to-silver/10 hover:from-silver/40 hover:to-silver/20 border-2 border-silver/30 text-foreground"
              disabled={timeLeft === 0}
            >
              ₹ TAILS
            </Button>
          </div>
        </>
      ) : !isFlipping && playerChoice && opponentChoice ? (
        <Button
          onClick={handleFlip}
          className="h-20 text-2xl font-bold bg-gradient-to-r from-gold to-gold-light hover:from-gold-light hover:to-gold text-navy-light shadow-[var(--shadow-glow)] animate-glow-pulse"
        >
          FLIP COIN
        </Button>
      ) : null}

      {/* Bet Info */}
      <div className="text-center mt-4 text-muted-foreground text-sm">
        <p>Bet Amount: ₹{betAmount} • Prize: ₹{betAmount * 2}</p>
      </div>
    </div>
  );
};

export default GameScreen;
