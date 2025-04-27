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
  socketId?: string;
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

// Room information for lobby
export interface RoomInfo {
  id: string;
  playerCount: number;
  state: GameState;
}

// Game state update for clients
export interface GameStateUpdate {
  roomId: string;
  players: Player[];
  currentTurn: number;
  state: GameState;
  round: number;
  winner: Player | null;
  winningPlayers?: Player[];  // All players who have won in order (1st, 2nd, 3rd)
  finishedPositions?: number[]; // Positions that have been determined
}
