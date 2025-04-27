import { Card, CardType, GameState, Player } from "../shared/gameTypes";
import { dealCards, checkWinningCondition } from "./game";

export class GameRoom {
  id: string;
  players: Player[];
  currentTurn: number;
  state: GameState;
  round: number;
  roundStartPlayerId: number | null;
  winner: Player | null;
  
  constructor(id: string) {
    this.id = id;
    this.players = [];
    this.currentTurn = 0;
    this.state = GameState.WAITING;
    this.round = 0;
    this.roundStartPlayerId = null;
    this.winner = null;
  }
  
  // Add player to the room
  addPlayer(name: string, socketId: string): Player {
    const playerId = this.players.length;
    
    const player: Player = {
      id: playerId,
      name,
      socketId,
      hand: [],
      winningSet: null,
      isAI: false,
    };
    
    this.players.push(player);
    
    return player;
  }
  
  // Add AI player to the room
  addAIPlayer(name: string): Player {
    const playerId = this.players.length;
    
    const player: Player = {
      id: playerId,
      name,
      hand: [],
      winningSet: null,
      isAI: true,
    };
    
    this.players.push(player);
    
    return player;
  }
  
  // Remove player from the room
  removePlayer(socketId: string): Player | undefined {
    const playerIndex = this.players.findIndex(p => p.socketId === socketId);
    
    if (playerIndex === -1) {
      return undefined;
    }
    
    const player = this.players[playerIndex];
    
    // Remove the player
    this.players.splice(playerIndex, 1);
    
    // Update player ids to maintain contiguous ids
    this.players.forEach((p, idx) => {
      p.id = idx;
    });
    
    return player;
  }
  
  // Start the game
  startGame(): { players: Player[], startPlayerId: number } {
    this.state = GameState.ACTIVE;
    this.round = 1;
    this.winner = null;
    
    // Deal cards to players
    const { players, startPlayerId } = dealCards(this.players);
    
    this.players = players;
    this.currentTurn = startPlayerId;
    this.roundStartPlayerId = startPlayerId;
    
    return { players, startPlayerId };
  }
  
  // Handle card passing
  passCard(fromPlayerId: number, cardId: number, toPlayerId: number): void {
    // Find players
    const fromPlayer = this.players.find(p => p.id === fromPlayerId);
    const toPlayer = this.players.find(p => p.id === toPlayerId);
    
    if (!fromPlayer || !toPlayer) {
      throw new Error("Invalid player IDs");
    }
    
    // Find card
    const cardIndex = fromPlayer.hand.findIndex(c => c.id === cardId);
    
    if (cardIndex === -1) {
      throw new Error("Card not found in player's hand");
    }
    
    // Remove card from origin player
    const card = fromPlayer.hand.splice(cardIndex, 1)[0];
    
    // Add card to destination player
    toPlayer.hand.push(card);
    
    // Update current turn
    this.currentTurn = toPlayerId;
    
    // Check if we've completed a round
    if (toPlayerId === this.roundStartPlayerId) {
      this.round += 1;
    }
    
    // Check for winner
    this.checkForWinner();
  }
  
  // Check if any player has won
  checkForWinner(): Player | null {
    const winner = checkWinningCondition(this.players, this.round);
    
    if (winner) {
      this.winner = winner;
      this.state = GameState.ENDED;
    }
    
    return winner;
  }
  
  // Get room state
  getRoomState() {
    return {
      roomId: this.id,
      players: this.players.map(player => ({
        ...player,
        // Remove card details for other players
        hand: player.hand.map(card => ({
          id: card.id,
          type: card.type,
          isRamChaal: card.isRamChaal,
        })),
      })),
      currentTurn: this.currentTurn,
      state: this.state,
      round: this.round,
      winner: this.winner,
    };
  }
  
  // Get public room info (for lobby listings)
  getPublicInfo() {
    return {
      id: this.id,
      playerCount: this.players.length,
      state: this.state,
    };
  }
}
