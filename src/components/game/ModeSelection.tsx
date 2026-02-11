import { useState } from "react";
import { Wallet, Trophy, Users, Info, Crown, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { GameMode } from "@/pages/Index";
import { motion } from "framer-motion";
import InfoPanel from "@/components/InfoPanel";

interface ModeSelectionProps {
  onSelectMode: (mode: GameMode) => void;
  balance: number;
}

const ModeSelection = ({ onSelectMode, balance }: ModeSelectionProps) => {
  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col p-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <motion.div 
          className="flex items-center gap-3 bg-gradient-to-r from-card to-card/80 px-5 py-3 rounded-full border border-gold/30 shadow-[var(--shadow-gold)]"
          whileHover={{ scale: 1.02 }}
        >
          <Wallet className="w-5 h-5 text-gold" />
          <span className="text-xl font-bold text-gold">₹ {balance.toLocaleString()}</span>
        </motion.div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-gold/10">
              <Info className="w-5 h-5 text-foreground" />
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-background border-border overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-foreground">Information</SheetTitle>
            </SheetHeader>
            <InfoPanel />
          </SheetContent>
        </Sheet>
      </motion.div>

      {/* Logo/Title */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-12"
      >
        <motion.div 
          className="flex items-center justify-center mb-4"
          animate={{ 
            rotateY: [0, 360],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatDelay: 5,
            ease: "easeInOut",
          }}
        >
          <div className="relative">
            <Crown className="w-20 h-20 text-gold" />
            <motion.div
              className="absolute inset-0 rounded-full bg-gold/30 blur-xl"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
        <h1 className="text-6xl font-black mb-3 bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent tracking-tight">
          ROYAL FLIP
        </h1>
        <p className="text-muted-foreground flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-gold" />
          Choose your destiny
          <Sparkles className="w-4 h-4 text-gold" />
        </p>
      </motion.div>

      {/* Mode Cards */}
      <div className="flex-1 flex flex-col gap-4 max-w-md mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            onClick={() => onSelectMode("money")}
            className="w-full h-28 text-xl font-bold bg-gradient-to-r from-gold via-gold-light to-gold hover:from-gold-light hover:via-gold hover:to-gold-light border-2 border-gold/50 shadow-[var(--shadow-gold)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[var(--shadow-glow)] relative overflow-hidden group"
          >
            <Wallet className="w-7 h-7 mr-3" />
            MONEY BASED
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
            <div className="absolute top-2 right-2 px-2 py-1 bg-navy/30 rounded-full">
              <span className="text-xs">₹10 - ₹100</span>
            </div>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={() => onSelectMode("choice")}
            className="w-full h-28 text-xl font-bold bg-gradient-to-r from-royal via-royal to-royal-dark hover:from-royal-dark hover:via-royal hover:to-royal border-2 border-royal/50 shadow-[var(--shadow-royal)] transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group"
          >
            <Trophy className="w-7 h-7 mr-3" />
            CHOICE BASED
            <div className="absolute top-2 right-2 px-2 py-1 bg-background/30 rounded-full">
              <span className="text-xs">Free Play</span>
            </div>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={() => onSelectMode("multiplayer")}
            className="w-full h-28 text-xl font-bold bg-gradient-to-r from-success via-success to-success/80 hover:from-success/80 hover:via-success hover:to-success border-2 border-success/50 transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group"
          >
            <Users className="w-7 h-7 mr-3" />
            MULTI PLAYER
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-background/30 rounded-full">
              <Zap className="w-3 h-3" />
              <span className="text-xs">Live</span>
            </div>
          </Button>
        </motion.div>
      </div>

      {/* Footer Info */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center mt-8 text-muted-foreground text-sm"
      >
        <p className="flex items-center justify-center gap-2">
          <Zap className="w-4 h-4 text-gold" />
          Play responsibly • 18+ only
          <Zap className="w-4 h-4 text-gold" />
        </p>
      </motion.div>
    </div>
  );
};

export default ModeSelection;
