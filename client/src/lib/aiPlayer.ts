import { useGameStore } from "./stores/useGameStore";
import { getBestCardToPass } from "./cardUtils";
import { CardType, Player } from "./types";

// AI player names
const AI_NAMES = ["R.1", "P10", "R.0"];

// Create AI players
export const createAiPlayers = (count: number): Player[] => {
  return Array.from({ length: count }).map((_, index) => ({
    id: index + 1, // Start from 1, player will be 0
    name: AI_NAMES[index],
    hand: [],
    isAI: true,
    winningSet: null,
  }));
};

// Start a solo game against AI players
export const startAiGame = async (playerName: string): Promise<void> => {
  const gameStore = useGameStore.getState();
  
  console.log("Starting AI game with player:", playerName);
  
  // Create player
  const player: Player = {
    id: 0,
    name: playerName,
    hand: [],
    isAI: false,
    winningSet: null,
  };
  
  // Create AI players (3)
  const aiPlayers = createAiPlayers(3);
  console.log("Created AI players:", aiPlayers.map(p => p.name).join(", "));
  
  // Initialize game with all players
  const players = [player, ...aiPlayers];
  gameStore.initGame(players, 0);
  
  // Set up AI turn handling first to make sure it's ready when the game starts
  setupAiTurnHandling();
  
  // Start the game
  console.log("Starting game with players:", players.map(p => p.name).join(", "));
  gameStore.startGame();
};

// Handle AI turns
const setupAiTurnHandling = () => {
  console.log("Setting up AI turn handling...");
  
  // Subscribe to turn changes
  useGameStore.subscribe(
    state => state.currentTurn,
    (currentTurnIndex) => {
      const { players, isGameOver } = useGameStore.getState();
      
      // If game is over, don't process AI turns
      if (isGameOver) return;
      
      // Find the current player by index
      const currentPlayer = players.find((_, idx) => idx === currentTurnIndex);
      
      console.log(`Current turn: ${currentTurnIndex}, Player: ${currentPlayer?.name}, isAI: ${currentPlayer?.isAI}`);
      
      // If it's an AI's turn
      if (currentPlayer && currentPlayer.isAI) {
        console.log(`AI ${currentPlayer.name}'s turn - preparing to pass card...`);
        // Add a slight delay to make it feel more natural
        setTimeout(() => {
          handleAiTurn(currentPlayer);
        }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
      }
    }
  );
};

// Process AI turn
const handleAiTurn = (aiPlayer: Player) => {
  const gameStore = useGameStore.getState();
  const { players, passTurn } = gameStore;
  
  // Get the next player ID - ensure we handle players array length properly
  const currentPlayerIdx = players.findIndex(p => p.id === aiPlayer.id);
  const nextPlayerIdx = (currentPlayerIdx + 1) % players.length;
  const nextPlayerId = players[nextPlayerIdx].id;
  
  // Select best card to pass using enhanced strategic logic
  const cardToPass = getBestCardToPass(aiPlayer.hand);
  
  console.log(`AI ${aiPlayer.name} (id: ${aiPlayer.id}) passing card ${cardToPass.type} to next player ${players[nextPlayerIdx].name} (id: ${nextPlayerId})`);
  
  // Temporarily override myPlayerId to the AI's ID so that passTurn works correctly
  const originalMyPlayerId = gameStore.myPlayerId;
  gameStore.updateGameState({ myPlayerId: aiPlayer.id });
  
  // Pass the card with a small delay to make it visible to the player
  setTimeout(() => {
    passTurn(cardToPass.id, nextPlayerId);
    
    // Restore the original player ID
    gameStore.updateGameState({ myPlayerId: originalMyPlayerId });
  }, 800);
};
