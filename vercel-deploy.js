// This is a helper script for Vercel deployment
// Run this script before deploying to Vercel

const fs = require('fs');
const path = require('path');

console.log('Setting up for Vercel deployment...');

// 1. Check the vercel.json file exists
if (!fs.existsSync(path.join(__dirname, 'vercel.json'))) {
  console.error('vercel.json not found! Make sure it exists before deploying.');
  process.exit(1);
}

// 2. Make sure the client build directory exists
const clientBuildDir = path.join(__dirname, 'client', 'dist');
if (!fs.existsSync(clientBuildDir)) {
  console.log('Creating client build directory...');
  try {
    fs.mkdirSync(clientBuildDir, { recursive: true });
  } catch (error) {
    console.error('Error creating client build directory:', error);
    process.exit(1);
  }
}

// 3. Make sure the server build directory exists
const serverBuildDir = path.join(__dirname, 'dist', 'server');
if (!fs.existsSync(serverBuildDir)) {
  console.log('Creating server build directory...');
  try {
    fs.mkdirSync(serverBuildDir, { recursive: true });
  } catch (error) {
    console.error('Error creating server build directory:', error);
    process.exit(1);
  }
}

// 4. Show deployment instructions
console.log(`
=============================
Vercel Deployment Instructions
=============================

1. Make sure you've run the build command:
   npm run build

2. Make sure you have the Vercel CLI installed:
   npm install -g vercel

3. Deploy using the Vercel CLI:
   vercel

4. Configure the following environment variables in Vercel:
   - DATABASE_URL (required for database connection)
   - GEMINI_API_KEY (required for AI functions)
   - NODE_ENV=production

5. If you need to link to an existing project, run:
   vercel link

Good luck with your deployment!
`);

console.log('Vercel deployment setup complete!');