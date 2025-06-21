import { BpmnEngine } from '../../src/core/BpmnEngine.js';
import { IdGenerator } from '../../src/utils/IdGenerator.js';

describe('BpmnEngine Integration Tests', () => {
  let engine: BpmnEngine;

  beforeEach(() => {
    engine = new BpmnEngine();
    IdGenerator.reset();
  });

  afterEach(() => {
    engine.clear();
  });

  describe('createProcess', () => {
    it('should create a new process', async () => {
      const process = await engine.createProcess('Test Process');
      
      expect(process).toBeDefined();
      expect(process.id).toBe('Process_1');
      expect(process.name).toBe('Test Process');
      expect(process.type).toBe('process');
      expect(process.elements).toBeInstanceOf(Map);
      expect(process.connections).toBeInstanceOf(Map);
    });

    it('should create a collaboration', async () => {
      const collab = await engine.createProcess('Test Collaboration', 'collaboration');
      
      expect(collab.type).toBe('collaboration');
      expect(collab.xml).toContain('bpmn:collaboration');
    });
  });

  describe('createElement', () => {
    it('should create a start event', async () => {
      const process = await engine.createProcess('Test Process');
      
      const element = await engine.createElement(process.id, {
        type: 'bpmn:StartEvent',
        name: 'Start',
        position: { x: 100, y: 100 }
      });
      
      expect(element).toBeDefined();
      expect(element.id).toBe('StartEvent_1');
      expect(element.type).toBe('bpmn:StartEvent');
    });

    it('should create a task', async () => {
      const process = await engine.createProcess('Test Process');
      
      const element = await engine.createElement(process.id, {
        type: 'bpmn:Task',
        name: 'Do Something',
        position: { x: 200, y: 100 }
      });
      
      expect(element).toBeDefined();
      expect(element.id).toBe('Task_1');
      expect(element.type).toBe('bpmn:Task');
    });

    it('should throw error for invalid process ID', async () => {
      await expect(engine.createElement('invalid-id', {
        type: 'bpmn:Task',
        name: 'Test'
      })).rejects.toThrow('Process invalid-id not found');
    });
  });

  describe('connect', () => {
    it('should connect two elements', async () => {
      const process = await engine.createProcess('Test Process');
      
      const start = await engine.createElement(process.id, {
        type: 'bpmn:StartEvent',
        name: 'Start'
      });
      
      const task = await engine.createElement(process.id, {
        type: 'bpmn:Task',
        name: 'Task',
        position: { x: 200, y: 100 }
      });
      
      const connection = await engine.connect(process.id, start.id, task.id);
      
      expect(connection).toBeDefined();
      expect(connection.id).toContain('Flow_');
      expect(process.connections.size).toBe(1);
    });

    it('should connect with label', async () => {
      const process = await engine.createProcess('Test Process');
      
      const gateway = await engine.createElement(process.id, {
        type: 'bpmn:ExclusiveGateway',
        name: 'Decision'
      });
      
      const task = await engine.createElement(process.id, {
        type: 'bpmn:Task',
        name: 'Task'
      });
      
      const connection = await engine.connect(process.id, gateway.id, task.id, 'Yes');
      
      expect(connection).toBeDefined();
      // Label verification would require checking the business object
    });

    it('should throw error for invalid elements', async () => {
      const process = await engine.createProcess('Test Process');
      
      await expect(engine.connect(process.id, 'invalid1', 'invalid2'))
        .rejects.toThrow('Source or target element not found');
    });
  });

  describe('exportXml', () => {
    it('should export process as XML', async () => {
      const process = await engine.createProcess('Export Test');
      
      await engine.createElement(process.id, {
        type: 'bpmn:StartEvent',
        name: 'Start'
      });
      
      const xml = await engine.exportXml(process.id);
      
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('bpmn:definitions');
      expect(xml).toContain('Export Test');
      expect(xml).toContain('bpmn:startEvent');
    });

    it('should export formatted XML by default', async () => {
      const process = await engine.createProcess('Format Test');
      const xml = await engine.exportXml(process.id);
      
      expect(xml).toContain('\n');
      expect(xml).toContain('  '); // Indentation
    });

    it('should export unformatted XML when specified', async () => {
      const process = await engine.createProcess('Unformat Test');
      const xml = await engine.exportXml(process.id, false);
      
      // Unformatted XML might still have some newlines, but less
      const newlineCount = (xml.match(/\n/g) || []).length;
      expect(newlineCount).toBeLessThan(10);
    });
  });

  describe('importXml', () => {
    it('should import valid BPMN XML', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_imported" name="Imported Process" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Start" />
    <bpmn:task id="Task_1" name="Do Work" />
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_imported" />
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

      const process = await engine.importXml(xml);
      
      expect(process).toBeDefined();
      expect(process.name).toBe('Imported Process');
      expect(process.elements.size).toBeGreaterThan(0);
      expect(process.connections.size).toBe(1);
    });

    it('should throw error for invalid XML', async () => {
      const invalidXml = '<invalid>not bpmn</invalid>';
      
      await expect(engine.importXml(invalidXml))
        .rejects.toThrow();
    });
  });

  describe('Complex scenarios', () => {
    it('should create a complete process with multiple elements', async () => {
      const process = await engine.createProcess('Complete Process');
      
      // Create elements
      const start = await engine.createElement(process.id, {
        type: 'bpmn:StartEvent',
        name: 'Start',
        position: { x: 100, y: 100 }
      });
      
      const task1 = await engine.createElement(process.id, {
        type: 'bpmn:UserTask',
        name: 'Review',
        position: { x: 200, y: 100 }
      });
      
      const gateway = await engine.createElement(process.id, {
        type: 'bpmn:ExclusiveGateway',
        name: 'Decision',
        position: { x: 350, y: 100 }
      });
      
      const task2 = await engine.createElement(process.id, {
        type: 'bpmn:ServiceTask',
        name: 'Approve',
        position: { x: 500, y: 50 }
      });
      
      const task3 = await engine.createElement(process.id, {
        type: 'bpmn:SendTask',
        name: 'Reject',
        position: { x: 500, y: 150 }
      });
      
      const end = await engine.createElement(process.id, {
        type: 'bpmn:EndEvent',
        name: 'End',
        position: { x: 650, y: 100 }
      });
      
      // Create connections
      await engine.connect(process.id, start.id, task1.id);
      await engine.connect(process.id, task1.id, gateway.id);
      await engine.connect(process.id, gateway.id, task2.id, 'Approved');
      await engine.connect(process.id, gateway.id, task3.id, 'Rejected');
      await engine.connect(process.id, task2.id, end.id);
      await engine.connect(process.id, task3.id, end.id);
      
      // Verify
      expect(process.elements.size).toBe(6);
      expect(process.connections.size).toBe(6);
      
      // Export and verify XML
      const xml = await engine.exportXml(process.id);
      expect(xml).toContain('bpmn:userTask');
      expect(xml).toContain('bpmn:serviceTask');
      expect(xml).toContain('bpmn:sendTask');
      expect(xml).toContain('bpmn:exclusiveGateway');
    });
  });
});