import { useGameStore } from "./stores/useGameStore";
import { getBestCardToPass, hasWinningSet, checkWinningCondition } from "./cardUtils";
import { CardType, Player, GameState } from "./types";

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
  
  // Create AI players with exact names as requested
  const aiPlayers = createAiPlayers(3);
  
  // Initialize game with all players
  const players = [player, ...aiPlayers];
  gameStore.initGame(players, 0);
  
  // Start the game
  gameStore.startGame();
  
  // Start monitoring AI turns (after a short delay to ensure the game is initialized)
  setTimeout(() => {
    checkForAITurn();
  }, 500);
};

// Simple function to check if it's an AI's turn and handle it if so
const checkForAITurn = () => {
  const { players, currentTurn, isGameOver } = useGameStore.getState();
  
  // If game is over, stop checking
  if (isGameOver) return;
  
  // Get current player
  const currentPlayer = players[currentTurn];
  
  // If it's an AI's turn
  if (currentPlayer && currentPlayer.isAI) {
    console.log(`AI ${currentPlayer.name}'s turn - will pass a card...`);
    
    // Add a slight delay to make it feel more natural (1-2 seconds)
    setTimeout(() => {
      // Handle AI turn
      executeAIMove(currentPlayer);
      
      // Check again after a delay in case the next player is also AI
      setTimeout(checkForAITurn, 500);
    }, 1000 + Math.random() * 1000);
  } else {
    // Not an AI turn, check again after a while
    setTimeout(checkForAITurn, 1000);
  }
};

// Execute AI move
const executeAIMove = (aiPlayer: Player) => {
  const gameStore = useGameStore.getState();
  const { players, round, roundStartPlayerId } = gameStore;
  
  // Get the next player ID
  const currentPlayerIndex = players.findIndex(p => p.id === aiPlayer.id);
  const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
  const nextPlayerId = players[nextPlayerIndex].id;
  
  // Select best card to pass
  const cardToPass = getBestCardToPass(aiPlayer.hand);
  
  if (!cardToPass) {
    console.error(`AI ${aiPlayer.name} has no cards to pass!`);
    return;
  }
  
  console.log(`AI ${aiPlayer.name} passing card ${cardToPass.type} to player ${players[nextPlayerIndex].name}`);
  
  // Update the game state
  useGameStore.setState(state => {
    // First, remove the card from AI's hand
    const updatedPlayers = state.players.map(p => {
      if (p.id === aiPlayer.id) {
        return {
          ...p,
          hand: p.hand.filter(c => c.id !== cardToPass.id)
        };
      }
      
      if (p.id === nextPlayerId) {
        return {
          ...p,
          hand: [...p.hand, cardToPass]
        };
      }
      
      return p;
    });
    
    // Check if we've completed a round
    let newRound = state.round;
    if (nextPlayerId === state.roundStartPlayerId) {
      newRound += 1;
      console.log(`AI completed round ${state.round}, starting round ${newRound}`);
    }
    
    // Check if the next player has won
    let isGameOver = state.isGameOver;
    let winner = state.winner;
    
    // Only check for winners after round 1
    if (newRound >= 2) {
      const nextPlayer = updatedPlayers.find(p => p.id === nextPlayerId);
      if (nextPlayer) {
        const winningSet = hasWinningSet(nextPlayer);
        if (winningSet) {
          // We have a winner!
          isGameOver = true;
          // Update the player with the winning set
          const winningPlayer = { 
            ...nextPlayer,
            winningSet 
          };
          winner = winningPlayer;
          
          console.log(`Player ${winningPlayer.name} has won the game!`);
          
          // Update the players array with the winning set
          updatedPlayers.forEach(p => {
            if (p.id === nextPlayerId) {
              p.winningSet = winningSet;
            }
          });
        }
      }
    }
    
    // Update next player's turn and other game state
    return {
      players: updatedPlayers,
      currentTurn: nextPlayerIndex,
      round: newRound,
      isGameOver,
      winner,
      gameState: isGameOver ? GameState.ENDED : state.gameState
    };
  });
};
