// Mock for bpmn-js to avoid ES module issues in tests
class BpmnModeler {
  constructor(options) {
    this.options = options;
    this._definitions = null;
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
        createShape: jest.fn((shape, position, parent) => ({
          ...shape,
          x: position.x,
          y: position.y,
          parent
        })),
        updateLabel: jest.fn(),
        updateProperties: jest.fn(),
        connect: jest.fn((source, target) => ({
          id: `Flow_${Math.random().toString(36).substr(2, 9)}`,
          source,
          target,
          type: 'bpmn:SequenceFlow'
        })),
        appendShape: jest.fn((source, shape, position) => ({
          ...shape,
          x: position.x || source.x + 150,
          y: position.y || source.y
        })),
        removeElements: jest.fn(),
        addLane: jest.fn((pool) => ({
          id: `Lane_${Math.random().toString(36).substr(2, 9)}`,
          type: 'bpmn:Lane',
          parent: pool
        }))
      },
      elementRegistry: {
        get: jest.fn((id) => {
          if (id === 'invalid-id' || id === 'invalid-source' || id === 'invalid-target') {
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
        getAll: jest.fn(() => []),
        filter: jest.fn(() => []),
        forEach: jest.fn()
      },
      bpmnFactory: {
        create: jest.fn((type, attrs) => ({ $type: type, ...attrs }))
      },
      canvas: {
        getRootElement: jest.fn(() => ({ id: 'root', type: 'bpmn:Process' })),
        addShape: jest.fn(),
        addConnection: jest.fn(),
        updateShape: jest.fn(),
        removeShape: jest.fn()
      }
    };
  }

  async importXML(xml) {
    this._definitions = xml;
    return { warnings: [] };
  }

  async saveXML(options) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" name="Test Process" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Start" />
    <bpmn:task id="Task_1" name="Do Work" />
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
}

module.exports = BpmnModeler;
module.exports.BpmnModeler = BpmnModeler;
module.exports.default = BpmnModeler;