/**
 * Intermediate graph structure for layout engines
 * This structure acts as a bridge between Mermaid AST and layout engines like ELK
 */

export interface GraphNode {
  id: string;
  type: 'start' | 'end' | 'task' | 'gateway' | 'subprocess';
  label: string;
  width: number;
  height: number;
  ports?: GraphPort[];
  properties?: Record<string, any>;
}

export interface GraphPort {
  id: string;
  side: 'north' | 'south' | 'east' | 'west';
  offset?: number; // Position along the side (0-1)
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
  label?: string;
  properties?: Record<string, any>;
}

export interface IntermediateGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  properties?: Record<string, any>;
}

/**
 * BPMN-specific element dimensions
 */
export const BPMN_DIMENSIONS = {
  startEvent: { width: 36, height: 36 },
  endEvent: { width: 36, height: 36 },
  task: { width: 100, height: 80 },
  gateway: { width: 50, height: 50 },
  subprocess: { width: 150, height: 100 }
} as const;

/**
 * Convert Mermaid AST to intermediate graph structure
 */
export function createIntermediateGraph(
  mermaidNodes: Array<{ id: string; type: string; label: string }>,
  mermaidEdges: Array<{ source: string; target: string; label?: string }>
): IntermediateGraph {
  const nodes: GraphNode[] = mermaidNodes.map(node => {
    const nodeType = mapNodeType(node.type);
    const dimensions = getDimensions(nodeType);
    
    return {
      id: node.id,
      type: nodeType,
      label: node.label,
      width: dimensions.width,
      height: dimensions.height,
      ports: createPortsForNode(nodeType, node.id, mermaidEdges),
      properties: {
        originalType: node.type
      }
    };
  });

  const edges: GraphEdge[] = mermaidEdges.map((edge, index) => ({
    id: `edge_${index}`,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    sourcePort: findSourcePort(edge.source, edge.target, nodes),
    targetPort: findTargetPort(edge.target, edge.source, nodes)
  }));

  return {
    nodes,
    edges,
    properties: {
      algorithm: 'layered',
      direction: 'DOWN'
    }
  };
}

function mapNodeType(mermaidType: string): GraphNode['type'] {
  switch (mermaidType) {
    case 'start':
      return 'start';
    case 'end':
      return 'end';
    case 'process':
      return 'task';
    case 'decision':
      return 'gateway';
    case 'subprocess':
      return 'subprocess';
    default:
      return 'task';
  }
}

function getDimensions(nodeType: GraphNode['type']): { width: number; height: number } {
  switch (nodeType) {
    case 'start':
      return BPMN_DIMENSIONS.startEvent;
    case 'end':
      return BPMN_DIMENSIONS.endEvent;
    case 'task':
      return BPMN_DIMENSIONS.task;
    case 'gateway':
      return BPMN_DIMENSIONS.gateway;
    case 'subprocess':
      return BPMN_DIMENSIONS.subprocess;
    default:
      return BPMN_DIMENSIONS.task;
  }
}

function createPortsForNode(
  nodeType: GraphNode['type'],
  nodeId: string,
  edges: Array<{ source: string; target: string; label?: string }>
): GraphPort[] {
  const ports: GraphPort[] = [];
  
  // Find incoming and outgoing edges for this node
  const incomingEdges = edges.filter(edge => edge.target === nodeId);
  const outgoingEdges = edges.filter(edge => edge.source === nodeId);
  
  if (nodeType === 'gateway') {
    // Special port handling for gateways
    
    // Always have a north port for incoming
    if (incomingEdges.length > 0) {
      ports.push({ id: `${nodeId}_north`, side: 'north' });
    }
    
    // Create ports based on outgoing edges count
    if (outgoingEdges.length === 1) {
      // 1 outgoing: south port
      ports.push({ id: `${nodeId}_south`, side: 'south' });
    } else if (outgoingEdges.length === 2) {
      // 2 outgoing: west and east ports
      ports.push({ id: `${nodeId}_west`, side: 'west' });
      ports.push({ id: `${nodeId}_east`, side: 'east' });
    } else if (outgoingEdges.length === 3) {
      // 3 outgoing: south, west, east ports
      ports.push({ id: `${nodeId}_south`, side: 'south' });
      ports.push({ id: `${nodeId}_west`, side: 'west' });
      ports.push({ id: `${nodeId}_east`, side: 'east' });
    } else {
      // More than 3: distribute around the gateway
      const sides = ['south', 'west', 'east', 'north'] as const;
      outgoingEdges.forEach((_, index) => {
        const side = sides[index % sides.length];
        ports.push({ id: `${nodeId}_${side}_${index}`, side });
      });
    }
  } else {
    // Standard ports for non-gateway nodes
    if (incomingEdges.length > 0) {
      ports.push({ id: `${nodeId}_in`, side: 'west' });
    }
    if (outgoingEdges.length > 0) {
      ports.push({ id: `${nodeId}_out`, side: 'east' });
    }
  }
  
  return ports;
}

function findSourcePort(sourceNodeId: string, targetNodeId: string, nodes: GraphNode[]): string | undefined {
  const sourceNode = nodes.find(n => n.id === sourceNodeId);
  if (!sourceNode || !sourceNode.ports) return undefined;
  
  if (sourceNode.type === 'gateway') {
    // For gateways, determine port based on flow logic
    const outPorts = sourceNode.ports.filter(p => p.side !== 'north');
    
    if (outPorts.length === 1) {
      return outPorts[0].id; // Single south port
    } else if (outPorts.length >= 2) {
      // For multiple ports, we'll need more logic to determine which port to use
      // For now, alternate between available ports
      const portIndex = Math.abs(targetNodeId.charCodeAt(0)) % outPorts.length;
      return outPorts[portIndex].id;
    }
  }
  
  // For non-gateways, use the standard out port
  return sourceNode.ports.find(p => p.id.endsWith('_out'))?.id;
}

function findTargetPort(targetNodeId: string, _sourceNodeId: string, nodes: GraphNode[]): string | undefined {
  const targetNode = nodes.find(n => n.id === targetNodeId);
  if (!targetNode || !targetNode.ports) return undefined;
  
  // For most nodes, use the standard in port
  return targetNode.ports.find(p => p.id.endsWith('_in') || p.id.endsWith('_north'))?.id;
}