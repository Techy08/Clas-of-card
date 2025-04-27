import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playerStats = pgTable("player_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  wins: integer("wins").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  gamesPlayed: integer("games_played").default(0).notNull(),
  winRate: real("win_rate").default(0).notNull(),
  bestPosition: integer("best_position").default(4).notNull(),
  lastPlayed: timestamp("last_played"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const gameHistory = pgTable("game_history", {
  id: serial("id").primaryKey(),
  gameId: text("game_id").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  playerCount: integer("player_count").notNull(),
  winnerId: integer("winner_id").references(() => users.id),
});

export const gameParticipants = pgTable("game_participants", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => gameHistory.id),
  userId: integer("user_id").references(() => users.id),
  position: integer("position").notNull(), // 1 = 1st place, 2 = 2nd place, etc.
  isAI: boolean("is_ai").default(false).notNull(),
  aiName: text("ai_name"),
});

// Schema for inserting a new user
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
});

// Schema for creating a new player stats record
export const insertPlayerStatsSchema = createInsertSchema(playerStats).pick({
  userId: true,
});

// Schema for game history record
export const insertGameHistorySchema = createInsertSchema(gameHistory).pick({
  gameId: true,
  playerCount: true,
});

// Schema for game participant record
export const insertGameParticipantSchema = createInsertSchema(gameParticipants).pick({
  gameId: true,
  userId: true,
  position: true,
  isAI: true,
  aiName: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type PlayerStats = typeof playerStats.$inferSelect;
export type GameHistory = typeof gameHistory.$inferSelect;
export type GameParticipant = typeof gameParticipants.$inferSelect;

// Leaderboard entry type (for frontend display)
export interface LeaderboardEntry {
  id: number;
  username: string;
  displayName: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
  bestPosition: number;
}
