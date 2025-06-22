import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export interface SaveOptions {
  filename?: string;
  directory?: string;
  overwrite?: boolean;
}

export interface SaveResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export class FileManager {
  private defaultDirectory: string;

  constructor() {
    // Default directory: ~/mcp-bpmn/ on Unix-like, %USERPROFILE%\mcp-bpmn\ on Windows
    this.defaultDirectory = process.env.MCP_BPMN_DIAGRAMS_PATH || 
      path.join(os.homedir(), 'mcp-bpmn');
  }

  /**
   * Ensure the directory exists, create if it doesn't
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Sanitize filename to prevent security issues
   */
  sanitizeFilename(filename: string): string {
    // Remove or replace unsafe characters
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/\.+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .substring(0, 255);
  }

  /**
   * Generate a default filename based on current timestamp
   */
  generateDefaultFilename(processName?: string): string {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('.')[0];
    
    const baseName = processName 
      ? this.sanitizeFilename(processName)
      : 'process';
    
    return `${baseName}_${timestamp}.bpmn`;
  }

  /**
   * Validate that the target path is within allowed directory
   */
  validatePath(targetPath: string, allowedDir: string): boolean {
    const resolvedTarget = path.resolve(targetPath);
    const resolvedAllowed = path.resolve(allowedDir);
    
    return resolvedTarget.startsWith(resolvedAllowed);
  }

  /**
   * Save BPMN XML content to file
   */
  async saveBpmnFile(
    xmlContent: string, 
    options: SaveOptions = {}
  ): Promise<SaveResult> {
    try {
      const targetDir = options.directory || this.defaultDirectory;
      await this.ensureDirectory(targetDir);

      let filename = options.filename;
      if (!filename) {
        // Extract process name from XML if available
        const processNameMatch = xmlContent.match(/name="([^"]+)"/);
        const processName = processNameMatch?.[1];
        filename = this.generateDefaultFilename(processName);
      } else {
        filename = this.sanitizeFilename(filename);
        if (!filename.endsWith('.bpmn')) {
          filename += '.bpmn';
        }
      }

      const filePath = path.join(targetDir, filename);

      // Security check: ensure we're not writing outside allowed directory
      if (!this.validatePath(filePath, targetDir)) {
        return {
          success: false,
          error: 'Invalid file path: outside allowed directory'
        };
      }

      // Check if file exists and overwrite is not allowed
      if (!options.overwrite) {
        try {
          await fs.access(filePath);
          return {
            success: false,
            error: `File already exists: ${filename}. Use overwrite option to replace.`
          };
        } catch {
          // File doesn't exist, we can proceed
        }
      }

      // Write the file
      await fs.writeFile(filePath, xmlContent, 'utf8');

      return {
        success: true,
        filePath: filePath
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * List BPMN files in the output directory
   */
  async listBpmnFiles(directory?: string): Promise<string[]> {
    const targetDir = directory || this.defaultDirectory;
    
    try {
      await this.ensureDirectory(targetDir);
      const files = await fs.readdir(targetDir);
      return files
        .filter(file => file.endsWith('.bpmn'))
        .sort((a, b) => b.localeCompare(a)); // Sort by name, newest first
    } catch {
      return [];
    }
  }

  /**
   * Get the default output directory
   */
  getDefaultDirectory(): string {
    return this.defaultDirectory;
  }

  /**
   * Get file stats
   */
  async getFileInfo(filePath: string): Promise<{
    exists: boolean;
    size?: number;
    modified?: Date;
  }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size,
        modified: stats.mtime
      };
    } catch {
      return {
        exists: false
      };
    }
  }
}