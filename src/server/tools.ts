import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
  // Creation tools
  {
    name: 'new_bpmn',
    description: 'Create a new BPMN diagram and set it as current context',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the diagram'
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
    name: 'new_from_mermaid',
    description: 'Create a new BPMN diagram from Mermaid code and set it as current context',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name for the new diagram'
        },
        mermaidCode: {
          type: 'string',
          description: 'Mermaid flowchart code to convert'
        }
      },
      required: ['name', 'mermaidCode']
    }
  },
  
  // File operations
  {
    name: 'open_bpmn',
    description: 'Open an existing BPMN file and set it as current context',
    inputSchema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'Filename of the BPMN diagram to open'
        }
      },
      required: ['filename']
    }
  },
  {
    name: 'open_mermaid_file',
    description: 'Open a Mermaid file, convert it to BPMN, and set as current context',
    inputSchema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'Filename of the Mermaid file to open and convert'
        }
      },
      required: ['filename']
    }
  },
  {
    name: 'save',
    description: 'Save the current diagram to its file (error if no filename set)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'save_as',
    description: 'Save the current diagram with a new filename',
    inputSchema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'New filename for the diagram'
        }
      },
      required: ['filename']
    }
  },
  {
    name: 'close',
    description: 'Close the current diagram and clear the context',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'current',
    description: 'Get information about the current diagram',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  
  // Element manipulation tools (work on current context)
  {
    name: 'add_event',
    description: 'Add an event to the current diagram',
    inputSchema: {
      type: 'object',
      properties: {
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
      required: ['eventType']
    }
  },
  {
    name: 'add_activity',
    description: 'Add an activity to the current diagram',
    inputSchema: {
      type: 'object',
      properties: {
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
      required: ['activityType', 'name']
    }
  },
  {
    name: 'add_gateway',
    description: 'Add a gateway to the current diagram',
    inputSchema: {
      type: 'object',
      properties: {
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
        }
      },
      required: ['gatewayType']
    }
  },
  {
    name: 'connect',
    description: 'Connect two elements in the current diagram',
    inputSchema: {
      type: 'object',
      properties: {
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
      required: ['sourceId', 'targetId']
    }
  },
  {
    name: 'add_pool',
    description: 'Add a pool to the current collaboration diagram',
    inputSchema: {
      type: 'object',
      properties: {
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
      required: ['name']
    }
  },
  {
    name: 'add_lane',
    description: 'Add a lane to an existing pool in the current diagram',
    inputSchema: {
      type: 'object',
      properties: {
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
      required: ['poolId', 'name']
    }
  },
  
  // Query and manipulation tools
  {
    name: 'list_elements',
    description: 'List all elements in the current diagram',
    inputSchema: {
      type: 'object',
      properties: {
        elementType: {
          type: 'string',
          description: 'Filter by element type (optional)'
        }
      }
    }
  },
  {
    name: 'get_element',
    description: 'Get details of a specific element in the current diagram',
    inputSchema: {
      type: 'object',
      properties: {
        elementId: {
          type: 'string',
          description: 'ID of the element'
        }
      },
      required: ['elementId']
    }
  },
  {
    name: 'update_element',
    description: 'Update properties of an element in the current diagram',
    inputSchema: {
      type: 'object',
      properties: {
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
      required: ['elementId']
    }
  },
  {
    name: 'delete_element',
    description: 'Delete an element from the current diagram',
    inputSchema: {
      type: 'object',
      properties: {
        elementId: {
          type: 'string',
          description: 'ID of the element to delete'
        }
      },
      required: ['elementId']
    }
  },
  
  // Utility tools
  {
    name: 'export',
    description: 'Export the current diagram as BPMN XML',
    inputSchema: {
      type: 'object',
      properties: {
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
      }
    }
  },
  {
    name: 'validate',
    description: 'Validate the current diagram for BPMN correctness',
    inputSchema: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          enum: ['syntax', 'semantic', 'full'],
          description: 'Validation level',
          default: 'full'
        }
      }
    }
  },
  {
    name: 'auto_layout',
    description: 'Apply automatic layout to the current diagram',
    inputSchema: {
      type: 'object',
      properties: {
        algorithm: {
          type: 'string',
          enum: ['horizontal', 'vertical'],
          description: 'Layout algorithm to use',
          default: 'horizontal'
        }
      }
    }
  },
  
  // File management tools
  {
    name: 'list_diagrams',
    description: 'List all saved BPMN diagrams',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'delete_diagram_file',
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
    name: 'get_diagrams_path',
    description: 'Get the path where BPMN diagrams are saved',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];