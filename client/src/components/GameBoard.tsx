import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import PlayerHand from "./PlayerHand";
import { useGameStore } from "@/lib/stores/useGameStore";
import { useSocketStore } from "@/lib/stores/useSocketStore";
import { useAudio } from "@/lib/stores/useAudio";
import { Button } from "./ui/button";
import { Player } from "@/lib/types";
import { getRandomBackground } from "@/assets/card-backgrounds";

const GameBoard = () => {
  const { 
    gameState,
    players,
    currentTurn,
    myPlayerId,
    playerHand,
    selectedCard,
    setSelectedCard,
    passTurn,
    isGameStarted,
    isGameOver,
    startGame
  } = useGameStore();
  
  const { socket, isConnected } = useSocketStore();
  const { playCardMove, playSuccess, playWinSound } = useAudio();
  const [background, setBackground] = useState("");
  const [animatingCard, setAnimatingCard] = useState<number | null>(null);
  const [cardPositions, setCardPositions] = useState<{ [key: string]: { top: number, left: number } }>({});
  const isSoloMode = players.some(p => p.isAI);

  // Set random background on game start
  useEffect(() => {
    setBackground(getRandomBackground());
  }, [isGameStarted]);

  // Setup player positions based on number of players
  const getPlayerPosition = (index: number, total: number) => {
    const positions = [
      { top: 'auto', left: '50%', bottom: '2%', transform: 'translateX(-50%)' }, // Bottom (current player)
      { top: '50%', left: '0%', transform: 'translateY(-50%)' }, // Left
      { top: '2%', left: '50%', transform: 'translateX(-50%)' }, // Top
      { top: '50%', right: '0%', left: 'auto', transform: 'translateY(-50%)' }, // Right
    ];
    
    // First position is always for the current player
    if (index === myPlayerId) {
      return positions[0];
    }
    
    // Adjust other positions based on player count
    let posIndex = 1;
    for (let i = 0; i < total; i++) {
      if (i !== myPlayerId) {
        if (i === index) {
          // 2 players: put opponent at top
          if (total === 2) {
            return positions[2];
          }
          // 3 players: distribute other players left and right
          if (total === 3) {
            return positions[posIndex];
          }
          // 4 players: distribute normally
          return positions[posIndex];
        }
        posIndex = (posIndex % 3) + 1;
      }
    }
    
    return positions[index % 4];
  };

  // Handle card selection and passing
  const handleCardSelect = (cardId: number) => {
    if (currentTurn !== myPlayerId || isGameOver) return;
    setSelectedCard(cardId);
  };

  const handleConfirmPass = () => {
    if (selectedCard === null || currentTurn !== myPlayerId) return;
    
    // Calculate next player index
    const nextPlayerIndex = (currentTurn + 1) % players.length;
    
    // Play card move sound
    playCardMove();
    
    // Get card positions for animation
    const fromPos = document.getElementById(`player-${myPlayerId}`)?.getBoundingClientRect();
    const toPos = document.getElementById(`player-${nextPlayerIndex}`)?.getBoundingClientRect();
    
    if (fromPos && toPos) {
      // Set the animating card
      setAnimatingCard(selectedCard);
      
      // Store positions for animation
      setCardPositions({
        start: { top: fromPos.top, left: fromPos.left },
        end: { top: toPos.top, left: toPos.left }
      });
      
      // After animation completes, pass the turn
      setTimeout(() => {
        passTurn(selectedCard, nextPlayerIndex);
        setAnimatingCard(null);
      }, 1000);
    } else {
      // Fallback if elements not found
      passTurn(selectedCard, nextPlayerIndex);
    }
  };

  // Handle start game button click
  const handleStartGame = () => {
    startGame();
  };

  if (!isGameStarted) {
    return (
      <div 
        className="flex flex-col items-center justify-center h-full"
        style={{
          backgroundImage: `url(${background})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="bg-background/80 backdrop-blur-sm rounded-lg p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-center">Waiting for players...</h2>
          
          {isSoloMode ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>You (Host)</span>
              </div>
              {players.filter(p => p.isAI).map((player, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>{player.name}</span>
                  <span className="ml-auto text-muted-foreground text-sm">AI</span>
                </div>
              ))}
              <Button 
                className="w-full mt-6" 
                size="lg"
                onClick={handleStartGame}
              >
                Start Game
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {players.map((player, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>{player.name}{player.id === myPlayerId ? " (You)" : ""}</span>
                    {index === 0 && <span className="ml-auto text-muted-foreground text-sm">Host</span>}
                  </div>
                ))}
                
                {players.length < 4 && Array.from({ length: 4 - players.length }).map((_, index) => (
                  <div key={`empty-${index}`} className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-muted-foreground">Waiting for player...</span>
                  </div>
                ))}
              </div>
              
              {players[0]?.id === myPlayerId && (
                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={players.length < 2}
                  onClick={handleStartGame}
                >
                  {players.length < 2 ? "Need at least 2 players" : "Start Game"}
                </Button>
              )}
              
              {players[0]?.id !== myPlayerId && (
                <div className="flex items-center justify-center p-3 bg-muted/20 rounded-md">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  <span>Waiting for host to start the game...</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundImage: `url(${background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute top-0 left-0 right-0 p-4 bg-background/30 backdrop-blur-sm flex items-center justify-center">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Current Turn:</span>
          <span className={`px-3 py-1 rounded-md ${currentTurn === myPlayerId ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            {players[currentTurn]?.name || "Unknown"}
            {currentTurn === myPlayerId ? " (You)" : ""}
          </span>
        </div>
      </div>

      {/* Player positions */}
      {players.map((player, index) => {
        const position = getPlayerPosition(player.id, players.length);
        
        return (
          <div
            key={player.id}
            id={`player-${player.id}`}
            className="absolute"
            style={{
              top: position.top,
              left: position.left,
              right: position.right || 'auto',
              bottom: position.bottom || 'auto',
              transform: position.transform
            }}
          >
            <PlayerHand
              player={player}
              isCurrentPlayer={player.id === myPlayerId}
              isCurrentTurn={currentTurn === player.id}
              onSelectCard={handleCardSelect}
              selectedCard={selectedCard}
            />
          </div>
        );
      })}

      {/* Pass button */}
      {currentTurn === myPlayerId && selectedCard !== null && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2">
          <Button
            onClick={handleConfirmPass}
            size="lg"
            className="font-semibold shadow-lg"
          >
            Pass Card
          </Button>
        </div>
      )}

      {/* Animating card */}
      <AnimatePresence>
        {animatingCard !== null && cardPositions.start && cardPositions.end && (
          <motion.div
            className="absolute w-16 h-24 bg-primary rounded-md shadow-lg flex items-center justify-center text-white font-bold z-50"
            style={{
              top: cardPositions.start.top,
              left: cardPositions.start.left,
            }}
            animate={{
              top: cardPositions.end.top,
              left: cardPositions.end.left,
              scale: [1, 1.2, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 1,
              ease: "easeInOut",
            }}
          >
            {/* Card content */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameBoard;
