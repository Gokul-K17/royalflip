import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ModeSelection from "@/components/game/ModeSelection";
import Header from "@/components/Header";
import AmountSelection from "@/components/game/AmountSelection";
import PlayerMatching from "@/components/game/PlayerMatching";
import GameScreen from "@/components/game/GameScreen";
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
  const [queueId, setQueueId] = useState<string | null>(null);
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

  const handleRealTimeMatchFound = (opponentId: string, opponentName: string, matchQueueId: string) => {
    setOpponentInfo({ id: opponentId, name: opponentName });
    setQueueId(matchQueueId);
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
      // Get current balance
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (!wallet) return;

      const currentBalance = parseFloat(wallet.balance.toString());
      let newBalance: number;
      let transactionType: string;
      let transactionAmount: number;

      if (result === "win" && wonAmount) {
        // Winner gets double the entry fee (winAmount)
        newBalance = currentBalance - selectedAmount + wonAmount;
        transactionType = "win";
        transactionAmount = wonAmount;
        toast.success(`You won ₹${wonAmount}!`);
      } else {
        // Loser loses their entry fee
        newBalance = currentBalance - selectedAmount;
        transactionType = "loss";
        transactionAmount = -selectedAmount;
        toast.error(`You lost ₹${selectedAmount}`);
      }

      // Update wallet balance
      await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", user.id);

      // Record transaction
      await supabase.from("transactions").insert({
        user_id: user.id,
        type: transactionType,
        amount: Math.abs(transactionAmount),
        balance_after: newBalance,
        status: "completed",
        game_details: {
          mode: selectedMode,
          entry_fee: selectedAmount,
          result: result,
          player_choice: playerChoice,
          opponent: opponentInfo,
        },
      });

      // Update local balance
      setUserBalance(newBalance);

      // Update user stats
      const { data: stats } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (stats) {
        const newStats = {
          total_games: stats.total_games + 1,
          games_won: result === "win" ? stats.games_won + 1 : stats.games_won,
          games_lost: result === "loss" ? stats.games_lost + 1 : stats.games_lost,
          total_wagered: stats.total_wagered + selectedAmount,
          total_winnings: result === "win" ? stats.total_winnings + (wonAmount || 0) : stats.total_winnings,
          net_profit: result === "win" 
            ? stats.net_profit + ((wonAmount || 0) - selectedAmount)
            : stats.net_profit - selectedAmount,
          win_rate: 0,
        };
        newStats.win_rate = (newStats.games_won / newStats.total_games) * 100;

        await supabase
          .from("user_stats")
          .update(newStats)
          .eq("user_id", user.id);
      }
    } catch (error) {
      console.error("Error updating game results:", error);
    }

    setGameStage("result");
  };

  const handleRematch = () => {
    setGameResult(null);
    setOpponentInfo(null);
    setQueueId(null);
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
    setQueueId(null);
    setGameStage("amount");
  };

  const handleBackToMode = () => {
    setGameResult(null);
    setSelectedAmount(null);
    setSelectedMode(null);
    setPlayerChoice(null);
    setOpponentInfo(null);
    setQueueId(null);
    setGameStage("mode");
  };

  const handleBackToChoice = () => {
    setPlayerChoice(null);
    setGameStage("choice");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <WinTicker />
      
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
      
      {gameStage === "game" && selectedAmount && (
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