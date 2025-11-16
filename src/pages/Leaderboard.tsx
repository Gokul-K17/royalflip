import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Medal } from "lucide-react";

interface LeaderboardEntry {
  username: string;
  total_winnings: number;
  games_won: number;
  win_rate: number;
  profile_image: string | null;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase
        .from("user_stats")
        .select(`
          total_winnings,
          games_won,
          win_rate,
          profiles!inner(username, profile_image)
        `)
        .order("total_winnings", { ascending: false })
        .limit(100);

      if (!error && data) {
        const formatted = data.map((entry: any) => ({
          username: entry.profiles.username,
          total_winnings: entry.total_winnings,
          games_won: entry.games_won,
          win_rate: entry.win_rate,
          profile_image: entry.profiles.profile_image,
        }));
        setLeaderboard(formatted);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-gold" />;
    if (index === 1) return <Medal className="w-6 h-6 text-silver" />;
    if (index === 2) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="text-muted-foreground">#{index + 1}</span>;
  };

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
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-royal to-gold bg-clip-text text-transparent mb-2">
            Leaderboard
          </h1>
          <p className="text-muted-foreground">Top players by total winnings</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading leaderboard...
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No players yet. Be the first!
              </div>
            ) : (
              <div className="divide-y divide-border">
                {leaderboard.map((entry, index) => (
                  <div
                    key={index}
                    className={`p-4 flex items-center gap-4 hover:bg-royal/5 transition-colors ${
                      index < 3 ? "bg-royal/10" : ""
                    }`}
                  >
                    <div className="w-12 flex items-center justify-center">
                      {getRankIcon(index)}
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-royal to-gold flex items-center justify-center text-xl font-bold text-white">
                      {entry.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">
                        {entry.username}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entry.games_won} wins • {entry.win_rate.toFixed(1)}% win rate
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gold">
                        ₹{entry.total_winnings.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Winnings</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
