import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Card, Player, GameState } from "../types";
import { dealCards, checkWinningCondition } from "../cardUtils";

interface GameStoreState {
  // Game state
  gameState: GameState;
  isGameStarted: boolean;
  isGameOver: boolean;
  players: Player[];
  currentTurn: number;
  myPlayerId: number;
  playerHand: Card[];
  selectedCard: number | null;
  winner: Player | null;
  round: number;
  roundStartPlayerId: number | null;
  
  // Actions
  initGame: (players: Player[], myPlayerId: number) => void;
  startGame: () => void;
  resetGame: () => void;
  setSelectedCard: (cardId: number | null) => void;
  passTurn: (cardId: number, targetPlayerId: number) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: number) => void;
  setCurrentTurn: (playerId: number) => void;
  setPlayerHand: (playerId: number, hand: Card[]) => void;
  receiveCard: (playerId: number, card: Card) => void;
  checkForWinner: () => void;
  updateGameState: (gameState: Partial<GameStoreState>) => void;
}

export const useGameStore = create<GameStoreState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    gameState: GameState.WAITING,
    isGameStarted: false,
    isGameOver: false,
    players: [],
    currentTurn: 0,
    myPlayerId: 0,
    playerHand: [],
    selectedCard: null,
    winner: null,
    round: 0,
    roundStartPlayerId: null,
    
    // Initialize game with players
    initGame: (players, myPlayerId) => {
      set({
        players,
        myPlayerId,
        gameState: GameState.WAITING,
      });
      
      // Update player hand
      const myPlayerHand = players.find(p => p.id === myPlayerId)?.hand || [];
      set({ playerHand: myPlayerHand });
    },
    
    // Start the game
    startGame: () => {
      const { players } = get();
      
      // Clear any previous game state
      set({
        isGameStarted: true,
        isGameOver: false,
        winner: null,
        selectedCard: null,
        gameState: GameState.ACTIVE,
        round: 1,
      });
      
      // Deal cards to players
      const { updatedPlayers, startPlayerId } = dealCards(players);
      
      // Set starting player (the one with Ram Chaal card)
      set({
        players: updatedPlayers,
        currentTurn: startPlayerId,
        roundStartPlayerId: startPlayerId,
      });
      
      // Update player hand
      const { myPlayerId } = get();
      const myPlayerHand = updatedPlayers.find(p => p.id === myPlayerId)?.hand || [];
      set({ playerHand: myPlayerHand });
    },
    
    // Reset game state
    resetGame: () => {
      set({
        gameState: GameState.WAITING,
        isGameStarted: false,
        isGameOver: false,
        players: [],
        currentTurn: 0,
        playerHand: [],
        selectedCard: null,
        winner: null,
        round: 0,
        roundStartPlayerId: null,
      });
    },
    
    // Select a card
    setSelectedCard: (cardId) => {
      set({ selectedCard: cardId });
    },
    
    // Pass a card to another player
    passTurn: (cardId, targetPlayerId) => {
      const { players, myPlayerId, round, roundStartPlayerId } = get();
      
      // Find current player and card
      const currentPlayer = players.find(p => p.id === myPlayerId);
      if (!currentPlayer) return;
      
      // Find the card being passed
      const cardToPass = currentPlayer.hand.find(c => c.id === cardId);
      if (!cardToPass) return;
      
      // Remove card from current player's hand
      const updatedCurrentPlayerHand = currentPlayer.hand.filter(c => c.id !== cardId);
      
      // Update player states
      const updatedPlayers = players.map(player => {
        if (player.id === myPlayerId) {
          return {
            ...player,
            hand: updatedCurrentPlayerHand,
          };
        }
        
        if (player.id === targetPlayerId) {
          // Add card to target player's hand
          return {
            ...player,
            hand: [...player.hand, cardToPass],
          };
        }
        
        return player;
      });
      
      // Check if we've completed a full round
      let newRound = round;
      if (targetPlayerId === roundStartPlayerId) {
        newRound += 1;
      }
      
      // Update state
      set({
        players: updatedPlayers,
        playerHand: updatedCurrentPlayerHand,
        currentTurn: targetPlayerId,
        selectedCard: null,
        round: newRound,
      });
      
      // Check for winner after card passing
      const winningPlayer = checkWinningCondition(updatedPlayers, newRound);
      if (winningPlayer) {
        set({
          isGameOver: true,
          winner: winningPlayer,
          gameState: GameState.ENDED,
        });
      }
    },
    
    // Add player to the game
    addPlayer: (player) => {
      const { players } = get();
      set({ players: [...players, player] });
    },
    
    // Remove player from the game
    removePlayer: (playerId) => {
      const { players } = get();
      set({ players: players.filter(p => p.id !== playerId) });
    },
    
    // Set current player's turn
    setCurrentTurn: (playerId) => {
      set({ currentTurn: playerId });
    },
    
    // Set a player's hand
    setPlayerHand: (playerId, hand) => {
      const { players, myPlayerId } = get();
      
      const updatedPlayers = players.map(player => {
        if (player.id === playerId) {
          return { ...player, hand };
        }
        return player;
      });
      
      set({ players: updatedPlayers });
      
      // Update own hand if it's the current player
      if (playerId === myPlayerId) {
        set({ playerHand: hand });
      }
    },
    
    // Receive a card from another player
    receiveCard: (playerId, card) => {
      const { players, myPlayerId } = get();
      
      const updatedPlayers = players.map(player => {
        if (player.id === playerId) {
          return {
            ...player,
            hand: [...player.hand, card],
          };
        }
        return player;
      });
      
      set({ players: updatedPlayers });
      
      // Update own hand if it's the current player
      if (playerId === myPlayerId) {
        set({ playerHand: [...get().playerHand, card] });
      }
    },
    
    // Check if any player has won
    checkForWinner: () => {
      const { players, round } = get();
      
      const winningPlayer = checkWinningCondition(players, round);
      if (winningPlayer) {
        set({
          isGameOver: true,
          winner: winningPlayer,
          gameState: GameState.ENDED,
        });
      }
    },
    
    // Update game state (used for syncing from server)
    updateGameState: (gameState) => {
      set(gameState);
    },
  }))
);
