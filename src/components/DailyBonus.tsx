import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";
import { toast } from "sonner";

const DailyBonus = () => {
  const [canClaim, setCanClaim] = useState(false);
  const [loading, setLoading] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    checkDailyBonus();
  }, []);

  const checkDailyBonus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("daily_bonuses")
      .select("*")
      .eq("user_id", user.id)
      .order("claimed_at", { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      setCanClaim(true);
      return;
    }

    const lastClaim = new Date(data.claimed_at);
    const now = new Date();
    const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastClaim >= 24) {
      setCanClaim(true);
      const daysSinceLastClaim = hoursSinceLastClaim / 24;
      setStreak(daysSinceLastClaim <= 1.5 ? data.streak_days : 0);
    }
  };

  const claimBonus = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to claim bonus");
      setLoading(false);
      return;
    }

    const bonusAmount = 10.00;
    const newStreak = streak + 1;

    const { error: bonusError } = await supabase
      .from("daily_bonuses")
      .insert({
        user_id: user.id,
        bonus_amount: bonusAmount,
        streak_days: newStreak,
      });

    if (bonusError) {
      toast.error("Failed to claim bonus");
      setLoading(false);
      return;
    }

    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (wallet) {
      const newBalance = parseFloat(wallet.balance.toString()) + bonusAmount;
      
      await supabase
        .from("wallets")
        .update({ bonus_balance: newBalance })
        .eq("user_id", user.id);

      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "bonus",
        amount: bonusAmount,
        status: "completed",
        balance_after: newBalance,
        processed_at: new Date().toISOString(),
      });

      toast.success(`Daily bonus claimed! +₹${bonusAmount} (${newStreak} day streak)`);
      setCanClaim(false);
      setStreak(newStreak);
    }

    setLoading(false);
  };

  if (!canClaim) return null;

  return (
    <Button
      onClick={claimBonus}
      disabled={loading}
      className="bg-gradient-to-r from-gold to-gold/80 text-royal hover:from-gold/90 hover:to-gold/70 gap-2"
    >
      <Gift className="w-4 h-4" />
      Claim Daily ₹10
    </Button>
  );
};

export default DailyBonus;
