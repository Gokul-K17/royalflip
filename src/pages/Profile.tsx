import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Wallet, TrendingUp, Trophy } from "lucide-react";
import { toast } from "sonner";

interface ProfileData {
  username: string;
  email: string;
  balance: number;
  bonus_balance: number;
  total_games: number;
  games_won: number;
  win_rate: number;
  total_winnings: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("username, email")
      .eq("id", user.id)
      .single();

    const { data: walletData } = await supabase
      .from("wallets")
      .select("balance, bonus_balance")
      .eq("user_id", user.id)
      .single();

    const { data: statsData } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileData && walletData && statsData) {
      setProfile({
        username: profileData.username,
        email: profileData.email,
        balance: parseFloat(walletData.balance.toString()),
        bonus_balance: parseFloat(walletData.bonus_balance.toString()),
        total_games: statsData.total_games,
        games_won: statsData.games_won,
        win_rate: parseFloat(statsData.win_rate.toString()),
        total_winnings: parseFloat(statsData.total_winnings.toString()),
      });
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-royal/5 to-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-royal/5 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-card border border-border rounded-xl p-8 shadow-xl">
            <div className="text-center mb-6">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-royal to-gold flex items-center justify-center text-4xl font-bold text-white">
                {profile.username[0].toUpperCase()}
              </div>
              <h2 className="text-2xl font-bold text-foreground">{profile.username}</h2>
              <p className="text-muted-foreground">{profile.email}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-royal/10 rounded-lg p-4 border border-royal/20">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5 text-royal" />
                  <span className="text-sm text-muted-foreground">Balance</span>
                </div>
                <div className="text-2xl font-bold text-gold">
                  ₹{profile.balance.toFixed(2)}
                </div>
              </div>

              <div className="bg-gold/10 rounded-lg p-4 border border-gold/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-gold" />
                  <span className="text-sm text-muted-foreground">Total Winnings</span>
                </div>
                <div className="text-2xl font-bold text-gold">
                  ₹{profile.total_winnings.toFixed(2)}
                </div>
              </div>

              <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">Games Won</span>
                </div>
                <div className="text-2xl font-bold text-green-500">
                  {profile.games_won}
                </div>
              </div>

              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                </div>
                <div className="text-2xl font-bold text-blue-500">
                  {profile.win_rate.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Total Games Played</div>
              <div className="text-xl font-semibold">{profile.total_games}</div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Payment Options</h3>
            <div className="space-y-3">
              <Button className="w-full" variant="outline">
                Deposit Funds
              </Button>
              <Button className="w-full" variant="outline">
                Withdraw Funds
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Payment integration coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
