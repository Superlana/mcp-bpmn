import type { MermaidAST, MermaidNode } from '../converters/ASTTypes.js';
import type { ConversionResult } from '../converters/types.js';
import type { LayoutResult } from './LayoutEngine.js';

export class SimpleBpmnGenerator {
  private idCounter = 0;
  
  private generateDefinitionsId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'Definitions_';
    for (let i = 0; i < 7; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  generateBpmn(ast: MermaidAST, processName: string, layout?: LayoutResult): ConversionResult {
    const startTime = Date.now();
    const processId = this.generateId('Process');
    const elements: ConversionResult['elements'] = [];
    const flows: ConversionResult['flows'] = [];
    const pools: ConversionResult['pools'] = [];
    const nodeIdMap = new Map<string, string>();
    
    // First, clean up the AST to handle labeled edges properly
    const cleanedNodes = this.cleanupNodes(ast);
    
    // Convert subgraphs to pools
    for (const subgraph of ast.subgraphs) {
      pools.push({
        id: this.generateId('Pool'),
        name: subgraph.title,
        lanes: []
      });
    }
    
    // Convert nodes
    for (const node of cleanedNodes) {
      const bpmnId = `${this.getBpmnType(node)}_${node.id}`;
      const bpmnType = this.mapNodeType(node);
      
      // Use layout positions if available, otherwise fall back to simple grid
      let x = 100 + (elements.length * 150);
      let y = 100;
      
      if (layout?.nodes.has(node.id)) {
        const layoutNode = layout.nodes.get(node.id)!;
        x = layoutNode.position.x - layoutNode.width / 2; // Convert from center to top-left
        y = layoutNode.position.y - layoutNode.height / 2;
      }
      
      elements.push({
        id: bpmnId,
        type: bpmnType,
        businessObject: {} as any,
        x,
        y
      });
      
      nodeIdMap.set(node.id, bpmnId);
    }
    
    // Convert edges
    for (const edge of ast.edges) {
      const sourceId = nodeIdMap.get(edge.source);
      const targetId = nodeIdMap.get(edge.target);
      
      if (sourceId && targetId) {
        const flowId = this.generateId('Flow');
        flows.push({
          id: flowId,
          source: sourceId,
          target: targetId,
          label: edge.label
        });
      }
    }
    
    // Generate XML
    const xml = this.generateXml(processId, processName, elements, flows, nodeIdMap, cleanedNodes, ast.subgraphs);
    
    // Calculate statistics
    const statistics = {
      totalElements: elements.length,
      tasks: elements.filter(e => e.type.includes('Task')).length,
      events: elements.filter(e => e.type.includes('Event')).length,
      gateways: elements.filter(e => e.type.includes('Gateway')).length,
      flows: flows.length
    };
    
    return {
      processId,
      xml,
      elements,
      flows,
      pools,
      lanes: [],
      statistics,
      warnings: [],
      confidence: 0.9,
      conversionTime: Date.now() - startTime,
      stats: {
        nodeCount: ast.nodes.length,
        edgeCount: ast.edges.length
      }
    };
  }
  
  private cleanupNodes(ast: MermaidAST): MermaidNode[] {
    // Remove duplicate nodes that are created by the parser for labeled edges
    const nodeMap = new Map<string, MermaidNode>();
    const realNodeIds = new Set<string>();
    
    // First pass: identify real nodes (those without edge labels in their IDs)
    for (const node of ast.nodes) {
      if (!node.id.includes('|')) {
        realNodeIds.add(node.id);
        nodeMap.set(node.id, node);
      }
    }
    
    // Second pass: only include real nodes
    return Array.from(nodeMap.values());
  }
  
  private generateId(type: string): string {
    const prefix = type.replace('bpmn:', '');
    return `${prefix}_${++this.idCounter}`;
  }
  
  private getBpmnType(node: MermaidNode): string {
    const mapping: Record<string, string> = {
      'start': 'StartEvent',
      'end': 'EndEvent',
      'process': 'Task',
      'decision': 'Gateway',
      'subprocess': 'SubProcess',
      'data': 'DataObject',
      'terminator': 'Event'
    };
    return mapping[node.type] || 'Task';
  }
  
  private mapNodeType(node: MermaidNode): string {
    const mapping: Record<string, string> = {
      'start': 'bpmn:StartEvent',
      'end': 'bpmn:EndEvent',
      'process': 'bpmn:Task',
      'decision': 'bpmn:ExclusiveGateway',
      'subprocess': 'bpmn:SubProcess',
      'data': 'bpmn:DataObjectReference',
      'terminator': 'bpmn:IntermediateThrowEvent'
    };
    return mapping[node.type] || 'bpmn:Task';
  }
  
  private generateXml(
    processId: string,
    _processName: string,
    elements: ConversionResult['elements'],
    flows: ConversionResult['flows'],
    nodeIdMap: Map<string, string>,
    cleanedNodes: MermaidNode[],
    subgraphs: MermaidAST['subgraphs'] = []
  ): string {
    const nodesByBpmnId = new Map<string, MermaidNode>();
    cleanedNodes.forEach(node => {
      const bpmnId = nodeIdMap.get(node.id);
      if (bpmnId) {
        nodesByBpmnId.set(bpmnId, node);
      }
    });
    
    let processElements = '';
    
    // Add elements
    for (const element of elements) {
      const node = nodesByBpmnId.get(element.id);
      const name = node ? node.label : element.id;
      
      switch (element.type) {
        case 'bpmn:StartEvent':
          // Start events typically don't have names unless specifically labeled
          if (name !== element.id && !name.toLowerCase().includes('start')) {
            processElements += `    <bpmn:startEvent id="${element.id}" name="${name}" />\n`;
          } else {
            processElements += `    <bpmn:startEvent id="${element.id}" />\n`;
          }
          break;
        case 'bpmn:EndEvent':
          // End events typically don't have names unless specifically labeled
          if (name !== element.id && !name.toLowerCase().includes('end')) {
            processElements += `    <bpmn:endEvent id="${element.id}" name="${name}" />\n`;
          } else {
            processElements += `    <bpmn:endEvent id="${element.id}" />\n`;
          }
          break;
        case 'bpmn:Task':
          processElements += `    <bpmn:task id="${element.id}" name="${name}" />\n`;
          break;
        case 'bpmn:ExclusiveGateway':
          processElements += `    <bpmn:exclusiveGateway id="${element.id}" name="${name}" />\n`;
          break;
        case 'bpmn:SubProcess':
          processElements += `    <bpmn:subProcess id="${element.id}" name="${name}" />\n`;
          break;
        default:
          processElements += `    <bpmn:task id="${element.id}" name="${name}" />\n`;
      }
    }
    
    // Add flows
    for (const flow of flows) {
      if (flow.label) {
        // Flow with condition
        const conditionXml = `\n      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${this.escapeXml(flow.label)}</bpmn:conditionExpression>\n    `;
        processElements += `    <bpmn:sequenceFlow id="${flow.id}" sourceRef="${flow.source}" targetRef="${flow.target}" name="${this.escapeXml(flow.label)}">${conditionXml}</bpmn:sequenceFlow>\n`;
      } else {
        // Simple flow - self-closing
        processElements += `    <bpmn:sequenceFlow id="${flow.id}" sourceRef="${flow.source}" targetRef="${flow.target}" />\n`;
      }
    }
    
    // Generate diagram elements
    let diagramElements = '';
    elements.forEach((element, index) => {
      const x = element.x || 100 + (index % 5) * 150;
      const y = element.y || 100 + Math.floor(index / 5) * 100;
      const width = element.type.includes('Gateway') ? 50 : element.type.includes('Event') ? 36 : 100;
      const height = element.type.includes('Gateway') ? 50 : element.type.includes('Event') ? 36 : 80;
      
      diagramElements += `      <bpmndi:BPMNShape id="${element.id}_di" bpmnElement="${element.id}">
        <dc:Bounds x="${x}" y="${y}" width="${width}" height="${height}"/>
      </bpmndi:BPMNShape>\n`;
    });
    
    flows.forEach((flow) => {
      const sourceElement = elements.find(e => e.id === flow.source);
      const targetElement = elements.find(e => e.id === flow.target);
      
      if (sourceElement && targetElement) {
        // Get gateway outgoing flows info for special diamond attachment logic
        const gatewayFlowInfo = this.getGatewayFlowInfo(flow, flows);
        const waypoints = this.calculateWaypoints(sourceElement, targetElement, gatewayFlowInfo);
        diagramElements += `      <bpmndi:BPMNEdge id="${flow.id}_di" bpmnElement="${flow.id}">
${waypoints}      </bpmndi:BPMNEdge>\n`;
      } else {
        diagramElements += `      <bpmndi:BPMNEdge id="${flow.id}_di" bpmnElement="${flow.id}"/>\n`;
      }
    });
    
    // Add collaboration if there are subgraphs
    let collaborationXml = '';
    if (subgraphs.length > 0) {
      collaborationXml = `  <bpmn:collaboration id="Collaboration_1">
${subgraphs.map((sg, i) => `    <bpmn:participant id="Participant_${i + 1}" name="${this.escapeXml(sg.title)}" processRef="${processId}"/>`).join('\n')}
  </bpmn:collaboration>\n`;
    }
    
    const definitionsId = this.generateDefinitionsId();
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="${definitionsId}" targetNamespace="http://bpmn.io/schema/bpmn" exporter="mermaid-2-bpmn" exporterVersion="1.0.0">
${collaborationXml}  <bpmn:process id="${processId}" isExecutable="true">
${processElements}  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">
${diagramElements}    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
  }
  
  private getGatewayFlowInfo(currentFlow: any, allFlows: any[]): { 
    isFromGateway: boolean; 
    totalOutgoingFlows: number; 
    currentFlowIndex: number;
    flowLabels: string[];
  } {
    const sourceId = currentFlow.source;
    
    // Find all outgoing flows from the same source
    const outgoingFlows = allFlows.filter(flow => flow.source === sourceId);
    const isFromGateway = sourceId.includes('Gateway');
    
    if (!isFromGateway) {
      return {
        isFromGateway: false,
        totalOutgoingFlows: outgoingFlows.length,
        currentFlowIndex: 0,
        flowLabels: []
      };
    }
    
    // Sort flows to ensure consistent ordering (by label if available, then by target)
    const sortedFlows = outgoingFlows.sort((a, b) => {
      // Prioritize "No" flows to go left, "Yes" flows to go right
      if (a.label && b.label) {
        if (a.label.toLowerCase() === 'no' && b.label.toLowerCase() === 'yes') return -1;
        if (a.label.toLowerCase() === 'yes' && b.label.toLowerCase() === 'no') return 1;
        return a.label.localeCompare(b.label);
      }
      return a.target.localeCompare(b.target);
    });
    
    const currentFlowIndex = sortedFlows.findIndex(flow => 
      flow.source === currentFlow.source && flow.target === currentFlow.target
    );
    
    return {
      isFromGateway: true,
      totalOutgoingFlows: outgoingFlows.length,
      currentFlowIndex: currentFlowIndex,
      flowLabels: sortedFlows.map(flow => flow.label || '')
    };
  }

  private calculateWaypoints(sourceElement: any, targetElement: any, gatewayFlowInfo?: {
    isFromGateway: boolean;
    totalOutgoingFlows: number;
    currentFlowIndex: number;
    flowLabels: string[];
  }): string {
    // Get element dimensions
    const sourceWidth = sourceElement.type.includes('Gateway') ? 50 : sourceElement.type.includes('Event') ? 36 : 100;
    const sourceHeight = sourceElement.type.includes('Gateway') ? 50 : sourceElement.type.includes('Event') ? 36 : 80;
    const targetWidth = targetElement.type.includes('Gateway') ? 50 : targetElement.type.includes('Event') ? 36 : 100;
    const targetHeight = targetElement.type.includes('Gateway') ? 50 : targetElement.type.includes('Event') ? 36 : 80;
    
    // Calculate bounding boxes
    const sourceBox = {
      x: sourceElement.x || 0,
      y: sourceElement.y || 0,
      width: sourceWidth,
      height: sourceHeight,
      centerX: (sourceElement.x || 0) + sourceWidth / 2,
      centerY: (sourceElement.y || 0) + sourceHeight / 2
    };
    
    const targetBox = {
      x: targetElement.x || 0,
      y: targetElement.y || 0,
      width: targetWidth,
      height: targetHeight,
      centerX: (targetElement.x || 0) + targetWidth / 2,
      centerY: (targetElement.y || 0) + targetHeight / 2
    };
    
    // Calculate edge connection points with special diamond logic
    const sourceConnection = this.calculateEdgeConnectionPoint(sourceBox, targetBox.centerX, targetBox.centerY, true, gatewayFlowInfo);
    const targetConnection = this.calculateEdgeConnectionPoint(targetBox, sourceBox.centerX, sourceBox.centerY, false);
    
    const sourceX = sourceConnection.sourceX!;
    const sourceY = sourceConnection.sourceY!;
    const targetX = targetConnection.targetX!;
    const targetY = targetConnection.targetY!;
    
    // Check if this is a loop back (target is before source)
    const isLoopBack = targetBox.centerX < sourceBox.centerX - 100;
    
    if (isLoopBack) {
      // Create a curved path for loops
      const midY = Math.max(sourceY, targetY) + 50;
      return `        <di:waypoint x="${sourceX}" y="${sourceY}" />
        <di:waypoint x="${sourceX + 30}" y="${midY}" />
        <di:waypoint x="${targetX - 30}" y="${midY}" />
        <di:waypoint x="${targetX}" y="${targetY}" />
`;
    }
    
    // For normal flows, use simple routing
    return `        <di:waypoint x="${sourceX}" y="${sourceY}" />
        <di:waypoint x="${targetX}" y="${targetY}" />
`;
  }
  
  private calculateEdgeConnectionPoint(
    elementBox: { x: number; y: number; width: number; height: number; centerX: number; centerY: number },
    targetCenterX: number,
    targetCenterY: number,
    isSource: boolean,
    gatewayFlowInfo?: {
      isFromGateway: boolean;
      totalOutgoingFlows: number;
      currentFlowIndex: number;
      flowLabels: string[];
    }
  ): { sourceX: number; sourceY: number; targetX: number; targetY: number } {
    // Special logic for diamond gateways as source
    if (isSource && gatewayFlowInfo?.isFromGateway && elementBox.width === 50 && elementBox.height === 50) {
      let connectionX: number;
      let connectionY: number;
      
      const { totalOutgoingFlows, currentFlowIndex } = gatewayFlowInfo;
      
      if (totalOutgoingFlows === 1) {
        // 1 arrow: bottom point
        connectionX = elementBox.centerX;
        connectionY = elementBox.y + elementBox.height;
      } else if (totalOutgoingFlows === 2) {
        // 2 arrows: left and right points
        if (currentFlowIndex === 0) {
          // Left point
          connectionX = elementBox.x;
          connectionY = elementBox.centerY;
        } else {
          // Right point
          connectionX = elementBox.x + elementBox.width;
          connectionY = elementBox.centerY;
        }
      } else if (totalOutgoingFlows === 3) {
        // 3 arrows: bottom, left, right points
        if (currentFlowIndex === 0) {
          // Bottom point
          connectionX = elementBox.centerX;
          connectionY = elementBox.y + elementBox.height;
        } else if (currentFlowIndex === 1) {
          // Left point
          connectionX = elementBox.x;
          connectionY = elementBox.centerY;
        } else {
          // Right point
          connectionX = elementBox.x + elementBox.width;
          connectionY = elementBox.centerY;
        }
      } else {
        // More than 3 arrows: fall back to normal calculation
        return this.calculateNormalEdgeConnection(elementBox, targetCenterX, targetCenterY, isSource);
      }
      
      return {
        sourceX: Math.round(connectionX),
        sourceY: Math.round(connectionY),
        targetX: 0,
        targetY: 0
      };
    }
    
    // Normal edge calculation for non-gateway elements or target elements
    return this.calculateNormalEdgeConnection(elementBox, targetCenterX, targetCenterY, isSource);
  }
  
  private calculateNormalEdgeConnection(
    elementBox: { x: number; y: number; width: number; height: number; centerX: number; centerY: number },
    targetCenterX: number,
    targetCenterY: number,
    isSource: boolean
  ): { sourceX: number; sourceY: number; targetX: number; targetY: number } {
    const dx = targetCenterX - elementBox.centerX;
    const dy = targetCenterY - elementBox.centerY;
    
    // Calculate which edge the line intersects with
    const xRatio = Math.abs(dx) / (elementBox.width / 2);
    const yRatio = Math.abs(dy) / (elementBox.height / 2);
    
    let connectionX, connectionY;
    
    if (xRatio > yRatio) {
      // Connection is on left or right edge
      if (dx > 0) {
        // Right edge
        connectionX = elementBox.x + elementBox.width;
        connectionY = elementBox.centerY + (dy * elementBox.width / 2) / Math.abs(dx);
      } else {
        // Left edge
        connectionX = elementBox.x;
        connectionY = elementBox.centerY + (dy * elementBox.width / 2) / Math.abs(dx);
      }
    } else {
      // Connection is on top or bottom edge
      if (dy > 0) {
        // Bottom edge
        connectionX = elementBox.centerX + (dx * elementBox.height / 2) / Math.abs(dy);
        connectionY = elementBox.y + elementBox.height;
      } else {
        // Top edge
        connectionX = elementBox.centerX + (dx * elementBox.height / 2) / Math.abs(dy);
        connectionY = elementBox.y;
      }
    }
    
    // Ensure connection point is within element bounds
    connectionX = Math.max(elementBox.x, Math.min(elementBox.x + elementBox.width, connectionX));
    connectionY = Math.max(elementBox.y, Math.min(elementBox.y + elementBox.height, connectionY));
    
    const roundedX = Math.round(connectionX);
    const roundedY = Math.round(connectionY);
    
    if (isSource) {
      return { sourceX: roundedX, sourceY: roundedY, targetX: 0, targetY: 0 };
    } else {
      return { sourceX: 0, sourceY: 0, targetX: roundedX, targetY: roundedY };
    }
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/<br\s*\/?>/gi, ' ') // Replace <br> tags with spaces for better BPMN compatibility
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}