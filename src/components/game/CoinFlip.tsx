import { motion } from "framer-motion";
import coinHeads from "@/assets/coin-heads.png";
import coinTails from "@/assets/coin-tails.png";

interface CoinFlipProps {
  isFlipping: boolean;
  result: "heads" | "tails" | null;
}

const CoinFlip = ({ isFlipping, result }: CoinFlipProps) => {
  // Calculate the final rotation based on result
  const getFinalRotation = () => {
    if (!result) return 0;
    return result === "heads" ? 1800 : 1980; // 1800 = 5 full rotations (heads), 1980 = 5.5 rotations (tails)
  };

  return (
    <div className="relative w-72 h-72">
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-[-20px] rounded-full"
        animate={isFlipping ? {
          boxShadow: [
            "0 0 30px hsl(45 93% 47% / 0.3)",
            "0 0 80px hsl(45 93% 47% / 0.6)",
            "0 0 30px hsl(45 93% 47% / 0.3)",
          ],
        } : {}}
        transition={{ duration: 0.5, repeat: isFlipping ? Infinity : 0 }}
      />

      {/* Floating animation container */}
      <motion.div
        className="w-full h-full"
        animate={!isFlipping && !result ? {
          y: [0, -15, 0],
        } : {}}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* 3D Coin container */}
        <motion.div
          className="relative w-full h-full"
          style={{
            transformStyle: "preserve-3d",
            perspective: "1000px",
          }}
          animate={isFlipping ? {
            rotateY: [0, getFinalRotation()],
            scale: [1, 1.15, 1],
          } : result ? {
            rotateY: result === "tails" ? 180 : 0,
          } : {}}
          transition={isFlipping ? {
            duration: 2,
            ease: [0.45, 0.05, 0.55, 0.95],
          } : {
            duration: 0.3,
          }}
        >
          {/* Heads Side - Lion */}
          <div
            className="absolute inset-0 rounded-full shadow-2xl flex items-center justify-center overflow-hidden border-4 border-gold/50"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <img src={coinHeads} alt="Heads" className="w-full h-full object-cover" />
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent rounded-full" />
          </div>

          {/* Tails Side - Rupee */}
          <div
            className="absolute inset-0 rounded-full shadow-2xl flex items-center justify-center overflow-hidden border-4 border-silver/50"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <img src={coinTails} alt="Tails" className="w-full h-full object-cover" />
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-full" />
          </div>
        </motion.div>
      </motion.div>

      {/* Particle effects when flipping */}
      {isFlipping && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: "50%",
                top: "50%",
                backgroundColor: i % 2 === 0 ? "hsl(45 93% 47%)" : "hsl(217 91% 60%)",
              }}
              animate={{
                x: [0, Math.cos((i * 30 * Math.PI) / 180) * 150],
                y: [0, Math.sin((i * 30 * Math.PI) / 180) * 150],
                opacity: [1, 0],
                scale: [1, 0],
              }}
              transition={{
                duration: 1,
                delay: 0.5,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      )}

      {/* Base glow */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          className="absolute inset-[-10%] rounded-full bg-gold/20 blur-3xl"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
    </div>
  );
};

export default CoinFlip;
