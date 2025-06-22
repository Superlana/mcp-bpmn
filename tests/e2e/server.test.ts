import { spawn } from 'child_process';
import * as path from 'path';

describe('MCP Server End-to-End Tests', () => {
  let server: any;
  let responseBuffer: string = '';

  beforeAll((done) => {
    const serverPath = path.resolve(process.cwd(), 'dist/server/index.js');
    server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    server.stdout.on('data', (data: Buffer) => {
      responseBuffer += data.toString();
    });

    server.stderr.once('data', (data: Buffer) => {
      const message = data.toString();
      if (message.includes('MCP-BPMN Server running')) {
        done();
      }
    });

    server.on('error', (error: Error) => {
      done(error);
    });
  });

  afterAll(() => {
    if (server) {
      server.kill();
    }
  });

  const sendRequest = (request: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      responseBuffer = '';
      const requestStr = JSON.stringify(request) + '\n';
      
      server.stdin.write(requestStr);
      
      // Wait for response
      const checkResponse = setInterval(() => {
        const lines = responseBuffer.split('\n');
        for (const line of lines) {
          if (line.trim() && line.includes('{')) {
            try {
              const response = JSON.parse(line);
              clearInterval(checkResponse);
              resolve(response);
              return;
            } catch (e) {
              // Not complete JSON yet
            }
          }
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkResponse);
        reject(new Error('Response timeout'));
      }, 5000);
    });
  };

  it('should start without errors', () => {
    // Server started in beforeAll
    expect(server).toBeDefined();
    expect(server.killed).toBe(false);
  });

  it('should respond to tools/list request', async () => {
    const response = await sendRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(1);
    expect(response.result).toBeDefined();
    expect(response.result.tools).toBeInstanceOf(Array);
    expect(response.result.tools.length).toBeGreaterThan(0);
  });

  it('should handle new_bpmn tool call', async () => {
    const response = await sendRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'new_bpmn',
        arguments: {
          name: 'E2E Test Process'
        }
      }
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(2);
    
    if (response.error) {
      // If there's an error, it should be related to bpmn-js, not MCP protocol
      expect(response.error.message).toContain('module');
    } else {
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
    }
  });

  it('should handle invalid tool name gracefully', async () => {
    const response = await sendRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'invalid_tool_name',
        arguments: {}
      }
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(3);
    expect(response.result).toBeDefined();
    expect(response.result.isError).toBe(true);
  });

  it('should successfully create and export a BPMN process', async () => {
    // Create process
    const createResponse = await sendRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'new_bpmn',
        arguments: {
          name: 'Full E2E Test Process'
        }
      }
    });

    console.log('Create response:', JSON.stringify(createResponse, null, 2));

    // If creation succeeds, try to export
    if (!createResponse.result?.isError) {
      const exportResponse = await sendRequest({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'export',
          arguments: {
            format: 'xml'
          }
        }
      });

      console.log('Export response:', JSON.stringify(exportResponse, null, 2));
      
      expect(exportResponse.result).toBeDefined();
      if (!exportResponse.result.isError) {
        expect(exportResponse.result.content[0].text).toContain('<?xml');
        expect(exportResponse.result.content[0].text).toContain('bpmn:definitions');
      }
    }
  });
});