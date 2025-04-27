import { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import { GameRoom } from "./gameRoom";
import { GameState, Player, Card, CardType } from "../shared/gameTypes";
import { log } from "./vite";
import { 
  getCardPlayingStrategy, 
  generateAIDialogue, 
  generateGameTipOrFact,
  getAIPlayerNameSuggestions,
  generateGameResultCommentary
} from "./geminiService";

interface GameRooms {
  [key: string]: GameRoom;
}

interface ChatMessage {
  content: string;
  sender: string;
}

export class SocketManager {
  private io: Server;
  private rooms: GameRooms = {};
  private waitingForRandomMatch: string[] = []; // Socket IDs waiting for random match

  constructor(io: Server) {
    this.io = io;
    this.initialize();
  }

  // Initialize socket handlers
  private initialize(): void {
    this.io.on("connection", (socket: Socket) => {
      log(`Client connected: ${socket.id}`, "socket");

      // Create a new room
      socket.on("create_room", ({ playerName, withAI = false }, callback) => {
        try {
          const roomId = nanoid(6).toUpperCase();
          this.rooms[roomId] = new GameRoom(roomId);
          
          const player = this.rooms[roomId].addPlayer(playerName, socket.id);
          socket.join(roomId);
          
          // If AI players are requested, add them
          if (withAI) {
            // Add 3 AI players with default names for now (will be updated with Gemini later)
            this.rooms[roomId].addAIPlayer("R.9");
            this.rooms[roomId].addAIPlayer("R.O");
            this.rooms[roomId].addAIPlayer("P10");
            
            // Update AI names using Gemini in the background
            getAIPlayerNameSuggestions(3).then(names => {
              if (this.rooms[roomId]) {
                const aiPlayers = this.rooms[roomId].players.filter(p => p.isAI);
                
                // Update AI player names
                for (let i = 0; i < Math.min(aiPlayers.length, names.length); i++) {
                  aiPlayers[i].name = names[i];
                }
                
                // Send updated state to the player
                this.io.to(roomId).emit("game_state_update", this.rooms[roomId].getRoomState());
              }
            }).catch(err => {
              log(`Error getting AI player names: ${err}`, "socket");
            });
          }
          
          log(`Room created: ${roomId} by ${playerName} ${withAI ? 'with AI players' : ''}`, "socket");
          callback({ success: true, roomId });
        } catch (error) {
          log(`Error creating room: ${error}`, "socket");
          callback({ success: false, error: "Failed to create room" });
        }
      });

      // Join an existing room
      socket.on("join_room", ({ roomId, playerName }, callback) => {
        try {
          // Check if room exists
          if (!this.rooms[roomId]) {
            return callback({ success: false, error: "Room not found" });
          }
          
          // Check if game already started
          if (this.rooms[roomId].state !== GameState.WAITING) {
            return callback({ success: false, error: "Game already in progress" });
          }
          
          // Check if room is full
          if (this.rooms[roomId].players.length >= 4) {
            return callback({ success: false, error: "Room is full" });
          }
          
          // Add player to room
          const player = this.rooms[roomId].addPlayer(playerName, socket.id);
          socket.join(roomId);
          
          // Notify other players
          socket.to(roomId).emit("player_joined", player);
          
          // Send current room state to new player
          socket.emit("game_state_update", this.rooms[roomId].getRoomState());
          
          log(`${playerName} joined room: ${roomId}`, "socket");
          callback({ success: true });
        } catch (error) {
          log(`Error joining room: ${error}`, "socket");
          callback({ success: false, error: "Failed to join room" });
        }
      });

      // Leave room
      socket.on("leave_room", ({ roomId }) => {
        if (this.rooms[roomId]) {
          const player = this.rooms[roomId].removePlayer(socket.id);
          
          if (player) {
            socket.leave(roomId);
            socket.to(roomId).emit("player_left", player.id);
            
            log(`${player.name} left room: ${roomId}`, "socket");
            
            // If room is empty, delete it
            if (this.rooms[roomId].players.length === 0) {
              delete this.rooms[roomId];
              log(`Room deleted: ${roomId}`, "socket");
            }
          }
        }
      });

      // Start game
      socket.on("start_game", ({ roomId }) => {
        if (this.rooms[roomId]) {
          // Check if user is the host (first player)
          const isHost = this.rooms[roomId].players.length > 0 && 
                        this.rooms[roomId].players[0].socketId === socket.id;
          
          if (!isHost) {
            return;
          }
          
          // Start the game
          const { players, startPlayerId } = this.rooms[roomId].startGame();
          
          // Emit game started event to all players in room
          this.io.to(roomId).emit("game_started", {
            players,
            startPlayerId,
          });
          
          log(`Game started in room: ${roomId}`, "socket");
          
          // If the current player is an AI, make their move
          const currentPlayer = this.rooms[roomId].players.find(p => p.id === startPlayerId);
          if (currentPlayer && currentPlayer.isAI) {
            // AI players move automatically after a short delay
            setTimeout(() => {
              this.handleAITurn(roomId, startPlayerId);
            }, 2000);
          }
        }
      });

      // Pass card
      socket.on("pass_card", ({ roomId, fromPlayerId, cardId, toPlayerId }) => {
        if (this.rooms[roomId]) {
          try {
            // Verify this is from the correct player
            const player = this.rooms[roomId].players.find(p => p.id === fromPlayerId);
            
            if (!player || player.socketId !== socket.id) {
              return;
            }
            
            // Process card passing
            this.rooms[roomId].passCard(fromPlayerId, cardId, toPlayerId);
            
            // Update game state for all players
            this.io.to(roomId).emit("game_state_update", this.rooms[roomId].getRoomState());
            
            // If there's a winner, emit game ended event
            if (this.rooms[roomId].winner) {
              this.io.to(roomId).emit("game_ended", this.rooms[roomId].winner);
            }
          } catch (error) {
            log(`Error passing card: ${error}`, "socket");
          }
        }
      });

      // Chat message
      socket.on("chat_message", (message: ChatMessage) => {
        // Find which room this socket is in
        const roomId = this.findRoomIdBySocket(socket.id);
        
        if (roomId) {
          const timestamp = new Date().toISOString();
          const id = nanoid();
          
          // Broadcast to all other players in the room
          socket.to(roomId).emit("chat_message", {
            id,
            sender: message.sender,
            content: message.content,
            timestamp,
          });
        }
      });

      // Find random game
      socket.on("find_random_game", ({ playerName }) => {
        // Check if player is already in a room
        const existingRoomId = this.findRoomIdBySocket(socket.id);
        if (existingRoomId) {
          socket.emit("random_game_found", { roomId: existingRoomId });
          return;
        }
        
        // Try to find an available room
        const availableRoom = Object.values(this.rooms).find(room => 
          room.state === GameState.WAITING && room.players.length < 4
        );
        
        if (availableRoom) {
          // Join existing room
          const player = availableRoom.addPlayer(playerName, socket.id);
          socket.join(availableRoom.id);
          
          // Notify other players
          socket.to(availableRoom.id).emit("player_joined", player);
          
          // Send current room state to new player
          socket.emit("game_state_update", availableRoom.getRoomState());
          
          // Notify player about the room
          socket.emit("random_game_found", { roomId: availableRoom.id });
          
          log(`${playerName} joined random game: ${availableRoom.id}`, "socket");
        } else {
          // Check waiting list first
          if (this.waitingForRandomMatch.length > 0) {
            // Get waiting socket ID
            const waitingSocketId = this.waitingForRandomMatch.shift()!;
            const waitingSocket = this.io.sockets.sockets.get(waitingSocketId);
            
            if (waitingSocket) {
              // Create new room
              const roomId = nanoid(6).toUpperCase();
              this.rooms[roomId] = new GameRoom(roomId);
              
              // Get waiting player's name from socket data
              const waitingPlayerName = waitingSocket.data.playerName || "Player 1";
              
              // Add waiting player to room
              const player1 = this.rooms[roomId].addPlayer(waitingPlayerName, waitingSocketId);
              
              // Add current player to room
              const player2 = this.rooms[roomId].addPlayer(playerName, socket.id);
              
              // Add both sockets to room
              waitingSocket.join(roomId);
              socket.join(roomId);
              
              // Send updates to both players
              this.io.to(roomId).emit("game_state_update", this.rooms[roomId].getRoomState());
              
              // Notify both players
              waitingSocket.emit("random_game_found", { roomId });
              socket.emit("random_game_found", { roomId });
              
              log(`Random match created: ${roomId} with ${waitingPlayerName} and ${playerName}`, "socket");
            } else {
              // If waiting socket is invalid, add current socket to waiting list
              this.waitingForRandomMatch.push(socket.id);
              socket.data.playerName = playerName;
            }
          } else {
            // Add to waiting list
            this.waitingForRandomMatch.push(socket.id);
            socket.data.playerName = playerName;
            log(`${playerName} added to random match waiting list`, "socket");
          }
        }
      });

      // Disconnect
      socket.on("disconnect", () => {
        log(`Client disconnected: ${socket.id}`, "socket");
        
        // Remove from random match waiting list
        const waitingIndex = this.waitingForRandomMatch.indexOf(socket.id);
        if (waitingIndex !== -1) {
          this.waitingForRandomMatch.splice(waitingIndex, 1);
        }
        
        // Find and leave any rooms
        const roomId = this.findRoomIdBySocket(socket.id);
        if (roomId && this.rooms[roomId]) {
          const player = this.rooms[roomId].removePlayer(socket.id);
          
          if (player) {
            socket.to(roomId).emit("player_left", player.id);
            
            log(`${player.name} disconnected from room: ${roomId}`, "socket");
            
            // If room is empty, delete it
            if (this.rooms[roomId].players.length === 0) {
              delete this.rooms[roomId];
              log(`Room deleted: ${roomId}`, "socket");
            }
          }
        }
      });
    });
  }

  // Record game result in database
  private async recordGameResult(roomId: string): Promise<void> {
    if (!this.rooms[roomId] || !this.rooms[roomId].winner) {
      return;
    }

    try {
      const { db, recordGameHistory, completeGameHistory, recordGameParticipant, updatePlayerStats } = await import('./db');
      
      const room = this.rooms[roomId];
      const players = room.players;
      const winner = room.winner;
      
      // Record basic game history
      const gameRecord = await recordGameHistory(
        roomId,
        players.length,
        winner?.socketId ? winner.id : undefined // Only record real users, not AI
      );
      
      if (!gameRecord) {
        log(`Failed to record game history for room ${roomId}`, 'socket');
        return;
      }
      
      // Sort players by winning status (winner first, then others)
      const sortedPlayers = [...players].sort((a, b) => {
        if (a.id === winner?.id) return -1;
        if (b.id === winner?.id) return 1;
        return 0;
      });
      
      // Record each participant and update their stats
      for (let i = 0; i < sortedPlayers.length; i++) {
        const player = sortedPlayers[i];
        const position = i + 1; // Position 1 = 1st place (winner)
        const isWinner = player.id === winner?.id;
        
        // Only update stats for real players (those with socketId)
        if (player.socketId) {
          // Record this player's participation
          await recordGameParticipant(
            gameRecord.id,
            player.id,
            position,
            false // Not AI
          );
          
          // Update player stats (skip for now as we don't have user IDs yet)
          // In a real implementation, you'd associate socketId with user accounts
        }
        // Record AI players too
        else if (player.isAI) {
          await recordGameParticipant(
            gameRecord.id,
            null, // No user ID for AI
            position,
            true, // Is AI
            player.name
          );
        }
      }
      
      // Mark game as completed
      await completeGameHistory(roomId, winner?.socketId ? winner.id : undefined);
      
      log(`Game results recorded for room ${roomId}`, 'socket');
    } catch (error) {
      log(`Error recording game results: ${error}`, 'socket');
    }
  }

  // Find room ID by socket ID
  private findRoomIdBySocket(socketId: string): string | null {
    for (const roomId in this.rooms) {
      const playerExists = this.rooms[roomId].players.some(p => p.socketId === socketId);
      if (playerExists) {
        return roomId;
      }
    }
    return null;
  }
  
  // Handle AI turn logic with more advanced decision making
  private handleAITurn(roomId: string, aiPlayerId: number): void {
    if (!this.rooms[roomId]) return;
    
    const room = this.rooms[roomId];
    const aiPlayer = room.players.find(p => p.id === aiPlayerId);
    
    if (!aiPlayer || !aiPlayer.isAI) return;
    
    // Introduce a delay to make AI seem more human-like
    setTimeout(async () => {
      try {
        if (!this.rooms[roomId]) return; // Room may have been deleted during timeout
        
        // Get the AI player's hand
        const aiHand = aiPlayer.hand;
        
        if (aiHand.length === 0) return;
        
        // Try to get strategic advice from Gemini
        let cardToPass: Card | undefined;
        let nextPlayerId: number;
        
        try {
          // Get AI advice from Gemini
          const strategy = await getCardPlayingStrategy(aiHand, aiPlayerId, room.round);
          log(`AI ${aiPlayer.name} strategy: ${strategy}`, "socket");
          
          // Check for any potential winning cards that could help complete a set
          const cardCounts = {
            Ram: aiHand.filter(c => c.type === CardType.Ram && !c.isRamChaal).length,
            Sita: aiHand.filter(c => c.type === CardType.Sita).length,
            Lakshman: aiHand.filter(c => c.type === CardType.Lakshman).length,
            Ravan: aiHand.filter(c => c.type === CardType.Ravan).length,
          };
          
          const hasRamChaal = aiHand.some(c => c.isRamChaal);
          
          // Strategy logic
          if (hasRamChaal && cardCounts.Ram >= 2) {
            // If we have Ram Chaal and at least 2 Ram cards, we're close to a winning set
            // Pass a non-Ram card
            cardToPass = aiHand.find(c => c.type !== CardType.Ram);
          } else if (cardCounts.Sita >= 3) {
            // If we have 3 Sita cards, keep them and pass something else
            cardToPass = aiHand.find(c => c.type !== CardType.Sita);
          } else if (cardCounts.Lakshman >= 3) {
            // If we have 3 Lakshman cards, keep them and pass something else
            cardToPass = aiHand.find(c => c.type !== CardType.Lakshman);
          } else if (cardCounts.Ravan >= 3) {
            // If we have 3 Ravan cards, keep them and pass something else
            cardToPass = aiHand.find(c => c.type !== CardType.Ravan);
          } else {
            // Find the card type with the lowest count (least likely to form a set)
            const minType = Object.entries(cardCounts)
              .filter(([type]) => type !== 'Ram' || !hasRamChaal) // Don't count Ram if we have Ram Chaal
              .reduce((min, curr) => curr[1] < min[1] ? curr : min, ['', Infinity])[0];
              
            // Pass a card of the type with the lowest count
            cardToPass = aiHand.find(c => {
              if (c.type === CardType.Ram) {
                return c.type.toString() === minType && !c.isRamChaal;
              }
              return c.type.toString() === minType;
            });
          }
        } catch (error) {
          log(`Error getting AI strategy: ${error}`, "socket");
          
          // Fallback strategy: pass the first card in hand
          cardToPass = aiHand[0];
        }
        
        // If no card was selected based on strategy, just pass the first card
        if (!cardToPass) {
          cardToPass = aiHand[0];
        }
        
        // Find the next player to pass to
        const currentPlayerIndex = room.players.findIndex(p => p.id === aiPlayerId);
        const nextPlayerIndex = (currentPlayerIndex + 1) % room.players.length;
        nextPlayerId = room.players[nextPlayerIndex].id;
        
        // Pass the selected card
        room.passCard(aiPlayerId, cardToPass.id, nextPlayerId);
        
        // Generate AI dialogue for a more engaging experience
        let context = "making a move";
        let emotion: 'happy' | 'frustrated' | 'excited' | 'neutral' = 'neutral';
        
        // Check if AI player is close to winning
        const cardTypeCount = {};
        aiPlayer.hand.forEach(card => {
          const type = card.isRamChaal ? 'RamChaal' : card.type;
          cardTypeCount[type] = (cardTypeCount[type] || 0) + 1;
        });
        
        if (cardTypeCount['RamChaal'] && cardTypeCount[CardType.Ram] >= 2) {
          context = "close to winning with Ram cards";
          emotion = 'excited';
        } else if (Object.values(cardTypeCount).some(count => (count as number) >= 3)) {
          context = "close to winning";
          emotion = 'excited';
        }
        
        // Try to generate dialogue
        try {
          const humanPlayerName = room.players.find(p => !p.isAI)?.name || 'opponent';
          const dialogue = await generateAIDialogue(aiPlayer.name, humanPlayerName, context, emotion);
          
          // Send AI dialogue as chat message
          const timestamp = new Date().toISOString();
          const id = nanoid();
          
          this.io.to(roomId).emit("chat_message", {
            id,
            sender: aiPlayer.name,
            content: dialogue,
            timestamp,
          });
        } catch (error) {
          log(`Error generating AI dialogue: ${error}`, "socket");
        }
        
        // Update game state for all players
        this.io.to(roomId).emit("game_state_update", room.getRoomState());
        
        // If there's a winner, emit game ended event
        if (room.winner) {
          // Try to generate game result commentary
          try {
            const commentary = await generateGameResultCommentary(
              room.winner,
              room.players,
              room.round
            );
            
            // Send commentary as system message
            const timestamp = new Date().toISOString();
            const id = nanoid();
            
            this.io.to(roomId).emit("chat_message", {
              id,
              sender: "GAME",
              content: commentary,
              timestamp,
            });
          } catch (error) {
            log(`Error generating game result commentary: ${error}`, "socket");
          }
          
          this.io.to(roomId).emit("game_ended", room.winner);
          
          // Record game results
          this.recordGameResult(roomId);
        } 
        // Check if next player is also AI
        else {
          const nextPlayer = room.players.find(p => p.id === nextPlayerId);
          if (nextPlayer && nextPlayer.isAI) {
            // Schedule next AI turn after a delay
            setTimeout(() => {
              this.handleAITurn(roomId, nextPlayerId);
            }, 2000);
          }
        }
      } catch (error) {
        log(`Error handling AI turn: ${error}`, "socket");
      }
    }, 1500);
  }
  

}
