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

    try {
      const { data, error } = await supabase.rpc("claim_daily_bonus", {
        p_user_id: user.id,
      });

      if (error) throw error;

      const res = data as { success: boolean; bonus_amount?: number; streak?: number; error?: string };
      if (!res.success) {
        toast.error(res.error || "Failed to claim bonus");
      } else {
        toast.success(`Daily bonus claimed! +₹${res.bonus_amount} (${res.streak} day streak)`);
        setCanClaim(false);
        setStreak(res.streak || 0);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to claim bonus");
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
