// Monitoring script for deployed RamSita: Clash of Cards game on Vercel
// This script helps check the health of your deployed app and tests critical endpoints

const https = require('https');
const readline = require('readline');
const { performance } = require('perf_hooks');

// Create readline interface for CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for output formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Default URL to monitor (replace with your Vercel deployment URL)
let deploymentUrl = 'https://ramsita-clash-of-cards.vercel.app';

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
  const startTime = performance.now();
  
  console.log(`\n${colors.bright}Running health check for RamSita: Clash of Cards${colors.reset}`);
  console.log(`${colors.dim}----------------------------------------------${colors.reset}`);
  
  // Test critical endpoints
  
  // 1. Main app (HTML delivery)
  checkEndpoint(deploymentUrl, '/', 'Frontend App');
  
  // 2. API endpoints
  checkEndpoint(deploymentUrl, '/api/leaderboard', 'Leaderboard API');
  
  // 3. Socket.IO endpoint (just checking if it responds, not actual connection)
  checkEndpoint(deploymentUrl, '/socket.io/', 'Socket.IO');
  
  // 4. Static assets (check a critical JS file)
  checkEndpoint(deploymentUrl, '/assets/index.js', 'Frontend Assets');
  
  // 5. Database-dependent API
  setTimeout(() => {
    checkEndpoint(deploymentUrl, '/api/users/123', 'Database API');
  }, 500); // Small delay to avoid rate limiting
  
  // Report total check time
  const totalTime = Math.round(performance.now() - startTime);
  const date = new Date();
  
  setTimeout(() => {
    console.log(`\n${colors.dim}Check completed in ${totalTime}ms${colors.reset}`);
    console.log(`${colors.dim}Last check: ${date.toLocaleTimeString()} (${date.toLocaleDateString()})${colors.reset}`);
    console.log(`${colors.dim}Type 'help' for available commands${colors.reset}\n`);
  }, 1000); // Give time for all checks to complete
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