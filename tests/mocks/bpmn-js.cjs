// Mock for bpmn-js to avoid ES module issues in tests
class BpmnModeler {
  constructor(options) {
    this.options = options;
    this._definitions = null;
    this._processName = 'Test Process';
    this._trackedElements = [];
    this._services = {
      elementFactory: {
        create: jest.fn().mockReturnValue({ id: 'mock-element' }),
        createShape: jest.fn((attrs) => ({ 
          ...attrs, 
          x: attrs.position?.x || 0, 
          y: attrs.position?.y || 0 
        }))
      },
      modeling: {
        createShape: jest.fn((shape, position, parent) => {
          const created = {
            ...shape,
            x: position.x,
            y: position.y,
            parent,
            incoming: shape.incoming || [],
            outgoing: shape.outgoing || []
          };
          this._trackedElements.push(created);
          return created;
        }),
        updateLabel: jest.fn(),
        updateProperties: jest.fn(),
        connect: jest.fn((source, target) => {
          const connection = {
            id: `Flow_${Math.random().toString(36).substr(2, 9)}`,
            source,
            target,
            type: 'bpmn:SequenceFlow'
          };
          // Update source and target incoming/outgoing
          if (source.outgoing) source.outgoing.push(connection);
          if (target.incoming) target.incoming.push(connection);
          return connection;
        }),
        appendShape: jest.fn((source, shape, position) => {
          const newShape = {
            ...shape,
            x: position.x || source.x + 150,
            y: position.y || source.y,
            incoming: shape.incoming || [],
            outgoing: shape.outgoing || []
          };
          // Create implicit connection
          const connection = {
            id: `Flow_${Math.random().toString(36).substr(2, 9)}`,
            source,
            target: newShape,
            type: 'bpmn:SequenceFlow'
          };
          if (source.outgoing) source.outgoing.push(connection);
          newShape.incoming.push(connection);
          this._trackedElements.push(newShape);
          return newShape;
        }),
        removeElements: jest.fn(),
        addLane: jest.fn((pool) => ({
          id: `Lane_${Math.random().toString(36).substr(2, 9)}`,
          type: 'bpmn:Lane',
          parent: pool
        }))
      },
      elementRegistry: {
        get: jest.fn((id) => {
          if (id === 'invalid-id' || id === 'invalid-source' || id === 'invalid-target' || id === 'invalid1' || id === 'invalid2') {
            return undefined;
          }
          return { 
            id, 
            type: 'bpmn:Task',
            businessObject: { name: 'Mock Element' },
            x: 100,
            y: 100,
            incoming: [],
            outgoing: []
          };
        }),
        getAll: jest.fn(() => this._trackedElements),
        filter: jest.fn((predicate) => {
          return this._trackedElements.filter(predicate);
        }),
        forEach: jest.fn((callback) => {
          this._trackedElements.forEach(callback);
        })
      },
      bpmnFactory: {
        create: jest.fn((type, attrs) => ({ $type: type, ...attrs }))
      },
      canvas: {
        getRootElement: jest.fn(() => ({ 
          id: 'root', 
          type: 'bpmn:Process',
          businessObject: { 
            name: this._processName,
            $type: 'bpmn:Process'
          }
        })),
        addShape: jest.fn(),
        addConnection: jest.fn(),
        updateShape: jest.fn(),
        removeShape: jest.fn()
      }
    };
  }

  async importXML(xml) {
    // Basic validation
    if (!xml.includes('bpmn:definitions')) {
      throw new Error('Invalid BPMN XML: missing bpmn:definitions');
    }
    
    this._definitions = xml;
    
    // Parse process name from XML - look specifically for process name
    const processMatch = xml.match(/<bpmn:process[^>]+name="([^"]+)"/);
    if (processMatch) {
      this._processName = processMatch[1];
    }
    
    // Track imported elements
    this._trackedElements = [];
    const elements = new Map();
    
    // Parse all elements first
    const startEventMatch = xml.match(/<bpmn:startEvent[^>]+id="([^"]+)"[^>]*name="([^"]+)"?/);
    if (startEventMatch) {
      const element = {
        id: startEventMatch[1],
        type: 'bpmn:StartEvent',
        businessObject: { name: startEventMatch[2] || 'Start' },
        incoming: [],
        outgoing: []
      };
      elements.set(element.id, element);
      this._trackedElements.push(element);
    }
    
    const taskMatch = xml.match(/<bpmn:task[^>]+id="([^"]+)"[^>]*name="([^"]+)"?/);
    if (taskMatch) {
      const element = {
        id: taskMatch[1],
        type: 'bpmn:Task',
        businessObject: { name: taskMatch[2] || 'Task' },
        incoming: [],
        outgoing: []
      };
      elements.set(element.id, element);
      this._trackedElements.push(element);
    }
    
    const endEventMatch = xml.match(/<bpmn:endEvent[^>]+id="([^"]+)"[^>]*name="([^"]+)"?/);
    if (endEventMatch) {
      const element = {
        id: endEventMatch[1],
        type: 'bpmn:EndEvent',
        businessObject: { name: endEventMatch[2] || 'End' },
        incoming: [],
        outgoing: []
      };
      elements.set(element.id, element);
      this._trackedElements.push(element);
    }
    
    // Parse sequence flows and update connections
    const flowRegex = /<bpmn:sequenceFlow[^>]+id="([^"]+)"[^>]+sourceRef="([^"]+)"[^>]+targetRef="([^"]+)"/g;
    let flowMatch;
    while ((flowMatch = flowRegex.exec(xml)) !== null) {
      const flow = {
        id: flowMatch[1],
        type: 'bpmn:SequenceFlow',
        source: elements.get(flowMatch[2]),
        target: elements.get(flowMatch[3])
      };
      
      if (flow.source && flow.target) {
        flow.source.outgoing.push(flow);
        flow.target.incoming.push(flow);
        this._trackedElements.push(flow);
      }
    }
    
    // Mock element registry updates
    const elementRegistry = this.get('elementRegistry');
    elementRegistry.getAll = jest.fn(() => this._trackedElements);
    
    return { warnings: [] };
  }

  async saveXML(options) {
    // Generate XML based on tracked elements for better test coverage
    const processName = this._processName || 'Test Process';
    const elements = this._trackedElements || [];
    
    let elementXml = elements.map(el => {
      const typeMap = {
        'bpmn:StartEvent': 'startEvent',
        'bpmn:EndEvent': 'endEvent',
        'bpmn:Task': 'task',
        'bpmn:UserTask': 'userTask',
        'bpmn:ServiceTask': 'serviceTask',
        'bpmn:SendTask': 'sendTask',
        'bpmn:ExclusiveGateway': 'exclusiveGateway',
        'bpmn:ParallelGateway': 'parallelGateway'
      };
      const tagName = typeMap[el.type] || 'task';
      return `    <bpmn:${tagName} id="${el.id}" name="${el.businessObject?.name || ''}" />`;
    }).join('\n');
    
    if (!elementXml) {
      elementXml = `    <bpmn:startEvent id="StartEvent_1" name="Start" />
    <bpmn:task id="Task_1" name="Do Work" />`;
    }
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" name="${processName}" isExecutable="true">
${elementXml}
  </bpmn:process>
</bpmn:definitions>`;
    return { xml };
  }

  async saveSVG(options) {
    return { 
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>' 
    };
  }

  get(serviceName) {
    return this._services[serviceName] || {};
  }
  
  // Helper method to set process name for tests
  setProcessName(name) {
    this._processName = name;
  }
}

module.exports = BpmnModeler;
module.exports.BpmnModeler = BpmnModeler;
module.exports.default = BpmnModeler;