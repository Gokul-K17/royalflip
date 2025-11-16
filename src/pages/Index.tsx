import { useState } from "react";
import ModeSelection from "@/components/game/ModeSelection";
import AmountSelection from "@/components/game/AmountSelection";
import PlayerMatching from "@/components/game/PlayerMatching";
import GameScreen from "@/components/game/GameScreen";
import ResultScreen from "@/components/game/ResultScreen";

export type GameMode = "money" | "choice" | "multiplayer";
export type GameStage = "mode" | "amount" | "matching" | "game" | "result";

const Index = () => {
  const [gameStage, setGameStage] = useState<GameStage>("mode");
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [userBalance, setUserBalance] = useState(12000);
  const [gameResult, setGameResult] = useState<"win" | "loss" | null>(null);

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    if (mode === "money") {
      setGameStage("amount");
    }
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setGameStage("matching");
  };

  const handleMatchFound = () => {
    setGameStage("game");
  };

  const handleGameComplete = (result: "win" | "loss", wonAmount?: number) => {
    setGameResult(result);
    if (result === "win" && wonAmount) {
      setUserBalance(prev => prev + wonAmount);
    }
    setGameStage("result");
  };

  const handleRematch = () => {
    setGameResult(null);
    setGameStage("matching");
  };

  const handleBackToAmount = () => {
    setGameResult(null);
    setSelectedAmount(null);
    setGameStage("amount");
  };

  const handleBackToMode = () => {
    setGameResult(null);
    setSelectedAmount(null);
    setSelectedMode(null);
    setGameStage("mode");
  };

  return (
    <div className="min-h-screen bg-background">
      {gameStage === "mode" && (
        <ModeSelection onSelectMode={handleModeSelect} balance={userBalance} />
      )}
      
      {gameStage === "amount" && (
        <AmountSelection
          onSelectAmount={handleAmountSelect}
          onBack={handleBackToMode}
          balance={userBalance}
        />
      )}
      
      {gameStage === "matching" && selectedAmount && (
        <PlayerMatching
          amount={selectedAmount}
          onMatchFound={handleMatchFound}
          balance={userBalance}
        />
      )}
      
      {gameStage === "game" && selectedAmount && (
        <GameScreen
          betAmount={selectedAmount}
          balance={userBalance}
          onGameComplete={handleGameComplete}
        />
      )}
      
      {gameStage === "result" && gameResult && selectedAmount && (
        <ResultScreen
          result={gameResult}
          amount={selectedAmount}
          onRematch={handleRematch}
          onBackToAmount={handleBackToAmount}
          balance={userBalance}
        />
      )}
    </div>
  );
};

export default Index;
