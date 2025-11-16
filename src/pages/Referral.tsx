import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Copy, Users, Gift, Check } from "lucide-react";
import { toast } from "sonner";

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  totalRewards: number;
}

const Referral = () => {
  const navigate = useNavigate();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .single();

    const { data: referrals } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id);

    if (profile) {
      const totalRewards = referrals?.filter(r => r.reward_claimed).length || 0;
      setReferralData({
        referralCode: profile.referral_code || "",
        totalReferrals: referrals?.length || 0,
        totalRewards: totalRewards * 50,
      });
    }
    setLoading(false);
  };

  const copyReferralCode = () => {
    if (referralData?.referralCode) {
      const referralLink = `${window.location.origin}/auth?ref=${referralData.referralCode}`;
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-royal/5 to-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!referralData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-royal/5 to-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-8 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="bg-card border-border p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-royal to-gold flex items-center justify-center">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Refer & Earn</h1>
              <p className="text-muted-foreground">
                Invite friends and earn ₹50 for each successful referral!
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Your Referral Link
                </label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/auth?ref=${referralData.referralCode}`}
                    className="bg-muted border-border"
                  />
                  <Button
                    onClick={copyReferralCode}
                    className="gap-2 bg-gradient-to-r from-royal to-gold hover:opacity-90"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-royal/10 rounded-lg p-6 border border-royal/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-6 h-6 text-royal" />
                    <span className="text-sm text-muted-foreground">Total Referrals</span>
                  </div>
                  <div className="text-3xl font-bold text-royal">
                    {referralData.totalReferrals}
                  </div>
                </div>

                <div className="bg-gold/10 rounded-lg p-6 border border-gold/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Gift className="w-6 h-6 text-gold" />
                    <span className="text-sm text-muted-foreground">Total Rewards</span>
                  </div>
                  <div className="text-3xl font-bold text-gold">
                    ₹{referralData.totalRewards}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-card border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">How It Works</h3>
            <ol className="space-y-3 text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-royal/20 flex items-center justify-center text-royal text-sm font-bold">
                  1
                </span>
                <span>Share your unique referral link with friends</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-royal/20 flex items-center justify-center text-royal text-sm font-bold">
                  2
                </span>
                <span>Your friend signs up using your referral link</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-royal/20 flex items-center justify-center text-royal text-sm font-bold">
                  3
                </span>
                <span>When they make their first deposit, you both get ₹50!</span>
              </li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Referral;
