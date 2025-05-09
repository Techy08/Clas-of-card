// Card types
export enum CardType {
  Ram = "Ram",
  Sita = "Sita",
  Lakshman = "Lakshman",
  Ravan = "Ravan",
}

// Card interface
export interface Card {
  id: number;
  type: CardType;
  isRamChaal: boolean;
}

// Player interface
export interface Player {
  id: number;
  name: string;
  hand: Card[];
  isAI?: boolean;
  winningSet: number[] | null;
  position?: number; // 1st, 2nd, 3rd (winners) or 4th (loser)
}

// Game state enum
export enum GameState {
  WAITING = "waiting",
  ACTIVE = "active",
  ENDED = "ended",
}

// Chat message interface
export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
}
