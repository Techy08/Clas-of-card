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

### 2. Prepare Your Codebase

The codebase has been optimized for Vercel deployment with:
- `vercel.json` configuration file
- Optimized Socket.IO settings for serverless environments
- Updated database connection pool settings for serverless functions
- CORS settings for cross-origin requests

### 3. Deploy to Vercel

#### Option 1: Using the Vercel Dashboard

1. Push your code to a GitHub repository
2. Log in to your Vercel dashboard
3. Click "New Project"
4. Import your GitHub repository
5. Configure the project:
   - Build Command: `npm run build`
   - Output Directory: `client/dist` (for the client)
   - Add environment variables:
     - `DATABASE_URL`: Your PostgreSQL connection string
     - `GEMINI_API_KEY`: Your Google Gemini API key
     - `NODE_ENV`: Set to `production`
6. Click "Deploy"

#### Option 2: Using the Vercel CLI

1. Make sure you're in the project root directory
2. Run the build command: `npm run build`
3. Run `vercel` to start the deployment process
4. Follow the prompts to configure your project
5. When asked about environment variables, add:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `NODE_ENV`: Set to `production`
6. Complete the deployment process

### 4. Verify Deployment

1. After deployment completes, Vercel will provide you with a URL (e.g., https://ramsita-clash-of-cards.vercel.app)
2. Visit the URL to verify that your application is working properly
3. Test the multiplayer functionality by opening the game in multiple browser tabs

## Troubleshooting

### Socket.IO Connection Issues

If you experience issues with Socket.IO connections:

1. Check the browser console for connection errors
2. Verify that the Socket.IO path is correctly set to "/socket.io/"
3. Make sure CORS settings are allowing your client domain

### Database Connection Issues

If you encounter database connection problems:

1. Verify your `DATABASE_URL` environment variable is correct
2. Ensure your database is accessible from Vercel's servers
3. Check if your database provider requires SSL connections

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Socket.IO with Vercel](https://socket.io/docs/v4/serverless-integration/)
- [PostgreSQL with Vercel](https://vercel.com/guides/deploying-a-postgresql-database)

## Support

If you encounter any issues with deployment, please create an issue in the repository or contact the development team.

---

Good luck with your deployment! Enjoy playing RamSita: Clash of Cards online!