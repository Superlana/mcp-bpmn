import { SimpleBpmnEngine } from '../core/SimpleBpmnEngine.js';
import { TypeMappings } from '../utils/TypeMappings.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export class BpmnRequestHandler {
  private engine: SimpleBpmnEngine;

  constructor() {
    this.engine = new SimpleBpmnEngine();
  }

  async handleRequest(name: string, args: any): Promise<CallToolResult> {
    try {
      switch (name) {
        case 'bpmn_create_process':
          return await this.createProcess(args);
        case 'bpmn_import_xml':
          return await this.importXml(args);
        case 'bpmn_add_event':
          return await this.addEvent(args);
        case 'bpmn_add_activity':
          return await this.addActivity(args);
        case 'bpmn_add_gateway':
          return await this.addGateway(args);
        case 'bpmn_connect':
          return await this.connectElements(args);
        case 'bpmn_add_pool':
          return await this.addPool(args);
        case 'bpmn_add_lane':
          return await this.addLane(args);
        case 'bpmn_export':
          return await this.exportProcess(args);
        case 'bpmn_validate':
          return await this.validateProcess(args);
        case 'bpmn_list_elements':
          return await this.listElements(args);
        case 'bpmn_get_element':
          return await this.getElement(args);
        case 'bpmn_update_element':
          return await this.updateElement(args);
        case 'bpmn_delete_element':
          return await this.deleteElement(args);
        case 'bpmn_list_diagrams':
          return await this.listDiagrams();
        case 'bpmn_load_diagram':
          return await this.loadDiagram(args);
        case 'bpmn_delete_diagram':
          return await this.deleteDiagram(args);
        case 'bpmn_get_diagrams_path':
          return await this.getDiagramsPath();
        case 'bpmn_auto_layout':
          return await this.autoLayout(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  private async createProcess(args: any): Promise<CallToolResult> {
    const { name, type = 'process' } = args;
    const context = await this.engine.createProcess(name, type);
    
    const filename = `${context.id}_${name.replace(/[^a-zA-Z0-9-_]/g, '_')}.bpmn`;
    const path = this.engine.getDiagramsPath();
    
    return {
      content: [
        {
          type: 'text',
          text: `Created ${type} "${name}" with ID: ${context.id}\n\nSaved to: ${path}/${filename}`
        }
      ]
    };
  }

  private async importXml(args: any): Promise<CallToolResult> {
    const { xml, validate = true } = args;
    
    // Basic validation
    if (validate && !xml.includes('bpmn:definitions')) {
      throw new Error('Invalid BPMN XML: missing definitions element');
    }

    const context = await this.engine.importXml(xml);
    
    return {
      content: [
        {
          type: 'text',
          text: `Imported process "${context.name}" with ID: ${context.id}\nElements: ${context.elements.size}, Connections: ${context.connections.size}`
        }
      ]
    };
  }

  private async addEvent(args: any): Promise<CallToolResult> {
    const { processId, eventType, name, eventDefinition, position, attachTo } = args;
    
    const bpmnType = TypeMappings.mapEventType(eventType, eventDefinition);
    const elementDef = {
      type: bpmnType,
      name,
      position,
      properties: {
        eventDefinition,
        attachTo
      }
    };

    const element = await this.engine.createElement(processId, elementDef);

    return {
      content: [
        {
          type: 'text',
          text: `Added ${eventType} event "${name || 'Unnamed'}" with ID: ${element.id}`
        }
      ]
    };
  }

  private async addActivity(args: any): Promise<CallToolResult> {
    const { processId, activityType, name, position, properties = {} } = args;
    
    const bpmnType = TypeMappings.mapActivityType(activityType);
    const elementDef = {
      type: bpmnType,
      name,
      position,
      properties
    };

    const element = await this.engine.createElement(processId, elementDef);

    return {
      content: [
        {
          type: 'text',
          text: `Added ${activityType} "${name}" with ID: ${element.id}`
        }
      ]
    };
  }

  private async addGateway(args: any): Promise<CallToolResult> {
    const { processId, gatewayType, name, position } = args;
    
    const bpmnType = TypeMappings.mapGatewayType(gatewayType);
    const elementDef = {
      type: bpmnType,
      name,
      position
    };

    const element = await this.engine.createElement(processId, elementDef);

    return {
      content: [
        {
          type: 'text',
          text: `Added ${gatewayType} gateway "${name || 'Gateway'}" with ID: ${element.id}`
        }
      ]
    };
  }

  private async connectElements(args: any): Promise<CallToolResult> {
    const { processId, sourceId, targetId, label, condition } = args;
    
    const connection = await this.engine.connect(processId, sourceId, targetId, label);
    
    // Note: Condition expressions are stored but not yet applied to XML in SimpleBpmnEngine
    if (condition) {
      console.log(`Condition '${condition}' will be added to connection ${connection.id} in future version`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Connected ${sourceId} to ${targetId}${label ? ` with label "${label}"` : ''}`
        }
      ]
    };
  }

  private async addPool(args: any): Promise<CallToolResult> {
    const { processId, name, position, size } = args;
    
    const process = this.engine.getProcess(processId);
    if (process.type !== 'collaboration') {
      throw new Error('Pools can only be added to collaborations. Create a collaboration first.');
    }

    const elementDef = {
      type: 'bpmn:Participant',
      name,
      position: position || { x: 100, y: 100 },
      size: size || { width: 600, height: 250 }
    };

    const element = await this.engine.createElement(processId, elementDef);

    return {
      content: [
        {
          type: 'text',
          text: `Added pool "${name}" with ID: ${element.id}`
        }
      ]
    };
  }

  private async addLane(args: any): Promise<CallToolResult> {
    const { processId: _processId, poolId: _poolId, name: _name, position: _position = 'bottom' } = args;
    
    // For SimpleBpmnEngine, lanes are not yet fully implemented
    throw new Error('Lanes are not yet implemented in SimpleBpmnEngine. Use pools instead.');
  }

  private async exportProcess(args: any): Promise<CallToolResult> {
    const { processId, format = 'xml', formatted = true } = args;
    
    if (format === 'svg') {
      throw new Error('SVG export is not yet implemented in SimpleBpmnEngine');
    }
    
    const content = await this.engine.exportXml(processId, formatted);

    return {
      content: [
        {
          type: 'text',
          text: content
        }
      ]
    };
  }

  private async validateProcess(args: any): Promise<CallToolResult> {
    const { processId } = args;
    
    const process = this.engine.getProcess(processId);
    const elements = Array.from(process.elements.values());
    const connections = Array.from(process.connections.values());
    
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for start events
    const startEvents = elements.filter(e => e.type === 'bpmn:StartEvent');
    if (startEvents.length === 0) {
      errors.push('Process must have at least one start event');
    }

    // Check for end events
    const endEvents = elements.filter(e => e.type === 'bpmn:EndEvent');
    if (endEvents.length === 0) {
      warnings.push('Process should have at least one end event');
    }

    // Check for disconnected elements
    elements.forEach(element => {
      const incomingConnections = connections.filter(c => c.target === element.id);
      const outgoingConnections = connections.filter(c => c.source === element.id);
      
      if (incomingConnections.length === 0 && element.type !== 'bpmn:StartEvent') {
        warnings.push(`Element ${element.id} has no incoming connections`);
      }
      if (outgoingConnections.length === 0 && element.type !== 'bpmn:EndEvent') {
        warnings.push(`Element ${element.id} has no outgoing connections`);
      }
    });

    const valid = errors.length === 0;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            valid,
            errors,
            warnings,
            summary: `Validation ${valid ? 'passed' : 'failed'}: ${errors.length} errors, ${warnings.length} warnings`
          }, null, 2)
        }
      ]
    };
  }

  private async listElements(args: any): Promise<CallToolResult> {
    const { processId, elementType } = args;
    
    const process = this.engine.getProcess(processId);
    const elements = Array.from(process.elements.values());
    const connections = Array.from(process.connections.values());
    
    const filteredElements = elements.filter(e => {
      if (elementType) {
        return e.type === elementType;
      }
      return true;
    });

    const elementList = filteredElements.map(e => {
      const incoming = connections.filter(c => c.target === e.id);
      const outgoing = connections.filter(c => c.source === e.id);
      
      return {
        id: e.id,
        type: e.type,
        name: e.name,
        position: e.position,
        incoming: incoming.length,
        outgoing: outgoing.length
      };
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(elementList, null, 2)
        }
      ]
    };
  }

  private async getElement(args: any): Promise<CallToolResult> {
    const { processId, elementId } = args;
    
    const process = this.engine.getProcess(processId);
    const element = process.elements.get(elementId);
    const connections = Array.from(process.connections.values());
    
    if (!element) {
      throw new Error(`Element ${elementId} not found`);
    }

    const incoming = connections.filter(c => c.target === elementId);
    const outgoing = connections.filter(c => c.source === elementId);

    const details = {
      id: element.id,
      type: element.type,
      name: element.name,
      position: element.position,
      incoming: incoming.map(c => ({ id: c.id, source: c.source })),
      outgoing: outgoing.map(c => ({ id: c.id, target: c.target })),
      properties: element.properties
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(details, null, 2)
        }
      ]
    };
  }

  private async updateElement(args: any): Promise<CallToolResult> {
    const { processId, elementId, name, properties } = args;
    
    const process = this.engine.getProcess(processId);
    const element = process.elements.get(elementId);
    
    if (!element) {
      throw new Error(`Element ${elementId} not found`);
    }

    // Update name if provided
    if (name !== undefined) {
      element.name = name;
    }

    // Update other properties
    if (properties) {
      Object.assign(element.properties, properties);
    }

    // Regenerate XML (SimpleBpmnEngine automatically updates XML)

    return {
      content: [
        {
          type: 'text',
          text: `Updated element ${elementId}`
        }
      ]
    };
  }

  private async deleteElement(args: any): Promise<CallToolResult> {
    const { processId, elementId } = args;
    
    const process = this.engine.getProcess(processId);
    
    if (!process.elements.has(elementId)) {
      throw new Error(`Element ${elementId} not found`);
    }

    // Remove element
    process.elements.delete(elementId);
    
    // Remove any connections involving this element
    const connectionsToRemove = [];
    for (const [connId, conn] of process.connections) {
      if (conn.source === elementId || conn.target === elementId) {
        connectionsToRemove.push(connId);
      }
    }
    
    connectionsToRemove.forEach(connId => {
      process.connections.delete(connId);
    });

    // Regenerate XML (SimpleBpmnEngine automatically updates XML)

    return {
      content: [
        {
          type: 'text',
          text: `Deleted element ${elementId} and ${connectionsToRemove.length} associated connections`
        }
      ]
    };
  }

  private async listDiagrams(): Promise<CallToolResult> {
    const diagrams = await this.engine.listDiagrams();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            count: diagrams.length,
            diagrams: diagrams,
            path: this.engine.getDiagramsPath()
          }, null, 2)
        }
      ]
    };
  }

  private async loadDiagram(args: any): Promise<CallToolResult> {
    const { filename } = args;
    
    const process = await this.engine.loadDiagram(filename);
    
    return {
      content: [
        {
          type: 'text',
          text: `Loaded diagram "${process.name}" with ID: ${process.id}\nElements: ${process.elements.size}, Connections: ${process.connections.size}`
        }
      ]
    };
  }

  private async deleteDiagram(args: any): Promise<CallToolResult> {
    const { filename } = args;
    
    await this.engine.deleteDiagram(filename);
    
    return {
      content: [
        {
          type: 'text',
          text: `Deleted diagram file: ${filename}`
        }
      ]
    };
  }

  private async getDiagramsPath(): Promise<CallToolResult> {
    const path = this.engine.getDiagramsPath();
    
    return {
      content: [
        {
          type: 'text',
          text: `BPMN diagrams are saved to: ${path}\n\nYou can set a custom path using the environment variable: MCP_BPMN_DIAGRAMS_PATH`
        }
      ]
    };
  }

  private async autoLayout(args: any): Promise<CallToolResult> {
    const { processId, algorithm = 'horizontal' } = args;
    
    const process = this.engine.getProcess(processId);
    const elementCount = process.elements.size;
    const connectionCount = process.connections.size;
    
    // Apply auto-layout
    await this.engine.applyAutoLayout(processId, algorithm);
    
    return {
      content: [
        {
          type: 'text',
          text: `Applied ${algorithm} auto-layout to process ${processId}\n\nRepositioned ${elementCount} elements and ${connectionCount} connections\n\nElements are now positioned with proper spacing to avoid visual overlap.`
        }
      ]
    };
  }
}