import BpmnModdle from 'bpmn-moddle';
import { ProcessContext, ElementDefinition } from '../types/index.js';
import { IdGenerator } from '../utils/IdGenerator.js';

/**
 * Alternative BPMN engine using bpmn-moddle for server-side processing
 * This avoids the browser dependencies of bpmn-js
 */
export class BpmnModdleEngine {
  private moddle: any;
  private processes: Map<string, ProcessContext> = new Map();
  private definitions: Map<string, any> = new Map();

  constructor() {
    this.moddle = new BpmnModdle();
  }

  /**
   * Create a new BPMN process using bpmn-moddle
   */
  async createProcess(name: string, type: 'process' | 'collaboration' = 'process'): Promise<ProcessContext> {
    const processId = IdGenerator.generate('Process');
    
    // Create BPMN definitions
    const definitions = this.moddle.create('bpmn:Definitions', {
      id: 'Definitions_1',
      targetNamespace: 'http://bpmn.io/schema/bpmn'
    });

    // Create process or collaboration
    let rootElement: any;
    if (type === 'process') {
      rootElement = this.moddle.create('bpmn:Process', {
        id: processId,
        name: name,
        isExecutable: true
      });
    } else {
      rootElement = this.moddle.create('bpmn:Collaboration', {
        id: processId,
        name: name
      });
    }

    definitions.rootElements = [rootElement];
    
    // Store the definitions
    this.definitions.set(processId, { definitions, rootElement });
    
    // Create process context
    const context: ProcessContext = {
      id: processId,
      name,
      type,
      elements: new Map(),
      connections: new Map(),
      xml: ''
    };

    this.processes.set(processId, context);
    
    // Generate initial XML
    context.xml = await this.exportXml(processId);
    
    return context;
  }

  /**
   * Add an element to the process
   */
  async createElement(processId: string, elementDef: ElementDefinition): Promise<any> {
    const process = this.processes.get(processId);
    if (!process) {
      throw new Error(`Process ${processId} not found`);
    }

    const def = this.definitions.get(processId);
    if (!def) {
      throw new Error(`Process definition ${processId} not found`);
    }

    const elementId = IdGenerator.generate(elementDef.type.split(':')[1]);
    
    // Create the BPMN element
    const element = this.moddle.create(elementDef.type, {
      id: elementId,
      name: elementDef.name,
      ...elementDef.properties
    });

    // Add to process
    if (!def.rootElement.flowElements) {
      def.rootElement.flowElements = [];
    }
    def.rootElement.flowElements.push(element);

    // Track in context
    process.elements.set(elementId, element);
    
    return element;
  }

  /**
   * Connect two elements
   */
  async connect(processId: string, sourceId: string, targetId: string, label?: string): Promise<any> {
    const process = this.processes.get(processId);
    if (!process) {
      throw new Error(`Process ${processId} not found`);
    }

    const def = this.definitions.get(processId);
    if (!def) {
      throw new Error(`Process definition ${processId} not found`);
    }

    const source = process.elements.get(sourceId);
    const target = process.elements.get(targetId);
    
    if (!source || !target) {
      throw new Error('Source or target element not found');
    }

    const flowId = IdGenerator.generate('Flow');
    
    // Create sequence flow
    const flow = this.moddle.create('bpmn:SequenceFlow', {
      id: flowId,
      name: label,
      sourceRef: source,
      targetRef: target
    });

    // Add to process
    def.rootElement.flowElements.push(flow);
    
    // Update source and target references
    if (!source.outgoing) source.outgoing = [];
    source.outgoing.push(flow);
    
    if (!target.incoming) target.incoming = [];
    target.incoming.push(flow);
    
    // Track connection
    process.connections.set(flowId, {
      id: flowId,
      source: sourceId,
      target: targetId,
      type: 'bpmn:SequenceFlow'
    });
    
    return flow;
  }

  /**
   * Export process as XML
   */
  async exportXml(processId: string, formatted: boolean = true): Promise<string> {
    const def = this.definitions.get(processId);
    if (!def) {
      throw new Error(`Process definition ${processId} not found`);
    }

    return new Promise((resolve, reject) => {
      this.moddle.toXML(def.definitions, { format: formatted }, (err: any, xml: string) => {
        if (err) {
          reject(err);
        } else {
          resolve(xml);
        }
      });
    });
  }

  /**
   * Import XML
   */
  async importXml(xml: string): Promise<ProcessContext> {
    return new Promise((resolve, reject) => {
      this.moddle.fromXML(xml, (err: any, definitions: any) => {
        if (err) {
          reject(new Error(`Failed to parse XML: ${err.message}`));
          return;
        }

        // Find the first process or collaboration
        const rootElement = definitions.rootElements?.find((el: any) => 
          el.$type === 'bpmn:Process' || el.$type === 'bpmn:Collaboration'
        );

        if (!rootElement) {
          reject(new Error('No process or collaboration found in XML'));
          return;
        }

        const processId = rootElement.id || IdGenerator.generate('Process');
        const name = rootElement.name || 'Imported Process';
        const type = rootElement.$type === 'bpmn:Collaboration' ? 'collaboration' : 'process';

        // Store definitions
        this.definitions.set(processId, { definitions, rootElement });

        // Create context
        const context: ProcessContext = {
          id: processId,
          name,
          type,
          elements: new Map(),
          connections: new Map(),
          xml
        };

        // Populate elements and connections
        if (rootElement.flowElements) {
          rootElement.flowElements.forEach((el: any) => {
            if (el.$type === 'bpmn:SequenceFlow') {
              context.connections.set(el.id, {
                id: el.id,
                source: el.sourceRef?.id || '',
                target: el.targetRef?.id || '',
                type: el.$type
              });
            } else {
              context.elements.set(el.id, el);
            }
          });
        }

        this.processes.set(processId, context);
        resolve(context);
      });
    });
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
   * Clear all processes
   */
  clear(): void {
    this.processes.clear();
    this.definitions.clear();
    IdGenerator.reset();
  }
}