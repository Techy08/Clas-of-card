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
    // If socket already exists, don't recreate
    if (get().socket) {
      return;
    }
    
    // Create socket connection
    const socket = io("", {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });
    
    // Set up event listeners
    socket.on("connect", () => {
      console.log("Socket connected");
      set({ isConnected: true });
    });
    
    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      set({ isConnected: false });
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
