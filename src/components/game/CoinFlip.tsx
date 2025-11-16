interface CoinFlipProps {
  isFlipping: boolean;
  result: "heads" | "tails" | null;
}

const CoinFlip = ({ isFlipping, result }: CoinFlipProps) => {
  return (
    <div className="relative w-64 h-64">
      {/* Floating animation when not flipping */}
      <div className={`w-full h-full ${!isFlipping && !result ? 'animate-coin-float' : ''}`}>
        <div
          className={`relative w-full h-full transition-all duration-300 ${
            isFlipping ? 'animate-flip-coin' : ''
          }`}
          style={{
            transformStyle: 'preserve-3d',
            transform: result === "tails" ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Heads Side - Lion */}
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-royal to-royal-dark border-8 border-royal/30 shadow-2xl flex items-center justify-center"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <div className="text-8xl">🦁</div>
          </div>

          {/* Tails Side - Rupee */}
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-silver/80 to-silver/40 border-8 border-silver/30 shadow-2xl flex items-center justify-center"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="text-8xl">₹</div>
          </div>
        </div>
      </div>

      {/* Glow Effect */}
      {(isFlipping || result) && (
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 rounded-full bg-gold/20 blur-3xl animate-glow-pulse" />
        </div>
      )}
    </div>
  );
};

export default CoinFlip;
