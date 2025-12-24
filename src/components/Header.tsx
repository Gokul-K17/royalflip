import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User, Trophy, Wallet, Users, Plus, Crown, Shield } from "lucide-react";
import DailyBonus from "./DailyBonus";
import AddFundsModal from "./AddFundsModal";
import { motion } from "framer-motion";

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchBalance(session.user.id);
          checkAdminRole(session.user.id);
        } else {
          setIsAdmin(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchBalance(session.user.id);
        checkAdminRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin"
    });
    setIsAdmin(!!data);
  };

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

  // Subscribe to balance changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('wallet-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setBalance(parseFloat(payload.new.balance.toString()));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <>
      <header className="bg-gradient-to-r from-card/95 via-card to-card/95 backdrop-blur-xl border-b border-gold/20 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate("/")}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <Crown className="w-8 h-8 text-gold group-hover:animate-pulse" />
            <span className="text-2xl font-black bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent tracking-tight">
              ROYALFLIP
            </span>
          </motion.div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 bg-gradient-to-r from-gold/10 to-gold/5 px-3 py-2 rounded-full border border-gold/30"
                >
                  <Wallet className="w-4 h-4 text-gold" />
                  <span className="font-bold text-gold text-lg">₹{balance.toFixed(0)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full bg-gold/20 hover:bg-gold/30 ml-1"
                    onClick={() => setShowAddFunds(true)}
                  >
                    <Plus className="w-3 h-3 text-gold" />
                  </Button>
                </motion.div>
                <DailyBonus />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/leaderboard")}
                  className="hover:bg-gold/10"
                >
                  <Trophy className="w-5 h-5 text-gold" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/referral")}
                  className="hover:bg-royal/10"
                >
                  <Users className="w-5 h-5 text-royal" />
                </Button>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/a9x7k2m4")}
                    className="hover:bg-red-500/10"
                    title="Admin Panel"
                  >
                    <Shield className="w-5 h-5 text-red-500" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/profile")}
                  className="hover:bg-muted"
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
                  <Trophy className="w-4 h-4 text-gold" />
                  Leaderboard
                </Button>
                <Button
                  onClick={() => navigate("/auth")}
                  className="bg-gradient-to-r from-gold to-gold-light text-navy-light font-bold hover:shadow-[var(--shadow-gold)]"
                >
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {user && (
        <AddFundsModal
          open={showAddFunds}
          onClose={() => setShowAddFunds(false)}
          userId={user.id}
          onSuccess={() => fetchBalance(user.id)}
        />
      )}
    </>
  );
};

export default Header;
