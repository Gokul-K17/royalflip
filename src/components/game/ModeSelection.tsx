import { Wallet, Trophy, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameMode } from "@/pages/Index";

interface ModeSelectionProps {
  onSelectMode: (mode: GameMode) => void;
  balance: number;
}

const ModeSelection = ({ onSelectMode, balance }: ModeSelectionProps) => {
  return (
    <div className="min-h-screen flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3 bg-card px-4 py-2.5 rounded-full border border-gold/20">
          <Wallet className="w-5 h-5 text-gold" />
          <span className="text-xl font-bold text-foreground">₹ {balance.toLocaleString()}</span>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Settings className="w-5 h-5 text-foreground" />
        </Button>
      </div>

      {/* Logo/Title */}
      <div className="text-center mb-12 animate-scale-in">
        <div className="flex items-center justify-center mb-4">
          <Trophy className="w-16 h-16 text-gold animate-glow-pulse" />
        </div>
        <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent">
          ROYAL FLIP
        </h1>
        <p className="text-muted-foreground text-sm">Choose your destiny</p>
      </div>

      {/* Mode Cards */}
      <div className="flex-1 flex flex-col gap-4 max-w-md mx-auto w-full">
        <Button
          onClick={() => onSelectMode("money")}
          className="h-24 text-xl font-bold bg-gradient-to-r from-gold to-gold-light hover:from-gold-light hover:to-gold border-2 border-gold/30 shadow-[var(--shadow-gold)] transition-all duration-300 hover:scale-105"
        >
          <Wallet className="w-6 h-6 mr-3" />
          MONEY BASED
        </Button>

        <Button
          onClick={() => onSelectMode("choice")}
          className="h-24 text-xl font-bold bg-gradient-to-r from-royal to-royal-dark hover:from-royal-dark hover:to-royal border-2 border-royal/30 shadow-[var(--shadow-royal)] transition-all duration-300 hover:scale-105"
        >
          <Trophy className="w-6 h-6 mr-3" />
          CHOICE BASED
        </Button>

        <Button
          onClick={() => onSelectMode("multiplayer")}
          className="h-24 text-xl font-bold bg-gradient-to-r from-success to-success/80 hover:from-success/80 hover:to-success border-2 border-success/30 transition-all duration-300 hover:scale-105"
        >
          <Users className="w-6 h-6 mr-3" />
          MULTI PLAYER
        </Button>
      </div>

      {/* Footer Info */}
      <div className="text-center mt-8 text-muted-foreground text-sm">
        <p>Play responsibly • 18+ only</p>
      </div>
    </div>
  );
};

export default ModeSelection;
