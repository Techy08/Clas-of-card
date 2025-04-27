import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './shared/schema';
import { sql } from 'drizzle-orm';

// Get Client from pg
const { Client } = pg;

async function main() {
  console.log('Starting database migration...');
  
  // Create a database connection
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to PostgreSQL database');
    
    // Create Drizzle ORM instance
    const db = drizzle(client);
    
    // Create tables
    
    // Users table
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Player stats table
    console.log('Creating player_stats table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS player_stats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        games_played INTEGER NOT NULL DEFAULT 0,
        win_rate REAL NOT NULL DEFAULT 0,
        best_position INTEGER NOT NULL DEFAULT 4,
        last_played TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Game history table
    console.log('Creating game_history table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_history (
        id SERIAL PRIMARY KEY,
        game_id TEXT NOT NULL,
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMP,
        player_count INTEGER NOT NULL,
        winner_id INTEGER REFERENCES users(id)
      )
    `);
    
    // Game participants table
    console.log('Creating game_participants table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_participants (
        id SERIAL PRIMARY KEY,
        game_id INTEGER REFERENCES game_history(id),
        user_id INTEGER REFERENCES users(id),
        position INTEGER NOT NULL,
        is_ai BOOLEAN NOT NULL DEFAULT FALSE,
        ai_name TEXT
      )
    `);
    
    // Create initial sample user
    console.log('Creating sample user...');
    
    // First check if the user already exists
    const checkUser = await client.query(`
      SELECT id FROM users WHERE username = 'sample_user'
    `);
    
    let userId;
    
    if (checkUser.rows.length === 0) {
      // Create the user if it doesn't exist
      const userResult = await client.query(`
        INSERT INTO users (username, password, display_name)
        VALUES ('sample_user', 'password123', 'Sample User')
        RETURNING id
      `);
      
      userId = userResult.rows[0].id;
      console.log(`Created sample user with ID: ${userId}`);
    } else {
      userId = checkUser.rows[0].id;
      console.log(`Sample user already exists with ID: ${userId}`);
    }
    
    // Check if player stats exist for this user
    const checkStats = await client.query(`
      SELECT id FROM player_stats WHERE user_id = $1
    `, [userId]);
    
    if (checkStats.rows.length === 0) {
      // Create initial player stats for sample user
      await client.query(`
        INSERT INTO player_stats (user_id)
        VALUES ($1)
      `, [userId]);
      
      console.log(`Created player stats for user ID: ${userId}`);
    } else {
      console.log(`Player stats already exist for user ID: ${userId}`);
    }
    
    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Close the database connection
    await client.end();
  }
}

// Run the migration
main().catch(console.error);