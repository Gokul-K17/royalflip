import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, CircleDot, Users, Timer, Trophy, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import coinHeadsImage from "@/assets/coin-heads.png";
import coinTailsImage from "@/assets/coin-tails.png";
interface MultiplayerModeProps {
  userId: string;
  username: string;
  balance: number;
  onBack: () => void;
}
interface Round {
  id: string;
  round_number: number;
  status: string;
  king_total: number;
  tail_total: number;
  winner: string | null;
  ends_at: string;
}
interface Bet {
  id: string;
  user_id: string;
  username: string;
  side: string;
  amount: number;
  payout: number;
}
const MultiplayerMode = ({
  userId,
  username,
  balance,
  onBack
}: MultiplayerModeProps) => {
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [selectedSide, setSelectedSide] = useState<"king" | "tail" | null>(null);
  const [betAmount, setBetAmount] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [userBet, setUserBet] = useState<{
    side: string;
    amount: number;
  } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);

  // Fetch or create current round
  const fetchCurrentRound = useCallback(async () => {
    // First try to get an active round
    const {
      data: activeRound
    } = await supabase.from("multiplayer_rounds").select("*").eq("status", "betting").gt("ends_at", new Date().toISOString()).order("started_at", {
      ascending: false
    }).limit(1).single();
    if (activeRound) {
      setCurrentRound(activeRound);
      setShowResult(false);
      setIsFlipping(false);
      return;
    }

    // Check for recently completed round to show result
    const {
      data: completedRound
    } = await supabase.from("multiplayer_rounds").select("*").eq("status", "completed").order("completed_at", {
      ascending: false
    }).limit(1).single();
    if (completedRound) {
      const completedTime = new Date(completedRound.completed_at).getTime();
      const now = Date.now();
      // Show result for 10 seconds after completion
      if (now - completedTime < 10000) {
        setCurrentRound(completedRound);
        setShowResult(true);
        return;
      }
    }

    // Create new round using the function
    const {
      data: newRoundId
    } = await supabase.rpc("get_current_round");
    if (newRoundId) {
      const {
        data: newRound
      } = await supabase.from("multiplayer_rounds").select("*").eq("id", newRoundId).single();
      if (newRound) {
        setCurrentRound(newRound);
        setShowResult(false);
        setIsFlipping(false);
        setUserBet(null);
      }
    }
  }, []);

  // Fetch bets for current round
  const fetchBets = useCallback(async () => {
    if (!currentRound) return;
    const {
      data
    } = await supabase.from("multiplayer_bets").select("*").eq("round_id", currentRound.id).order("created_at", {
      ascending: false
    });
    if (data) {
      setBets(data);
      // Check if user has already bet
      const myBet = data.find(b => b.user_id === userId);
      if (myBet) {
        setUserBet({
          side: myBet.side,
          amount: myBet.amount
        });
      } else {
        setUserBet(null);
      }
    }
  }, [currentRound, userId]);

  // Initial fetch
  useEffect(() => {
    fetchCurrentRound();
  }, [fetchCurrentRound]);

  // Fetch bets when round changes
  useEffect(() => {
    fetchBets();
  }, [fetchBets]);

  // Subscribe to real-time updates
  useEffect(() => {
    const roundsChannel = supabase.channel("multiplayer-rounds").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "multiplayer_rounds"
    }, payload => {
      if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
        const updatedRound = payload.new as Round;
        if (updatedRound.status === "flipping") {
          setIsFlipping(true);
          setCurrentRound(updatedRound);
        } else if (updatedRound.status === "cancelled") {
          // Round was cancelled - both sides didn't have players
          setCurrentRound(updatedRound);
          setShowResult(true);
          setIsFlipping(false);
          if (userBet) {
            toast.info("Round cancelled - not enough players on both sides. Your bet has been refunded!");
          }

          // After 5 seconds, fetch new round
          setTimeout(() => {
            fetchCurrentRound();
            setUserBet(null);
          }, 5000);
        } else if (updatedRound.status === "completed") {
          setCurrentRound(updatedRound);
          setShowResult(true);
          setIsFlipping(false);

          // Check if user won
          if (userBet && updatedRound.winner === userBet.side) {
            toast.success("🎉 Your side won!");
          } else if (userBet) {
            toast.error("Your side lost. Better luck next round!");
          }

          // After 10 seconds, fetch new round
          setTimeout(() => {
            fetchCurrentRound();
            setUserBet(null);
          }, 10000);
        } else {
          setCurrentRound(updatedRound);
        }
      }
    }).subscribe();
    const betsChannel = supabase.channel("multiplayer-bets").on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "multiplayer_bets"
    }, () => {
      fetchBets();
      // Also refresh round totals
      if (currentRound) {
        supabase.from("multiplayer_rounds").select("*").eq("id", currentRound.id).single().then(({
          data
        }) => {
          if (data) setCurrentRound(data);
        });
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(roundsChannel);
      supabase.removeChannel(betsChannel);
    };
  }, [currentRound?.id, userBet, fetchCurrentRound, fetchBets]);

  // Countdown timer
  useEffect(() => {
    if (!currentRound || currentRound.status !== "betting") return;
    const updateTimer = () => {
      const endsAt = new Date(currentRound.ends_at).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endsAt - now) / 1000));
      setTimeLeft(remaining);

      // When time runs out, trigger round completion
      if (remaining === 0 && currentRound.status === "betting") {
        completeRound();
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentRound]);
  const completeRound = async () => {
    if (!currentRound || currentRound.status !== "betting") return;

    // Call the completion function
    await supabase.rpc("complete_multiplayer_round", {
      p_round_id: currentRound.id
    });
  };
  const handlePlaceBet = async () => {
    if (!selectedSide || !betAmount || !currentRound) return;
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (amount > balance) {
      toast.error("Insufficient balance");
      return;
    }
    setIsPlacingBet(true);
    try {
      const {
        data,
        error
      } = await supabase.rpc("place_multiplayer_bet", {
        p_round_id: currentRound.id,
        p_user_id: userId,
        p_username: username,
        p_side: selectedSide,
        p_amount: amount
      });
      if (error) throw error;
      const result = data as {
        success: boolean;
        error?: string;
      };
      if (!result.success) {
        toast.error(result.error || "Failed to place bet");
        return;
      }
      toast.success(`Bet placed on ${selectedSide === "king" ? "King Army" : "Tail Army"}!`);
      setUserBet({
        side: selectedSide,
        amount
      });
      setBetAmount("");
      setSelectedSide(null);
      fetchBets();
    } catch (error: any) {
      toast.error(error.message || "Failed to place bet");
    } finally {
      setIsPlacingBet(false);
    }
  };
  const kingBets = bets.filter(b => b.side === "king");
  const tailBets = bets.filter(b => b.side === "tail");
  const totalPool = (currentRound?.king_total || 0) + (currentRound?.tail_total || 0);
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  return <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <motion.div initial={{
      opacity: 0,
      y: -20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Balance</p>
          <p className="text-xl font-bold text-primary">₹{balance.toFixed(2)}</p>
        </div>
      </motion.div>

      {/* Timer and Round Info */}
      <motion.div initial={{
      opacity: 0,
      scale: 0.9
    }} animate={{
      opacity: 1,
      scale: 1
    }} className="text-center mb-6">
        <div className="inline-flex items-center gap-3 bg-card/80 backdrop-blur-sm rounded-full px-6 py-3 border border-border">
          <Timer className="w-5 h-5 text-primary" />
          <span className="text-2xl font-mono font-bold text-foreground">
            {showResult ? "Result" : isFlipping ? "Flipping..." : formatTime(timeLeft)}
          </span>
          <span className="text-muted-foreground">
            Round #{currentRound?.round_number || 1}
          </span>
        </div>
      </motion.div>

      {/* Coin Flip Animation */}
      <AnimatePresence>
        {(isFlipping || showResult) && <motion.div initial={{
        scale: 0
      }} animate={{
        scale: 1
      }} exit={{
        scale: 0
      }} className="flex justify-center mb-6">
            <motion.div animate={isFlipping ? {
          rotateY: [0, 1800]
        } : {}} transition={{
          duration: 3,
          ease: "easeInOut"
        }} className="w-32 h-32 relative">
              <img src={currentRound?.winner === "king" || !showResult && !isFlipping ? coinHeadsImage : coinTailsImage} alt="Coin" className="w-full h-full object-contain" />
            </motion.div>
          </motion.div>}
      </AnimatePresence>

      {/* Winner Announcement / Cancelled */}
      <AnimatePresence>
        {showResult && currentRound?.status === "cancelled" && <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} exit={{
        opacity: 0
      }} className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-amber-500/20 rounded-full px-6 py-3 border border-amber-500/50">
              <Users className="w-6 h-6 text-amber-500" />
              <span className="text-lg font-bold text-amber-500">
                Round Cancelled!
              </span>
            </div>
            <p className="text-muted-foreground mt-2">
              {kingBets.length === 0 && tailBets.length > 0 ? "King Army needs at least 1 player. All bets refunded." : tailBets.length === 0 && kingBets.length > 0 ? "Tail Army needs at least 1 player. All bets refunded." : "Both sides need at least 1 player. All bets refunded."}
            </p>
            <p className="text-sm text-muted-foreground mt-1">New round starting in 5 seconds...</p>
          </motion.div>}
        {showResult && currentRound?.winner && <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} exit={{
        opacity: 0
      }} className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-primary/20 rounded-full px-6 py-3 border border-primary/50">
              <Trophy className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold text-primary">
                {currentRound.winner === "king" ? "King Army" : "Tail Army"} Wins!
              </span>
            </div>
            <p className="text-muted-foreground mt-2">New round starting in 10 seconds...</p>
          </motion.div>}
      </AnimatePresence>

      {/* Total Pool */}
      <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} className="text-center mb-6">
        <p className="text-muted-foreground text-sm">Total Pool</p>
        <p className="text-3xl font-bold text-primary">₹{totalPool.toFixed(2)}</p>
        <p className="text-xs text-muted-foreground">(5% platform fee on winnings)</p>
      </motion.div>

      {/* Two Armies */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* King Army */}
        <motion.div initial={{
        opacity: 0,
        x: -50
      }} animate={{
        opacity: 1,
        x: 0
      }} className={`bg-gradient-to-br from-amber-900/30 to-amber-800/10 rounded-2xl p-4 border-2 transition-all ${selectedSide === "king" ? "border-primary shadow-[0_0_30px_hsl(var(--primary)/0.3)]" : "border-amber-700/30"} ${userBet?.side === "king" ? "ring-2 ring-primary" : ""}`} onClick={() => !userBet && setSelectedSide("king")}>
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-6 h-6 text-amber-400" />
            <h3 className="font-bold text-amber-400">King Army</h3>
          </div>
          <img src={coinHeadsImage} alt="Heads" className="w-16 h-16 mx-auto mb-3" />
          <p className="text-2xl font-bold text-center text-foreground">
            ₹{(currentRound?.king_total || 0).toFixed(0)}
          </p>
          <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mt-1">
            <Users className="w-4 h-4" />
            <span>{kingBets.length} players</span>
          </div>

          {/* King Bets List - Show only amounts */}
          <div className="mt-3 max-h-32 overflow-y-auto space-y-1">
            {kingBets.map((bet, index) => {})}
          </div>
        </motion.div>

        {/* Tail Army */}
        <motion.div initial={{
        opacity: 0,
        x: 50
      }} animate={{
        opacity: 1,
        x: 0
      }} className={`bg-gradient-to-br from-slate-700/30 to-slate-600/10 rounded-2xl p-4 border-2 transition-all ${selectedSide === "tail" ? "border-secondary shadow-[0_0_30px_hsl(var(--secondary)/0.3)]" : "border-slate-600/30"} ${userBet?.side === "tail" ? "ring-2 ring-secondary" : ""}`} onClick={() => !userBet && setSelectedSide("tail")}>
          <div className="flex items-center gap-2 mb-3">
            <CircleDot className="w-6 h-6 text-slate-400" />
            <h3 className="font-bold text-slate-400">Tail Army</h3>
          </div>
          <img src={coinTailsImage} alt="Tails" className="w-16 h-16 mx-auto mb-3" />
          <p className="text-2xl font-bold text-center text-foreground">
            ₹{(currentRound?.tail_total || 0).toFixed(0)}
          </p>
          <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mt-1">
            <Users className="w-4 h-4" />
            <span>{tailBets.length} players</span>
          </div>

          {/* Tail Bets List - Show only amounts */}
          <div className="mt-3 max-h-32 overflow-y-auto space-y-1">
            {tailBets.map((bet, index) => {})}
          </div>
        </motion.div>
      </div>

      {/* Bet Input */}
      {!userBet && currentRound?.status === "betting" && <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-border">
          <p className="text-center text-muted-foreground mb-3">
            {selectedSide ? `Betting on ${selectedSide === "king" ? "King Army" : "Tail Army"}` : "Select a side to bet"}
          </p>
          <div className="flex gap-3">
            <Input type="number" placeholder="Enter amount" value={betAmount} onChange={e => setBetAmount(e.target.value)} disabled={!selectedSide} className="flex-1 bg-background/50" />
            <Button onClick={handlePlaceBet} disabled={!selectedSide || !betAmount || isPlacingBet} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6">
              {isPlacingBet ? <Loader2 className="w-5 h-5 animate-spin" /> : "Place Bet"}
            </Button>
          </div>
          {/* Quick amounts - works without selecting side first */}
          <div className="flex gap-2 mt-3 justify-center flex-wrap">
            {[10, 20, 50, 100, 200, 500].map(amt => <Button key={amt} variant="outline" size="sm" onClick={() => setBetAmount(amt.toString())} disabled={amt > balance} className="text-xs">
                ₹{amt}
              </Button>)}
          </div>
        </motion.div>}

      {/* User's Bet Info */}
      {userBet && <motion.div initial={{
      opacity: 0,
      scale: 0.9
    }} animate={{
      opacity: 1,
      scale: 1
    }} className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-primary/30 text-center">
          <p className="text-muted-foreground">Your bet</p>
          <p className="text-xl font-bold text-primary">
            ₹{userBet.amount} on {userBet.side === "king" ? "King Army" : "Tail Army"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Waiting for round to complete...
          </p>
        </motion.div>}
    </div>;
};
export default MultiplayerMode;