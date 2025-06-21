import { PositionCalculator } from '../../../src/utils/PositionCalculator.js';
import { Position } from '../../../src/types/index.js';

describe('PositionCalculator', () => {
  describe('calculateNextPosition', () => {
    const basePosition: Position = { x: 100, y: 100 };

    it('should calculate right position by default', () => {
      const next = PositionCalculator.calculateNextPosition(basePosition);
      expect(next).toEqual({ x: 250, y: 100 });
    });

    it('should calculate position in specified direction', () => {
      const rightPos = PositionCalculator.calculateNextPosition(basePosition, 'right');
      expect(rightPos).toEqual({ x: 250, y: 100 });

      const bottomPos = PositionCalculator.calculateNextPosition(basePosition, 'bottom');
      expect(bottomPos).toEqual({ x: 100, y: 200 });

      const leftPos = PositionCalculator.calculateNextPosition(basePosition, 'left');
      expect(leftPos).toEqual({ x: -50, y: 100 });

      const topPos = PositionCalculator.calculateNextPosition(basePosition, 'top');
      expect(topPos).toEqual({ x: 100, y: 0 });
    });
  });

  describe('calculateBranchPosition', () => {
    const gatewayPosition: Position = { x: 300, y: 300 };

    it('should calculate positions for multiple branches', () => {
      const branch1 = PositionCalculator.calculateBranchPosition(gatewayPosition, 0, 3);
      const branch2 = PositionCalculator.calculateBranchPosition(gatewayPosition, 1, 3);
      const branch3 = PositionCalculator.calculateBranchPosition(gatewayPosition, 2, 3);

      expect(branch1).toEqual({ x: 450, y: 200 });
      expect(branch2).toEqual({ x: 450, y: 300 });
      expect(branch3).toEqual({ x: 450, y: 400 });
    });

    it('should center single branch', () => {
      const branch = PositionCalculator.calculateBranchPosition(gatewayPosition, 0, 1);
      expect(branch).toEqual({ x: 450, y: 300 });
    });

    it('should handle even number of branches', () => {
      const branch1 = PositionCalculator.calculateBranchPosition(gatewayPosition, 0, 2);
      const branch2 = PositionCalculator.calculateBranchPosition(gatewayPosition, 1, 2);

      expect(branch1).toEqual({ x: 450, y: 250 });
      expect(branch2).toEqual({ x: 450, y: 350 });
    });
  });

  describe('calculateCenter', () => {
    it('should calculate center between two points', () => {
      const pos1: Position = { x: 100, y: 100 };
      const pos2: Position = { x: 300, y: 200 };

      const center = PositionCalculator.calculateCenter(pos1, pos2);
      expect(center).toEqual({ x: 200, y: 150 });
    });
  });

  describe('calculateWaypoints', () => {
    it('should calculate waypoints for horizontal connection', () => {
      const source = {
        position: { x: 100, y: 100 },
        size: { width: 100, height: 80 }
      };
      const target = {
        position: { x: 300, y: 100 },
        size: { width: 100, height: 80 }
      };

      const waypoints = PositionCalculator.calculateWaypoints(source, target);
      expect(waypoints).toHaveLength(2);
      expect(waypoints[0].x).toBeGreaterThan(150); // Right edge of source
      expect(waypoints[1].x).toBeLessThan(350); // Left edge of target
    });
  });

  describe('getDefaultSize', () => {
    it('should return correct sizes for events', () => {
      expect(PositionCalculator.getDefaultSize('bpmn:StartEvent')).toEqual({ width: 36, height: 36 });
      expect(PositionCalculator.getDefaultSize('bpmn:EndEvent')).toEqual({ width: 36, height: 36 });
      expect(PositionCalculator.getDefaultSize('bpmn:IntermediateThrowEvent')).toEqual({ width: 36, height: 36 });
    });

    it('should return correct sizes for tasks', () => {
      expect(PositionCalculator.getDefaultSize('bpmn:Task')).toEqual({ width: 100, height: 80 });
      expect(PositionCalculator.getDefaultSize('bpmn:UserTask')).toEqual({ width: 100, height: 80 });
      expect(PositionCalculator.getDefaultSize('bpmn:ServiceTask')).toEqual({ width: 100, height: 80 });
    });

    it('should return correct sizes for gateways', () => {
      expect(PositionCalculator.getDefaultSize('bpmn:ExclusiveGateway')).toEqual({ width: 50, height: 50 });
      expect(PositionCalculator.getDefaultSize('bpmn:ParallelGateway')).toEqual({ width: 50, height: 50 });
    });

    it('should return correct sizes for pools and lanes', () => {
      expect(PositionCalculator.getDefaultSize('bpmn:Participant')).toEqual({ width: 600, height: 250 });
      expect(PositionCalculator.getDefaultSize('bpmn:Lane')).toEqual({ width: 600, height: 100 });
    });

    it('should return default size for unknown types', () => {
      expect(PositionCalculator.getDefaultSize('bpmn:Unknown')).toEqual({ width: 100, height: 80 });
    });
  });
});