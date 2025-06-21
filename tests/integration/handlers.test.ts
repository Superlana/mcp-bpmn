import { BpmnRequestHandler } from '../../src/server/handlers.js';
import { IdGenerator } from '../../src/utils/IdGenerator.js';

describe('BpmnRequestHandler Integration Tests', () => {
  let handler: BpmnRequestHandler;

  beforeEach(() => {
    handler = new BpmnRequestHandler();
    IdGenerator.reset();
  });

  describe('bpmn_create_process', () => {
    it('should create a process successfully', async () => {
      const result = await handler.handleRequest('bpmn_create_process', {
        name: 'Test Process'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Created process "Test Process" with ID: Process_1');
    });

    it('should create a collaboration', async () => {
      const result = await handler.handleRequest('bpmn_create_process', {
        name: 'Test Collaboration',
        type: 'collaboration'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Created collaboration "Test Collaboration"');
    });
  });

  describe('bpmn_add_event', () => {
    let processId: string;

    beforeEach(async () => {
      await handler.handleRequest('bpmn_create_process', {
        name: 'Event Test Process'
      });
      // Extract process ID from result
      processId = 'Process_1';
    });

    it('should add a start event', async () => {
      const result = await handler.handleRequest('bpmn_add_event', {
        processId,
        eventType: 'start',
        name: 'Start Event'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Added start event "Start Event" with ID: StartEvent_1');
    });

    it('should add an end event', async () => {
      const result = await handler.handleRequest('bpmn_add_event', {
        processId,
        eventType: 'end',
        name: 'End Event'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Added end event "End Event" with ID: EndEvent_1');
    });

    it('should add event with connection', async () => {
      // First add a start event
      await handler.handleRequest('bpmn_add_event', {
        processId,
        eventType: 'start',
        name: 'Start'
      });

      // Then add end event connected to start
      const result = await handler.handleRequest('bpmn_add_event', {
        processId,
        eventType: 'end',
        name: 'End',
        connectFrom: 'StartEvent_1'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Added end event "End" with ID: EndEvent_1');
    });

    it('should handle invalid process ID', async () => {
      const result = await handler.handleRequest('bpmn_add_event', {
        processId: 'invalid-id',
        eventType: 'start',
        name: 'Start'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Process invalid-id not found');
    });
  });

  describe('bpmn_add_activity', () => {
    let processId: string;

    beforeEach(async () => {
      await handler.handleRequest('bpmn_create_process', {
        name: 'Activity Test Process'
      });
      processId = 'Process_1';
    });

    it('should add a task', async () => {
      const result = await handler.handleRequest('bpmn_add_activity', {
        processId,
        activityType: 'task',
        name: 'Simple Task'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Added task "Simple Task" with ID: Task_1');
    });

    it('should add a user task with properties', async () => {
      const result = await handler.handleRequest('bpmn_add_activity', {
        processId,
        activityType: 'userTask',
        name: 'Review Document',
        properties: {
          assignee: 'john.doe',
          candidateGroups: 'reviewers'
        }
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Added userTask "Review Document" with ID: UserTask_1');
    });

    it('should add activity connected to another element', async () => {
      // Add start event first
      await handler.handleRequest('bpmn_add_event', {
        processId,
        eventType: 'start',
        name: 'Start'
      });

      // Add task connected to start
      const result = await handler.handleRequest('bpmn_add_activity', {
        processId,
        activityType: 'task',
        name: 'Connected Task',
        connectFrom: 'StartEvent_1'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Added task "Connected Task" with ID: Task_1');
    });
  });

  describe('bpmn_add_gateway', () => {
    let processId: string;

    beforeEach(async () => {
      await handler.handleRequest('bpmn_create_process', {
        name: 'Gateway Test Process'
      });
      processId = 'Process_1';
    });

    it('should add an exclusive gateway', async () => {
      const result = await handler.handleRequest('bpmn_add_gateway', {
        processId,
        gatewayType: 'exclusive',
        name: 'Decision Point'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Added exclusive gateway "Decision Point" with ID: Gateway_1');
    });

    it('should add a parallel gateway', async () => {
      const result = await handler.handleRequest('bpmn_add_gateway', {
        processId,
        gatewayType: 'parallel',
        name: 'Fork'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Added parallel gateway "Fork" with ID: Gateway_1');
    });
  });

  describe('bpmn_connect', () => {
    let processId: string;

    beforeEach(async () => {
      await handler.handleRequest('bpmn_create_process', {
        name: 'Connection Test Process'
      });
      processId = 'Process_1';

      // Add elements to connect
      await handler.handleRequest('bpmn_add_event', {
        processId,
        eventType: 'start',
        name: 'Start'
      });

      await handler.handleRequest('bpmn_add_activity', {
        processId,
        activityType: 'task',
        name: 'Task'
      });
    });

    it('should connect two elements', async () => {
      const result = await handler.handleRequest('bpmn_connect', {
        processId,
        sourceId: 'StartEvent_1',
        targetId: 'Task_1'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Connected StartEvent_1 to Task_1');
    });

    it('should connect with label', async () => {
      const result = await handler.handleRequest('bpmn_connect', {
        processId,
        sourceId: 'StartEvent_1',
        targetId: 'Task_1',
        label: 'Start Flow'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Connected StartEvent_1 to Task_1 with label "Start Flow"');
    });

    it('should handle invalid element IDs', async () => {
      const result = await handler.handleRequest('bpmn_connect', {
        processId,
        sourceId: 'invalid-source',
        targetId: 'invalid-target'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Source or target element not found');
    });
  });

  describe('bpmn_export', () => {
    let processId: string;

    beforeEach(async () => {
      await handler.handleRequest('bpmn_create_process', {
        name: 'Export Test Process'
      });
      processId = 'Process_1';

      // Add some elements
      await handler.handleRequest('bpmn_add_event', {
        processId,
        eventType: 'start',
        name: 'Start'
      });

      await handler.handleRequest('bpmn_add_activity', {
        processId,
        activityType: 'task',
        name: 'Do Work',
        connectFrom: 'StartEvent_1'
      });
    });

    it('should export as XML', async () => {
      const result = await handler.handleRequest('bpmn_export', {
        processId,
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
      const result = await handler.handleRequest('bpmn_export', {
        processId,
        format: 'svg'
      });

      expect(result.isError).toBeUndefined();
      const svg = result.content[0].text;
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });
  });

  describe('bpmn_validate', () => {
    let processId: string;

    beforeEach(async () => {
      await handler.handleRequest('bpmn_create_process', {
        name: 'Validation Test Process'
      });
      processId = 'Process_1';
    });

    it('should validate empty process', async () => {
      const result = await handler.handleRequest('bpmn_validate', {
        processId
      });

      expect(result.isError).toBeUndefined();
      const validation = JSON.parse(result.content[0].text as string);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Process must have at least one start event');
    });

    it('should validate complete process', async () => {
      // Add start and end events
      await handler.handleRequest('bpmn_add_event', {
        processId,
        eventType: 'start',
        name: 'Start'
      });

      await handler.handleRequest('bpmn_add_event', {
        processId,
        eventType: 'end',
        name: 'End',
        connectFrom: 'StartEvent_1'
      });

      const result = await handler.handleRequest('bpmn_validate', {
        processId
      });

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