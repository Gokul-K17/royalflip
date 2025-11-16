import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User, Trophy, Wallet, Users } from "lucide-react";
import DailyBonus from "./DailyBonus";

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchBalance(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchBalance(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchBalance = async (userId: string) => {
    const { data } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (data) {
      setBalance(parseFloat(data.balance.toString()));
    }
  };

  return (
    <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div
          onClick={() => navigate("/")}
          className="text-2xl font-bold bg-gradient-to-r from-royal to-gold bg-clip-text text-transparent cursor-pointer"
        >
          ROYALFLIP
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-2 bg-royal/10 px-4 py-2 rounded-full border border-royal/20">
                <Wallet className="w-4 h-4 text-gold" />
                <span className="font-semibold text-gold">₹{balance.toFixed(2)}</span>
              </div>
              <DailyBonus />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/leaderboard")}
              >
                <Trophy className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/referral")}
              >
                <Users className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/profile")}
              >
                <User className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate("/leaderboard")}
                className="gap-2"
              >
                <Trophy className="w-4 h-4" />
                Leaderboard
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                className="bg-gradient-to-r from-royal to-royal-dark"
              >
                Sign In
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
