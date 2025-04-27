import { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import { GameRoom } from "./gameRoom";
import { GameState } from "../shared/gameTypes";
import { log } from "./vite";

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
      socket.on("create_room", ({ playerName }, callback) => {
        try {
          const roomId = nanoid(6).toUpperCase();
          this.rooms[roomId] = new GameRoom(roomId);
          
          const player = this.rooms[roomId].addPlayer(playerName, socket.id);
          socket.join(roomId);
          
          log(`Room created: ${roomId} by ${playerName}`, "socket");
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
}
