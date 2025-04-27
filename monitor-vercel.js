// Monitoring script for deployed Vercel applications
// This script helps check the health of your deployed app

const https = require('https');
const readline = require('readline');

// Create readline interface for CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Default URL to monitor (replace with your Vercel deployment URL)
let deploymentUrl = 'https://your-app-name.vercel.app';

console.log('==================================');
console.log('Vercel Deployment Monitoring Tool');
console.log('==================================\n');

// Ask for the deployment URL
rl.question(`Enter your Vercel deployment URL [${deploymentUrl}]: `, (answer) => {
  if (answer.trim()) {
    deploymentUrl = answer.trim();
    if (!deploymentUrl.startsWith('https://')) {
      deploymentUrl = 'https://' + deploymentUrl;
    }
  }
  
  console.log(`\nMonitoring: ${deploymentUrl}\n`);
  
  // Start monitoring
  runHealthCheck();
  
  // Setup interval for regular checks
  const intervalId = setInterval(runHealthCheck, 60000); // Check every minute
  
  // Handle user commands
  rl.on('line', (input) => {
    switch (input.trim().toLowerCase()) {
      case 'exit':
      case 'quit':
      case 'q':
        console.log('Stopping monitoring...');
        clearInterval(intervalId);
        rl.close();
        break;
      case 'check':
      case 'c':
        console.log('Running manual health check...');
        runHealthCheck();
        break;
      case 'help':
      case 'h':
        showHelp();
        break;
      default:
        console.log('Unknown command. Type "help" for available commands.');
    }
  });
  
  // Show initial help
  showHelp();
});

// Function to show help information
function showHelp() {
  console.log('\nAvailable commands:');
  console.log('  check (c) - Run a manual health check');
  console.log('  help (h)  - Show this help information');
  console.log('  exit (q)  - Exit the monitoring tool');
  console.log('\nMonitoring will automatically run every minute.\n');
}

// Function to check the health of the deployed application
function runHealthCheck() {
  const startTime = Date.now();
  
  // Test the base URL
  checkEndpoint(deploymentUrl, '/', 'Base URL');
  
  // Test the API endpoint
  checkEndpoint(deploymentUrl, '/api/leaderboard', 'API Endpoint');
  
  // Report timestamp
  const date = new Date();
  console.log(`\nLast check: ${date.toLocaleTimeString()} (${date.toLocaleDateString()})\n`);
}

// Function to check a specific endpoint
function checkEndpoint(baseUrl, path, label) {
  const startTime = Date.now();
  const url = baseUrl + path;
  
  const req = https.request(url, { method: 'GET' }, (res) => {
    const responseTime = Date.now() - startTime;
    
    let statusColor = '\x1b[32m'; // Green for 200s
    if (res.statusCode >= 300 && res.statusCode < 400) {
      statusColor = '\x1b[33m'; // Yellow for 300s
    } else if (res.statusCode >= 400) {
      statusColor = '\x1b[31m'; // Red for 400s/500s
    }
    
    console.log(`${label}: ${statusColor}${res.statusCode}\x1b[0m (${responseTime}ms)`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode >= 400) {
        console.log(`Error response: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error(`\x1b[31mError checking ${label}: ${error.message}\x1b[0m`);
  });
  
  req.end();
}

// Handle termination
process.on('SIGINT', () => {
  console.log('\nStopping monitoring...');
  rl.close();
});