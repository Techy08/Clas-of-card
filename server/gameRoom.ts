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
  winningPlayers: Player[];  // Track all players who have won
  finishedPositions: number[]; // Track positions that have been filled (1st, 2nd, 3rd)
  
  constructor(id: string) {
    this.id = id;
    this.players = [];
    this.currentTurn = 0;
    this.state = GameState.WAITING;
    this.round = 0;
    this.roundStartPlayerId = null;
    this.winner = null;
    this.winningPlayers = [];
    this.finishedPositions = [];
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
  removePlayer(idOrSocketId: string | number): Player | undefined {
    let playerIndex = -1;
    
    // Check if it's a socket ID or player ID
    if (typeof idOrSocketId === 'string') {
      // Try to match by socket ID first
      playerIndex = this.players.findIndex(p => p.socketId === idOrSocketId);
      
      // If no match, try to parse as a player ID number
      if (playerIndex === -1) {
        const parsedId = parseInt(idOrSocketId);
        if (!isNaN(parsedId)) {
          playerIndex = this.players.findIndex(p => p.id === parsedId);
        }
      }
    } else {
      // It's a numeric player ID
      playerIndex = this.players.findIndex(p => p.id === idOrSocketId);
    }
    
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
    // Check for a winning player who hasn't already won
    const activePlayers = this.players.filter(p => !this.winningPlayers.includes(p));
    const winner = checkWinningCondition(activePlayers, this.round);
    
    if (winner) {
      // Add to winning players list
      this.winningPlayers.push(winner);
      
      // Determine position (1st, 2nd, or 3rd)
      const position = this.winningPlayers.length;
      this.finishedPositions.push(position);
      
      // Update player with winning info
      winner.position = position;
      
      // If this is the first winner, set it as the main winner
      if (position === 1) {
        this.winner = winner;
      }
      
      // Remove player from active turns
      const remainingPlayers = this.players.filter(p => 
        !this.winningPlayers.includes(p) && 
        p.id !== winner.id
      );
      
      // If 3 players have won (positions 1-3), the remaining player is the loser
      if (this.winningPlayers.length === 3 && remainingPlayers.length === 1) {
        const loser = remainingPlayers[0];
        loser.position = 4; // 4th position (loser)
        this.state = GameState.ENDED;
      }
      // If all players have won, end the game
      else if (this.winningPlayers.length === this.players.length) {
        this.state = GameState.ENDED;
      }
      // Otherwise, adjust game flow to skip the winning player
      else {
        // If it was the winner's turn, move to the next player
        if (this.currentTurn === winner.id) {
          // Find next active player
          let nextPlayerIndex = this.players.findIndex(p => p.id === winner.id) + 1;
          
          // Find the next player who hasn't won yet
          while (true) {
            if (nextPlayerIndex >= this.players.length) {
              nextPlayerIndex = 0;
            }
            
            const nextPlayer = this.players[nextPlayerIndex];
            if (!this.winningPlayers.includes(nextPlayer)) {
              this.currentTurn = nextPlayer.id;
              break;
            }
            
            nextPlayerIndex++;
          }
        }
      }
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
      winningPlayers: this.winningPlayers,
      finishedPositions: this.finishedPositions
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
