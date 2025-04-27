import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { useGameStore } from "./useGameStore";
import { useChatStore } from "./useChatStore";

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  roomId: string | null;
  
  // Actions
  initializeSocket: () => void;
  disconnectSocket: () => void;
  createRoom: (playerName: string) => Promise<string>;
  createAIRoom: (playerName: string) => Promise<string>;
  joinRoom: (roomId: string, playerName: string) => Promise<void>;
  leaveRoom: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  roomId: null,
  
  // Initialize socket connection
  initializeSocket: () => {
    // If socket already exists, don't recreate - but check if it's connected
    const existingSocket = get().socket;
    if (existingSocket) {
      if (existingSocket.connected) {
        return; // Already connected, nothing to do
      } else {
        // Socket exists but is disconnected, let's try to reconnect it
        try {
          existingSocket.connect();
          return;
        } catch (error) {
          console.error("Failed to reconnect existing socket, creating new one:", error);
          // Continue to create a new socket
          existingSocket.removeAllListeners();
          existingSocket.disconnect();
        }
      }
    }
    
    // Get the server URL for Vercel deployment
    const getServerUrl = () => {
      // For local development
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return "";
      }
      
      // For Vercel production deployment
      return window.location.origin;
    };
    
    // Create socket connection with settings optimized for Vercel
    const socket = io(getServerUrl(), {
      path: "/socket.io/",
      transports: ["websocket", "polling"], // Fallback to polling if websocket fails
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000,
      forceNew: true,
    });
    
    // Set up event listeners
    socket.on("connect", () => {
      console.log("Socket connected successfully");
      set({ isConnected: true });
      
      // If we were in a room before disconnection, try to rejoin
      const { roomId } = get();
      const storedName = localStorage.getItem("playerName") || "Player";
      
      if (roomId) {
        console.log("Attempting to reconnect to room:", roomId);
        
        // Use a timeout to ensure server has time to register the connection
        setTimeout(() => {
          socket.emit("rejoin_room", { roomId, playerName: storedName }, (response: { success: boolean, error?: string }) => {
            if (response.success) {
              console.log("Successfully rejoined room:", roomId);
            } else {
              console.error("Failed to rejoin room:", response.error);
              // If rejoin fails, clear the roomId
              set({ roomId: null });
            }
          });
        }, 500);
      }
    });
    
    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected, reason:", reason);
      set({ isConnected: false });
      
      // If the server disconnected us, try to reconnect automatically
      if (reason === "io server disconnect") {
        console.log("Server disconnected us, attempting to reconnect...");
        socket.connect();
      }
    });
    
    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      
      // Try to switch transport if connection fails
      if (socket.io.engine?.transport.name === "websocket") {
        console.log("WebSocket transport failed, falling back to polling");
        socket.io.engine.transport.close();
      }
    });
    
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
    
    socket.io.on("reconnect", (attempt) => {
      console.log(`Socket reconnected after ${attempt} attempts`);
      
      // Update our connected state
      set({ isConnected: true });
    });
    
    socket.io.on("reconnect_attempt", (attempt) => {
      console.log(`Socket reconnection attempt: ${attempt}`);
    });
    
    socket.io.on("reconnect_error", (error) => {
      console.error("Socket reconnection error:", error);
    });
    
    socket.io.on("reconnect_failed", () => {
      console.error("Socket reconnection failed after all attempts");
      
      // Create a completely new socket connection as a last resort
      if (get().socket === socket) {
        console.log("Creating a new socket connection after reconnection failure");
        socket.removeAllListeners();
        socket.disconnect();
        
        // Slight delay before recreating
        setTimeout(() => {
          if (get().socket === socket) {
            // Only create new if this socket is still the current one
            set({ socket: null });
            get().initializeSocket();
          }
        }, 1000);
      }
    });
    
    // Game events
    socket.on("game_state_update", (gameState) => {
      useGameStore.getState().updateGameState(gameState);
    });
    
    socket.on("player_joined", (player) => {
      useGameStore.getState().addPlayer(player);
    });
    
    socket.on("player_left", (playerId) => {
      useGameStore.getState().removePlayer(playerId);
    });
    
    socket.on("turn_change", (playerId) => {
      useGameStore.getState().setCurrentTurn(playerId);
    });
    
    socket.on("game_started", () => {
      useGameStore.getState().startGame();
    });
    
    socket.on("game_ended", (gameEndData) => {
      const { winner, winningPlayers, finishedPositions } = gameEndData;
      useGameStore.getState().updateGameState({
        isGameOver: true,
        winner,
        winningPlayers: winningPlayers || [],
        finishedPositions: finishedPositions || []
      });
    });
    
    socket.on("receive_card", ({ playerId, card }) => {
      useGameStore.getState().receiveCard(playerId, card);
    });
    
    // Chat events
    socket.on("chat_message", (message) => {
      useChatStore.getState().addMessage({
        ...message,
        isFromMe: false,
      });
    });
    
    // Store socket
    set({ socket });
  },
  
  // Disconnect socket
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, roomId: null });
    }
  },
  
  // Create a new room
  createRoom: (playerName) => {
    const { socket } = get();
    
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error("Socket not initialized"));
        return;
      }
      
      socket.emit("create_room", { playerName }, (response: { success: boolean; roomId?: string; error?: string }) => {
        if (response.success && response.roomId) {
          set({ roomId: response.roomId });
          resolve(response.roomId);
        } else {
          reject(new Error(response.error || "Failed to create room"));
        }
      });
    });
  },
  
  // Create a new room with AI players
  createAIRoom: (playerName) => {
    const { socket } = get();
    
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error("Socket not initialized"));
        return;
      }
      
      socket.emit("create_room", { playerName, withAI: true }, (response: { success: boolean; roomId?: string; error?: string }) => {
        if (response.success && response.roomId) {
          set({ roomId: response.roomId });
          resolve(response.roomId);
        } else {
          reject(new Error(response.error || "Failed to create AI room"));
        }
      });
    });
  },
  
  // Join existing room
  joinRoom: (roomId, playerName) => {
    const { socket } = get();
    
    return new Promise<void>((resolve, reject) => {
      if (!socket) {
        reject(new Error("Socket not initialized"));
        return;
      }
      
      socket.emit("join_room", { roomId, playerName }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          set({ roomId });
          resolve();
        } else {
          reject(new Error(response.error || "Failed to join room"));
        }
      });
    });
  },
  
  // Leave current room
  leaveRoom: () => {
    const { socket, roomId } = get();
    
    if (socket && roomId) {
      socket.emit("leave_room", { roomId });
      set({ roomId: null });
    }
  },
}));
