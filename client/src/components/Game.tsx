import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import GameBoard from "./GameBoard";
import WinnerPopup from "./WinnerPopup";
import Chat from "./Chat";
import { useGameStore } from "@/lib/stores/useGameStore";
import { useSocketStore } from "@/lib/stores/useSocketStore";
import { useChatStore } from "@/lib/stores/useChatStore";
import { startAiGame } from "@/lib/aiPlayer";

const Game = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const isSoloMode = roomId === "solo";
  
  const { 
    gameState, 
    initGame, 
    resetGame,
    startGame,
    isGameOver,
    winner,
    players,
    playerHand,
    myPlayerId
  } = useGameStore();
  
  const { 
    socket, 
    isConnected, 
    joinRoom, 
    leaveRoom 
  } = useSocketStore();
  
  const { resetChat } = useChatStore();

  // Initialize the game
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const setupGame = async () => {
      try {
        // Reset game state
        resetGame();
        resetChat();
        
        if (isSoloMode) {
          // Start single player game
          const playerName = localStorage.getItem("playerName") || "Player";
          await startAiGame(playerName);
          setIsLoading(false);
        } else if (roomId && isConnected) {
          // Join multiplayer room
          const playerName = localStorage.getItem("playerName") || "Player";
          await joinRoom(roomId, playerName);
          
          // Set loading false after a minimum time to avoid flashing
          timeoutId = setTimeout(() => {
            setIsLoading(false);
          }, 1000);
        } else {
          // No room ID or not connected
          toast.error("Unable to join game. Returning to home.");
          navigate("/");
        }
      } catch (error) {
        console.error("Game setup error:", error);
        toast.error("Failed to join the game");
        navigate("/");
      }
    };

    setupGame();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (!isSoloMode) {
        leaveRoom();
      }
    };
  }, [roomId, isConnected, resetGame, resetChat, joinRoom, leaveRoom, navigate, isSoloMode]);

  // Handle game exit
  const handleExitGame = () => {
    resetGame();
    resetChat();
    if (!isSoloMode) {
      leaveRoom();
    }
    navigate("/");
  };

  // Handle new game
  const handleNewGame = () => {
    resetGame();
    startGame();
  };

  return (
    <>
      <Helmet>
        <title>Ram-Sita Adventure | Game</title>
      </Helmet>

      <div className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-indigo-900 via-purple-800 to-pink-800">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <h2 className="text-2xl font-semibold text-white">
                {isSoloMode ? "Setting up game..." : "Joining room..."}
              </h2>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col h-full">
            {/* Game Header */}
            <div className="flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm">
              <h1 className="text-xl font-bold">Ram-Sita Adventure</h1>
              <div className="flex items-center gap-4">
                {!isSoloMode && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowChat(!showChat)}
                    className="hidden sm:flex"
                  >
                    {showChat ? "Hide Chat" : "Show Chat"}
                  </Button>
                )}
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleExitGame}
                >
                  Exit Game
                </Button>
              </div>
            </div>

            {/* Game Content with Chat Sidebar */}
            <div className="relative flex flex-grow h-full">
              {/* Main Game Board */}
              <div className={`flex-grow h-full overflow-hidden ${showChat ? 'sm:w-3/4' : 'w-full'}`}>
                <GameBoard />
              </div>

              {/* Chat Sidebar */}
              {!isSoloMode && (
                <AnimatePresence>
                  {showChat && (
                    <motion.div
                      initial={{ x: "100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "100%" }}
                      transition={{ type: "spring", damping: 20 }}
                      className="fixed right-0 top-0 bottom-0 w-full sm:w-1/4 sm:relative h-full bg-background/90 backdrop-blur-md sm:border-l border-border z-10"
                    >
                      <div className="absolute top-2 right-2 sm:hidden">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowChat(false)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                          </svg>
                        </Button>
                      </div>
                      <Chat />
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {/* Mobile Chat Toggle */}
            {!isSoloMode && (
              <div className="fixed bottom-4 right-4 sm:hidden z-10">
                <Button
                  variant="secondary"
                  size="icon"
                  className="w-12 h-12 rounded-full shadow-lg"
                  onClick={() => setShowChat(!showChat)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z" />
                    <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
                  </svg>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Winner Popup */}
        <AnimatePresence>
          {isGameOver && (
            <WinnerPopup 
              winner={winner} 
              players={players}
              winningPlayers={useGameStore(state => state.winningPlayers)}
              onNewGame={handleNewGame}
              onExit={handleExitGame}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default Game;
