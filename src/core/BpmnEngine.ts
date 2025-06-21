import { JSDOM } from 'jsdom';
import { ProcessContext, ElementDefinition } from '../types/index.js';
import { IdGenerator } from '../utils/IdGenerator.js';
import { ElementFactory } from './ElementFactory.js';

// Dynamic import to handle module resolution issues
async function getBpmnModeler() {
  try {
    // Try to import from the package root
    const pkg = await import('bpmn-js');
    return pkg.default || pkg;
  } catch {
    // Fallback to direct file import
    const mod = await import('bpmn-js/lib/Modeler.js');
    return mod.default || mod;
  }
}

export class BpmnEngine {
  private processes: Map<string, ProcessContext> = new Map();
  private modelers: Map<string, any> = new Map();

  /**
   * Create a new BPMN process
   */
  async createProcess(name: string, type: 'process' | 'collaboration' = 'process'): Promise<ProcessContext> {
    const processId = IdGenerator.generate('Process');
    const dom = new JSDOM('<!DOCTYPE html><div id="canvas"></div>');
    const window = dom.window as any;
    
    // Setup global window and document for bpmn-js
    Object.defineProperty(globalThis, 'window', { value: window, writable: true });
    Object.defineProperty(globalThis, 'document', { value: window.document, writable: true });
    Object.defineProperty(globalThis, 'navigator', { value: window.navigator, writable: true });

    const container = window.document.getElementById('canvas');
    
    // Create modeler instance
    const BpmnModeler = await getBpmnModeler();
    const modeler = new BpmnModeler({
      container,
      keyboard: { bindTo: window }
    });

    // Create initial BPMN XML
    const xml = this.createInitialXml(processId, name, type);
    
    try {
      await modeler.importXML(xml);
      
      const context: ProcessContext = {
        id: processId,
        name,
        type,
        elements: new Map(),
        connections: new Map(),
        xml
      };

      this.processes.set(processId, context);
      this.modelers.set(processId, modeler);

      return context;
    } catch (error) {
      throw new Error(`Failed to create process: ${error}`);
    }
  }

  /**
   * Get modeler instance for a process
   */
  getModeler(processId: string): any {
    const modeler = this.modelers.get(processId);
    if (!modeler) {
      throw new Error(`Process ${processId} not found`);
    }
    return modeler;
  }

  /**
   * Get process context
   */
  getProcess(processId: string): ProcessContext {
    const process = this.processes.get(processId);
    if (!process) {
      throw new Error(`Process ${processId} not found`);
    }
    return process;
  }

  /**
   * Get element factory for a process
   */
  getElementFactory(processId: string): ElementFactory {
    const modeler = this.getModeler(processId);
    return new ElementFactory(
      modeler.get('elementFactory'),
      modeler.get('modeling'),
      modeler.get('elementRegistry'),
      modeler.get('bpmnFactory'),
      modeler.get('canvas')
    );
  }

  /**
   * Create an element in the process
   */
  async createElement(processId: string, elementDef: ElementDefinition): Promise<any> {
    const factory = this.getElementFactory(processId);
    const element = await factory.createElement(elementDef);
    
    // Update process context
    const process = this.getProcess(processId);
    process.elements.set(element.id, element);
    
    return element;
  }

  /**
   * Connect two elements
   */
  async connect(processId: string, sourceId: string, targetId: string, label?: string): Promise<any> {
    const modeler = this.getModeler(processId);
    const modeling = modeler.get('modeling');
    const elementRegistry = modeler.get('elementRegistry');
    
    const source = elementRegistry.get(sourceId);
    const target = elementRegistry.get(targetId);
    
    if (!source || !target) {
      throw new Error('Source or target element not found');
    }

    const connection = modeling.connect(source, target);
    
    if (label) {
      modeling.updateLabel(connection, label);
    }

    // Update process context
    const process = this.getProcess(processId);
    process.connections.set(connection.id, {
      id: connection.id,
      source: sourceId,
      target: targetId,
      type: connection.type,
      label
    });

    return connection;
  }

  /**
   * Export process as XML
   */
  async exportXml(processId: string, formatted = true): Promise<string> {
    const modeler = this.getModeler(processId);
    
    try {
      const result = await modeler.saveXML({ format: formatted });
      return result.xml;
    } catch (error) {
      throw new Error(`Failed to export XML: ${error}`);
    }
  }

  /**
   * Export process as SVG
   */
  async exportSvg(processId: string): Promise<string> {
    const modeler = this.getModeler(processId);
    
    try {
      const result = await modeler.saveSVG();
      return result.svg;
    } catch (error) {
      throw new Error(`Failed to export SVG: ${error}`);
    }
  }

  /**
   * Import XML into a process
   */
  async importXml(xml: string): Promise<ProcessContext> {
    // Extract process name from XML (simplified)
    const nameMatch = xml.match(/name="([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : 'Imported Process';
    
    const processId = IdGenerator.generate('Process');
    const dom = new JSDOM('<!DOCTYPE html><div id="canvas"></div>');
    const window = dom.window as any;
    
    Object.defineProperty(globalThis, 'window', { value: window, writable: true });
    Object.defineProperty(globalThis, 'document', { value: window.document, writable: true });
    Object.defineProperty(globalThis, 'navigator', { value: window.navigator, writable: true });

    const container = window.document.getElementById('canvas');
    const BpmnModeler = await getBpmnModeler();
    const modeler = new BpmnModeler({ container });

    try {
      await modeler.importXML(xml);
      
      const context: ProcessContext = {
        id: processId,
        name,
        type: xml.includes('bpmn:collaboration') ? 'collaboration' : 'process',
        elements: new Map(),
        connections: new Map(),
        xml
      };

      // Populate elements and connections from imported XML
      const elementRegistry = modeler.get('elementRegistry');
      elementRegistry.forEach((element: any) => {
        if (element.type === 'bpmn:SequenceFlow' || element.type === 'bpmn:MessageFlow') {
          context.connections.set(element.id, {
            id: element.id,
            source: element.source.id,
            target: element.target.id,
            type: element.type
          });
        } else if (element.id && element.type !== 'label') {
          context.elements.set(element.id, element);
        }
      });

      this.processes.set(processId, context);
      this.modelers.set(processId, modeler);

      return context;
    } catch (error) {
      throw new Error(`Failed to import XML: ${error}`);
    }
  }

  /**
   * Create initial BPMN XML
   */
  private createInitialXml(processId: string, name: string, type: 'process' | 'collaboration'): string {
    if (type === 'collaboration') {
      return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
  id="Definitions_1" 
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="${processId}" name="${name}">
  </bpmn:collaboration>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
  id="Definitions_1" 
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${processId}" name="${name}" isExecutable="true">
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
  }

  /**
   * Clear all processes (useful for cleanup)
   */
  clear(): void {
    this.processes.clear();
    this.modelers.clear();
    IdGenerator.reset();
  }
}