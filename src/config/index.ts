import { homedir } from 'os';
import { join } from 'path';

export interface Config {
  bpmnDiagramsPath: string;
}

/**
 * Get configuration with environment variable override
 */
export function getConfig(): Config {
  // Allow override via environment variable
  const customPath = process.env.MCP_BPMN_DIAGRAMS_PATH;
  
  // Default to ~/mcp-bpmn on Unix-like or %HOME%\mcp-bpmn on Windows
  const defaultPath = join(homedir(), 'mcp-bpmn');
  
  return {
    bpmnDiagramsPath: customPath || defaultPath
  };
}

export const config = getConfig();