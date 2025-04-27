import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced CORS middleware optimized for Vercel deployment
app.use((req, res, next) => {
  // Get origin from request
  const origin = req.headers.origin;
  
  // Allowed origins - this includes the Vercel deployment URLs
  const allowedOrigins = [
    // Local development
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5173',
    
    // Vercel deployments (both preview and production)
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : null,
    
    // Custom domain if configured in Vercel
    'https://ramsita-clash-of-cards.vercel.app',
    
    // Allow Vercel preview deployments
    /https:\/\/.*\.vercel\.app$/
  ].filter(Boolean);
  
  // Check if the request origin is allowed
  if (origin) {
    // Check exact matches first
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } 
    // Check regex patterns for preview deployments
    else if (allowedOrigins.some(allowed => 
      typeof allowed === 'object' && allowed instanceof RegExp && allowed.test(origin)
    )) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    else {
      // In production, don't default to '*' for better security
      if (process.env.NODE_ENV === 'production') {
        log(`Blocked request from unauthorized origin: ${origin}`, 'cors');
      } else {
        // In development, allow all origins as a fallback
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
    }
  } else {
    // No origin header - likely a non-browser client or same-origin request
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  // Set enhanced CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours - reduce preflight requests
  
  // Handle preflight requests efficiently
  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // 204 is more appropriate for preflight
  }
  
  next();
});

// Initialize database
initializeDatabase().catch(err => {
  log(`Failed to initialize database: ${err}`, "db");
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log the error for debugging
    log(`Server error: ${err.message || 'Unknown error'} (${err.code || 'no code'})`, 'express');
    
    // Handle database connection errors specially
    if (err.code && (err.code === '57P01' || err.code.startsWith('08'))) {
      // Database connection errors (57P01, 08XXX, etc.)
      log('Database connection error detected. The game will attempt to reconnect automatically.', 'express');
      
      return res.status(503).json({ 
        message: "Database service temporarily unavailable. Please try again shortly.",
        code: err.code
      });
    }

    // Send error response but don't throw it again (preventing server crash)
    res.status(status).json({ message, code: err.code });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
  
  // Add better error handling for the server
  server.on('error', (error) => {
    log(`Server error: ${error.message}`, 'express');
    
    // Attempt recovery if it's a connection-related issue
    if ((error as any).code === 'ECONNRESET' || (error as any).code === 'EPIPE') {
      log('Connection reset detected, this is normal for client disconnections', 'express');
    }
  });
  
  // Add graceful shutdown handlers
  const gracefulShutdown = () => {
    log('Shutting down gracefully...', 'express');
    server.close(() => {
      log('HTTP server closed', 'express');
      process.exit(0);
    });
    
    // Force close if not closed within 10 seconds
    setTimeout(() => {
      log('Forcing shutdown after timeout', 'express');
      process.exit(1);
    }, 10000);
  };
  
  // Listen for termination signals
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
})();
