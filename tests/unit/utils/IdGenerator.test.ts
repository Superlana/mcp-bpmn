import { IdGenerator } from '../../../src/utils/IdGenerator.js';

describe('IdGenerator', () => {
  beforeEach(() => {
    IdGenerator.reset();
  });

  describe('generate', () => {
    it('should generate sequential IDs with prefix', () => {
      const id1 = IdGenerator.generate('Task');
      const id2 = IdGenerator.generate('Task');
      const id3 = IdGenerator.generate('Task');

      expect(id1).toBe('Task_1');
      expect(id2).toBe('Task_2');
      expect(id3).toBe('Task_3');
    });

    it('should maintain separate counters for different prefixes', () => {
      const task1 = IdGenerator.generate('Task');
      const gateway1 = IdGenerator.generate('Gateway');
      const task2 = IdGenerator.generate('Task');
      const gateway2 = IdGenerator.generate('Gateway');

      expect(task1).toBe('Task_1');
      expect(task2).toBe('Task_2');
      expect(gateway1).toBe('Gateway_1');
      expect(gateway2).toBe('Gateway_2');
    });
  });

  describe('generateUuid', () => {
    it('should generate UUID without prefix', () => {
      const id = IdGenerator.generateUuid();
      expect(id).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should generate UUID with prefix', () => {
      const id = IdGenerator.generateUuid('Process');
      expect(id).toMatch(/^Process_[a-f0-9]{32}$/);
    });

    it('should generate unique UUIDs', () => {
      const id1 = IdGenerator.generateUuid();
      const id2 = IdGenerator.generateUuid();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateElementId', () => {
    it('should generate correct prefix for BPMN elements', () => {
      const tests = [
        { type: 'bpmn:Process', expected: 'Process_1' },
        { type: 'bpmn:StartEvent', expected: 'StartEvent_1' },
        { type: 'bpmn:EndEvent', expected: 'EndEvent_1' },
        { type: 'bpmn:Task', expected: 'Task_1' },
        { type: 'bpmn:UserTask', expected: 'UserTask_1' },
        { type: 'bpmn:ServiceTask', expected: 'ServiceTask_1' },
        { type: 'bpmn:ExclusiveGateway', expected: 'Gateway_1' },
        { type: 'bpmn:ParallelGateway', expected: 'Gateway_2' },
        { type: 'bpmn:SequenceFlow', expected: 'Flow_1' },
        { type: 'bpmn:Participant', expected: 'Participant_1' },
        { type: 'bpmn:Lane', expected: 'Lane_1' },
      ];

      tests.forEach(test => {
        const id = IdGenerator.generateElementId(test.type);
        expect(id).toBe(test.expected);
      });
    });

    it('should use Element prefix for unknown types', () => {
      const id = IdGenerator.generateElementId('bpmn:Unknown');
      expect(id).toBe('Element_1');
    });
  });

  describe('reset', () => {
    it('should reset all counters', () => {
      IdGenerator.generate('Task');
      IdGenerator.generate('Task');
      IdGenerator.generate('Gateway');

      IdGenerator.reset();

      expect(IdGenerator.generate('Task')).toBe('Task_1');
      expect(IdGenerator.generate('Gateway')).toBe('Gateway_1');
    });
  });
});