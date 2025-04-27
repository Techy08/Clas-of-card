import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { SocketManager } from "./socketManager";
import { 
  createUser, 
  getUserByUsername, 
  getLeaderboard,
  getPlayerStats,
  updatePlayerStats
} from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Initialize socket manager with improved connection handling
  const io = new SocketManager(httpServer);
  
  // API Routes - all prefixed with /api
  
  // Leaderboard endpoints
  app.get("/api/leaderboard", async (req: Request, res: Response) => {
    try {
      const sortBy = req.query.sortBy as string || "winRate";
      const limit = parseInt(req.query.limit as string || "10");
      
      const leaderboard = await getLeaderboard(sortBy, limit);
      res.json({ success: true, data: leaderboard });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch leaderboard" 
      });
    }
  });
  
  // User registration
  app.post("/api/users/register", async (req: Request, res: Response) => {
    try {
      const { username, password, displayName } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          error: "Username and password are required" 
        });
      }
      
      // Check if user already exists
      const existingUser = await getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ 
          success: false, 
          error: "Username already exists" 
        });
      }
      
      // Create new user
      const user = await createUser(username, password, displayName);
      
      res.status(201).json({ 
        success: true, 
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: "Failed to register user" 
      });
    }
  });
  
  // User login
  app.post("/api/users/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          error: "Username and password are required" 
        });
      }
      
      // Find user
      const user = await getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: "User not found" 
        });
      }
      
      // Check password (in a real app, you'd use bcrypt to compare hashed passwords)
      if (user.password !== password) {
        return res.status(401).json({ 
          success: false, 
          error: "Invalid password" 
        });
      }
      
      // Get player stats
      const stats = await getPlayerStats(user.id);
      
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName
        },
        stats
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: "Failed to login" 
      });
    }
  });
  
  // Get user profile
  app.get("/api/users/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Get player stats
      const stats = await getPlayerStats(userId);
      if (!stats) {
        return res.status(404).json({ 
          success: false, 
          error: "User not found" 
        });
      }
      
      res.json({ 
        success: true, 
        stats
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: "Failed to get user profile" 
      });
    }
  });

  return httpServer;
}
