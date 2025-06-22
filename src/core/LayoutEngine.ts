import type { MermaidAST, MermaidNode } from '../converters/ASTTypes.js';

export interface Position {
  x: number;
  y: number;
}

export interface LayoutNode {
  id: string;
  position: Position;
  width: number;
  height: number;
}

export interface LayoutResult {
  nodes: Map<string, LayoutNode>;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export class LayoutEngine {
  private readonly DEFAULT_SPACING = {
    horizontal: 150,
    vertical: 100,
    laneVertical: 150,
    poolHorizontal: 50,
    gatewayBranchOffset: 80
  };

  private readonly ELEMENT_SIZES = {
    'start': { width: 36, height: 36 },
    'end': { width: 36, height: 36 },
    'process': { width: 100, height: 80 },
    'decision': { width: 50, height: 50 },
    'subprocess': { width: 150, height: 100 },
    'data': { width: 36, height: 50 },
    'terminator': { width: 36, height: 36 }
  };

  layout(ast: MermaidAST): LayoutResult {
    const layoutNodes = new Map<string, LayoutNode>();
    const levels = this.computeLevels(ast);
    const gatewayBranches = this.identifyGatewayBranches(ast);
    const spacing = this.calculateDynamicSpacing(ast);
    
    let maxY = 100;
    
    levels.forEach((level, depth) => {
      const baseY = 100 + depth * spacing.vertical;
      const totalWidth = this.calculateLevelWidth(level);
      let currentX = (800 - totalWidth) / 2;
      
      level.forEach((node, _nodeIndex) => {
        const size = this.ELEMENT_SIZES[node.type] || this.ELEMENT_SIZES.process;
        let y = baseY;
        
        // Handle gateway branch positioning with better spacing
        if (this.isGatewayBranchNode(node, gatewayBranches, ast)) {
          const branchInfo = this.getGatewayBranchInfo(node, gatewayBranches, ast);
          if (branchInfo) {
            // Use larger offset for gateway branches to prevent overlap
            const branchOffset = spacing.gatewayBranchOffset;
            y = baseY + (branchInfo.branchIndex - branchInfo.totalBranches / 2 + 0.5) * branchOffset;
          }
        }
        
        layoutNodes.set(node.id, {
          id: node.id,
          position: { x: currentX + size.width / 2, y },
          width: size.width,
          height: size.height
        });
        
        currentX += size.width + spacing.horizontal;
        maxY = Math.max(maxY, y);
      });
    });

    const bounds = this.calculateBounds(layoutNodes);
    
    return { nodes: layoutNodes, bounds };
  }

  layoutWithPools(ast: MermaidAST): LayoutResult {
    const layoutResult = this.layout(ast);
    
    if (ast.subgraphs.length === 0) {
      return layoutResult;
    }

    const poolLayouts: Map<string, { nodes: string[]; bounds: any }> = new Map();
    
    ast.subgraphs.forEach((subgraph) => {
      const subgraphNodes = subgraph.nodes
        .map(nodeId => layoutResult.nodes.get(nodeId))
        .filter(node => node !== undefined) as LayoutNode[];
      
      if (subgraphNodes.length === 0) return;
      
      const bounds = {
        minX: Math.min(...subgraphNodes.map(n => n.position.x - n.width / 2)) - 20,
        maxX: Math.max(...subgraphNodes.map(n => n.position.x + n.width / 2)) + 20,
        minY: Math.min(...subgraphNodes.map(n => n.position.y - n.height / 2)) - 40,
        maxY: Math.max(...subgraphNodes.map(n => n.position.y + n.height / 2)) + 20
      };
      
      poolLayouts.set(subgraph.id, {
        nodes: subgraph.nodes,
        bounds
      });
    });

    let currentY = 100;
    poolLayouts.forEach((pool) => {
      const height = pool.bounds.maxY - pool.bounds.minY;
      
      pool.nodes.forEach(nodeId => {
        const node = layoutResult.nodes.get(nodeId);
        if (node) {
          node.position.y = currentY + (node.position.y - pool.bounds.minY);
        }
      });
      
      currentY += height + this.DEFAULT_SPACING.poolHorizontal;
    });

    return layoutResult;
  }

  private computeLevels(ast: MermaidAST): Map<number, MermaidNode[]> {
    const levels = new Map<number, MermaidNode[]>();
    const nodeLevel = new Map<string, number>();
    const visited = new Set<string>();
    
    const adjacencyList = this.buildAdjacencyList(ast);
    const startNodes = this.findStartNodes(ast);
    
    if (startNodes.length === 0 && ast.nodes.length > 0) {
      startNodes.push(ast.nodes[0]);
    }
    
    startNodes.forEach(startNode => {
      this.assignLevels(startNode, 0, adjacencyList, nodeLevel, visited, ast);
    });
    
    ast.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const minLevel = this.findMinPossibleLevel(node, adjacencyList, nodeLevel, ast);
        this.assignLevels(node, minLevel, adjacencyList, nodeLevel, visited, ast);
      }
    });
    
    ast.nodes.forEach(node => {
      const level = nodeLevel.get(node.id) || 0;
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level)!.push(node);
    });
    
    return levels;
  }

  private assignLevels(
    node: MermaidNode,
    level: number,
    adjacencyList: Map<string, string[]>,
    nodeLevel: Map<string, number>,
    visited: Set<string>,
    ast: MermaidAST
  ): void {
    if (visited.has(node.id)) return;
    
    visited.add(node.id);
    nodeLevel.set(node.id, level);
    
    const neighbors = adjacencyList.get(node.id) || [];
    neighbors.forEach(neighborId => {
      const neighbor = ast.nodes.find(n => n.id === neighborId);
      if (neighbor && !visited.has(neighborId)) {
        this.assignLevels(neighbor, level + 1, adjacencyList, nodeLevel, visited, ast);
      }
    });
  }

  private buildAdjacencyList(ast: MermaidAST): Map<string, string[]> {
    const adjacencyList = new Map<string, string[]>();
    
    ast.nodes.forEach(node => {
      adjacencyList.set(node.id, []);
    });
    
    ast.edges.forEach(edge => {
      const sourceList = adjacencyList.get(edge.source) || [];
      sourceList.push(edge.target);
      adjacencyList.set(edge.source, sourceList);
    });
    
    return adjacencyList;
  }

  private findStartNodes(ast: MermaidAST): MermaidNode[] {
    const hasIncoming = new Set<string>();
    ast.edges.forEach(edge => hasIncoming.add(edge.target));
    
    const startNodes = ast.nodes.filter(node => 
      !hasIncoming.has(node.id) || node.type === 'start'
    );
    
    return startNodes.length > 0 ? startNodes : [];
  }

  private findMinPossibleLevel(
    node: MermaidNode,
    _adjacencyList: Map<string, string[]>,
    nodeLevel: Map<string, number>,
    ast: MermaidAST
  ): number {
    const incomingNodes = ast.edges
      .filter(edge => edge.target === node.id)
      .map(edge => edge.source)
      .filter(sourceId => nodeLevel.has(sourceId));
    
    if (incomingNodes.length === 0) return 0;
    
    const maxIncomingLevel = Math.max(
      ...incomingNodes.map(sourceId => nodeLevel.get(sourceId) || 0)
    );
    
    return maxIncomingLevel + 1;
  }

  private calculateLevelWidth(nodes: MermaidNode[]): number {
    return nodes.reduce((width, node) => {
      const size = this.ELEMENT_SIZES[node.type] || this.ELEMENT_SIZES.process;
      return width + size.width + this.DEFAULT_SPACING.horizontal;
    }, -this.DEFAULT_SPACING.horizontal);
  }

  private identifyGatewayBranches(ast: MermaidAST): Map<string, string[]> {
    const gatewayBranches = new Map<string, string[]>();
    
    ast.nodes.forEach(node => {
      if (node.type === 'decision') {
        // Find all outgoing edges from this gateway
        const outgoingTargets = ast.edges
          .filter(edge => edge.source === node.id)
          .map(edge => edge.target);
        
        if (outgoingTargets.length > 1) {
          gatewayBranches.set(node.id, outgoingTargets);
        }
      }
    });
    
    return gatewayBranches;
  }

  private isGatewayBranchNode(node: MermaidNode, gatewayBranches: Map<string, string[]>, _ast: MermaidAST): boolean {
    // Check if this node is a direct target of a gateway with multiple branches
    for (const [_gatewayId, targets] of gatewayBranches) {
      if (targets.includes(node.id) && targets.length > 1) {
        return true;
      }
    }
    return false;
  }

  private getGatewayBranchInfo(node: MermaidNode, gatewayBranches: Map<string, string[]>, _ast: MermaidAST): { branchIndex: number; totalBranches: number } | null {
    for (const [_gatewayId, targets] of gatewayBranches) {
      if (targets.includes(node.id) && targets.length > 1) {
        const branchIndex = targets.indexOf(node.id);
        return {
          branchIndex,
          totalBranches: targets.length
        };
      }
    }
    return null;
  }

  private calculateDynamicSpacing(ast: MermaidAST): typeof this.DEFAULT_SPACING {
    // Calculate max label length
    const maxLabelLength = Math.max(...ast.nodes.map(n => n.label.length), 10);
    
    // Calculate complexity metrics
    const nodeCount = ast.nodes.length;
    const gatewayCount = ast.nodes.filter(n => n.type === 'decision').length;
    
    // Adjust spacing based on complexity
    const baseHorizontal = Math.max(150, maxLabelLength * 7);
    const baseVertical = nodeCount > 10 ? 120 : 100;
    const gatewayOffset = gatewayCount > 3 ? 100 : 80;
    
    return {
      horizontal: baseHorizontal,
      vertical: baseVertical,
      laneVertical: 150,
      poolHorizontal: 50,
      gatewayBranchOffset: gatewayOffset
    };
  }

  private calculateBounds(nodes: Map<string, LayoutNode>): LayoutResult['bounds'] {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x - node.width / 2);
      minY = Math.min(minY, node.position.y - node.height / 2);
      maxX = Math.max(maxX, node.position.x + node.width / 2);
      maxY = Math.max(maxY, node.position.y + node.height / 2);
    });
    
    return { minX, minY, maxX, maxY };
  }
}