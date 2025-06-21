import { ProcessContext, ElementDefinition } from '../types/index.js';
import { IdGenerator } from '../utils/IdGenerator.js';
import { config } from '../config/index.js';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Simple BPMN engine that generates XML directly without bpmn-moddle
 * This is a temporary solution to avoid async issues with bpmn-moddle
 */
export class SimpleBpmnEngine {
  private processes: Map<string, ProcessContext> = new Map();
  private diagramsPath: string;

  constructor() {
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
    const processId = IdGenerator.generate('Process');
    
    const context: ProcessContext = {
      id: processId,
      name,
      type,
      elements: new Map(),
      connections: new Map(),
      xml: this.generateInitialXml(processId, name, type)
    };

    this.processes.set(processId, context);
    
    // Save the initial process
    await this.saveProcess(context);
    
    return context;
  }

  /**
   * Generate initial BPMN XML
   */
  private generateInitialXml(processId: string, name: string, type: string): string {
    if (type === 'collaboration') {
      return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
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
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
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
   * Create an element
   */
  async createElement(processId: string, elementDef: ElementDefinition): Promise<any> {
    const process = this.getProcess(processId);
    const elementId = IdGenerator.generate(elementDef.type.split(':')[1]);
    
    // Use provided position or default
    let position = elementDef.position;
    if (!position) {
      // Calculate default position based on existing elements
      const elementCount = process.elements.size;
      position = {
        x: 100 + (elementCount * 50),
        y: 200
      };
    }
    
    const element = {
      id: elementId,
      type: elementDef.type,
      name: elementDef.name,
      position,
      properties: elementDef.properties || {}
    };

    process.elements.set(elementId, element);
    
    // Regenerate XML with new element
    process.xml = this.generateXmlWithElements(process);
    await this.saveProcess(process);
    
    return element;
  }

  /**
   * Connect two elements
   */
  async connect(processId: string, sourceId: string, targetId: string, label?: string): Promise<any> {
    const process = this.getProcess(processId);
    
    const source = process.elements.get(sourceId);
    const target = process.elements.get(targetId);
    
    if (!source || !target) {
      throw new Error('Source or target element not found');
    }

    const flowId = IdGenerator.generate('Flow');
    
    const connection = {
      id: flowId,
      source: sourceId,
      target: targetId,
      type: 'bpmn:SequenceFlow',
      label
    };

    process.connections.set(flowId, connection);
    
    // Regenerate XML with new connection
    process.xml = this.generateXmlWithElements(process);
    await this.saveProcess(process);
    
    return connection;
  }

  /**
   * Generate XML with all elements and connections
   */
  private generateXmlWithElements(process: ProcessContext): string {
    const elements = Array.from(process.elements.values());
    const connections = Array.from(process.connections.values());

    let elementXml = '';
    let diagramXml = '';

    // Generate element XML
    elements.forEach(element => {
      const tagName = this.getXmlTagName(element.type);
      elementXml += `    <bpmn:${tagName} id="${element.id}" name="${element.name || ''}" />\n`;
      
      // Add diagram info with proper sizing
      const x = element.position?.x || 100;
      const y = element.position?.y || 100;
      const sizing = this.getElementSizing(element.type);
      
      diagramXml += `      <bpmndi:BPMNShape id="${element.id}_di" bpmnElement="${element.id}">
        <dc:Bounds x="${x}" y="${y}" width="${sizing.width}" height="${sizing.height}" />
      </bpmndi:BPMNShape>\n`;
    });

    // Generate connection XML
    connections.forEach(conn => {
      elementXml += `    <bpmn:sequenceFlow id="${conn.id}" sourceRef="${conn.source}" targetRef="${conn.target}"${conn.label ? ` name="${conn.label}"` : ''} />\n`;
      
      // Calculate waypoints based on actual element positions
      const sourceElement = elements.find(e => e.id === conn.source);
      const targetElement = elements.find(e => e.id === conn.target);
      
      if (sourceElement && targetElement) {
        const sourceSizing = this.getElementSizing(sourceElement.type);
        const targetSizing = this.getElementSizing(targetElement.type);
        
        // Calculate connection points (from center-right of source to center-left of target)
        const sourceX = (sourceElement.position?.x || 100) + sourceSizing.width;
        const sourceY = (sourceElement.position?.y || 100) + (sourceSizing.height / 2);
        const targetX = targetElement.position?.x || 250;
        const targetY = (targetElement.position?.y || 100) + (targetSizing.height / 2);
        
        diagramXml += `      <bpmndi:BPMNEdge id="${conn.id}_di" bpmnElement="${conn.id}">
        <di:waypoint x="${sourceX}" y="${sourceY}" />
        <di:waypoint x="${targetX}" y="${targetY}" />
      </bpmndi:BPMNEdge>\n`;
      }
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1" 
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${process.id}" name="${process.name}" isExecutable="true">
${elementXml}  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${process.id}">
${diagramXml}    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
  }

  /**
   * Get XML tag name from BPMN type
   */
  private getXmlTagName(bpmnType: string): string {
    const typeMap: { [key: string]: string } = {
      'bpmn:StartEvent': 'startEvent',
      'bpmn:EndEvent': 'endEvent',
      'bpmn:Task': 'task',
      'bpmn:UserTask': 'userTask',
      'bpmn:ServiceTask': 'serviceTask',
      'bpmn:SendTask': 'sendTask',
      'bpmn:ReceiveTask': 'receiveTask',
      'bpmn:ScriptTask': 'scriptTask',
      'bpmn:BusinessRuleTask': 'businessRuleTask',
      'bpmn:ManualTask': 'manualTask',
      'bpmn:ExclusiveGateway': 'exclusiveGateway',
      'bpmn:ParallelGateway': 'parallelGateway',
      'bpmn:InclusiveGateway': 'inclusiveGateway',
      'bpmn:EventBasedGateway': 'eventBasedGateway'
    };
    return typeMap[bpmnType] || 'task';
  }

  /**
   * Get appropriate sizing for BPMN element types
   */
  private getElementSizing(bpmnType: string): { width: number, height: number } {
    const sizingMap: { [key: string]: { width: number, height: number } } = {
      'bpmn:StartEvent': { width: 36, height: 36 },
      'bpmn:EndEvent': { width: 36, height: 36 },
      'bpmn:Task': { width: 100, height: 80 },
      'bpmn:UserTask': { width: 100, height: 80 },
      'bpmn:ServiceTask': { width: 100, height: 80 },
      'bpmn:SendTask': { width: 100, height: 80 },
      'bpmn:ReceiveTask': { width: 100, height: 80 },
      'bpmn:ScriptTask': { width: 100, height: 80 },
      'bpmn:BusinessRuleTask': { width: 100, height: 80 },
      'bpmn:ManualTask': { width: 100, height: 80 },
      'bpmn:ExclusiveGateway': { width: 50, height: 50 },
      'bpmn:ParallelGateway': { width: 50, height: 50 },
      'bpmn:InclusiveGateway': { width: 50, height: 50 },
      'bpmn:EventBasedGateway': { width: 50, height: 50 }
    };
    return sizingMap[bpmnType] || { width: 100, height: 80 };
  }

  /**
   * Export XML
   */
  async exportXml(processId: string, _formatted: boolean = true): Promise<string> {
    const process = this.getProcess(processId);
    return process.xml || '';
  }

  /**
   * Import XML (basic parsing)
   */
  async importXml(xml: string): Promise<ProcessContext> {
    // Extract process info from XML
    const processMatch = xml.match(/<bpmn:process[^>]+id="([^"]+)"[^>]*name="([^"]+)"/);
    const processId = processMatch ? processMatch[1] : IdGenerator.generate('Process');
    const name = processMatch ? processMatch[2] : 'Imported Process';

    const context: ProcessContext = {
      id: processId,
      name,
      type: 'process',
      elements: new Map(),
      connections: new Map(),
      xml
    };

    this.processes.set(processId, context);
    await this.saveProcess(context);
    
    return context;
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
   * Get diagrams path
   */
  getDiagramsPath(): string {
    return this.diagramsPath;
  }

  /**
   * Save process to file
   */
  private async saveProcess(process: ProcessContext): Promise<string> {
    const filename = `${process.id}_${this.sanitizeFilename(process.name)}.bpmn`;
    const filepath = join(this.diagramsPath, filename);
    
    await fs.writeFile(filepath, process.xml || '', 'utf8');
    
    return filepath;
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
  }

  /**
   * Apply auto-layout to a process
   */
  async applyAutoLayout(processId: string, algorithm: 'horizontal' | 'vertical' = 'horizontal'): Promise<void> {
    const process = this.getProcess(processId);
    const { AutoLayout } = await import('../utils/AutoLayout.js');
    
    if (algorithm === 'horizontal') {
      AutoLayout.applyLayout(process);
    } else {
      throw new Error('Only horizontal layout algorithm is currently supported');
    }
    
    // Regenerate XML with new positions
    process.xml = this.generateXmlWithElements(process);
    await this.saveProcess(process);
  }

  /**
   * Clear all processes
   */
  clear(): void {
    this.processes.clear();
    IdGenerator.reset();
  }
}