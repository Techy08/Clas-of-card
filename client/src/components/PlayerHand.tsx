import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Card from "./Card";
import { Player as PlayerType } from "@/lib/types";
import { useGameStore } from "@/lib/stores/useGameStore";

interface PlayerHandProps {
  player: PlayerType;
  isCurrentPlayer: boolean;
  isCurrentTurn: boolean;
  onSelectCard?: (cardId: number) => void;
  selectedCard: number | null;
}

const PlayerHand = ({
  player,
  isCurrentPlayer,
  isCurrentTurn,
  onSelectCard,
  selectedCard,
}: PlayerHandProps) => {
  const { myPlayerId } = useGameStore();
  
  // Only show cards for current player, otherwise show card backs
  const showCards = isCurrentPlayer;
  
  return (
    <div className="relative">
      {/* Player Name & Status Indicator */}
      <motion.div
        className={cn(
          "absolute left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-t-lg mb-2 text-center",
          isCurrentTurn 
            ? "bg-primary text-primary-foreground font-semibold"
            : "bg-muted text-muted-foreground",
          isCurrentPlayer ? "-top-12" : "-bottom-12"
        )}
        animate={{
          y: isCurrentTurn ? [0, -5, 0] : 0,
        }}
        transition={{
          y: {
            repeat: isCurrentTurn ? Infinity : 0,
            repeatType: "reverse",
            duration: 1,
          },
        }}
      >
        <div className="flex items-center gap-2">
          <span>
            {player.name}
            {isCurrentPlayer ? " (You)" : ""}
          </span>
          {isCurrentTurn && (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          )}
        </div>
      </motion.div>

      {/* Cards Container */}
      <div className="relative flex justify-center items-center">
        <div className="relative w-40 h-40 flex items-center justify-center">
          {player.hand.map((card, index) => (
            <Card
              key={`${player.id}-card-${card.id}`}
              card={card}
              index={index}
              isSelected={selectedCard === card.id && isCurrentPlayer}
              isHidden={!showCards}
              onClick={() => {
                if (isCurrentPlayer && isCurrentTurn) {
                  onSelectCard?.(card.id);
                }
              }}
              className={cn(
                "absolute",
                isCurrentPlayer && !isCurrentTurn && "pointer-events-none",
                isCurrentPlayer && isCurrentTurn && "cursor-pointer"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerHand;
