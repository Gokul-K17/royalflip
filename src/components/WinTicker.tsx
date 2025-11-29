import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WinEntry {
  id: string;
  username: string;
  amount: number;
  timestamp: Date;
}

const WinTicker = () => {
  const [wins, setWins] = useState<WinEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Generate sample wins for demo (replace with real data later)
  useEffect(() => {
    const sampleNames = [
      "Rahul_K", "Priya_S", "Amit_D", "Sneha_M", "Vikram_P",
      "Anjali_R", "Karan_J", "Neha_G", "Arjun_T", "Divya_N",
      "Rohit_B", "Pooja_A", "Suresh_V", "Meera_L", "Arun_C"
    ];
    
    const amounts = [20, 40, 100, 200];
    
    const generateWins = () => {
      const newWins: WinEntry[] = [];
      for (let i = 0; i < 10; i++) {
        newWins.push({
          id: `win-${i}-${Date.now()}`,
          username: sampleNames[Math.floor(Math.random() * sampleNames.length)],
          amount: amounts[Math.floor(Math.random() * amounts.length)],
          timestamp: new Date(Date.now() - Math.random() * 3600000)
        });
      }
      setWins(newWins);
    };

    generateWins();

    // Fetch real wins from database
    const fetchRecentWins = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id, amount, created_at, user_id")
        .eq("type", "win")
        .order("created_at", { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        const winEntries: WinEntry[] = [];
        for (const transaction of data) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", transaction.user_id)
            .single();

          winEntries.push({
            id: transaction.id,
            username: profile?.username || "Player",
            amount: transaction.amount,
            timestamp: new Date(transaction.created_at)
          });
        }
        if (winEntries.length > 0) {
          setWins(winEntries);
        }
      }
    };

    fetchRecentWins();

    // Subscribe to real-time wins
    const channel = supabase
      .channel('win-ticker')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: 'type=eq.win'
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", payload.new.user_id)
            .single();

          const newWin: WinEntry = {
            id: payload.new.id,
            username: profile?.username || "Player",
            amount: payload.new.amount,
            timestamp: new Date(payload.new.created_at)
          };

          setWins(prev => [newWin, ...prev.slice(0, 19)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Rotate through wins
  useEffect(() => {
    if (wins.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % wins.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [wins.length]);

  if (wins.length === 0) return null;

  const currentWin = wins[currentIndex];

  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-gold/10 via-gold/20 to-gold/10 border-y border-gold/30">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-2 text-gold">
            <Trophy className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider">Live Wins</span>
          </div>
          
          <div className="h-4 w-px bg-gold/30" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentWin?.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-gold" />
              <span className="font-semibold text-foreground">{currentWin?.username}</span>
              <span className="text-muted-foreground">won</span>
              <span className="font-bold text-gold text-lg">₹{currentWin?.amount}</span>
              <Sparkles className="w-4 h-4 text-gold" />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default WinTicker;
