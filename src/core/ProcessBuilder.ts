import { BpmnEngine } from './BpmnEngine.js';
import { ElementFactory } from './ElementFactory.js';
import { Position, ActivityType, GatewayType, EventDefinitionType } from '../types/index.js';
import { TypeMappings } from '../utils/TypeMappings.js';
import { PositionCalculator } from '../utils/PositionCalculator.js';

export class ProcessBuilder {
  private engine: BpmnEngine;
  private processId: string;
  private currentElement: any;
  private elementFactory: ElementFactory;
  private lastPosition: Position = { x: 100, y: 100 };

  constructor(engine: BpmnEngine, processId: string) {
    this.engine = engine;
    this.processId = processId;
    this.elementFactory = engine.getElementFactory(processId);
  }

  /**
   * Add a start event
   */
  startEvent(name?: string, eventDefinition?: EventDefinitionType): ProcessBuilder {
    const position = this.lastPosition;
    this.currentElement = this.createElement({
      type: 'bpmn:StartEvent',
      name,
      position,
      properties: { eventDefinition }
    });
    this.updateLastPosition();
    return this;
  }

  /**
   * Add an end event
   */
  endEvent(name?: string, eventDefinition?: EventDefinitionType): ProcessBuilder {
    if (this.currentElement) {
      const element = this.appendElement({
        type: 'bpmn:EndEvent',
        name,
        properties: { eventDefinition }
      });
      this.currentElement = element;
    } else {
      this.currentElement = this.createElement({
        type: 'bpmn:EndEvent',
        name,
        position: this.lastPosition,
        properties: { eventDefinition }
      });
    }
    this.updateLastPosition();
    return this;
  }

  /**
   * Add a task
   */
  task(name: string, type: ActivityType = 'task'): ProcessBuilder {
    const bpmnType = TypeMappings.mapActivityType(type);
    
    if (this.currentElement) {
      const element = this.appendElement({
        type: bpmnType,
        name
      });
      this.currentElement = element;
    } else {
      this.currentElement = this.createElement({
        type: bpmnType,
        name,
        position: this.lastPosition
      });
    }
    this.updateLastPosition();
    return this;
  }

  /**
   * Add a user task
   */
  userTask(name: string, assignee?: string): ProcessBuilder {
    const element = this.appendOrCreate({
      type: 'bpmn:UserTask',
      name,
      properties: { assignee }
    });
    this.currentElement = element;
    this.updateLastPosition();
    return this;
  }

  /**
   * Add a service task
   */
  serviceTask(name: string, implementation?: string): ProcessBuilder {
    const element = this.appendOrCreate({
      type: 'bpmn:ServiceTask',
      name,
      properties: { implementation }
    });
    this.currentElement = element;
    this.updateLastPosition();
    return this;
  }

  /**
   * Add a gateway
   */
  gateway(type: GatewayType = 'exclusive', name?: string): ProcessBuilder {
    const bpmnType = TypeMappings.mapGatewayType(type);
    const element = this.appendOrCreate({
      type: bpmnType,
      name
    });
    this.currentElement = element;
    this.updateLastPosition();
    return this;
  }

  /**
   * Add a subprocess
   */
  subProcess(name: string, isExpanded = true): ProcessBuilder {
    const element = this.appendOrCreate({
      type: 'bpmn:SubProcess',
      name,
      properties: { isExpanded }
    });
    this.currentElement = element;
    this.updateLastPosition();
    return this;
  }

  /**
   * Connect to a specific element by ID
   */
  connectTo(targetId: string, label?: string): ProcessBuilder {
    if (!this.currentElement) {
      throw new Error('No current element to connect from');
    }
    
    this.engine.connect(this.processId, this.currentElement.id, targetId, label);
    const target = this.engine.getModeler(this.processId).get('elementRegistry').get(targetId);
    this.currentElement = target;
    return this;
  }

  /**
   * Branch out from current element (useful for gateways)
   */
  branch(_label: string, builderFn: (builder: ProcessBuilder) => void): ProcessBuilder {
    if (!this.currentElement) {
      throw new Error('No current element to branch from');
    }

    const branchBuilder = new ProcessBuilder(this.engine, this.processId);
    branchBuilder.currentElement = this.currentElement;
    branchBuilder.lastPosition = { ...this.lastPosition };
    
    builderFn(branchBuilder);
    
    // Optionally connect the branch back to main flow
    return this;
  }

  /**
   * Create parallel branches
   */
  parallel(...branches: Array<(builder: ProcessBuilder) => void>): ProcessBuilder {
    // Add parallel gateway
    const splitGateway = this.gateway('parallel', 'Split');
    
    // Create join gateway position
    const joinPosition = {
      x: this.lastPosition.x + 300,
      y: this.lastPosition.y
    };

    // Create join gateway
    const joinGateway = this.createElement({
      type: 'bpmn:ParallelGateway',
      name: 'Join',
      position: joinPosition
    });

    // Execute each branch
    branches.forEach((branchFn, index) => {
      const branchBuilder = new ProcessBuilder(this.engine, this.processId);
      branchBuilder.currentElement = splitGateway.currentElement;
      
      // Calculate branch position
      const branchY = this.lastPosition.y + (index - (branches.length - 1) / 2) * 100;
      branchBuilder.lastPosition = {
        x: this.lastPosition.x,
        y: branchY
      };

      // Execute branch
      branchFn(branchBuilder);

      // Connect branch end to join gateway
      if (branchBuilder.currentElement) {
        this.engine.connect(
          this.processId,
          branchBuilder.currentElement.id,
          joinGateway.id
        );
      }
    });

    this.currentElement = joinGateway;
    this.lastPosition = joinPosition;
    return this;
  }

  /**
   * Build and return the process
   */
  async build(): Promise<string> {
    return await this.engine.exportXml(this.processId);
  }

  /**
   * Get the process ID
   */
  getProcessId(): string {
    return this.processId;
  }

  /**
   * Helper to create element
   */
  private createElement(definition: any): any {
    const element = this.elementFactory.createElement(definition);
    return element;
  }

  /**
   * Helper to append element
   */
  private appendElement(definition: any): any {
    if (!this.currentElement) {
      throw new Error('No current element to append to');
    }
    
    const element = this.elementFactory.appendShape(
      this.currentElement.id,
      definition
    );
    return element;
  }

  /**
   * Helper to append or create
   */
  private appendOrCreate(definition: any): any {
    if (this.currentElement) {
      return this.appendElement(definition);
    } else {
      definition.position = this.lastPosition;
      return this.createElement(definition);
    }
  }

  /**
   * Update last position based on current element
   */
  private updateLastPosition(): void {
    if (this.currentElement) {
      this.lastPosition = PositionCalculator.calculateNextPosition({
        x: this.currentElement.x || this.lastPosition.x,
        y: this.currentElement.y || this.lastPosition.y
      });
    }
  }
}