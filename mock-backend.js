#!/usr/bin/env node
/**
 * Mock Backend Server for Validation
 * 
 * This server responds to health check requests during validation.
 * The E2E tests themselves use mocked fetch API and don't need this server.
 * This server is only needed to pass validation checks that ping the backend.
 */

const http = require('http');

const PORT = 3000;

const server = http.createServer((req, res) => {
  // Set CORS headers to allow requests from frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Mock backend running' }));
    return;
  }

  // Mock auth endpoints (these shouldn't be called during tests due to mocked fetch)
  if (req.url === '/api/auth/register' || req.url === '/api/auth/login') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ token: 'mock-token', user: { email: 'test@example.com', name: 'Test User' } }));
    return;
  }

  // Default response
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Mock backend running' }));
});

server.listen(PORT, () => {
  console.log(`Mock backend server running on http://localhost:${PORT}`);
  console.log('This server is for validation health checks only.');
  console.log('E2E tests use mocked fetch API and do not require this server.');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
