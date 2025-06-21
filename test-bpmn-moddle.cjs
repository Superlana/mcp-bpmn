#!/usr/bin/env node

// Test creating a BPMN process using the bundled server

const { spawn } = require('child_process');

const server = spawn('node', ['dist/server/bundle.cjs']);

let responseBuffer = '';

server.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  const lines = responseBuffer.split('\n');
  
  lines.forEach(line => {
    if (line.trim() && line.includes('{')) {
      try {
        const response = JSON.parse(line);
        console.log('\nResponse:', JSON.stringify(response, null, 2));
      } catch (e) {
        // Not complete JSON
      }
    }
  });
});

server.stderr.on('data', (data) => {
  console.log('Server:', data.toString());
});

// Test sequence
async function runTests() {
  console.log('=== Testing MCP-BPMN Server with bpmn-moddle ===\n');
  
  // Test 1: Get diagrams path
  console.log('1. Getting diagrams path...');
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'bpmn_get_diagrams_path',
      arguments: {}
    }
  }) + '\n');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test 2: Create a process
  console.log('\n2. Creating a process...');
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'bpmn_create_process',
      arguments: {
        name: 'Order Processing Workflow'
      }
    }
  }) + '\n');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test 3: Add start event
  console.log('\n3. Adding start event...');
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'bpmn_add_event',
      arguments: {
        processId: 'Process_1',
        eventType: 'start',
        name: 'Order Received'
      }
    }
  }) + '\n');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test 4: List diagrams
  console.log('\n4. Listing saved diagrams...');
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'bpmn_list_diagrams',
      arguments: {}
    }
  }) + '\n');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  server.kill();
  process.exit(0);
}

runTests();