import { ProcessContext } from '../types/index.js';

interface LayoutNode {
  id: string;
  type: string;
  name?: string;
  position?: { x: number; y: number };
  incoming: string[];
  outgoing: string[];
  level: number;
  lane?: number;
  positioned: boolean;
}

/**
 * Enhanced Auto-layout utility with better branch handling
 */
export class AutoLayoutEnhanced {
  private static readonly SPACING = {
    HORIZONTAL: 150,
    VERTICAL: 100,
    START_X: 100,
    START_Y: 200,
    GATEWAY_BRANCH_Y: 80
  };

  /**
   * Apply enhanced layout algorithm
   */
  static applyLayout(process: ProcessContext, algorithm: 'horizontal' | 'dagre' = 'horizontal'): void {
    const elements = Array.from(process.elements.values());
    const connections = Array.from(process.connections.values());

    if (algorithm === 'dagre') {
      // Future: integrate dagre library
      throw new Error('Dagre layout not yet implemented');
    }

    // Build enhanced flow graph
    const graph = this.buildEnhancedGraph(elements, connections);
    
    // Apply smart horizontal layout
    this.applySmartHorizontalLayout(graph, process);
  }

  /**
   * Build enhanced graph with better metadata
   */
  private static buildEnhancedGraph(elements: any[], connections: any[]): Map<string, LayoutNode> {
    const graph = new Map<string, LayoutNode>();

    // Initialize nodes
    elements.forEach(element => {
      graph.set(element.id, {
        id: element.id,
        type: element.type,
        name: element.name,
        position: element.position,
        incoming: [],
        outgoing: [],
        level: -1,
        lane: 0,
        positioned: false
      });
    });

    // Add edges
    connections.forEach(conn => {
      const source = graph.get(conn.source);
      const target = graph.get(conn.target);
      
      if (source && target) {
        source.outgoing.push(target.id);
        target.incoming.push(source.id);
      }
    });

    return graph;
  }

  /**
   * Apply smart horizontal layout with branch handling
   */
  private static applySmartHorizontalLayout(graph: Map<string, LayoutNode>, process: ProcessContext): void {
    // Step 1: Calculate levels using topological sort
    const levels = this.calculateLevels(graph);
    
    // Step 2: Assign lanes for parallel branches
    this.assignLanes(graph, levels);
    
    // Step 3: Position elements
    this.positionElements(graph, levels, process);
  }

  /**
   * Calculate element levels using topological sort
   */
  private static calculateLevels(graph: Map<string, LayoutNode>): Map<number, Set<string>> {
    const levels = new Map<number, Set<string>>();
    const visited = new Set<string>();
    const nodeLevel = new Map<string, number>();

    // Find start nodes
    const startNodes = Array.from(graph.values()).filter(node => 
      node.incoming.length === 0 || node.type === 'bpmn:StartEvent'
    );

    // BFS to assign levels
    const queue: Array<{id: string, level: number}> = [];
    startNodes.forEach(node => {
      queue.push({id: node.id, level: 0});
      nodeLevel.set(node.id, 0);
    });

    while (queue.length > 0) {
      const {id, level} = queue.shift()!;
      
      if (visited.has(id)) continue;
      visited.add(id);

      const node = graph.get(id)!;
      node.level = level;

      // Add to level set
      if (!levels.has(level)) {
        levels.set(level, new Set());
      }
      levels.get(level)!.add(id);

      // Process outgoing nodes
      node.outgoing.forEach(targetId => {
        const target = graph.get(targetId)!;
        const targetLevel = Math.max(
          nodeLevel.get(targetId) || 0,
          level + 1
        );
        nodeLevel.set(targetId, targetLevel);
        
        // Only add to queue if all incoming nodes are visited
        const allIncomingVisited = target.incoming.every(inId => visited.has(inId));
        if (allIncomingVisited) {
          queue.push({id: targetId, level: targetLevel});
        }
      });
    }

    return levels;
  }

  /**
   * Assign lanes for parallel branches
   */
  private static assignLanes(graph: Map<string, LayoutNode>, _levels: Map<number, Set<string>>): void {
    // For each gateway, assign different lanes to its branches
    Array.from(graph.values()).forEach(node => {
      if (this.isGateway(node.type) && node.outgoing.length > 1) {
        // Diverging gateway - assign lanes to branches
        node.outgoing.forEach((targetId, index) => {
          this.propagateLane(graph, targetId, index - Math.floor(node.outgoing.length / 2));
        });
      }
    });
  }

  /**
   * Propagate lane assignment through a branch
   */
  private static propagateLane(graph: Map<string, LayoutNode>, nodeId: string, lane: number): void {
    const node = graph.get(nodeId);
    if (!node || node.lane !== 0) return; // Already assigned

    node.lane = lane;

    // Continue propagation until merge point
    if (node.outgoing.length === 1) {
      const target = graph.get(node.outgoing[0]);
      if (target && target.incoming.length === 1) {
        this.propagateLane(graph, node.outgoing[0], lane);
      }
    }
  }

  /**
   * Position elements based on levels and lanes
   */
  private static positionElements(
    graph: Map<string, LayoutNode>, 
    levels: Map<number, Set<string>>,
    process: ProcessContext
  ): void {
    const maxLevel = Math.max(...Array.from(levels.keys()));

    for (let level = 0; level <= maxLevel; level++) {
      const nodesAtLevel = levels.get(level);
      if (!nodesAtLevel) continue;

      const x = this.SPACING.START_X + (level * this.SPACING.HORIZONTAL);
      
      // Group nodes by lane
      const laneGroups = new Map<number, string[]>();
      nodesAtLevel.forEach(nodeId => {
        const node = graph.get(nodeId)!;
        const lane = node.lane || 0;
        if (!laneGroups.has(lane)) {
          laneGroups.set(lane, []);
        }
        laneGroups.get(lane)!.push(nodeId);
      });

      // Position nodes in each lane
      const sortedLanes = Array.from(laneGroups.keys()).sort((a, b) => a - b);
      
      sortedLanes.forEach(lane => {
        const nodesInLane = laneGroups.get(lane)!;
        const baseY = this.SPACING.START_Y + (lane * this.SPACING.GATEWAY_BRANCH_Y);

        nodesInLane.forEach((nodeId, index) => {
          const node = graph.get(nodeId)!;
          const element = process.elements.get(nodeId);
          
          if (element) {
            element.position = {
              x: x,
              y: baseY + (index * this.SPACING.VERTICAL / 2)
            };
            node.positioned = true;
          }
        });
      });
    }

    // Handle any unpositioned elements
    const unpositioned = Array.from(graph.values()).filter(node => !node.positioned);
    unpositioned.forEach((node, index) => {
      const element = process.elements.get(node.id);
      if (element) {
        element.position = {
          x: this.SPACING.START_X + ((maxLevel + 1) * this.SPACING.HORIZONTAL),
          y: this.SPACING.START_Y + (index * this.SPACING.VERTICAL)
        };
      }
    });
  }

  /**
   * Check if element type is a gateway
   */
  private static isGateway(type: string): boolean {
    return type.includes('Gateway');
  }

  /**
   * Calculate position for a new element with branch awareness
   */
  static calculateSmartPosition(
    process: ProcessContext, 
    connectFrom?: string,
    branchIndex?: number
  ): { x: number, y: number } {
    if (!connectFrom) {
      return { x: this.SPACING.START_X, y: this.SPACING.START_Y };
    }

    const sourceElement = process.elements.get(connectFrom);
    if (!sourceElement || !sourceElement.position) {
      return { x: this.SPACING.START_X, y: this.SPACING.START_Y };
    }

    // Check if source is a gateway (branching point)
    if (this.isGateway(sourceElement.type)) {
      const connections = Array.from(process.connections.values());
      const outgoingCount = connections.filter(c => c.source === connectFrom).length;
      
      if (branchIndex !== undefined || outgoingCount > 0) {
        // Position on a branch
        const index = branchIndex ?? outgoingCount;
        const offset = (index - outgoingCount / 2) * this.SPACING.GATEWAY_BRANCH_Y;
        
        return {
          x: sourceElement.position.x + this.SPACING.HORIZONTAL,
          y: sourceElement.position.y + offset
        };
      }
    }

    // Default: place to the right
    return {
      x: sourceElement.position.x + this.SPACING.HORIZONTAL,
      y: sourceElement.position.y
    };
  }
}