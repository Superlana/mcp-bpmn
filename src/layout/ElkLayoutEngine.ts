/**
 * ELK Layout Engine integration for BPMN diagram layout
 */

import ELK, { ElkNode, ElkExtendedEdge, LayoutOptions } from 'elkjs';
import { IntermediateGraph, GraphNode, GraphEdge } from './GraphStructure.js';

export interface LayoutedNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  ports?: LayoutedPort[];
}

export interface LayoutedPort {
  id: string;
  x: number;
  y: number;
  side: 'north' | 'south' | 'east' | 'west';
}

export interface LayoutedEdge {
  id: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
  sections: Array<{
    startPoint: { x: number; y: number };
    endPoint: { x: number; y: number };
    bendPoints?: Array<{ x: number; y: number }>;
  }>;
  label?: string;
}

export interface LayoutResult {
  nodes: LayoutedNode[];
  edges: LayoutedEdge[];
  width: number;
  height: number;
}

export class ElkLayoutEngine {
  private elk: InstanceType<typeof ELK>;

  constructor() {
    this.elk = new ELK();
  }

  async layout(graph: IntermediateGraph): Promise<LayoutResult> {
    const elkGraph = this.convertToElkGraph(graph);
    const layoutedGraph = await this.elk.layout(elkGraph);
    return this.convertFromElkGraph(layoutedGraph, graph);
  }

  private convertToElkGraph(graph: IntermediateGraph): ElkNode {
    const elkNodes: ElkNode[] = graph.nodes.map(node => ({
      id: node.id,
      width: node.width,
      height: node.height,
      layoutOptions: this.getNodeLayoutOptions(node),
      ports: node.ports?.map(port => ({
        id: port.id,
        layoutOptions: {
          'port.side': port.side.toUpperCase(),
          ...(port.offset ? { 'port.index': Math.round(port.offset * 100).toString() } : {})
        }
      }))
    }));

    const elkEdges: ElkExtendedEdge[] = graph.edges.map(edge => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
      layoutOptions: this.getEdgeLayoutOptions(edge)
    }));

    return {
      id: 'root',
      layoutOptions: this.getGraphLayoutOptions(graph),
      children: elkNodes,
      edges: elkEdges
    };
  }

  private getGraphLayoutOptions(graph: IntermediateGraph): LayoutOptions {
    return {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '120',
      'elk.layered.spacing.nodeNodeBetweenLayers': '120',
      'elk.layered.spacing.edgeNodeBetweenLayers': '40',
      'elk.spacing.nodeNodeHorizontal': '150',
      'elk.layered.nodePlacement.strategy': 'INTERACTIVE',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.cycleBreaking.strategy': 'GREEDY',
      'elk.spacing.portPort': '20',
      'elk.spacing.portsSurrounding': '15',
      'elk.layered.thoroughness': '10',
      'elk.layered.unnecessaryBendpoints': 'false',
      'elk.edge.routing': 'ORTHOGONAL',
      'elk.edgeRouting.orthogonal.bendPoints': 'true',
      'elk.edgeRouting.orthogonal.cornerRadius': '0',
      'elk.layered.edgeRouting.bendPoint': 'true',
      ...graph.properties
    };
  }

  private getNodeLayoutOptions(node: GraphNode): LayoutOptions {
    const options: LayoutOptions = {
      'portConstraints': 'FIXED_SIDE'
    };

    // Special handling for different node types
    switch (node.type) {
      case 'gateway':
        options['nodeLabels.placement'] = 'H_CENTER V_TOP OUTSIDE';
        options['nodeSize.constraints'] = 'NODE_LABELS PORTS MINIMUM_SIZE';
        break;
      case 'task':
        options['nodeLabels.placement'] = 'H_CENTER V_CENTER INSIDE';
        options['nodeSize.constraints'] = 'NODE_LABELS MINIMUM_SIZE';
        break;
      case 'start':
      case 'end':
        options['nodeLabels.placement'] = 'H_CENTER V_BOTTOM OUTSIDE';
        options['nodeSize.constraints'] = 'MINIMUM_SIZE';
        break;
    }

    return options;
  }

  private getEdgeLayoutOptions(edge: GraphEdge): LayoutOptions {
    const options: LayoutOptions = {
      'elk.edge.routing': 'ORTHOGONAL'
    };

    if (edge.label) {
      options['edgeLabels.placement'] = 'HEAD';
      options['edgeLabels.inline'] = 'false';
    }

    return options;
  }

  private convertFromElkGraph(elkGraph: ElkNode, originalGraph: IntermediateGraph): LayoutResult {
    const nodes: LayoutedNode[] = (elkGraph.children || []).map(elkNode => {
      return {
        id: elkNode.id,
        x: elkNode.x || 0,
        y: elkNode.y || 0,
        width: elkNode.width || 0,
        height: elkNode.height || 0,
        ports: elkNode.ports?.map(elkPort => ({
          id: elkPort.id,
          x: (elkNode.x || 0) + (elkPort.x || 0),
          y: (elkNode.y || 0) + (elkPort.y || 0),
          side: this.mapElkSideToGraphSide(elkPort.layoutOptions?.['port.side'] as string)
        }))
      };
    });

    const edges: LayoutedEdge[] = (elkGraph.edges || []).map(elkEdge => {
      const originalEdge = originalGraph.edges.find(e => e.id === elkEdge.id);
      
      return {
        id: elkEdge.id,
        source: Array.isArray(elkEdge.sources) ? elkEdge.sources[0] : elkEdge.sources,
        target: Array.isArray(elkEdge.targets) ? elkEdge.targets[0] : elkEdge.targets,
        sourcePort: undefined,
        targetPort: undefined,
        sections: elkEdge.sections?.map(section => ({
          startPoint: section.startPoint,
          endPoint: section.endPoint,
          bendPoints: section.bendPoints
        })) || [{
          startPoint: { x: 0, y: 0 },
          endPoint: { x: 0, y: 0 }
        }],
        label: originalEdge?.label
      };
    });

    return {
      nodes,
      edges,
      width: elkGraph.width || 0,
      height: elkGraph.height || 0
    };
  }

  private mapElkSideToGraphSide(elkSide: string): 'north' | 'south' | 'east' | 'west' {
    switch (elkSide?.toUpperCase()) {
      case 'NORTH': return 'north';
      case 'SOUTH': return 'south';
      case 'EAST': return 'east';
      case 'WEST': return 'west';
      default: return 'east';
    }
  }
}