import { ElementDefinition } from '../types/index.js';
import { IdGenerator } from '../utils/IdGenerator.js';
import { PositionCalculator } from '../utils/PositionCalculator.js';

export class ElementFactory {
  constructor(
    private elementFactory: any,
    private modeling: any,
    private elementRegistry: any,
    private bpmnFactory: any,
    private canvas: any
  ) {}

  /**
   * Create a BPMN element
   */
  async createElement(definition: ElementDefinition): Promise<any> {
    const elementId = definition.id || IdGenerator.generateElementId(definition.type);
    const position = definition.position || { x: 100, y: 100 };
    const size = definition.size || PositionCalculator.getDefaultSize(definition.type);

    // Create business object
    const businessObject = this.bpmnFactory.create(definition.type, {
      id: elementId,
      name: definition.name,
      ...definition.properties
    });

    // Create shape
    const shape = this.elementFactory.createShape({
      id: elementId,
      type: definition.type,
      businessObject: businessObject,
      width: size.width,
      height: size.height
    });

    // Get parent element (root process or specific parent)
    const parent = definition.properties?.parentId 
      ? this.elementRegistry.get(definition.properties.parentId)
      : this.canvas.getRootElement();

    // Create the shape on canvas
    const createdShape = this.modeling.createShape(
      shape,
      position,
      parent
    );

    // Update label if provided
    if (definition.name) {
      this.modeling.updateLabel(createdShape, definition.name);
    }

    // Handle special properties
    this.applySpecialProperties(createdShape, definition);

    return createdShape;
  }

  /**
   * Create an element and connect it from a source
   */
  async createAndConnect(
    sourceId: string,
    definition: ElementDefinition
  ): Promise<{ element: any; connection: any }> {
    const source = this.elementRegistry.get(sourceId);
    if (!source) {
      throw new Error(`Source element ${sourceId} not found`);
    }

    // Calculate position if not provided
    if (!definition.position) {
      const sourcePosition = { x: source.x, y: source.y };
      definition.position = PositionCalculator.calculateNextPosition(sourcePosition);
    }

    // Create the element
    const element = await this.createElement(definition);

    // Connect elements
    const connection = this.modeling.connect(source, element);

    return { element, connection };
  }

  /**
   * Append a shape (creates and connects in one operation)
   */
  async appendShape(
    sourceId: string,
    definition: ElementDefinition,
    direction: 'right' | 'bottom' | 'left' | 'top' = 'right'
  ): Promise<any> {
    const source = this.elementRegistry.get(sourceId);
    if (!source) {
      throw new Error(`Source element ${sourceId} not found`);
    }

    const elementId = definition.id || IdGenerator.generateElementId(definition.type);
    const size = definition.size || PositionCalculator.getDefaultSize(definition.type);

    // Create business object
    const businessObject = this.bpmnFactory.create(definition.type, {
      id: elementId,
      name: definition.name,
      ...definition.properties
    });

    // Create shape definition
    const shape = this.elementFactory.createShape({
      id: elementId,
      type: definition.type,
      businessObject: businessObject,
      width: size.width,
      height: size.height
    });

    // Use modeling.appendShape for better positioning
    const position = definition.position || { direction };
    const createdShape = this.modeling.appendShape(
      source,
      shape,
      position,
      source.parent
    );

    // Update label if provided
    if (definition.name) {
      this.modeling.updateLabel(createdShape, definition.name);
    }

    return createdShape;
  }

  /**
   * Apply special properties based on element type
   */
  private applySpecialProperties(element: any, definition: ElementDefinition): void {
    const props = definition.properties || {};

    // Handle event definitions
    if (props.eventDefinition) {
      this.applyEventDefinition(element, props.eventDefinition);
    }

    // Handle gateway properties
    if (element.type.includes('Gateway') && props.default) {
      this.modeling.updateProperties(element, {
        default: props.default
      });
    }

    // Handle activity properties
    if (props.assignee || props.candidateGroups || props.dueDate) {
      const activityProps: any = {};
      if (props.assignee) activityProps['camunda:assignee'] = props.assignee;
      if (props.candidateGroups) activityProps['camunda:candidateGroups'] = props.candidateGroups;
      if (props.dueDate) activityProps['camunda:dueDate'] = props.dueDate;
      
      this.modeling.updateProperties(element, activityProps);
    }

    // Handle subprocess properties
    if (element.type === 'bpmn:SubProcess' && props.isExpanded !== undefined) {
      this.modeling.updateProperties(element, {
        isExpanded: props.isExpanded
      });
    }

    // Handle boundary event properties
    if (element.type === 'bpmn:BoundaryEvent' && props.attachTo) {
      const host = this.elementRegistry.get(props.attachTo);
      if (host) {
        this.modeling.updateProperties(element, {
          attachedToRef: host.businessObject,
          cancelActivity: props.cancelActivity !== false
        });
      }
    }
  }

  /**
   * Apply event definition to an event element
   */
  private applyEventDefinition(element: any, eventDefinitionType: string): void {
    const eventDefinitions: Record<string, any> = {
      'message': { $type: 'bpmn:MessageEventDefinition' },
      'timer': { $type: 'bpmn:TimerEventDefinition' },
      'error': { $type: 'bpmn:ErrorEventDefinition' },
      'signal': { $type: 'bpmn:SignalEventDefinition' },
      'conditional': { $type: 'bpmn:ConditionalEventDefinition' },
      'escalation': { $type: 'bpmn:EscalationEventDefinition' },
      'compensation': { $type: 'bpmn:CompensateEventDefinition' },
      'cancel': { $type: 'bpmn:CancelEventDefinition' },
      'terminate': { $type: 'bpmn:TerminateEventDefinition' }
    };

    const eventDef = eventDefinitions[eventDefinitionType];
    if (eventDef) {
      const eventDefinition = this.bpmnFactory.create(eventDef.$type);
      this.modeling.updateProperties(element, {
        eventDefinitions: [eventDefinition]
      });
    }
  }
}