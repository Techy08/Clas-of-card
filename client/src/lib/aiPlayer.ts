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
  
  // Initialize game with all players
  const players = [player, ...aiPlayers];
  gameStore.initGame(players, 0);
  
  // Start the game
  gameStore.startGame();
  
  // Set up AI turn handling
  setupAiTurnHandling();
};

// Handle AI turns
const setupAiTurnHandling = () => {
  // Subscribe to turn changes
  useGameStore.subscribe(
    state => state.currentTurn,
    (currentTurn) => {
      const { players, isGameOver } = useGameStore.getState();
      
      // If game is over, don't process AI turns
      if (isGameOver) return;
      
      const currentPlayer = players[currentTurn];
      
      // If it's an AI's turn
      if (currentPlayer && currentPlayer.isAI) {
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
  const { players, passTurn } = useGameStore.getState();
  
  // Get the next player ID
  const nextPlayerId = (aiPlayer.id + 1) % players.length;
  
  // Select best card to pass
  const cardToPass = getBestCardToPass(aiPlayer.hand);
  
  // Pass the card
  passTurn(cardToPass.id, nextPlayerId);
};
