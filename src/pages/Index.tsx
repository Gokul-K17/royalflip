import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ModeSelection from "@/components/game/ModeSelection";
import Header from "@/components/Header";
import AmountSelection from "@/components/game/AmountSelection";
import PlayerMatching from "@/components/game/PlayerMatching";
import GameScreen from "@/components/game/GameScreen";
import SharedGameScreen from "@/components/game/SharedGameScreen";
import ResultScreen from "@/components/game/ResultScreen";
import WinTicker from "@/components/WinTicker";
import ChoiceSelection from "@/components/game/ChoiceSelection";
import RealTimeMatching from "@/components/game/RealTimeMatching";
import NoMatchFound from "@/components/game/NoMatchFound";
import MultiplayerMode from "@/components/game/MultiplayerMode";
import { toast } from "sonner";

export type GameMode = "money" | "choice" | "multiplayer";
export type GameStage = "mode" | "amount" | "choice" | "matching" | "realtime-matching" | "no-match" | "game" | "result" | "multiplayer";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState<string>("Player");
  const [gameStage, setGameStage] = useState<GameStage>("mode");
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [playerChoice, setPlayerChoice] = useState<"heads" | "tails" | null>(null);
  const [opponentInfo, setOpponentInfo] = useState<{ id: string; name: string } | null>(null);
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState(100);
  const [gameResult, setGameResult] = useState<"win" | "loss" | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserBalance(session.user.id);
          fetchUserProfile(session.user.id);
        } else {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserBalance(session.user.id);
        fetchUserProfile(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Subscribe to wallet changes for real-time balance updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('wallet-balance')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setUserBalance(parseFloat(payload.new.balance.toString()));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    if (data) {
      setUsername(data.username);
    }
  };

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    if (mode === "money") {
      setGameStage("amount");
    } else if (mode === "choice") {
      setGameStage("amount");
    } else if (mode === "multiplayer") {
      setGameStage("multiplayer");
    }
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    if (selectedMode === "choice") {
      // For choice mode, go to choice selection first
      setGameStage("choice");
    } else {
      // For money mode, go to simulated matching
      setGameStage("matching");
    }
  };

  const handleChoiceSelected = (choice: "heads" | "tails") => {
    setPlayerChoice(choice);
    setGameStage("realtime-matching");
  };

  const handleMatchFound = () => {
    setGameStage("game");
  };

  const handleRealTimeMatchFound = (opponentId: string, opponentName: string, sessionId: string) => {
    setOpponentInfo({ id: opponentId, name: opponentName });
    setGameSessionId(sessionId);
    setGameStage("game");
  };

  const handleNoMatch = () => {
    setGameStage("no-match");
  };

  const handleRetryMatching = () => {
    setGameStage("realtime-matching");
  };

  const handleCancelMatching = () => {
    setPlayerChoice(null);
    setGameStage("choice");
  };

  const handleGameComplete = async (result: "win" | "loss", wonAmount?: number) => {
    setGameResult(result);
    
    if (!user || !selectedAmount) return;

    try {
      const { data, error } = await supabase.rpc("record_game_result", {
        p_user_id: user.id,
        p_amount: selectedAmount,
        p_result: result,
        p_won_amount: wonAmount || 0,
        p_mode: selectedMode || "money",
        p_player_choice: playerChoice || null,
        p_opponent_info: opponentInfo ? { id: opponentInfo.id, name: opponentInfo.name } : null,
      });

      if (error) throw error;

      const res = data as { success: boolean; new_balance?: number; error?: string };
      if (!res.success) {
        toast.error(res.error || "Failed to record game result");
      } else {
        if (result === "win" && wonAmount) {
          toast.success(`You won ₹${wonAmount}!`);
        } else {
          toast.error(`You lost ₹${selectedAmount}`);
        }
        if (res.new_balance !== undefined) {
          setUserBalance(res.new_balance);
        }
      }
    } catch (error) {
      console.error("Error updating game results:", error);
    }

    setGameStage("result");
  };

  const handleRematch = () => {
    setGameResult(null);
    setOpponentInfo(null);
    setGameSessionId(null);
    if (selectedMode === "choice") {
      setPlayerChoice(null);
      setGameStage("choice");
    } else {
      setGameStage("matching");
    }
  };

  const handleBackToAmount = () => {
    setGameResult(null);
    setSelectedAmount(null);
    setPlayerChoice(null);
    setOpponentInfo(null);
    setGameSessionId(null);
    setGameStage("amount");
  };

  const handleBackToMode = () => {
    setGameResult(null);
    setSelectedAmount(null);
    setSelectedMode(null);
    setPlayerChoice(null);
    setOpponentInfo(null);
    setGameSessionId(null);
    setGameStage("mode");
  };

  const handleBackToChoice = () => {
    setPlayerChoice(null);
    setGameStage("choice");
  };

  if (!user) return null;

  // Hide header/navigation during active game stages
  const isInActiveGame = ["matching", "realtime-matching", "game", "no-match"].includes(gameStage);

  return (
    <div className="min-h-screen bg-background">
      {!isInActiveGame && (
        <>
          <Header />
          <WinTicker />
        </>
      )}
      
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

      {gameStage === "choice" && selectedAmount && (
        <ChoiceSelection
          amount={selectedAmount}
          balance={userBalance}
          onChoiceSelected={handleChoiceSelected}
          onBack={handleBackToAmount}
        />
      )}

      {gameStage === "realtime-matching" && selectedAmount && playerChoice && (
        <RealTimeMatching
          amount={selectedAmount}
          playerChoice={playerChoice}
          balance={userBalance}
          userId={user.id}
          username={username}
          onMatchFound={handleRealTimeMatchFound}
          onNoMatch={handleNoMatch}
          onCancel={handleCancelMatching}
        />
      )}

      {gameStage === "no-match" && playerChoice && (
        <NoMatchFound
          playerChoice={playerChoice}
          onRetry={handleRetryMatching}
          onBack={handleBackToChoice}
        />
      )}
      
      {gameStage === "matching" && selectedAmount && (
        <PlayerMatching
          amount={selectedAmount}
          onMatchFound={handleMatchFound}
          balance={userBalance}
        />
      )}
      
      {gameStage === "game" && selectedAmount && selectedMode === "choice" && playerChoice && opponentInfo && gameSessionId && (
        <SharedGameScreen
          gameSessionId={gameSessionId}
          userId={user.id}
          betAmount={selectedAmount}
          balance={userBalance}
          playerChoice={playerChoice}
          opponentInfo={opponentInfo}
          onGameComplete={handleGameComplete}
        />
      )}

      {gameStage === "game" && selectedAmount && selectedMode !== "choice" && (
        <GameScreen
          betAmount={selectedAmount}
          balance={userBalance}
          onGameComplete={handleGameComplete}
          playerChoice={playerChoice}
          opponentInfo={opponentInfo}
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

      {gameStage === "multiplayer" && (
        <MultiplayerMode
          userId={user.id}
          username={username}
          balance={userBalance}
          onBack={handleBackToMode}
        />
      )}
    </div>
  );
};

export default Index;