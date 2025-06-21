import { Position, Size } from '../types/index.js';

export class PositionCalculator {
  private static readonly ELEMENT_SPACING = 150;
  private static readonly VERTICAL_SPACING = 100;

  /**
   * Calculate next position based on previous element
   */
  static calculateNextPosition(
    previousPosition: Position,
    direction: 'right' | 'bottom' | 'left' | 'top' = 'right'
  ): Position {
    switch (direction) {
      case 'right':
        return {
          x: previousPosition.x + this.ELEMENT_SPACING,
          y: previousPosition.y
        };
      case 'bottom':
        return {
          x: previousPosition.x,
          y: previousPosition.y + this.VERTICAL_SPACING
        };
      case 'left':
        return {
          x: previousPosition.x - this.ELEMENT_SPACING,
          y: previousPosition.y
        };
      case 'top':
        return {
          x: previousPosition.x,
          y: previousPosition.y - this.VERTICAL_SPACING
        };
    }
  }

  /**
   * Calculate position for parallel branches
   */
  static calculateBranchPosition(
    gatewayPosition: Position,
    branchIndex: number,
    totalBranches: number
  ): Position {
    const verticalOffset = this.VERTICAL_SPACING * (branchIndex - (totalBranches - 1) / 2);
    return {
      x: gatewayPosition.x + this.ELEMENT_SPACING,
      y: gatewayPosition.y + verticalOffset
    };
  }

  /**
   * Calculate center position between two points
   */
  static calculateCenter(pos1: Position, pos2: Position): Position {
    return {
      x: (pos1.x + pos2.x) / 2,
      y: (pos1.y + pos2.y) / 2
    };
  }

  /**
   * Calculate waypoints for a connection
   */
  static calculateWaypoints(
    source: { position: Position; size: Size },
    target: { position: Position; size: Size }
  ): Position[] {
    const sourceCenter = {
      x: source.position.x + source.size.width / 2,
      y: source.position.y + source.size.height / 2
    };

    const targetCenter = {
      x: target.position.x + target.size.width / 2,
      y: target.position.y + target.size.height / 2
    };

    // Simple direct connection for now
    // Could be enhanced with orthogonal routing
    return [
      this.getConnectionPoint(sourceCenter, targetCenter, source.size),
      this.getConnectionPoint(targetCenter, sourceCenter, target.size)
    ];
  }

  /**
   * Get connection point on element boundary
   */
  private static getConnectionPoint(
    from: Position,
    to: Position,
    elementSize: Size
  ): Position {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);

    // Calculate intersection with element boundary
    const hw = elementSize.width / 2;
    const hh = elementSize.height / 2;

    let x, y;
    if (Math.abs(Math.cos(angle)) * hh > Math.abs(Math.sin(angle)) * hw) {
      // Intersects left or right edge
      x = from.x + (dx > 0 ? hw : -hw);
      y = from.y + (dx > 0 ? hw : -hw) * Math.tan(angle);
    } else {
      // Intersects top or bottom edge
      x = from.x + (dy > 0 ? hh : -hh) / Math.tan(angle);
      y = from.y + (dy > 0 ? hh : -hh);
    }

    return { x, y };
  }

  /**
   * Get default size for element type
   */
  static getDefaultSize(elementType: string): Size {
    const sizeMap: Record<string, Size> = {
      'bpmn:StartEvent': { width: 36, height: 36 },
      'bpmn:EndEvent': { width: 36, height: 36 },
      'bpmn:IntermediateThrowEvent': { width: 36, height: 36 },
      'bpmn:IntermediateCatchEvent': { width: 36, height: 36 },
      'bpmn:BoundaryEvent': { width: 36, height: 36 },
      'bpmn:Task': { width: 100, height: 80 },
      'bpmn:UserTask': { width: 100, height: 80 },
      'bpmn:ServiceTask': { width: 100, height: 80 },
      'bpmn:ScriptTask': { width: 100, height: 80 },
      'bpmn:BusinessRuleTask': { width: 100, height: 80 },
      'bpmn:ManualTask': { width: 100, height: 80 },
      'bpmn:ReceiveTask': { width: 100, height: 80 },
      'bpmn:SendTask': { width: 100, height: 80 },
      'bpmn:SubProcess': { width: 350, height: 200 },
      'bpmn:CallActivity': { width: 100, height: 80 },
      'bpmn:ExclusiveGateway': { width: 50, height: 50 },
      'bpmn:ParallelGateway': { width: 50, height: 50 },
      'bpmn:InclusiveGateway': { width: 50, height: 50 },
      'bpmn:EventBasedGateway': { width: 50, height: 50 },
      'bpmn:ComplexGateway': { width: 50, height: 50 },
      'bpmn:Participant': { width: 600, height: 250 },
      'bpmn:Lane': { width: 600, height: 100 },
      'bpmn:DataObjectReference': { width: 36, height: 50 },
      'bpmn:DataStoreReference': { width: 50, height: 50 },
      'bpmn:TextAnnotation': { width: 100, height: 30 },
      'bpmn:Group': { width: 300, height: 300 }
    };

    return sizeMap[elementType] || { width: 100, height: 80 };
  }
}