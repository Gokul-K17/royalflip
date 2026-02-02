import { UserX, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface NoMatchFoundProps {
  playerChoice: "heads" | "tails";
  onRetry: () => void;
  onBack: () => void;
}

const NoMatchFound = ({ playerChoice, onRetry, onBack }: NoMatchFoundProps) => {
  const oppositeChoice = playerChoice === "heads" ? "tails" : "heads";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="w-32 h-32 mb-8 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center border-4 border-border"
      >
        <UserX className="w-16 h-16 text-muted-foreground" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4"
      >
        No player found
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground text-center mb-8 max-w-md"
      >
        No one chose <span className="text-gold font-semibold uppercase">{oppositeChoice}</span> within 30 seconds.
        Try again or choose a different option.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-4 w-full max-w-md"
      >
        <Button
          onClick={onRetry}
          className="flex-1 h-14 text-lg font-bold bg-gradient-to-r from-gold via-gold-light to-gold hover:from-gold-light hover:via-gold hover:to-gold-light text-navy-light shadow-[var(--shadow-glow)]"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Try Again
        </Button>
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1 h-14 text-lg font-bold border-2 border-border hover:bg-card"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Change Choice
        </Button>
      </motion.div>
    </div>
  );
};

export default NoMatchFound;