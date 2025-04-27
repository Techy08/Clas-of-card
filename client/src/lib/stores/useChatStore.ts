import { create } from "zustand";

export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isFromMe: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  
  // Add message to chat
  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },
  
  // Clear all messages
  clearMessages: () => {
    set({ messages: [] });
  },
  
  // Reset chat state
  resetChat: () => {
    set({ messages: [] });
  },
}));
