import { useState } from "react";
import { Wallet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import coinHeads from "@/assets/coin-heads.png";
import coinTails from "@/assets/coin-tails.png";

interface ChoiceSelectionProps {
  amount: number;
  balance: number;
  onChoiceSelected: (choice: "heads" | "tails") => void;
  onBack: () => void;
}

const ChoiceSelection = ({ amount, balance, onChoiceSelected, onBack }: ChoiceSelectionProps) => {
  const [selectedChoice, setSelectedChoice] = useState<"heads" | "tails" | null>(null);

  const handleContinue = () => {
    if (selectedChoice) {
      onChoiceSelected(selectedChoice);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Button>
        <div className="flex items-center gap-3 bg-card px-4 py-2.5 rounded-full border border-gold/20">
          <Wallet className="w-5 h-5 text-gold" />
          <span className="text-xl font-bold text-foreground">₹ {balance.toLocaleString()}</span>
        </div>
      </div>

      {/* Title */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-block px-6 py-2 bg-gold/10 border border-gold/30 rounded-full mb-4">
          <span className="text-gold font-semibold">ENTRY FEE: ₹{amount}</span>
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Choose Your Side</h2>
        <p className="text-muted-foreground">Pick heads or tails before finding an opponent</p>
      </motion.div>

      {/* Choice Cards */}
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-2 gap-6 w-full max-w-lg">
          {/* Heads */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={() => setSelectedChoice("heads")}
              className={`w-full h-52 flex flex-col items-center justify-center gap-3 rounded-2xl transition-all duration-300 ${
                selectedChoice === "heads"
                  ? "bg-gradient-to-br from-royal via-royal to-royal-dark border-4 border-gold shadow-[0_0_30px_rgba(212,175,55,0.4)]"
                  : "bg-gradient-to-br from-card to-card/80 border-2 border-royal/30 hover:border-royal/60"
              }`}
              variant="ghost"
            >
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gold/50 shadow-lg">
                <img src={coinHeads} alt="Heads" className="w-full h-full object-cover" />
              </div>
              <span className="text-2xl font-bold text-foreground">HEADS</span>
              {selectedChoice === "heads" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 bg-gold rounded-full flex items-center justify-center"
                >
                  <span className="text-navy-light font-bold">✓</span>
                </motion.div>
              )}
            </Button>
          </motion.div>

          {/* Tails */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={() => setSelectedChoice("tails")}
              className={`w-full h-52 flex flex-col items-center justify-center gap-3 rounded-2xl transition-all duration-300 relative ${
                selectedChoice === "tails"
                  ? "bg-gradient-to-br from-silver/50 via-silver/40 to-silver/30 border-4 border-gold shadow-[0_0_30px_rgba(212,175,55,0.4)]"
                  : "bg-gradient-to-br from-card to-card/80 border-2 border-silver/30 hover:border-silver/60"
              }`}
              variant="ghost"
            >
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-silver/50 shadow-lg">
                <img src={coinTails} alt="Tails" className="w-full h-full object-cover" />
              </div>
              <span className="text-2xl font-bold text-foreground">TAILS</span>
              {selectedChoice === "tails" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 bg-gold rounded-full flex items-center justify-center"
                >
                  <span className="text-navy-light font-bold">✓</span>
                </motion.div>
              )}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6"
      >
        <Button
          onClick={handleContinue}
          disabled={!selectedChoice}
          className={`w-full h-16 text-xl font-bold rounded-xl transition-all duration-300 ${
            selectedChoice
              ? "bg-gradient-to-r from-gold via-gold-light to-gold hover:from-gold-light hover:via-gold hover:to-gold-light text-navy-light shadow-[var(--shadow-glow)]"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <span>Find Opponent</span>
          <ArrowRight className="w-6 h-6 ml-2" />
        </Button>
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center mt-4"
      >
        <p className="text-sm text-muted-foreground">
          Win <span className="text-gold font-bold">₹{amount * 2}</span> if you win!
        </p>
      </motion.div>
    </div>
  );
};

export default ChoiceSelection;