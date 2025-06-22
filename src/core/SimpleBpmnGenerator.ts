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
    
    flows.forEach(flow => {
      const sourceElement = elements.find(e => e.id === flow.source);
      const targetElement = elements.find(e => e.id === flow.target);
      
      if (sourceElement && targetElement) {
        const waypoints = this.calculateWaypoints(sourceElement, targetElement);
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
  
  private calculateWaypoints(sourceElement: any, targetElement: any): string {
    // Calculate center points of source and target elements
    const sourceX = (sourceElement.x || 0) + (sourceElement.type.includes('Gateway') ? 25 : sourceElement.type.includes('Event') ? 18 : 50);
    const sourceY = (sourceElement.y || 0) + (sourceElement.type.includes('Gateway') ? 25 : sourceElement.type.includes('Event') ? 18 : 40);
    
    const targetX = (targetElement.x || 0) + (targetElement.type.includes('Gateway') ? 25 : targetElement.type.includes('Event') ? 18 : 50);
    const targetY = (targetElement.y || 0) + (targetElement.type.includes('Gateway') ? 25 : targetElement.type.includes('Event') ? 18 : 40);
    
    // Check if this is a loop back (target is before source)
    const isLoopBack = targetX < sourceX - 100;
    
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