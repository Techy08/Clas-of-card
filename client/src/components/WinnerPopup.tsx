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
  winningPlayers?: Player[]; // List of players in order of winning (1st, 2nd, 3rd)
  finishedPositions?: number[]; // Positions that have been determined (1, 2, 3, 4)
}

const WinnerPopup = ({ winner, players, onNewGame, onExit, winningPlayers = [], finishedPositions = [] }: WinnerPopupProps) => {
  const [showRewards, setShowRewards] = useState(false);
  
  // Sort players by position
  const sortedPlayers = [...players].sort((a, b) => {
    // If player has position property, sort by it
    if (a.position && b.position) {
      return a.position - b.position;
    }
    // Otherwise fall back to old logic (winner first)
    if (a.id === winner?.id) return -1;
    if (b.id === winner?.id) return 1;
    return 0;
  });
  
  const handleViewRewards = () => {
    setShowRewards(true);
  };
  
  // Get position label
  const getPositionLabel = (player: Player) => {
    if (!player.position) return player.id === winner?.id ? "Winner" : "Lost";
    
    switch (player.position) {
      case 1: return "1st Place";
      case 2: return "2nd Place";
      case 3: return "3rd Place";
      case 4: return "4th Place";
      default: return "Lost";
    }
  };
  
  // Get position style
  const getPositionStyle = (player: Player) => {
    if (!player.position) {
      return player.id === winner?.id 
        ? "bg-amber-500 text-white" 
        : "bg-gray-500 text-white";
    }
    
    switch (player.position) {
      case 1: return "bg-amber-500 text-white"; // Gold
      case 2: return "bg-gray-300 text-gray-800"; // Silver
      case 3: return "bg-amber-700 text-white"; // Bronze
      case 4: return "bg-red-500 text-white"; // Loser (red)
      default: return "bg-gray-500 text-white";
    }
  };
  
  // Get card container style
  const getContainerStyle = (player: Player) => {
    if (!player.position) {
      return player.id === winner?.id 
        ? "bg-amber-100 dark:bg-amber-950/30 border-2 border-amber-500"
        : "bg-muted/50 border border-border";
    }
    
    switch (player.position) {
      case 1: return "bg-amber-100 dark:bg-amber-950/30 border-2 border-amber-500"; // Gold
      case 2: return "bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-300"; // Silver
      case 3: return "bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-700"; // Bronze
      case 4: return "bg-red-50 dark:bg-red-950/20 border-2 border-red-500"; // Loser
      default: return "bg-muted/50 border border-border";
    }
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
          {winningPlayers && winningPlayers.length > 0 ? (
            <div>
              <p className="text-xl mb-2">
                <span className="font-semibold text-primary">{winningPlayers[0]?.name || winner?.name}</span> wins first place!
              </p>
              {winningPlayers.length > 1 && (
                <p className="text-sm mb-2">
                  <span className="font-medium">{winningPlayers[1]?.name}</span> takes second place
                  {winningPlayers.length > 2 ? ` and ${winningPlayers[2]?.name} takes third place.` : '.'}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                In this game, the first three players to complete a winning set are winners, while the last player loses.
              </p>
            </div>
          ) : (
            <p className="text-xl">The game has ended!</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {sortedPlayers.map((player) => {
            const positionLabel = getPositionLabel(player);
            const positionStyle = getPositionStyle(player);
            const containerStyle = getContainerStyle(player);
            const winningSet = player.winningSet;
            
            return (
              <div
                key={player.id}
                className={cn(
                  "p-4 rounded-lg transition-all",
                  containerStyle
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{player.name}</h3>
                  <span className={cn("px-2 py-1 text-xs rounded-full font-semibold", positionStyle)}>
                    {positionLabel}
                  </span>
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
                
                {player.winningSet && (
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
          players={sortedPlayers.length > 0 ? sortedPlayers : players} 
          onClose={() => setShowRewards(false)} 
        />
      )}
    </motion.div>
  );
};

export default WinnerPopup;
