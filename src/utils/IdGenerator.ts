import { v4 as uuidv4 } from 'uuid';

export class IdGenerator {
  private static counters: Map<string, number> = new Map();

  /**
   * Generate a unique ID with a given prefix
   */
  static generate(prefix: string): string {
    const counter = this.counters.get(prefix) || 0;
    this.counters.set(prefix, counter + 1);
    return `${prefix}_${counter + 1}`;
  }

  /**
   * Generate a UUID-based ID
   */
  static generateUuid(prefix?: string): string {
    const uuid = uuidv4().replace(/-/g, '');
    return prefix ? `${prefix}_${uuid}` : uuid;
  }

  /**
   * Reset counters (useful for testing)
   */
  static reset(): void {
    this.counters.clear();
  }

  /**
   * Generate ID for specific BPMN element types
   */
  static generateElementId(type: string): string {
    const typeMap: Record<string, string> = {
      'bpmn:Process': 'Process',
      'bpmn:StartEvent': 'StartEvent',
      'bpmn:EndEvent': 'EndEvent',
      'bpmn:Task': 'Task',
      'bpmn:UserTask': 'UserTask',
      'bpmn:ServiceTask': 'ServiceTask',
      'bpmn:ExclusiveGateway': 'Gateway',
      'bpmn:ParallelGateway': 'Gateway',
      'bpmn:InclusiveGateway': 'Gateway',
      'bpmn:EventBasedGateway': 'Gateway',
      'bpmn:SequenceFlow': 'Flow',
      'bpmn:MessageFlow': 'MessageFlow',
      'bpmn:Participant': 'Participant',
      'bpmn:Lane': 'Lane',
      'bpmn:SubProcess': 'SubProcess',
      'bpmn:BoundaryEvent': 'BoundaryEvent',
      'bpmn:IntermediateCatchEvent': 'IntermediateEvent',
      'bpmn:IntermediateThrowEvent': 'IntermediateEvent'
    };

    const prefix = typeMap[type] || 'Element';
    return this.generate(prefix);
  }
}