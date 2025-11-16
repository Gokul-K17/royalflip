import { ArrowLeft, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface AmountSelectionProps {
  onSelectAmount: (amount: number) => void;
  onBack: () => void;
  balance: number;
}

const betOptions = [
  { amount: 20, entryFee: 10, total: 30 },
  { amount: 40, entryFee: 20, total: 60 },
  { amount: 100, entryFee: 50, total: 150 },
  { amount: 200, entryFee: 100, total: 300 },
];

const AmountSelection = ({ onSelectAmount, onBack, balance }: AmountSelectionProps) => {
  return (
    <div className="min-h-screen flex flex-col p-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Button>
        <div className="flex items-center gap-3 bg-card px-4 py-2.5 rounded-full border border-gold/20">
          <Wallet className="w-5 h-5 text-gold" />
          <span className="text-xl font-bold text-foreground">₹ {balance.toLocaleString()}</span>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <div className="inline-block px-6 py-2 bg-gold/10 border border-gold/30 rounded-full mb-6">
          <span className="text-gold font-semibold">MONEY BASED</span>
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Select Your Bet</h2>
        <p className="text-muted-foreground">Choose an amount to start playing</p>
      </div>

      {/* Bet Options Grid */}
      <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
        {betOptions.map((option) => (
          <Card
            key={option.amount}
            className="relative overflow-hidden bg-card border-2 border-border hover:border-gold/50 transition-all duration-300 hover:scale-105 cursor-pointer group"
            onClick={() => onSelectAmount(option.total)}
          >
            <div className="p-6 text-center">
              {/* Bet Amount */}
              <div className="mb-4">
                <div className="text-5xl font-bold text-gold mb-1">₹{option.amount}</div>
                <div className="text-sm text-muted-foreground">Win Amount</div>
              </div>

              {/* Entry Fee */}
              <div className="mb-4 pb-4 border-b border-border">
                <div className="text-sm text-muted-foreground mb-1">Entry Fee</div>
                <div className="text-2xl font-bold text-foreground">₹{option.entryFee}</div>
              </div>

              {/* Play Button */}
              <Button
                className="w-full bg-gradient-to-r from-gold to-gold-light hover:from-gold-light hover:to-gold text-navy-light font-bold shadow-[var(--shadow-gold)] group-hover:shadow-[var(--shadow-glow)]"
                disabled={balance < option.total}
              >
                {balance < option.total ? "INSUFFICIENT BALANCE" : "PLAY"}
              </Button>

              {balance < option.total && (
                <p className="text-xs text-destructive mt-2">Low balance</p>
              )}
            </div>

            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </Card>
        ))}
      </div>

      {/* Info */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Winner takes the full prize pool</p>
      </div>
    </div>
  );
};

export default AmountSelection;
