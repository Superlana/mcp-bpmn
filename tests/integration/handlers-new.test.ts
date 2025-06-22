import { BpmnRequestHandler } from '../../src/server/handlers.js';
import { IdGenerator } from '../../src/utils/IdGenerator.js';
import { diagramContext } from '../../src/core/DiagramContext.js';

describe('New Stateful API Integration Tests', () => {
  let handler: BpmnRequestHandler;

  beforeEach(() => {
    handler = new BpmnRequestHandler();
    IdGenerator.reset();
    diagramContext.clear();
  });

  afterEach(() => {
    diagramContext.clear();
  });

  describe('Context Management', () => {
    it('should error when no context', async () => {
      const result = await handler.handleRequest('add_event', {
        eventType: 'start',
        name: 'Test'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No current context');
    });

    it('should show no current diagram initially', async () => {
      const result = await handler.handleRequest('current', {});
      
      expect(result.content[0].text).toBe('No current diagram');
    });
  });

  describe('Creation Tools', () => {
    it('should create new BPMN process', async () => {
      const result = await handler.handleRequest('new_bpmn', {
        name: 'Test Process'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Created new process diagram "Test Process"');
      
      // Check current
      const current = await handler.handleRequest('current', {});
      const info = JSON.parse(current.content[0].text as string);
      expect(info.name).toBe('Test Process');
      expect(info.type).toBe('process');
    });

    it('should create new BPMN collaboration', async () => {
      const result = await handler.handleRequest('new_bpmn', {
        name: 'Test Collab',
        type: 'collaboration'
      });

      expect(result.content[0].text).toBe('Created new collaboration diagram "Test Collab"');
    });

    it('should create from Mermaid', async () => {
      const mermaidCode = 'graph TD\n  A[Start] --> B[End]';
      const result = await handler.handleRequest('new_from_mermaid', {
        name: 'Mermaid Test',
        mermaidCode
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Created new BPMN diagram "Mermaid Test" from Mermaid');
      expect(result.content[0].text).toContain('2 nodes, 1 flows');
    });
  });

  describe('Element Manipulation', () => {
    beforeEach(async () => {
      await handler.handleRequest('new_bpmn', {
        name: 'Test Process'
      });
    });

    it('should add event', async () => {
      const result = await handler.handleRequest('add_event', {
        eventType: 'start',
        name: 'Start Event'
      });

      expect(result.content[0].text).toBe('Added start event "Start Event" with ID: StartEvent_1');
    });

    it('should add activity', async () => {
      const result = await handler.handleRequest('add_activity', {
        activityType: 'userTask',
        name: 'User Task'
      });

      expect(result.content[0].text).toBe('Added userTask "User Task" with ID: UserTask_1');
    });

    it('should add gateway', async () => {
      const result = await handler.handleRequest('add_gateway', {
        gatewayType: 'exclusive',
        name: 'Decision'
      });

      expect(result.content[0].text).toBe('Added exclusive gateway "Decision" with ID: ExclusiveGateway_1');
    });

    it('should connect elements', async () => {
      await handler.handleRequest('add_event', { eventType: 'start' });
      await handler.handleRequest('add_activity', { activityType: 'task', name: 'Task' });
      
      const result = await handler.handleRequest('connect', {
        sourceId: 'StartEvent_1',
        targetId: 'Task_1'
      });

      expect(result.content[0].text).toBe('Connected StartEvent_1 to Task_1');
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      await handler.handleRequest('new_bpmn', { name: 'Query Test' });
      await handler.handleRequest('add_event', { eventType: 'start', name: 'Start' });
      await handler.handleRequest('add_activity', { activityType: 'task', name: 'Task' });
      await handler.handleRequest('add_event', { eventType: 'end', name: 'End' });
    });

    it('should list elements', async () => {
      const result = await handler.handleRequest('list_elements', {});
      const elements = JSON.parse(result.content[0].text as string);

      expect(elements).toHaveLength(3);
      expect(elements[0].type).toBe('bpmn:StartEvent');
      expect(elements[1].type).toBe('bpmn:Task');
      expect(elements[2].type).toBe('bpmn:EndEvent');
    });

    it('should get element details', async () => {
      const result = await handler.handleRequest('get_element', {
        elementId: 'Task_1'
      });
      const details = JSON.parse(result.content[0].text as string);

      expect(details.id).toBe('Task_1');
      expect(details.type).toBe('bpmn:Task');
      expect(details.name).toBe('Task');
    });

    it('should update element', async () => {
      await handler.handleRequest('update_element', {
        elementId: 'Task_1',
        name: 'Updated Task',
        properties: { assignee: 'john' }
      });

      const result = await handler.handleRequest('get_element', {
        elementId: 'Task_1'
      });
      const details = JSON.parse(result.content[0].text as string);

      expect(details.name).toBe('Updated Task');
      expect(details.properties.assignee).toBe('john');
    });
  });

  describe('File Operations', () => {
    beforeEach(async () => {
      await handler.handleRequest('new_bpmn', { name: 'File Test' });
    });

    it('should error on save without filename', async () => {
      const result = await handler.handleRequest('save', {});
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No filename set');
    });

    it('should save as new file', async () => {
      const result = await handler.handleRequest('save_as', {
        filename: 'test-file.bpmn'
      });

      expect(result.content[0].text).toBe('Saved diagram "File Test" as test-file.bpmn');
      
      // Clean up
      await handler.handleRequest('delete_diagram_file', {
        filename: 'test-file.bpmn'
      });
    });

    it('should close diagram', async () => {
      const result = await handler.handleRequest('close', {});
      
      expect(result.content[0].text).toBe('Closed diagram "File Test"');
      
      // Verify no current
      const current = await handler.handleRequest('current', {});
      expect(current.content[0].text).toBe('No current diagram');
    });
  });

  describe('Utility Operations', () => {
    beforeEach(async () => {
      await handler.handleRequest('new_bpmn', { name: 'Utility Test' });
      await handler.handleRequest('add_event', { eventType: 'start' });
      await handler.handleRequest('add_activity', { activityType: 'task', name: 'Task' });
      await handler.handleRequest('add_event', { eventType: 'end' });
      await handler.handleRequest('connect', { sourceId: 'StartEvent_1', targetId: 'Task_1' });
      await handler.handleRequest('connect', { sourceId: 'Task_1', targetId: 'EndEvent_1' });
    });

    it('should export XML', async () => {
      const result = await handler.handleRequest('export', {});
      
      expect(result.content[0].text).toContain('<?xml version="1.0"');
      expect(result.content[0].text).toContain('bpmn:process');
      expect(result.content[0].text).toContain('StartEvent_1');
    });

    it('should validate diagram', async () => {
      const result = await handler.handleRequest('validate', {});
      const validation = JSON.parse(result.content[0].text as string);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should apply auto layout', async () => {
      const result = await handler.handleRequest('auto_layout', {});
      
      expect(result.content[0].text).toContain('Applied horizontal auto-layout');
      expect(result.content[0].text).toContain('3 elements');
    });
  });
});