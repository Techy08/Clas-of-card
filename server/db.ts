import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../shared/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { log } from './vite';

const { Client } = pg;

// Create a database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Connect to the database
async function connect() {
  try {
    await client.connect();
    log('Connected to PostgreSQL database', 'db');
  } catch (error) {
    log(`Error connecting to PostgreSQL: ${error}`, 'db');
  }
}

// Initialize database connection
connect();

// Create Drizzle ORM instance
export const db = drizzle(client, { schema });

// User operations
export async function createUser(username: string, password: string, displayName?: string) {
  try {
    const [user] = await db.insert(schema.users)
      .values({
        username,
        password, // Note: In a real app, this should be hashed
        displayName: displayName || username,
      })
      .returning();
    
    // Create initial player stats record
    await db.insert(schema.playerStats)
      .values({
        userId: user.id,
      });
    
    return user;
  } catch (error) {
    log(`Error creating user: ${error}`, 'db');
    throw error;
  }
}

export async function getUserByUsername(username: string) {
  try {
    const users = await db.select()
      .from(schema.users)
      .where(eq(schema.users.username, username));
    
    return users[0] || null;
  } catch (error) {
    log(`Error finding user: ${error}`, 'db');
    return null;
  }
}

// Player stats operations
export async function getPlayerStats(userId: number) {
  try {
    const stats = await db.select()
      .from(schema.playerStats)
      .where(eq(schema.playerStats.userId, userId));
    
    return stats[0] || null;
  } catch (error) {
    log(`Error getting player stats: ${error}`, 'db');
    return null;
  }
}

export async function updatePlayerStats(
  userId: number, 
  position: number,
  isWinner: boolean
) {
  try {
    const currentStats = await getPlayerStats(userId);
    
    if (!currentStats) {
      log(`Player stats not found for user ${userId}`, 'db');
      return null;
    }
    
    // Calculate new stats
    const wins = isWinner ? currentStats.wins + 1 : currentStats.wins;
    const losses = !isWinner ? currentStats.losses + 1 : currentStats.losses;
    const gamesPlayed = currentStats.gamesPlayed + 1;
    const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;
    
    // Update best position (lower is better, 1 is best)
    const bestPosition = position < currentStats.bestPosition 
      ? position 
      : currentStats.bestPosition;
    
    // Update stats in database
    const [updatedStats] = await db.update(schema.playerStats)
      .set({
        wins,
        losses,
        gamesPlayed,
        winRate,
        bestPosition,
        lastPlayed: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.playerStats.userId, userId))
      .returning();
    
    return updatedStats;
  } catch (error) {
    log(`Error updating player stats: ${error}`, 'db');
    return null;
  }
}

// Game history operations
export async function recordGameHistory(
  gameId: string,
  playerCount: number,
  winnerId?: number
) {
  try {
    const [game] = await db.insert(schema.gameHistory)
      .values({
        gameId,
        playerCount,
        winnerId,
        startedAt: new Date(),
      })
      .returning();
    
    return game;
  } catch (error) {
    log(`Error recording game history: ${error}`, 'db');
    return null;
  }
}

export async function completeGameHistory(gameId: string, winnerId?: number) {
  try {
    // Find the game by gameId
    const games = await db.select()
      .from(schema.gameHistory)
      .where(eq(schema.gameHistory.gameId, gameId));
    
    if (games.length === 0) {
      log(`Game not found: ${gameId}`, 'db');
      return null;
    }
    
    // Update the game record
    const [updatedGame] = await db.update(schema.gameHistory)
      .set({
        endedAt: new Date(),
        winnerId,
      })
      .where(eq(schema.gameHistory.gameId, gameId))
      .returning();
    
    return updatedGame;
  } catch (error) {
    log(`Error completing game history: ${error}`, 'db');
    return null;
  }
}

export async function recordGameParticipant(
  gameHistoryId: number,
  userId: number | null,
  position: number,
  isAI: boolean = false,
  aiName?: string
) {
  try {
    const [participant] = await db.insert(schema.gameParticipants)
      .values({
        gameId: gameHistoryId,
        userId,
        position,
        isAI,
        aiName,
      })
      .returning();
    
    return participant;
  } catch (error) {
    log(`Error recording game participant: ${error}`, 'db');
    return null;
  }
}

// Leaderboard operations
export async function getLeaderboard(sortBy: string = 'winRate', limit: number = 10) {
  try {
    // Join users and player_stats to get complete leaderboard data
    const results = await db.select({
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      wins: schema.playerStats.wins,
      losses: schema.playerStats.losses,
      gamesPlayed: schema.playerStats.gamesPlayed,
      winRate: schema.playerStats.winRate,
      bestPosition: schema.playerStats.bestPosition,
    })
    .from(schema.users)
    .innerJoin(
      schema.playerStats,
      eq(schema.users.id, schema.playerStats.userId)
    )
    .orderBy(
      sortBy === 'wins' 
        ? desc(schema.playerStats.wins)
        : sortBy === 'gamesPlayed'
          ? desc(schema.playerStats.gamesPlayed)
          : sortBy === 'bestPosition'
            ? asc(schema.playerStats.bestPosition)
            : desc(schema.playerStats.winRate)
    )
    .limit(limit);
    
    return results as schema.LeaderboardEntry[];
  } catch (error) {
    log(`Error fetching leaderboard: ${error}`, 'db');
    return [];
  }
}

// Initialize database tables if they don't exist
export async function initializeDatabase() {
  try {
    // Check if users table exists and has at least one user
    const usersExist = await db.select().from(schema.users).limit(1);
    
    if (usersExist.length === 0) {
      // Create a sample user if none exists
      await createUser('sample_user', 'password123', 'Sample User');
      log('Created initial sample user', 'db');
    }
    
    log('Database initialized successfully', 'db');
  } catch (error) {
    log(`Error initializing database: ${error}`, 'db');
  }
}