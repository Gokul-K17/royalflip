import { useState } from "react";
import { Wallet, Trophy, Users, Mail, BookOpen, Bell, Bug, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import coinHeads from "@/assets/coin-heads.png";
import coinTails from "@/assets/coin-tails.png";

type Section = "menu" | "how-to-play" | "updates" | "report";

const InfoPanel = () => {
  const [section, setSection] = useState<Section>("menu");

  return (
    <div className="flex flex-col h-full">
      <AnimatePresence mode="wait">
        {section === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-3 mt-4"
          >
            {[
              { id: "how-to-play" as Section, icon: BookOpen, label: "How to Play", desc: "Learn the game modes" },
              { id: "updates" as Section, icon: Bell, label: "Updates", desc: "Latest announcements" },
              { id: "report" as Section, icon: Bug, label: "Report Issues", desc: "Help us improve" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-gold/40 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-gold" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors" />
              </button>
            ))}
          </motion.div>
        )}

        {section === "how-to-play" && (
          <motion.div
            key="how-to-play"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col gap-4 mt-4"
          >
            <button onClick={() => setSection("menu")} className="text-sm text-gold flex items-center gap-1 self-start">
              ← Back
            </button>
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-2 px-2 scrollbar-hide">
              {/* Money Based */}
              <div className="min-w-[280px] snap-center rounded-xl border border-gold/30 bg-gradient-to-b from-card to-card/80 p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg">Money Based</h3>
                </div>
                <img src={coinHeads} alt="Coin heads" className="w-16 h-16 mx-auto object-contain" />
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Select an entry fee (₹10 - ₹100)</li>
                  <li>Pick Heads or Tails</li>
                  <li>Coin flips — win <span className="text-gold font-semibold">1.8x</span> your bet!</li>
                  <li>Winnings added to wallet instantly</li>
                </ol>
              </div>

              {/* Choice Based */}
              <div className="min-w-[280px] snap-center rounded-xl border border-secondary/30 bg-gradient-to-b from-card to-card/80 p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-secondary" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg">Choice Based</h3>
                </div>
                <img src={coinTails} alt="Coin tails" className="w-16 h-16 mx-auto object-contain" />
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Choose Heads or Tails</li>
                  <li>Get matched with a real opponent</li>
                  <li>Real-time coin flip decides the winner</li>
                  <li>Climb the leaderboard!</li>
                </ol>
              </div>

              {/* Multiplayer */}
              <div className="min-w-[280px] snap-center rounded-xl border border-success/30 bg-gradient-to-b from-card to-card/80 p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-success" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg">Multiplayer</h3>
                </div>
                <div className="flex justify-center gap-2">
                  <img src={coinHeads} alt="King side" className="w-12 h-12 object-contain" />
                  <img src={coinTails} alt="Tail side" className="w-12 h-12 object-contain" />
                </div>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Join a live round with other players</li>
                  <li>Bet on King or Tail side</li>
                  <li>Pool fills up, coin flips for all</li>
                  <li>Winners share the losing pool!</li>
                </ol>
              </div>
            </div>
          </motion.div>
        )}

        {section === "updates" && (
          <motion.div
            key="updates"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col gap-4 mt-4"
          >
            <button onClick={() => setSection("menu")} className="text-sm text-gold flex items-center gap-1 self-start">
              ← Back
            </button>
            <div className="space-y-3">
              {[
                { version: "v1.2.0", date: "Feb 2026", text: "Multiplayer mode with live rounds & pool betting" },
                { version: "v1.1.0", date: "Jan 2026", text: "Choice-based matchmaking with real-time opponents" },
                { version: "v1.0.0", date: "Dec 2025", text: "Initial release — Money based coin flip" },
              ].map((u) => (
                <div key={u.version} className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gold">{u.version}</span>
                    <span className="text-xs text-muted-foreground">{u.date}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{u.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {section === "report" && (
          <motion.div
            key="report"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col gap-4 mt-4"
          >
            <button onClick={() => setSection("menu")} className="text-sm text-gold flex items-center gap-1 self-start">
              ← Back
            </button>
            <div className="p-6 rounded-xl bg-card border border-border text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-gold/10 flex items-center justify-center">
                <Mail className="w-7 h-7 text-gold" />
              </div>
              <h3 className="font-bold text-foreground text-lg">Report an Issue</h3>
              <p className="text-sm text-muted-foreground">
                Found a bug or have feedback? Send us an email and we'll look into it right away.
              </p>
              <a
                href="mailto:notifications.projects@gmail.com?subject=RoyalFlip%20-%20Issue%20Report"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              >
                <Mail className="w-4 h-4" />
                Send Email
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InfoPanel;
