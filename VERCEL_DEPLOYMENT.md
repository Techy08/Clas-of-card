# Deploying RamSita: Clash of Cards to Vercel

This guide will help you deploy the RamSita card game to Vercel's serverless platform.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed globally: `npm install -g vercel`
3. A PostgreSQL database (you can use Neon, Supabase, or any other PostgreSQL provider)

## Deployment Steps

### 1. Prepare Your Database

Make sure you have your PostgreSQL database ready and accessible from the internet. You'll need the following information:
- Database connection string (format: `postgresql://username:password@hostname:port/database`)

### 2. Set up Environment Variables

For the game to function correctly, you'll need to set up these environment variables in your Vercel project:

1. **Database Configuration**
   - `DATABASE_URL`: Your PostgreSQL connection string (format: `postgresql://username:password@hostname:port/database`)

2. **API Keys**
   - `GEMINI_API_KEY`: Your Google Gemini API key (required for AI player functionality)
   
   To get a Gemini API key:
   1. Go to https://makersuite.google.com/app/apikey
   2. Sign in with your Google account
   3. Click "Create API Key" and follow the prompts
   4. Copy the generated key to your Vercel environment variables

3. **Environment Settings**
   - `NODE_ENV`: Set to `production` for optimized performance
   - `VERCEL_URL`: Automatically set by Vercel during deployment

### 3. Prepare Your Codebase

The codebase has been optimized for Vercel deployment with:
- `vercel.json` configuration file with proper routing and headers
- Optimized Socket.IO settings for serverless environments
- Updated database connection pool settings for serverless functions
- Enhanced CORS settings for cross-origin requests
- Adaptive transport strategy for socket connections
- Audio compatibility improvements for cross-origin playback on CDNs
- Proper fallbacks for browser autoplay restrictions

#### Build Output Structure

For Vercel deployment, the build output structure is critical. Make sure your project builds into these directories:

- Client: `client/dist/` - Contains all frontend assets
- Server: `dist/server/index.js` - Contains the server code

#### Important Build Notes

You might need to manually adjust the build process if default Vercel build fails:

1. Client optimization:
   - Consider setting `"target": "es2018"` in your tsconfig.json for better browser compatibility
   - Ensure the React app builds with correct base path settings
   - Large Three.js scenes might need code-splitting to improve loading performance

2. Server optimization:
   - Keep serverless functions small (under 50MB uncompressed)
   - Use dynamic imports for large dependencies
   - Implement proper request timeout handling for serverless environment

### 3. Build and Deploy

This project includes custom build scripts to simplify the Vercel deployment process:

#### Using the Provided Build Scripts

1. Build both client and server with one command:
   ```bash
   ./build-for-vercel.sh
   ```

2. Test your production build locally:
   ```bash
   node test-build.js
   ```

3. Deploy to Vercel when ready:
   ```bash
   vercel
   ```

#### Option 1: Using the Vercel Dashboard

1. Push your code to a GitHub repository
2. Run the build script locally first: `./build-for-vercel.sh`
3. Log in to your Vercel dashboard
4. Click "New Project"
5. Import your GitHub repository
6. Configure the project:
   - Build Command: `./build-for-vercel.sh`
   - Output Directory: `client/dist` (for the client)
   - Add environment variables:
     - `DATABASE_URL`: Your PostgreSQL connection string
     - `GEMINI_API_KEY`: Your Google Gemini API key
     - `NODE_ENV`: Set to `production`
7. Click "Deploy"

#### Option 2: Using the Vercel CLI

1. Make sure you're in the project root directory
2. Run the build script: `./build-for-vercel.sh`
3. Run `vercel` to start the deployment process
4. Follow the prompts to configure your project
5. When asked about environment variables, add:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `NODE_ENV`: Set to `production`
6. Complete the deployment process

### 4. Verify and Monitor Deployment

#### Initial Verification

1. After deployment completes, Vercel will provide you with a URL (e.g., https://ramsita-clash-of-cards.vercel.app)
2. Visit the URL to verify that your application is working properly
3. Test the multiplayer functionality by opening the game in multiple browser tabs

#### Using the Monitoring Tool

This project includes a built-in monitoring tool to help you verify your deployment health:

```bash
# Basic health check
node monitor-vercel.js https://your-vercel-url.vercel.app

# Comprehensive check including WebSocket tests
node monitor-vercel.js https://your-vercel-url.vercel.app --full
```

The monitoring tool will check:
- Frontend HTML delivery
- Static assets loading
- API endpoint responses
- WebSocket connectivity (with --full flag)
- Response times and sizes
- DNS resolution

You can use this tool for:
- Initial deployment verification
- Ongoing health monitoring
- Troubleshooting connection issues
- Performance assessment

## Troubleshooting

### Audio Not Playing in Production

Audio autoplay is restricted in many browsers, especially on mobile devices. In the deployed version:

1. First-time users must interact with the page (click, tap, or keypress) before audio will play
2. If background music or sound effects don't play:
   - Check the browser console for autoplay policy errors
   - Ensure the user has interacted with the page at least once
   - The app includes built-in fallbacks that will attempt to play audio after user interaction
3. For iOS Safari and some mobile browsers:
   - Audio may only play after a direct user gesture (tap)
   - Background audio might be interrupted when the device is locked or the app goes to background
4. The "cross-origin" attribute has been added to audio elements for better CDN compatibility

### Socket.IO Connection Issues

If you experience issues with Socket.IO connections:

1. Check the browser console for connection errors
2. Verify that the Socket.IO path is correctly set to "/socket.io/"
3. Make sure CORS settings are allowing your client domain
4. If using WebSocket transport, ensure your Vercel project has WebSockets enabled:
   ```
   // In vercel.json
   {
     "functions": {
       "server/index.ts": {
         "memory": 512,
         "maxDuration": 30
       }
     }
   }
   ```
5. Try switching to polling transport by modifying the client socket connection options:
   ```typescript
   const socket = io(getServerUrl(), {
     transports: ["polling"], // Force polling only
     // other options...
   });
   ```
6. Serverless Socket.IO can experience cold start delays - the first connection might take longer
7. In Vercel, make sure your serverless function timeout is long enough:
   ```
   // In vercel.json
   {
     "functions": {
       "server/index.ts": {
         "maxDuration": 30 // 30 seconds timeout
       }
     }
   }
   ```
8. If using custom domains, make sure your Socket.IO client is connecting to the same domain:
   ```typescript
   // Always connect to current origin in production
   const getServerUrl = () => {
     if (window.location.hostname === 'localhost') {
       return ''; // Local development
     }
     return window.location.origin; // Same domain in production
   };
   ```

### Database Connection Issues

If you encounter database connection problems:

1. Verify your `DATABASE_URL` environment variable is correct
2. Ensure your database is accessible from Vercel's servers
3. Check if your database provider requires SSL connections
4. Check the database connection pool settings (you may need to reduce the max connections for serverless)
5. Make sure your database provider supports the serverless connection pattern (with frequent connections/disconnections)

### Deployment Build Failures

If your Vercel deployment fails during build:

1. Check if the build script has execute permission: `chmod +x build-for-vercel.sh`
2. Ensure the build script is compatible with Vercel's build environment
3. Look at the build logs for specific errors
4. Try building locally first and then deploying the pre-built assets

### Function Size Limitations

If you hit Vercel's function size limits:

1. Optimize server dependencies, remove unnecessary packages
2. Split large functions into multiple smaller functions
3. Use dynamic imports for large libraries
4. Consider using Vercel's Edge Functions for lightweight API routes

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Socket.IO with Vercel](https://socket.io/docs/v4/serverless-integration/)
- [PostgreSQL with Vercel](https://vercel.com/guides/deploying-a-postgresql-database)

## Support

If you encounter any issues with deployment, please create an issue in the repository or contact the development team.

---

Good luck with your deployment! Enjoy playing RamSita: Clash of Cards online!