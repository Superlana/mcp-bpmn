import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
  {
    name: 'bpmn_create_process',
    description: 'Create a new BPMN process or collaboration diagram',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the process'
        },
        type: {
          type: 'string',
          enum: ['process', 'collaboration'],
          description: 'Type of diagram to create',
          default: 'process'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'bpmn_import_xml',
    description: 'Import an existing BPMN XML file',
    inputSchema: {
      type: 'object',
      properties: {
        xml: {
          type: 'string',
          description: 'BPMN 2.0 XML content'
        },
        validate: {
          type: 'boolean',
          description: 'Whether to validate the XML before importing',
          default: true
        }
      },
      required: ['xml']
    }
  },
  {
    name: 'bpmn_add_event',
    description: 'Add an event (start, end, intermediate, boundary) to the process',
    inputSchema: {
      type: 'object',
      properties: {
        processId: {
          type: 'string',
          description: 'ID of the process'
        },
        eventType: {
          type: 'string',
          enum: ['start', 'end', 'intermediate-throw', 'intermediate-catch', 'boundary'],
          description: 'Type of event to add'
        },
        name: {
          type: 'string',
          description: 'Name of the event'
        },
        eventDefinition: {
          type: 'string',
          enum: ['message', 'timer', 'error', 'signal', 'conditional', 'escalation', 'compensation', 'cancel', 'terminate'],
          description: 'Event definition type (optional)'
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' }
          },
          description: 'Position of the event (optional)'
        },
        attachTo: {
          type: 'string',
          description: 'ID of activity to attach to (for boundary events)'
        }
      },
      required: ['processId', 'eventType']
    }
  },
  {
    name: 'bpmn_add_activity',
    description: 'Add an activity (task, subprocess) to the process',
    inputSchema: {
      type: 'object',
      properties: {
        processId: {
          type: 'string',
          description: 'ID of the process'
        },
        activityType: {
          type: 'string',
          enum: ['task', 'userTask', 'serviceTask', 'scriptTask', 'businessRuleTask', 'manualTask', 'receiveTask', 'sendTask', 'subProcess', 'callActivity'],
          description: 'Type of activity'
        },
        name: {
          type: 'string',
          description: 'Name of the activity'
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' }
          },
          description: 'Position of the activity (optional)'
        },
        properties: {
          type: 'object',
          description: 'Additional properties (assignee, candidateGroups, etc.)'
        }
      },
      required: ['processId', 'activityType', 'name']
    }
  },
  {
    name: 'bpmn_add_gateway',
    description: 'Add a gateway (decision point) to the process',
    inputSchema: {
      type: 'object',
      properties: {
        processId: {
          type: 'string',
          description: 'ID of the process'
        },
        gatewayType: {
          type: 'string',
          enum: ['exclusive', 'parallel', 'inclusive', 'eventBased', 'complex'],
          description: 'Type of gateway'
        },
        name: {
          type: 'string',
          description: 'Name of the gateway (optional)'
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' }
          },
          description: 'Position of the gateway (optional)'
        },
        connectFrom: {
          type: 'string',
          description: 'ID of element to connect from (optional)'
        }
      },
      required: ['processId', 'gatewayType']
    }
  },
  {
    name: 'bpmn_connect',
    description: 'Connect two elements with a sequence flow',
    inputSchema: {
      type: 'object',
      properties: {
        processId: {
          type: 'string',
          description: 'ID of the process'
        },
        sourceId: {
          type: 'string',
          description: 'ID of the source element'
        },
        targetId: {
          type: 'string',
          description: 'ID of the target element'
        },
        label: {
          type: 'string',
          description: 'Label for the connection (optional)'
        },
        condition: {
          type: 'string',
          description: 'Condition expression for the flow (optional)'
        }
      },
      required: ['processId', 'sourceId', 'targetId']
    }
  },
  {
    name: 'bpmn_add_pool',
    description: 'Add a participant pool to a collaboration',
    inputSchema: {
      type: 'object',
      properties: {
        processId: {
          type: 'string',
          description: 'ID of the collaboration'
        },
        name: {
          type: 'string',
          description: 'Name of the participant/pool'
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' }
          },
          description: 'Position of the pool (optional)'
        },
        size: {
          type: 'object',
          properties: {
            width: { type: 'number' },
            height: { type: 'number' }
          },
          description: 'Size of the pool (optional)'
        }
      },
      required: ['processId', 'name']
    }
  },
  {
    name: 'bpmn_add_lane',
    description: 'Add a lane to an existing pool',
    inputSchema: {
      type: 'object',
      properties: {
        processId: {
          type: 'string',
          description: 'ID of the process'
        },
        poolId: {
          type: 'string',
          description: 'ID of the pool to add lane to'
        },
        name: {
          type: 'string',
          description: 'Name of the lane'
        },
        position: {
          type: 'string',
          enum: ['top', 'bottom'],
          description: 'Position relative to existing lanes',
          default: 'bottom'
        }
      },
      required: ['processId', 'poolId', 'name']
    }
  },
  {
    name: 'bpmn_export',
    description: 'Export the process as BPMN 2.0 XML or SVG',
    inputSchema: {
      type: 'object',
      properties: {
        processId: {
          type: 'string',
          description: 'ID of the process to export'
        },
        format: {
          type: 'string',
          enum: ['xml', 'svg'],
          description: 'Export format',
          default: 'xml'
        },
        formatted: {
          type: 'boolean',
          description: 'Whether to format the output (for XML)',
          default: true
        }
      },
      required: ['processId']
    }
  },
  {
    name: 'bpmn_validate',
    description: 'Validate a BPMN process for correctness',
    inputSchema: {
      type: 'object',
      properties: {
        processId: {
          type: 'string',
          description: 'ID of the process to validate'
        },
        level: {
          type: 'string',
          enum: ['syntax', 'semantic', 'full'],
          description: 'Validation level',
          default: 'full'
        }
      },
      required: ['processId']
    }
  },
  {
    name: 'bpmn_list_elements',
    description: 'List all elements in a process',
    inputSchema: {
      type: 'object',
      properties: {
        processId: {
          type: 'string',
          description: 'ID of the process'
        },
        elementType: {
          type: 'string',
          description: 'Filter by element type (optional)'
        }
      },
      required: ['processId']
    }
  },
  {
    name: 'bpmn_get_element',
    description: 'Get details of a specific element',
    inputSchema: {
      type: 'object',
      properties: {
        processId: {
          type: 'string',
          description: 'ID of the process'
        },
        elementId: {
          type: 'string',
          description: 'ID of the element'
        }
      },
      required: ['processId', 'elementId']
    }
  },
  {
    name: 'bpmn_update_element',
    description: 'Update properties of an existing element',
    inputSchema: {
      type: 'object',
      properties: {
        processId: {
          type: 'string',
          description: 'ID of the process'
        },
        elementId: {
          type: 'string',
          description: 'ID of the element to update'
        },
        name: {
          type: 'string',
          description: 'New name for the element'
        },
        properties: {
          type: 'object',
          description: 'Properties to update'
        }
      },
      required: ['processId', 'elementId']
    }
  },
  {
    name: 'bpmn_delete_element',
    description: 'Delete an element from the process',
    inputSchema: {
      type: 'object',
      properties: {
        processId: {
          type: 'string',
          description: 'ID of the process'
        },
        elementId: {
          type: 'string',
          description: 'ID of the element to delete'
        }
      },
      required: ['processId', 'elementId']
    }
  },
  {
    name: 'bpmn_list_diagrams',
    description: 'List all saved BPMN diagrams',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'bpmn_load_diagram',
    description: 'Load a saved BPMN diagram',
    inputSchema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'Filename of the diagram to load'
        }
      },
      required: ['filename']
    }
  },
  {
    name: 'bpmn_delete_diagram',
    description: 'Delete a saved BPMN diagram file',
    inputSchema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'Filename of the diagram to delete'
        }
      },
      required: ['filename']
    }
  },
  {
    name: 'bpmn_get_diagrams_path',
    description: 'Get the path where BPMN diagrams are saved',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'bpmn_auto_layout',
    description: 'Apply automatic layout to a process for better visual positioning',
    inputSchema: {
      type: 'object',
      properties: {
        processId: {
          type: 'string',
          description: 'ID of the process to layout'
        },
        algorithm: {
          type: 'string',
          enum: ['horizontal', 'vertical'],
          description: 'Layout algorithm to use',
          default: 'horizontal'
        }
      },
      required: ['processId']
    }
  },
  {
    name: 'bpmn_convert_mermaid',
    description: 'Convert a Mermaid flowchart diagram to BPMN 2.0 format',
    inputSchema: {
      type: 'object',
      properties: {
        mermaidCode: {
          type: 'string',
          description: 'Mermaid flowchart code to convert'
        },
        processName: {
          type: 'string',
          description: 'Name for the BPMN process (optional)',
          default: 'Converted Process'
        },
        saveToFile: {
          type: 'boolean',
          description: 'Whether to save the BPMN to a file',
          default: false
        },
        filename: {
          type: 'string',
          description: 'Custom filename for saved BPMN (optional)'
        }
      },
      required: ['mermaidCode']
    }
  },
  {
    name: 'bpmn_import_mermaid',
    description: 'Import a Mermaid diagram and create an editable BPMN process',
    inputSchema: {
      type: 'object',
      properties: {
        mermaidCode: {
          type: 'string',
          description: 'Mermaid flowchart code to import'
        },
        processName: {
          type: 'string',
          description: 'Name for the BPMN process',
          default: 'Imported Process'
        },
        autoLayout: {
          type: 'boolean',
          description: 'Apply automatic layout after import',
          default: true
        }
      },
      required: ['mermaidCode']
    }
  }
];