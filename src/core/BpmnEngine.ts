import { ProcessContext, ElementDefinition } from '../types/index.js';
import { BpmnModdleEngine } from './BpmnModdleEngine.js';
import { config } from '../config/index.js';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Main BPMN Engine that uses bpmn-moddle for server-side processing
 * and saves diagrams to the file system
 */
export class BpmnEngine {
  private moddleEngine: BpmnModdleEngine;
  private diagramsPath: string;

  constructor() {
    this.moddleEngine = new BpmnModdleEngine();
    this.diagramsPath = config.bpmnDiagramsPath;
    this.ensureDiagramsDirectory();
  }

  /**
   * Ensure the diagrams directory exists
   */
  private async ensureDiagramsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.diagramsPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create diagrams directory:', error);
    }
  }

  /**
   * Create a new BPMN process
   */
  async createProcess(name: string, type: 'process' | 'collaboration' = 'process'): Promise<ProcessContext> {
    const process = await this.moddleEngine.createProcess(name, type);
    
    // Save the initial process
    await this.saveProcess(process);
    
    return process;
  }

  /**
   * Get process context
   */
  getProcess(processId: string): ProcessContext {
    return this.moddleEngine.getProcess(processId);
  }

  /**
   * Create an element
   */
  async createElement(processId: string, elementDef: ElementDefinition): Promise<any> {
    const element = await this.moddleEngine.createElement(processId, elementDef);
    
    // Auto-save after modification
    const process = this.getProcess(processId);
    process.xml = await this.moddleEngine.exportXml(processId);
    await this.saveProcess(process);
    
    return element;
  }

  /**
   * Connect two elements
   */
  async connect(processId: string, sourceId: string, targetId: string, label?: string): Promise<any> {
    const connection = await this.moddleEngine.connect(processId, sourceId, targetId, label);
    
    // Auto-save after modification
    const process = this.getProcess(processId);
    process.xml = await this.moddleEngine.exportXml(processId);
    await this.saveProcess(process);
    
    return connection;
  }

  /**
   * Export process as XML
   */
  async exportXml(processId: string, formatted: boolean = true): Promise<string> {
    return this.moddleEngine.exportXml(processId, formatted);
  }

  /**
   * Export process as SVG (stub for now)
   */
  async exportSvg(processId: string): Promise<string> {
    // For Phase 1, we'll return a placeholder message
    return `<svg xmlns="http://www.w3.org/2000/svg"><text x="10" y="20">SVG export requires browser environment. Use VS Code BPMN extension to view ${processId}.bpmn</text></svg>`;
  }

  /**
   * Import XML
   */
  async importXml(xml: string): Promise<ProcessContext> {
    const process = await this.moddleEngine.importXml(xml);
    
    // Save the imported process
    await this.saveProcess(process);
    
    return process;
  }

  /**
   * Save process to file
   */
  private async saveProcess(process: ProcessContext): Promise<string> {
    const filename = `${process.id}_${this.sanitizeFilename(process.name)}.bpmn`;
    const filepath = join(this.diagramsPath, filename);
    
    // Ensure we have the latest XML
    if (!process.xml || process.xml.trim() === '') {
      process.xml = await this.moddleEngine.exportXml(process.id);
    }
    
    await fs.writeFile(filepath, process.xml, 'utf8');
    
    return filepath;
  }

  /**
   * List all saved diagrams
   */
  async listDiagrams(): Promise<Array<{filename: string, path: string, name: string, processId: string}>> {
    try {
      const files = await fs.readdir(this.diagramsPath);
      const bpmnFiles = files.filter(f => f.endsWith('.bpmn'));
      
      return bpmnFiles.map(filename => {
        const match = filename.match(/^(.+?)_(.+)\.bpmn$/);
        return {
          filename,
          path: join(this.diagramsPath, filename),
          processId: match ? match[1] : filename.replace('.bpmn', ''),
          name: match ? match[2].replace(/_/g, ' ') : filename.replace('.bpmn', '')
        };
      });
    } catch (error) {
      console.error('Failed to list diagrams:', error);
      return [];
    }
  }

  /**
   * Load a saved diagram
   */
  async loadDiagram(filename: string): Promise<ProcessContext> {
    const filepath = join(this.diagramsPath, filename);
    const xml = await fs.readFile(filepath, 'utf8');
    return this.importXml(xml);
  }

  /**
   * Delete a saved diagram
   */
  async deleteDiagram(filename: string): Promise<void> {
    const filepath = join(this.diagramsPath, filename);
    await fs.unlink(filepath);
  }

  /**
   * Get the diagrams directory path
   */
  getDiagramsPath(): string {
    return this.diagramsPath;
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
  }

  /**
   * Get element factory (compatibility stub)
   */
  getElementFactory(processId: string): any {
    // Return a simple object that delegates to moddleEngine
    return {
      createAndConnect: async (sourceId: string, elementDef: ElementDefinition) => {
        const element = await this.createElement(processId, elementDef);
        const connection = await this.connect(processId, sourceId, element.id);
        return { element, connection };
      }
    };
  }

  /**
   * Get modeler (compatibility stub)
   */
  getModeler(processId: string): any {
    const process = this.getProcess(processId);
    
    return {
      get: (service: string) => {
        if (service === 'elementRegistry') {
          return {
            get: (id: string) => process.elements.get(id),
            filter: (fn: (element: any) => boolean) => Array.from(process.elements.values()).filter(fn),
            getAll: () => Array.from(process.elements.values())
          };
        }
        return {};
      }
    };
  }

  /**
   * Clear all processes
   */
  clear(): void {
    this.moddleEngine.clear();
  }
}