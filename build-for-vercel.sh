#!/bin/bash

# Build script for Vercel deployment
# This script will build both the client and server code

echo "========================================"
echo "Building RamSita: Clash of Cards for Vercel deployment"
echo "========================================"

# Build the client
echo -e "\n1. Building client code..."
cd client
npm run build
if [ $? -ne 0 ]; then
  echo "Error: Client build failed"
  exit 1
fi
cd ..
echo "Client build successful!"

# Build the server
echo -e "\n2. Building server code..."
node build-server.js
if [ $? -ne 0 ]; then
  echo "Error: Server build failed"
  exit 1
fi
echo "Server build successful!"

# Create required directories for Vercel
echo -e "\n3. Preparing directory structure for Vercel..."
mkdir -p dist/server

# Check if build was successful
if [ -d "./client/dist" ] && [ -f "./dist/server/index.js" ]; then
  echo -e "\n========================================"
  echo "Build successful! Your app is ready for Vercel deployment."
  echo "========================================"
  echo -e "\nTo test your build locally, run:"
  echo "node test-build.js"
  echo -e "\nTo deploy to Vercel, run:"
  echo "vercel"
  echo -e "\nMake sure to set these environment variables in Vercel:"
  echo "- DATABASE_URL"
  echo "- GEMINI_API_KEY"
  echo "- NODE_ENV=production"
else
  echo -e "\nError: Build seems incomplete. Please check the logs above."
  exit 1
fi