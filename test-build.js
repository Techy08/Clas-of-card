// Test the production build locally before deployment
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('Testing production build locally...');

// Check if the build exists
const clientBuildDir = path.join(__dirname, 'client', 'dist');
const serverBuildDir = path.join(__dirname, 'dist', 'server');

if (!fs.existsSync(clientBuildDir)) {
  console.error('Client build not found! Please run the build command first.');
  process.exit(1);
}

if (!fs.existsSync(path.join(serverBuildDir, 'index.js'))) {
  console.error('Server build not found! Please run the build command first.');
  process.exit(1);
}

console.log('Build exists, starting test server...');

// Set production environment
process.env.NODE_ENV = 'production';

// Run the server
const serverProcess = exec('node dist/server/index.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error running server: ${error.message}`);
    return;
  }
  console.log(stdout);
  console.error(stderr);
});

// Log server output
serverProcess.stdout.on('data', (data) => {
  console.log(data.toString().trim());
});

serverProcess.stderr.on('data', (data) => {
  console.error(data.toString().trim());
});

// Test server connection after a short delay
setTimeout(() => {
  console.log('Testing server connection...');
  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/',
    method: 'GET'
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Server responded with status: ${res.statusCode}`);
      if (res.statusCode === 200) {
        console.log('Server is running correctly!');
        console.log('You can now test the application at: http://localhost:5000');
        console.log('\nPress Ctrl+C to stop the server when done testing.');
      } else {
        console.error('Server returned an unexpected status code.');
        serverProcess.kill();
        process.exit(1);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error(`Error connecting to server: ${error.message}`);
    console.error('Make sure the server is running and listening on port 5000.');
    serverProcess.kill();
    process.exit(1);
  });
  
  req.end();
}, 5000);

// Handle termination signals
process.on('SIGINT', () => {
  console.log('Stopping test server...');
  serverProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Stopping test server...');
  serverProcess.kill();
  process.exit(0);
});