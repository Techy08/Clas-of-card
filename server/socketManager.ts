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
  private playerSocketMap: Map<string, string> = new Map(); // Maps player socket ID to room ID
  private randomMatchQueue: Array<{socketId: string, playerName: string}> = []; // Queue for random matchmaking

  constructor(httpServer: any) {
    // Create the Socket.IO server with improved settings
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      // Enable better reconnection handling
      connectionStateRecovery: {
        // the backup duration of the sessions and the packets
        maxDisconnectionDuration: 2 * 60 * 1000,
        // whether to skip middlewares upon successful recovery
        skipMiddlewares: true,
      }
    });
    
    this.initialize();
  }

  // Initialize socket handlers
  private initialize(): void {
    // Configure Socket.IO for better reliability (if possible)
    try {
      if (this.io.engine) {
        this.io.engine.pingTimeout = 30000; // 30 seconds
        this.io.engine.pingInterval = 10000; // 10 seconds
      }
    } catch (error) {
      console.error("Could not configure Socket.IO engine settings:", error);
    }
    
    this.io.on("connection", (socket: Socket) => {
      // Ensure socket.id is available and log it
      const socketId = socket.id || 'unknown-id';
      log(`Client connected: ${socketId}`, "socket");

      // Create a new room
      socket.on("create_room", ({ playerName, withAI = false }, callback) => {
        try {
          const roomId = nanoid(6).toUpperCase();
          this.rooms[roomId] = new GameRoom(roomId);
          
          const player = this.rooms[roomId].addPlayer(playerName, socket.id);
          socket.join(roomId);
          
          // If AI players are requested, add them
          if (withAI) {
            // Add 3 AI players with specific names as requested
            this.rooms[roomId].addAIPlayer("R.1");
            this.rooms[roomId].addAIPlayer("P10");
            this.rooms[roomId].addAIPlayer("R.0");
            
            // No need to update names - they're fixed
            log(`Added AI players with names R.1, P10, and R.0 to room ${roomId}`, "socket");
            
            // Send updated state to the player
            this.io.to(roomId).emit("game_state_update", this.rooms[roomId].getRoomState());
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

      // Rejoin room (handle reconnections)
      socket.on("rejoin_room", ({ roomId, playerName }, callback) => {
        try {
          // Check if room exists
          if (!this.rooms[roomId]) {
            callback({ success: false, error: "Room not found" });
            return;
          }
          
          // Find if player was already in the room
          const existingPlayerIndex = this.rooms[roomId].players.findIndex(p => 
            p.name === playerName && (!p.socketId || p.socketId === socket.id)
          );
          
          if (existingPlayerIndex >= 0) {
            // Update player's socket ID
            this.rooms[roomId].players[existingPlayerIndex].socketId = socket.id;
            
            // Join the socket to the room
            socket.join(roomId);
            
            // Map socket ID to room ID
            this.playerSocketMap.set(socket.id, roomId);
            
            // Send current game state to the player
            socket.emit("game_state_update", this.rooms[roomId].getRoomState());
            
            log(`Player ${playerName} rejoined room ${roomId}`, "socket");
            callback({ success: true });
          } else {
            // If player was not found and room has space, add as a new player
            if (this.rooms[roomId].players.length < 4) {
              const player = this.rooms[roomId].addPlayer(playerName, socket.id);
              socket.join(roomId);
              
              this.playerSocketMap.set(socket.id, roomId);
              socket.to(roomId).emit("player_joined", player);
              socket.emit("game_state_update", this.rooms[roomId].getRoomState());
              
              log(`Player ${playerName} joined room ${roomId} as new player after failed rejoin attempt`, "socket");
              callback({ success: true });
            } else {
              callback({ success: false, error: "Room is full" });
            }
          }
        } catch (error) {
          log(`Error rejoining room: ${error}`, "socket");
          callback({ success: false, error: "Failed to rejoin room" });
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
            
            // If the game is over, emit game ended event
            if (this.rooms[roomId].state === GameState.ENDED) {
              this.io.to(roomId).emit("game_ended", {
                winner: this.rooms[roomId].winner,
                winningPlayers: this.rooms[roomId].winningPlayers,
                finishedPositions: this.rooms[roomId].finishedPositions
              });
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

      // Join random match (enhanced version with AI fill)
      socket.on("join_random_match", ({ playerName }, callback) => {
        try {
          log(`Player ${playerName} joining random match queue`, "socket");
          
          // Check if player is already in a room
          const existingRoomId = this.findRoomIdBySocket(socket.id);
          if (existingRoomId) {
            callback({ success: true, status: "already_joined", roomId: existingRoomId });
            return;
          }
          
          // Add player to random match queue
          this.randomMatchQueue.push({ socketId: socket.id, playerName });
          
          // Check if we have enough players to start a game (4)
          if (this.randomMatchQueue.length >= 4) {
            this.createRandomMatch();
          } else {
            // Tell the player they're waiting
            callback({ success: true, status: "waiting", position: this.randomMatchQueue.length });
            
            // After a short timeout, fill with AI players if needed
            setTimeout(() => {
              // If player is still in queue (hasn't been assigned to a game yet)
              if (this.randomMatchQueue.some(p => p.socketId === socket.id)) {
                this.fillRandomMatchWithAI();
              }
            }, 10000); // Wait 10 seconds before adding AI players
          }
        } catch (error) {
          log(`Error joining random match: ${error}`, "socket");
          callback({ success: false, error: "Failed to join random match" });
        }
      });

      // Disconnect
      socket.on("disconnect", (reason) => {
        log(`Client disconnected: ${socket.id}, reason: ${reason}`, "socket");
        
        // Remove from random match waiting list
        const waitingIndex = this.waitingForRandomMatch.indexOf(socket.id);
        if (waitingIndex !== -1) {
          this.waitingForRandomMatch.splice(waitingIndex, 1);
        }
        
        // Remove from random match queue
        const queueIndex = this.randomMatchQueue.findIndex(p => p.socketId === socket.id);
        if (queueIndex !== -1) {
          this.randomMatchQueue.splice(queueIndex, 1);
          log(`Player removed from random match queue`, "socket");
        }
        
        // Find player's room
        const roomId = this.findRoomIdBySocket(socket.id);
        if (roomId && this.rooms[roomId]) {
          // Don't remove the player on disconnect but mark their socket as disconnected
          // This allows them to reconnect to the same game later
          const playerIndex = this.rooms[roomId].players.findIndex(p => p.socketId === socket.id);
          
          if (playerIndex !== -1) {
            const player = this.rooms[roomId].players[playerIndex];
            log(`${player.name} disconnected from room: ${roomId}, preserving player data for reconnection`, "socket");
            
            // Keep the player in the game but mark their socket as null
            // This allows them to reconnect when they come back
            this.rooms[roomId].players[playerIndex].socketId = null;
            
            // Notify other players
            socket.to(roomId).emit("player_disconnected", player.id);
            
            // Start a cleanup timer in case they don't come back
            setTimeout(() => {
              // Check if the player is still disconnected
              if (this.rooms[roomId] && 
                  this.rooms[roomId].players[playerIndex] && 
                  this.rooms[roomId].players[playerIndex].socketId === null) {
                
                // Now remove them permanently
                const removedPlayer = this.rooms[roomId].removePlayer(player.id.toString());
                
                if (removedPlayer) {
                  this.io.to(roomId).emit("player_left", removedPlayer.id);
                  log(`${removedPlayer.name} permanently removed from room ${roomId} after timeout`, "socket");
                  
                  // If room is empty (no human players), delete it
                  const humanPlayers = this.rooms[roomId].players.filter(p => p.socketId || p.socketId === null);
                  if (humanPlayers.length === 0) {
                    delete this.rooms[roomId];
                    log(`Room deleted: ${roomId}`, "socket");
                  }
                }
              }
            }, 60000); // 1 minute timeout to actually remove disconnected players
          }
          
          // Only remove from player socket map when disconnected
          if (this.playerSocketMap.has(socket.id)) {
            this.playerSocketMap.delete(socket.id);
          }
          
          // If game is active and some players left, add AI players to replace them
          if (this.rooms[roomId] && this.rooms[roomId].state === GameState.ACTIVE && this.rooms[roomId].players.length < 4) {
            // Fill empty slots with AI players
            const aiCount = 4 - this.rooms[roomId].players.length;
            const aiNames = ["R.1", "P10", "R.0"];
            
            for (let i = 0; i < aiCount; i++) {
              this.rooms[roomId].addAIPlayer(aiNames[i]);
            }
            
            log(`Added ${aiCount} AI players to room ${roomId} to replace disconnected players`, "socket");
            
            // Update all players
            this.io.to(roomId).emit("game_state_update", this.rooms[roomId].getRoomState());
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
      
      // Sort players by position (1st, 2nd, 3rd, 4th)
      const sortedPlayers = [...players].sort((a, b) => {
        // If both players have position property, sort by it
        if (a.position && b.position) {
          return a.position - b.position;
        }
        // Otherwise fall back to old logic (winner first)
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
  
  // Create a random match with players from the queue
  private createRandomMatch(): void {
    // Take 4 players from the queue
    const matchPlayers = this.randomMatchQueue.splice(0, 4);
    
    if (matchPlayers.length !== 4) {
      log('Error: Not enough players to create a match', 'socket');
      return;
    }
    
    // Create a new room
    const roomId = nanoid(6).toUpperCase();
    this.rooms[roomId] = new GameRoom(roomId);
    
    // Add players to the room
    for (const player of matchPlayers) {
      const socket = this.io.sockets.sockets.get(player.socketId);
      if (socket) {
        const newPlayer = this.rooms[roomId].addPlayer(player.playerName, player.socketId);
        socket.join(roomId);
        
        // Track the player's room
        this.playerSocketMap.set(player.socketId, roomId);
        
        // Notify player about the match
        socket.emit("random_match_found", { 
          success: true, 
          roomId,
          playerId: newPlayer.id
        });
      }
    }
    
    // Start the game immediately
    const gameState = this.rooms[roomId].startGame();
    
    // Emit game state to all players
    this.io.to(roomId).emit("game_state_update", this.rooms[roomId].getRoomState());
    
    log(`Random match created with room ID: ${roomId}`, 'socket');
    
    // Handle AI turns if necessary
    const startingPlayer = this.rooms[roomId].players.find(p => p.id === gameState.startPlayerId);
    if (startingPlayer && startingPlayer.isAI) {
      setTimeout(() => {
        this.handleAITurn(roomId, gameState.startPlayerId);
      }, 2000);
    }
  }
  
  // Fill a match with AI players when not enough human players
  private fillRandomMatchWithAI(): void {
    // If we have at least one player in queue, create a match with AI players
    if (this.randomMatchQueue.length > 0) {
      // Create a new room
      const roomId = nanoid(6).toUpperCase();
      this.rooms[roomId] = new GameRoom(roomId);
      
      // Take all waiting players (up to 3)
      const humanPlayers = this.randomMatchQueue.splice(0, 3);
      log(`Creating match with ${humanPlayers.length} human players and filling with AI`, 'socket');
      
      // Add human players to room
      for (const player of humanPlayers) {
        const socket = this.io.sockets.sockets.get(player.socketId);
        if (socket) {
          const newPlayer = this.rooms[roomId].addPlayer(player.playerName, player.socketId);
          socket.join(roomId);
          
          // Track the player's room
          this.playerSocketMap.set(player.socketId, roomId);
          
          // Notify player about the match
          socket.emit("random_match_found", { 
            success: true, 
            roomId,
            playerId: newPlayer.id,
            withAI: true
          });
        }
      }
      
      // Fill remaining slots with AI players (need 4 total)
      const aiPlayerCount = 4 - humanPlayers.length;
      const aiNames = ["R.1", "P10", "R.0"];
      
      for (let i = 0; i < aiPlayerCount; i++) {
        this.rooms[roomId].addAIPlayer(aiNames[i]);
      }
      
      // Start the game immediately
      const gameState = this.rooms[roomId].startGame();
      
      // Emit game state to all players
      this.io.to(roomId).emit("game_state_update", this.rooms[roomId].getRoomState());
      
      log(`Match created with ${humanPlayers.length} humans and ${aiPlayerCount} AI with room ID: ${roomId}`, 'socket');
      
      // Handle AI turns if necessary
      const startingPlayer = this.rooms[roomId].players.find(p => p.id === gameState.startPlayerId);
      if (startingPlayer && startingPlayer.isAI) {
        setTimeout(() => {
          this.handleAITurn(roomId, gameState.startPlayerId);
        }, 2000);
      }
    }
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
