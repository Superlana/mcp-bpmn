import { ProcessContext, ElementDefinition } from '../types/index.js';
import { SimpleBpmnEngine } from './SimpleBpmnEngine.js';

/**
 * Main BPMN Engine - delegates to SimpleBpmnEngine for now
 * to avoid bpmn-moddle async issues
 */
export class BpmnEngine {
  private engine: SimpleBpmnEngine;

  constructor() {
    this.engine = new SimpleBpmnEngine();
  }

  /**
   * Create a new BPMN process
   */
  async createProcess(name: string, type: 'process' | 'collaboration' = 'process'): Promise<ProcessContext> {
    return this.engine.createProcess(name, type);
  }

  /**
   * Get process context
   */
  getProcess(processId: string): ProcessContext {
    return this.engine.getProcess(processId);
  }

  /**
   * Create an element
   */
  async createElement(processId: string, elementDef: ElementDefinition): Promise<any> {
    return this.engine.createElement(processId, elementDef);
  }

  /**
   * Connect two elements
   */
  async connect(processId: string, sourceId: string, targetId: string, label?: string): Promise<any> {
    return this.engine.connect(processId, sourceId, targetId, label);
  }

  /**
   * Export process as XML
   */
  async exportXml(processId: string, formatted: boolean = true): Promise<string> {
    return this.engine.exportXml(processId, formatted);
  }

  /**
   * Export process as SVG (stub for now)
   */
  async exportSvg(processId: string): Promise<string> {
    return `<svg xmlns="http://www.w3.org/2000/svg"><text x="10" y="20">SVG export requires browser environment. Use VS Code BPMN extension to view ${processId}.bpmn</text></svg>`;
  }

  /**
   * Import XML
   */
  async importXml(xml: string): Promise<ProcessContext> {
    return this.engine.importXml(xml);
  }

  /**
   * List all saved diagrams
   */
  async listDiagrams(): Promise<Array<{filename: string, path: string, name: string, processId: string}>> {
    return this.engine.listDiagrams();
  }

  /**
   * Load a saved diagram
   */
  async loadDiagram(filename: string): Promise<ProcessContext> {
    return this.engine.loadDiagram(filename);
  }

  /**
   * Delete a saved diagram
   */
  async deleteDiagram(filename: string): Promise<void> {
    return this.engine.deleteDiagram(filename);
  }

  /**
   * Get the diagrams directory path
   */
  getDiagramsPath(): string {
    return this.engine.getDiagramsPath();
  }

  /**
   * Get element factory (compatibility stub)
   */
  getElementFactory(processId: string): any {
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
    this.engine.clear();
  }
}