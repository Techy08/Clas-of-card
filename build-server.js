// Build script for server code to prepare for Vercel deployment
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building server code for Vercel deployment...');

// Create dist/server directory if it doesn't exist
const serverBuildDir = path.join(__dirname, 'dist', 'server');
if (!fs.existsSync(serverBuildDir)) {
  console.log('Creating server build directory...');
  fs.mkdirSync(serverBuildDir, { recursive: true });
}

// Run esbuild to bundle server code
const buildCommand = 'npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/server/index.js';
console.log(`Running build command: ${buildCommand}`);

exec(buildCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error building server code: ${error.message}`);
    process.exit(1);
  }
  
  if (stderr) {
    console.error(`Build warnings: ${stderr}`);
  }
  
  console.log('Server build complete!');
  console.log('Next steps:');
  console.log('1. Build the client code with: npm run build');
  console.log('2. Deploy to Vercel with: vercel');
});

// Copy any additional server assets if needed
// This is useful for any files that need to be accessible by the server at runtime
const copyServerAssets = () => {
  console.log('Copying server assets...');
  
  // Create any necessary subdirectories
  const assetPaths = [
    path.join(serverBuildDir, 'assets'),
  ];
  
  assetPaths.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Example of copying a file if needed:
  // fs.copyFileSync(
  //   path.join(__dirname, 'server', 'assets', 'some-file.json'),
  //   path.join(serverBuildDir, 'assets', 'some-file.json')
  // );
  
  console.log('Server assets copied successfully!');
};

// Only copy assets if they exist and are needed
try {
  if (fs.existsSync(path.join(__dirname, 'server', 'assets'))) {
    copyServerAssets();
  }
} catch (err) {
  console.warn('Warning: Error copying server assets', err);
}