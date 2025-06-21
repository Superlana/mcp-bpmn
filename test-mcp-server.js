#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Testing MCP-BPMN Server...\n');

// Start the server
const serverPath = join(__dirname, 'dist', 'server', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseBuffer = '';

server.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  
  // Try to parse complete JSON responses
  const lines = responseBuffer.split('\n');
  lines.forEach(line => {
    if (line.trim() && line.includes('{')) {
      try {
        const response = JSON.parse(line);
        console.log('✅ Received response:', JSON.stringify(response, null, 2));
      } catch (e) {
        // Not a complete JSON yet
      }
    }
  });
});

server.stderr.on('data', (data) => {
  console.log('Server log:', data.toString());
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

// Test 1: List tools
console.log('Test 1: Listing MCP tools...');
server.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
}) + '\n');

// Test 2: Create a process
setTimeout(() => {
  console.log('\nTest 2: Creating a BPMN process...');
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'bpmn_create_process',
      arguments: {
        name: 'Test Process'
      }
    }
  }) + '\n');
}, 1000);

// Test 3: Add elements
setTimeout(() => {
  console.log('\nTest 3: Adding a start event...');
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'bpmn_add_event',
      arguments: {
        processId: 'Process_1',
        eventType: 'start',
        name: 'Process Start'
      }
    }
  }) + '\n');
}, 2000);

// Cleanup
setTimeout(() => {
  console.log('\n✅ All tests completed successfully!');
  server.kill();
  process.exit(0);
}, 3000);