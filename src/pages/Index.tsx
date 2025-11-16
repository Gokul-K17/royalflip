import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ModeSelection from "@/components/game/ModeSelection";
import Header from "@/components/Header";
import AmountSelection from "@/components/game/AmountSelection";
import PlayerMatching from "@/components/game/PlayerMatching";
import GameScreen from "@/components/game/GameScreen";
import ResultScreen from "@/components/game/ResultScreen";

export type GameMode = "money" | "choice" | "multiplayer";
export type GameStage = "mode" | "amount" | "matching" | "game" | "result";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [gameStage, setGameStage] = useState<GameStage>("mode");
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [userBalance, setUserBalance] = useState(100);
  const [gameResult, setGameResult] = useState<"win" | "loss" | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserBalance(session.user.id);
        } else {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserBalance(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserBalance = async (userId: string) => {
    const { data } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (data) {
      setUserBalance(parseFloat(data.balance.toString()));
    }
  };

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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
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
