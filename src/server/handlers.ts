import { SimpleBpmnEngine } from '../core/SimpleBpmnEngine.js';
import { TypeMappings } from '../utils/TypeMappings.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { MermaidConverter } from '../converters/MermaidConverter.js';
import { FileManager } from '../utils/FileManager.js';
import { diagramContext } from '../core/DiagramContext.js';
import { promises as fs } from 'fs';
import { join } from 'path';

export class BpmnRequestHandler {
  private engine: SimpleBpmnEngine;
  private mermaidConverter: MermaidConverter;
  private fileManager: FileManager;

  constructor() {
    this.engine = new SimpleBpmnEngine();
    this.mermaidConverter = new MermaidConverter();
    this.fileManager = new FileManager();
  }

  async handleRequest(name: string, args: any): Promise<CallToolResult> {
    try {
      switch (name) {
        // Creation tools
        case 'new_bpmn':
          return await this.newBpmn(args);
        case 'new_from_mermaid':
          return await this.newFromMermaid(args);
          
        // File operations
        case 'open_bpmn':
          return await this.openBpmn(args);
        case 'open_mermaid_file':
          return await this.openMermaidFile(args);
        case 'save':
          return await this.save();
        case 'save_as':
          return await this.saveAs(args);
        case 'close':
          return await this.close();
        case 'current':
          return await this.current();
          
        // Element manipulation
        case 'add_event':
          return await this.addEvent(args);
        case 'add_activity':
          return await this.addActivity(args);
        case 'add_gateway':
          return await this.addGateway(args);
        case 'connect':
          return await this.connect(args);
        case 'add_pool':
          return await this.addPool(args);
        case 'add_lane':
          return await this.addLane(args);
          
        // Query and manipulation
        case 'list_elements':
          return await this.listElements(args);
        case 'get_element':
          return await this.getElement(args);
        case 'update_element':
          return await this.updateElement(args);
        case 'delete_element':
          return await this.deleteElement(args);
          
        // Utility tools
        case 'export':
          return await this.export(args);
        case 'validate':
          return await this.validate(args);
        case 'auto_layout':
          return await this.autoLayout(args);
          
        // File management
        case 'list_diagrams':
          return await this.listDiagrams();
        case 'delete_diagram_file':
          return await this.deleteDiagramFile(args);
        case 'get_diagrams_path':
          return await this.getDiagramsPath();
          
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

  // Creation tools
  private async newBpmn(args: any): Promise<CallToolResult> {
    const { name, type = 'process' } = args;
    const context = await this.engine.createProcess(name, type);
    
    diagramContext.setCurrent(context, name);
    
    return {
      content: [
        {
          type: 'text',
          text: `Created new ${type} diagram "${name}"`
        }
      ]
    };
  }

  private async newFromMermaid(args: any): Promise<CallToolResult> {
    const { name, mermaidCode } = args;
    
    // Convert Mermaid to BPMN
    const conversionResult = await this.mermaidConverter.convert(mermaidCode);
    
    // Import the XML into the engine
    const context = await this.engine.importXml(conversionResult.xml);
    
    // Update the name
    context.name = name;
    
    diagramContext.setCurrent(context, name);
    
    return {
      content: [
        {
          type: 'text',
          text: `Created new BPMN diagram "${name}" from Mermaid\nElements: ${conversionResult.stats.nodeCount} nodes, ${conversionResult.stats.edgeCount} flows`
        }
      ]
    };
  }

  // File operations
  private async openBpmn(args: any): Promise<CallToolResult> {
    const { filename } = args;
    
    const context = await this.engine.loadDiagram(filename);
    diagramContext.setCurrent(context, context.name, filename);
    
    return {
      content: [
        {
          type: 'text',
          text: `Opened BPMN diagram "${context.name}" from ${filename}\nElements: ${context.elements.size}, Connections: ${context.connections.size}`
        }
      ]
    };
  }

  private async openMermaidFile(args: any): Promise<CallToolResult> {
    const { filename } = args;
    
    // Read the Mermaid file
    const mermaidPath = join(this.engine.getDiagramsPath(), filename);
    const mermaidCode = await fs.readFile(mermaidPath, 'utf8');
    
    // Convert to BPMN
    const conversionResult = await this.mermaidConverter.convert(mermaidCode);
    
    // Import the XML
    const context = await this.engine.importXml(conversionResult.xml);
    
    // Extract name from filename
    const name = filename.replace(/\.(mmd|mermaid|txt)$/i, '');
    context.name = name;
    
    diagramContext.setCurrent(context, name);
    
    return {
      content: [
        {
          type: 'text',
          text: `Opened and converted Mermaid file "${filename}" to BPMN\nElements: ${conversionResult.stats.nodeCount} nodes, ${conversionResult.stats.edgeCount} flows`
        }
      ]
    };
  }

  private async save(): Promise<CallToolResult> {
    const info = diagramContext.getCurrentInfo();
    if (!info) {
      throw new Error('No current diagram to save');
    }
    
    if (!info.filename) {
      throw new Error('No filename set. Use save_as() to specify a filename');
    }
    
    const context = diagramContext.getCurrent();
    const saveResult = await this.fileManager.saveBpmnFile(context.xml || '', {
      filename: info.filename,
      overwrite: true
    });
    
    if (!saveResult.success) {
      throw new Error(saveResult.error || 'Failed to save file');
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `Saved diagram "${info.name}" to ${info.filename}`
        }
      ]
    };
  }

  private async saveAs(args: any): Promise<CallToolResult> {
    const { filename } = args;
    const context = diagramContext.getCurrent();
    const info = diagramContext.getCurrentInfo()!;
    
    const saveResult = await this.fileManager.saveBpmnFile(context.xml || '', {
      filename: filename,
      overwrite: false
    });
    
    if (!saveResult.success) {
      throw new Error(saveResult.error || 'Failed to save file');
    }
    
    diagramContext.updateFilename(filename);
    
    return {
      content: [
        {
          type: 'text',
          text: `Saved diagram "${info.name}" as ${filename}`
        }
      ]
    };
  }

  private async close(): Promise<CallToolResult> {
    const info = diagramContext.getCurrentInfo();
    if (!info) {
      throw new Error('No current diagram to close');
    }
    
    const name = info.name;
    diagramContext.clear();
    
    return {
      content: [
        {
          type: 'text',
          text: `Closed diagram "${name}"`
        }
      ]
    };
  }

  private async current(): Promise<CallToolResult> {
    const info = diagramContext.getCurrentInfo();
    
    if (!info) {
      return {
        content: [
          {
            type: 'text',
            text: 'No current diagram'
          }
        ]
      };
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(info, null, 2)
        }
      ]
    };
  }

  // Element manipulation methods
  private async addEvent(args: any): Promise<CallToolResult> {
    const { eventType, name, eventDefinition, position, attachTo } = args;
    const context = diagramContext.getCurrent();
    
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

    const element = await this.engine.createElement(context.id, elementDef);

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
    const { activityType, name, position, properties = {} } = args;
    const context = diagramContext.getCurrent();
    
    const bpmnType = TypeMappings.mapActivityType(activityType);
    const elementDef = {
      type: bpmnType,
      name,
      position,
      properties
    };

    const element = await this.engine.createElement(context.id, elementDef);

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
    const { gatewayType, name, position } = args;
    const context = diagramContext.getCurrent();
    
    const bpmnType = TypeMappings.mapGatewayType(gatewayType);
    const elementDef = {
      type: bpmnType,
      name,
      position
    };

    const element = await this.engine.createElement(context.id, elementDef);

    return {
      content: [
        {
          type: 'text',
          text: `Added ${gatewayType} gateway "${name || 'Gateway'}" with ID: ${element.id}`
        }
      ]
    };
  }

  private async connect(args: any): Promise<CallToolResult> {
    const { sourceId, targetId, label, condition } = args;
    const context = diagramContext.getCurrent();
    
    const connection = await this.engine.connect(context.id, sourceId, targetId, label);
    
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
    const { name, position, size } = args;
    const context = diagramContext.getCurrent();
    
    if (context.type !== 'collaboration') {
      throw new Error('Pools can only be added to collaborations. Create a collaboration first with new_bpmn()');
    }

    const elementDef = {
      type: 'bpmn:Participant',
      name,
      position: position || { x: 100, y: 100 },
      size: size || { width: 600, height: 250 }
    };

    const element = await this.engine.createElement(context.id, elementDef);

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
    const { poolId: _poolId, name: _name, position: _position = 'bottom' } = args;
    
    // For SimpleBpmnEngine, lanes are not yet fully implemented
    throw new Error('Lanes are not yet implemented in SimpleBpmnEngine. Use pools instead.');
  }

  // Query and manipulation methods
  private async listElements(args: any): Promise<CallToolResult> {
    const { elementType } = args;
    const context = diagramContext.getCurrent();
    
    const elements = Array.from(context.elements.values());
    const connections = Array.from(context.connections.values());
    
    const filteredElements = elements.filter((e: any) => {
      if (elementType) {
        return e.type === elementType;
      }
      return true;
    });

    const elementList = filteredElements.map((e: any) => {
      const incoming = connections.filter((c: any) => c.target === e.id);
      const outgoing = connections.filter((c: any) => c.source === e.id);
      
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
    const { elementId } = args;
    const context = diagramContext.getCurrent();
    
    const element = context.elements.get(elementId);
    const connections = Array.from(context.connections.values());
    
    if (!element) {
      throw new Error(`Element ${elementId} not found`);
    }

    const incoming = connections.filter((c: any) => c.target === elementId);
    const outgoing = connections.filter((c: any) => c.source === elementId);

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
    const { elementId, name, properties } = args;
    const context = diagramContext.getCurrent();
    
    const element = context.elements.get(elementId);
    
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

    // Regenerate XML
    context.xml = await this.engine.exportXml(context.id, true);

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
    const { elementId } = args;
    const context = diagramContext.getCurrent();
    
    if (!context.elements.has(elementId)) {
      throw new Error(`Element ${elementId} not found`);
    }

    // Remove element
    context.elements.delete(elementId);
    
    // Remove any connections involving this element
    const connectionsToRemove = [];
    for (const [connId, conn] of context.connections) {
      if (conn.source === elementId || conn.target === elementId) {
        connectionsToRemove.push(connId);
      }
    }
    
    connectionsToRemove.forEach(connId => {
      context.connections.delete(connId);
    });

    // Regenerate XML
    context.xml = await this.engine.exportXml(context.id, true);

    return {
      content: [
        {
          type: 'text',
          text: `Deleted element ${elementId} and ${connectionsToRemove.length} associated connections`
        }
      ]
    };
  }

  // Utility methods
  private async export(args: any): Promise<CallToolResult> {
    const { format = 'xml', formatted = true } = args;
    const context = diagramContext.getCurrent();
    
    if (format === 'svg') {
      throw new Error('SVG export is not yet implemented in SimpleBpmnEngine');
    }
    
    const content = await this.engine.exportXml(context.id, formatted);

    return {
      content: [
        {
          type: 'text',
          text: content
        }
      ]
    };
  }

  private async validate(_args: any): Promise<CallToolResult> {
    const context = diagramContext.getCurrent();
    
    const elements = Array.from(context.elements.values());
    const connections = Array.from(context.connections.values());
    
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for start events
    const startEvents = elements.filter((e: any) => e.type === 'bpmn:StartEvent');
    if (startEvents.length === 0) {
      errors.push('Process must have at least one start event');
    }

    // Check for end events
    const endEvents = elements.filter((e: any) => e.type === 'bpmn:EndEvent');
    if (endEvents.length === 0) {
      warnings.push('Process should have at least one end event');
    }

    // Check for disconnected elements
    elements.forEach((element: any) => {
      const incomingConnections = connections.filter((c: any) => c.target === element.id);
      const outgoingConnections = connections.filter((c: any) => c.source === element.id);
      
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

  private async autoLayout(args: any): Promise<CallToolResult> {
    const { algorithm = 'horizontal' } = args;
    const context = diagramContext.getCurrent();
    
    const elementCount = context.elements.size;
    const connectionCount = context.connections.size;
    
    // Apply auto-layout
    await this.engine.applyAutoLayout(context.id, algorithm);
    
    return {
      content: [
        {
          type: 'text',
          text: `Applied ${algorithm} auto-layout to current diagram\n\nRepositioned ${elementCount} elements and ${connectionCount} connections.`
        }
      ]
    };
  }

  // File management methods
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

  private async deleteDiagramFile(args: any): Promise<CallToolResult> {
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
}