import { ProcessContext } from '../types/index.js';

/**
 * Auto-layout utility for positioning BPMN elements
 */
export class AutoLayout {
  private static readonly SPACING = {
    HORIZONTAL: 150,
    VERTICAL: 100,
    START_X: 100,
    START_Y: 200
  };

  /**
   * Apply automatic layout to a process
   */
  static applyLayout(process: ProcessContext): void {
    const elements = Array.from(process.elements.values());
    const connections = Array.from(process.connections.values());

    // Build a simple flow graph
    const flowGraph = this.buildFlowGraph(elements, connections);
    
    // Apply horizontal layout
    this.applyHorizontalLayout(flowGraph);
  }

  /**
   * Build flow graph from elements and connections
   */
  private static buildFlowGraph(elements: any[], connections: any[]): Map<string, any> {
    const graph = new Map();

    // Initialize all elements
    elements.forEach(element => {
      graph.set(element.id, {
        ...element,
        incoming: [],
        outgoing: [],
        level: 0,
        positioned: false
      });
    });

    // Add connections
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
   * Apply horizontal layout (left to right flow)
   */
  private static applyHorizontalLayout(graph: Map<string, any>): void {
    const elements = Array.from(graph.values());
    
    // Find start events (no incoming connections)
    const startEvents = elements.filter(el => 
      el.type === 'bpmn:StartEvent' || el.incoming.length === 0
    );

    let currentLevel = 0;
    let currentX = this.SPACING.START_X;
    let currentY = this.SPACING.START_Y;

    // Position start events
    startEvents.forEach((startEvent, index) => {
      startEvent.position = {
        x: currentX,
        y: currentY + (index * this.SPACING.VERTICAL)
      };
      startEvent.level = 0;
      startEvent.positioned = true;
    });

    // Process levels from left to right
    const processedLevels = new Set();
    
    while (processedLevels.size < 10) { // Safety limit
      const currentLevelElements = elements.filter(el => 
        el.level === currentLevel && el.positioned
      );

      if (currentLevelElements.length === 0) break;

      // Find next level elements
      const nextLevelElements = new Set<any>();
      
      currentLevelElements.forEach(element => {
        element.outgoing.forEach((targetId: string) => {
          const target = graph.get(targetId);
          if (target && !target.positioned) {
            target.level = currentLevel + 1;
            nextLevelElements.add(target);
          }
        });
      });

      // Position next level elements
      if (nextLevelElements.size > 0) {
        const nextX = currentX + this.SPACING.HORIZONTAL;
        let nextY = this.SPACING.START_Y;

        Array.from(nextLevelElements).forEach((element, index) => {
          element.position = {
            x: nextX,
            y: nextY + (index * this.SPACING.VERTICAL)
          };
          element.positioned = true;
        });
      }

      processedLevels.add(currentLevel);
      currentLevel++;
      currentX += this.SPACING.HORIZONTAL;
    }

    // Handle any unpositioned elements (place them at the end)
    const unpositioned = elements.filter(el => !el.positioned);
    unpositioned.forEach((element, index) => {
      element.position = {
        x: currentX + this.SPACING.HORIZONTAL,
        y: this.SPACING.START_Y + (index * this.SPACING.VERTICAL)
      };
    });
  }

  /**
   * Calculate smart position for new element based on connectFrom
   */
  static calculateSmartPosition(
    process: ProcessContext, 
    connectFrom?: string
  ): { x: number, y: number } {
    if (!connectFrom) {
      // Default position if no connection
      return { x: this.SPACING.START_X, y: this.SPACING.START_Y };
    }

    const sourceElement = process.elements.get(connectFrom);
    if (!sourceElement || !sourceElement.position) {
      return { x: this.SPACING.START_X, y: this.SPACING.START_Y };
    }

    // Place new element to the right of source
    return {
      x: sourceElement.position.x + this.SPACING.HORIZONTAL,
      y: sourceElement.position.y
    };
  }

  /**
   * Suggest positions for gateway branches
   */
  static calculateBranchPositions(
    gatewayPosition: { x: number, y: number },
    branchCount: number
  ): Array<{ x: number, y: number }> {
    const positions = [];
    const baseY = gatewayPosition.y;
    const spacing = this.SPACING.VERTICAL;

    for (let i = 0; i < branchCount; i++) {
      const offsetY = (i - (branchCount - 1) / 2) * spacing;
      positions.push({
        x: gatewayPosition.x + this.SPACING.HORIZONTAL,
        y: baseY + offsetY
      });
    }

    return positions;
  }
}