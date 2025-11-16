import { useEffect, useState } from "react";
import { Wallet, User, Link2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface PlayerMatchingProps {
  amount: number;
  onMatchFound: () => void;
  balance: number;
}

const PlayerMatching = ({ amount, onMatchFound, balance }: PlayerMatchingProps) => {
  const [isSearching, setIsSearching] = useState(true);

  useEffect(() => {
    // Simulate finding a match after 3 seconds
    const timer = setTimeout(() => {
      setIsSearching(false);
      setTimeout(onMatchFound, 1000);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onMatchFound]);

  return (
    <div className="min-h-screen flex flex-col p-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-end mb-8">
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
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {isSearching ? "Searching opponent..." : "Match Found!"}
        </h2>
        <p className="text-muted-foreground">From globally...</p>
      </div>

      {/* Player Cards */}
      <div className="flex-1 flex items-center justify-center gap-8 max-w-2xl mx-auto w-full">
        {/* You */}
        <Card className="flex-1 p-8 bg-card border-2 border-royal/50 animate-scale-in">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-royal to-royal-dark flex items-center justify-center border-4 border-royal/30">
              <User className="w-12 h-12 text-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">You</h3>
            <div className="text-gold font-semibold">₹{amount}</div>
          </div>
        </Card>

        {/* Connection Icon */}
        <div className={`relative ${isSearching ? 'animate-glow-pulse' : 'animate-scale-in'}`}>
          <Link2 className={`w-12 h-12 ${isSearching ? 'text-muted-foreground animate-spin' : 'text-gold'}`} />
        </div>

        {/* Opponent */}
        <Card className={`flex-1 p-8 bg-card border-2 ${isSearching ? 'border-border' : 'border-gold/50'} transition-all duration-500 ${!isSearching && 'animate-scale-in'}`}>
          <div className="text-center">
            <div className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
              isSearching 
                ? 'bg-muted border-border' 
                : 'bg-gradient-to-br from-gold to-gold-light border-gold/30'
            }`}>
              {isSearching ? (
                <div className="w-8 h-8 border-4 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <User className="w-12 h-12 text-navy-light" />
              )}
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              {isSearching ? 'Searching...' : 'Opponent'}
            </h3>
            {!isSearching && <div className="text-gold font-semibold">₹{amount}</div>}
          </div>
        </Card>
      </div>

      {/* Status */}
      <div className="text-center mt-8">
        <p className="text-muted-foreground">
          {isSearching ? 'Finding a player with the same bet...' : 'Get ready to flip!'}
        </p>
      </div>
    </div>
  );
};

export default PlayerMatching;
