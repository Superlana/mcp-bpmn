import { BpmnRequestHandler } from '../../src/server/handlers.js';
import { IdGenerator } from '../../src/utils/IdGenerator.js';
import { diagramContext } from '../../src/core/DiagramContext.js';

describe('BpmnRequestHandler Integration Tests', () => {
  let handler: BpmnRequestHandler;

  beforeEach(() => {
    handler = new BpmnRequestHandler();
    IdGenerator.reset();
    diagramContext.clear();
  });

  afterEach(() => {
    diagramContext.clear();
  });

  describe('new_bpmn', () => {
    it('should create a process successfully', async () => {
      const result = await handler.handleRequest('new_bpmn', {
        name: 'Test Process'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Created new process diagram "Test Process"');
    });

    it('should create a collaboration', async () => {
      const result = await handler.handleRequest('new_bpmn', {
        name: 'Test Collaboration',
        type: 'collaboration'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Created new collaboration diagram "Test Collaboration"');
    });
  });

  describe('add_event', () => {
    beforeEach(async () => {
      await handler.handleRequest('new_bpmn', {
        name: 'Event Test Process'
      });
    });

    it('should add a start event', async () => {
      const result = await handler.handleRequest('add_event', {
        eventType: 'start',
        name: 'Start Event'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Added start event "Start Event" with ID: StartEvent_1');
    });

    it('should add an end event', async () => {
      const result = await handler.handleRequest('add_event', {
        eventType: 'end',
        name: 'End Event'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Added end event "End Event" with ID: EndEvent_1');
    });

    it('should error when no context', async () => {
      diagramContext.clear();
      const result = await handler.handleRequest('add_event', {
        eventType: 'start',
        name: 'Start'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No current context');
    });
  });

  describe('add_activity', () => {
    beforeEach(async () => {
      await handler.handleRequest('new_bpmn', {
        name: 'Activity Test Process'
      });
    });

    it('should add a task', async () => {
      const result = await handler.handleRequest('add_activity', {
        activityType: 'task',
        name: 'Simple Task'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Added task "Simple Task" with ID: Task_1');
    });

    it('should add a user task with properties', async () => {
      const result = await handler.handleRequest('add_activity', {
        activityType: 'userTask',
        name: 'Review Document',
        properties: {
          assignee: 'john.doe',
          candidateGroups: 'reviewers'
        }
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Added userTask "Review Document" with ID: UserTask_1');
    });
  });

  describe('add_gateway', () => {
    beforeEach(async () => {
      await handler.handleRequest('new_bpmn', {
        name: 'Gateway Test Process'
      });
    });

    it('should add an exclusive gateway', async () => {
      const result = await handler.handleRequest('add_gateway', {
        gatewayType: 'exclusive',
        name: 'Decision Point'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Added exclusive gateway "Decision Point" with ID: ExclusiveGateway_1');
    });

    it('should add a parallel gateway', async () => {
      const result = await handler.handleRequest('add_gateway', {
        gatewayType: 'parallel',
        name: 'Fork'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Added parallel gateway "Fork" with ID: ParallelGateway_1');
    });
  });

  describe('connect', () => {
    beforeEach(async () => {
      await handler.handleRequest('new_bpmn', {
        name: 'Connection Test Process'
      });

      // Add elements to connect
      await handler.handleRequest('add_event', {
        eventType: 'start',
        name: 'Start'
      });

      await handler.handleRequest('add_activity', {
        activityType: 'task',
        name: 'Task'
      });
    });

    it('should connect two elements', async () => {
      const result = await handler.handleRequest('connect', {
        sourceId: 'StartEvent_1',
        targetId: 'Task_1'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Connected StartEvent_1 to Task_1');
    });

    it('should connect with label', async () => {
      const result = await handler.handleRequest('connect', {
        sourceId: 'StartEvent_1',
        targetId: 'Task_1',
        label: 'Start Flow'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Connected StartEvent_1 to Task_1 with label "Start Flow"');
    });

    it('should handle invalid element IDs', async () => {
      const result = await handler.handleRequest('connect', {
        sourceId: 'invalid-source',
        targetId: 'invalid-target'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Source or target element not found');
    });
  });

  describe('export', () => {
    beforeEach(async () => {
      await handler.handleRequest('new_bpmn', {
        name: 'Export Test Process'
      });

      // Add some elements
      await handler.handleRequest('add_event', {
        eventType: 'start',
        name: 'Start'
      });

      await handler.handleRequest('add_activity', {
        activityType: 'task',
        name: 'Do Work'
      });
      
      await handler.handleRequest('connect', {
        sourceId: 'StartEvent_1',
        targetId: 'Task_1'
      });
    });

    it('should export as XML', async () => {
      const result = await handler.handleRequest('export', {
        format: 'xml'
      });

      expect(result.isError).toBeUndefined();
      const xml = result.content[0].text;
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('bpmn:definitions');
      expect(xml).toContain('Export Test Process');
      expect(xml).toContain('bpmn:startEvent');
      expect(xml).toContain('bpmn:task');
    });

    it('should export as SVG', async () => {
      const result = await handler.handleRequest('export', {
        format: 'svg'
      });

      // SVG export is not implemented in SimpleBpmnEngine
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('SVG export is not yet implemented');
    });
  });

  describe('validate', () => {
    beforeEach(async () => {
      await handler.handleRequest('new_bpmn', {
        name: 'Validation Test Process'
      });
    });

    it('should validate empty process', async () => {
      const result = await handler.handleRequest('validate', {});

      expect(result.isError).toBeUndefined();
      const validation = JSON.parse(result.content[0].text as string);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Process must have at least one start event');
    });

    it('should validate complete process', async () => {
      // Add start and end events
      await handler.handleRequest('add_event', {
        eventType: 'start',
        name: 'Start'
      });

      await handler.handleRequest('add_event', {
        eventType: 'end',
        name: 'End'
      });
      
      await handler.handleRequest('connect', {
        sourceId: 'StartEvent_1',
        targetId: 'EndEvent_1'
      });

      const result = await handler.handleRequest('validate', {});

      expect(result.isError).toBeUndefined();
      const validation = JSON.parse(result.content[0].text as string);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Error handling', () => {
    it('should handle unknown tool', async () => {
      const result = await handler.handleRequest('unknown_tool', {});
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Unknown tool: unknown_tool');
    });
  });
});