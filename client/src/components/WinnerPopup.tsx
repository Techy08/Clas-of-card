import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Player } from "@/lib/types";
import Card from "./Card";
import { cn } from "@/lib/utils";
import { useState } from "react";
import GameRewards from "./GameRewards";

interface WinnerPopupProps {
  winner: Player | null;
  players: Player[];
  onNewGame: () => void;
  onExit: () => void;
}

const WinnerPopup = ({ winner, players, onNewGame, onExit }: WinnerPopupProps) => {
  const [showRewards, setShowRewards] = useState(false);
  
  const handleViewRewards = () => {
    setShowRewards(true);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 20 }}
        className="bg-background rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold mb-2">Game Over!</h2>
          {winner ? (
            <p className="text-xl">
              <span className="font-semibold text-primary">{winner.name}</span> wins!
            </p>
          ) : (
            <p className="text-xl">It's a tie!</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {players.map((player) => {
            const isWinner = player.id === winner?.id;
            const winningSet = player.winningSet;
            
            return (
              <div
                key={player.id}
                className={cn(
                  "p-4 rounded-lg transition-all",
                  isWinner
                    ? "bg-amber-100 dark:bg-amber-950/30 border-2 border-amber-500"
                    : "bg-muted/50 border border-border"
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{player.name}</h3>
                  {isWinner ? (
                    <span className="px-2 py-1 bg-amber-500 text-white text-xs rounded-full font-semibold">
                      Winner
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded-full">
                      Lost
                    </span>
                  )}
                </div>

                <div className="flex justify-center gap-1 flex-wrap">
                  {player.hand.map((card, index) => (
                    <div key={index} className="relative">
                      <Card
                        card={card}
                        index={0}
                        isHidden={false}
                        style={{ position: "relative", transform: "none" }}
                      />
                      {winningSet?.includes(card.id) && (
                        <div className="absolute inset-0 bg-amber-200/30 dark:bg-amber-500/30 rounded-lg animate-pulse"></div>
                      )}
                    </div>
                  ))}
                </div>
                
                {isWinner && winningSet && (
                  <div className="mt-3 text-center text-sm text-muted-foreground">
                    {player.hand.some(c => c.isRamChaal) && player.hand.filter(c => c.type === "Ram").length >= 3
                      ? "Ram Chaal + 3 Ram Cards"
                      : player.hand.filter(c => c.type === "Sita").length === 4
                      ? "4 Sita Cards"
                      : player.hand.filter(c => c.type === "Lakshman").length === 4
                      ? "4 Lakshman Cards"
                      : "4 Ravan Cards"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            variant="outline" 
            onClick={onExit}
            className="sm:order-2"
          >
            Exit to Menu
          </Button>
          <Button 
            onClick={onNewGame}
            className="sm:order-0"
          >
            Play Again
          </Button>
          {winner && (
            <Button 
              variant="secondary" 
              onClick={handleViewRewards}
              className="sm:order-1 bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              View Rewards
            </Button>
          )}
        </div>
      </motion.div>
      
      {/* Game Rewards Modal */}
      {showRewards && winner && (
        <GameRewards 
          winner={winner} 
          players={players} 
          onClose={() => setShowRewards(false)} 
        />
      )}
    </motion.div>
  );
};

export default WinnerPopup;
