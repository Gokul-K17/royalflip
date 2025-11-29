import { ArrowLeft, Wallet, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

interface AmountSelectionProps {
  onSelectAmount: (amount: number) => void;
  onBack: () => void;
  balance: number;
}

// Fixed: Entry fee and win amounts as per user requirement
const betOptions = [
  { entryFee: 10, winAmount: 20 },
  { entryFee: 20, winAmount: 40 },
  { entryFee: 50, winAmount: 100 },
  { entryFee: 100, winAmount: 200 },
];

const AmountSelection = ({ onSelectAmount, onBack, balance }: AmountSelectionProps) => {
  return (
    <div className="min-h-screen flex flex-col p-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-royal/20">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Button>
        <motion.div 
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-3 bg-gradient-to-r from-card to-card/80 px-5 py-3 rounded-full border border-gold/30 shadow-[var(--shadow-gold)]"
        >
          <Wallet className="w-5 h-5 text-gold" />
          <span className="text-xl font-bold text-gold">₹ {balance.toLocaleString()}</span>
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-gold/20 to-gold/10 border border-gold/40 rounded-full mb-6">
          <Sparkles className="w-4 h-4 text-gold animate-pulse" />
          <span className="text-gold font-semibold tracking-wide">MONEY BASED</span>
          <Sparkles className="w-4 h-4 text-gold animate-pulse" />
        </div>
        <h2 className="text-4xl font-bold text-foreground mb-3">Select Your Bet</h2>
        <p className="text-muted-foreground">Double your money with a winning flip!</p>
      </motion.div>

      {/* Bet Options Grid */}
      <div className="grid grid-cols-2 gap-5 max-w-2xl mx-auto w-full">
        {betOptions.map((option, index) => (
          <motion.div
            key={option.entryFee}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.1 }}
          >
            <Card
              className="relative overflow-hidden bg-gradient-to-br from-card via-card to-card/90 border-2 border-border hover:border-gold/60 transition-all duration-500 hover:scale-[1.03] cursor-pointer group shadow-lg hover:shadow-[var(--shadow-glow)]"
              onClick={() => balance >= option.entryFee && onSelectAmount(option.entryFee)}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-gold/0 via-gold/5 to-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="p-6 text-center relative z-10">
                {/* Win Amount */}
                <div className="mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-gold animate-pulse" />
                    <span className="text-xs text-gold font-semibold uppercase tracking-wider">Win</span>
                    <Zap className="w-5 h-5 text-gold animate-pulse" />
                  </div>
                  <div className="text-5xl font-black bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent">
                    ₹{option.winAmount}
                  </div>
                </div>

                {/* Entry Fee */}
                <div className="mb-5 pb-4 border-b border-border/50">
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Entry Fee</div>
                  <div className="text-2xl font-bold text-foreground">₹{option.entryFee}</div>
                </div>

                {/* Play Button */}
                <Button
                  className="w-full h-12 bg-gradient-to-r from-gold via-gold-light to-gold hover:from-gold-light hover:via-gold hover:to-gold-light text-navy-light font-bold text-lg shadow-lg group-hover:shadow-[var(--shadow-glow)] transition-all duration-300"
                  disabled={balance < option.entryFee}
                >
                  {balance < option.entryFee ? "LOW BALANCE" : "PLAY NOW"}
                </Button>

                {balance < option.entryFee && (
                  <p className="text-xs text-destructive mt-2 animate-pulse">Insufficient funds</p>
                )}
              </div>

              {/* Animated shine */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              {/* Corner badge */}
              <div className="absolute top-3 right-3 px-2 py-1 bg-royal/30 rounded-full">
                <span className="text-xs text-royal font-semibold">2x</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Info */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-center text-sm text-muted-foreground"
      >
        <p className="flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-gold" />
          Winner takes double the entry fee!
          <Sparkles className="w-4 h-4 text-gold" />
        </p>
      </motion.div>
    </div>
  );
};

export default AmountSelection;
