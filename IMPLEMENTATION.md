# MCP-BPMN Implementation Guide

This document provides detailed technical information about the MCP-BPMN server implementation.

## 🏗️ Architecture Overview

### Design Principles

1. **Server-Side Generation**: Pure XML generation without browser dependencies
2. **Explicit API Design**: Clear separation between element creation and connection
3. **Smart Positioning**: Automatic layout with branch-aware algorithms
4. **File Persistence**: Local storage for diagram editing in visual tools

### Core Components

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   MCP Client    │────▶│  MCP Protocol    │────▶│ Request Handler │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                           │
                                                           ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  File Storage   │◀────│ SimpleBpmnEngine │◀────│ Type Mappings   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │   Auto Layout    │
                        └──────────────────┘
```

## 📦 Component Details

### SimpleBpmnEngine (`src/core/SimpleBpmnEngine.ts`)

The core engine responsible for BPMN XML generation.

#### Key Methods:

```typescript
// Create a new process
async createProcess(name: string, type: 'process' | 'collaboration'): Promise<ProcessContext>

// Add an element
async createElement(processId: string, elementDef: ElementDefinition): Promise<any>

// Connect elements
async connect(processId: string, sourceId: string, targetId: string, label?: string): Promise<any>

// Apply auto-layout
async applyAutoLayout(processId: string, algorithm: 'horizontal' | 'vertical'): Promise<void>

// Export as XML
async exportXml(processId: string, formatted: boolean): Promise<string>
```

#### XML Generation Strategy:

1. **Template-based**: Uses string templates for XML structure
2. **Dynamic waypoints**: Calculates connection points based on element positions
3. **Proper namespaces**: Includes all required BPMN 2.0 namespaces

Example XML structure:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI">
  <bpmn:process id="Process_1" name="My Process" isExecutable="true">
    <!-- Elements -->
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <!-- Shapes and Edges -->
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
```

### AutoLayout (`src/utils/AutoLayout.ts`)

Intelligent positioning system for BPMN elements.

#### Layout Algorithm:

1. **Graph Building**:
   ```typescript
   // Build flow graph from elements and connections
   const flowGraph = buildFlowGraph(elements, connections);
   ```

2. **Level Assignment**:
   - Start events at level 0
   - BFS traversal to assign levels
   - Each level gets increasing X coordinate

3. **Branch Handling**:
   ```typescript
   // For gateways with multiple outputs
   if (isGateway(element.type) && targets.length > 1) {
     targets.forEach((target, index) => {
       const offset = (index - (targets.length - 1) / 2) * VERTICAL_SPACING;
       target.position.y = centerY + offset;
     });
   }
   ```

4. **Positioning Constants**:
   - Horizontal spacing: 150px
   - Vertical spacing: 100px
   - Gateway branch spacing: 80px
   - Start position: (100, 200)

### Waypoint Calculation

Accurate edge routing for visual rendering:

```typescript
// Calculate connection points
const sourceX = sourceElement.position.x + sourceElement.width;
const sourceY = sourceElement.position.y + (sourceElement.height / 2);
const targetX = targetElement.position.x;
const targetY = targetElement.position.y + (targetElement.height / 2);

// Generate waypoints
<di:waypoint x="${sourceX}" y="${sourceY}" />
<di:waypoint x="${targetX}" y="${targetY}" />
```

### Type Mappings (`src/utils/TypeMappings.ts`)

Converts user-friendly types to BPMN types:

```typescript
// Event mapping
"start" → "bpmn:StartEvent"
"end" → "bpmn:EndEvent"
"message" + "start" → "bpmn:StartEvent" + "bpmn:MessageEventDefinition"

// Activity mapping
"userTask" → "bpmn:UserTask"
"serviceTask" → "bpmn:ServiceTask"

// Gateway mapping
"exclusive" → "bpmn:ExclusiveGateway"
"parallel" → "bpmn:ParallelGateway"
```

## 🔧 Implementation Patterns

### 1. Process Context Management

Each process maintains its state:

```typescript
interface ProcessContext {
  id: string;
  name: string;
  type: 'process' | 'collaboration';
  elements: Map<string, any>;      // Element storage
  connections: Map<string, any>;   // Connection storage
  xml?: string;                    // Generated XML
}
```

### 2. Element Creation Pattern

```typescript
// 1. Generate unique ID
const elementId = IdGenerator.generate(elementType);

// 2. Apply default position if not provided
if (!position) {
  position = { x: 100 + (elementCount * 50), y: 200 };
}

// 3. Create element object
const element = {
  id: elementId,
  type: bpmnType,
  name: elementName,
  position: position,
  properties: additionalProps
};

// 4. Store and regenerate XML
process.elements.set(elementId, element);
process.xml = generateXmlWithElements(process);
```

### 3. Connection Pattern

Explicit connection API to avoid duplicates:

```typescript
// Create connection object
const connection = {
  id: flowId,
  source: sourceId,
  target: targetId,
  type: 'bpmn:SequenceFlow',
  label: optionalLabel
};

// Store connection
process.connections.set(flowId, connection);
```

### 4. File Persistence Pattern

Automatic saving after each operation:

```typescript
// Generate filename
const filename = `${process.id}_${sanitizeFilename(process.name)}.bpmn`;
const filepath = join(diagramsPath, filename);

// Write to filesystem
await fs.writeFile(filepath, process.xml, 'utf8');
```

## 🛠️ MCP Protocol Implementation

### Tool Registration

Tools are defined with JSON Schema:

```typescript
{
  name: 'bpmn_add_activity',
  description: 'Add an activity to the process',
  inputSchema: {
    type: 'object',
    properties: {
      processId: { type: 'string', description: 'ID of the process' },
      activityType: { 
        type: 'string', 
        enum: ['task', 'userTask', 'serviceTask', ...] 
      },
      name: { type: 'string', description: 'Name of the activity' },
      position: { 
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' }
        }
      }
    },
    required: ['processId', 'activityType', 'name']
  }
}
```

### Request Handling Flow

1. **Request Reception**: MCP server receives tool call
2. **Validation**: Input validated against schema
3. **Routing**: Request routed to appropriate handler
4. **Processing**: Business logic executed
5. **Response**: Result returned via MCP protocol

```typescript
async handleRequest(name: string, args: any): Promise<CallToolResult> {
  try {
    switch (name) {
      case 'bpmn_create_process':
        return await this.createProcess(args);
      case 'bpmn_add_event':
        return await this.addEvent(args);
      // ... other tools
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
```

## 🧪 Testing Strategy

### Unit Tests
- Core functionality isolation
- Mock dependencies
- Fast execution

### Integration Tests
- Handler logic verification
- Real engine operations
- File system operations

### E2E Tests
- Full MCP protocol flow
- Real server startup
- Complete tool execution

### Test Structure:
```
tests/
├── unit/
│   ├── utils/          # Utility function tests
│   └── core/           # Engine tests
├── integration/
│   └── handlers/       # Handler tests
└── e2e/
    └── server/         # Full server tests
```

## 📊 Performance Considerations

### Memory Management
- Process contexts stored in memory
- Automatic file persistence reduces memory pressure
- Clear() method for cleanup

### Scalability
- O(n) layout complexity for standard flows
- Efficient Map-based storage
- Minimal object cloning

### Bundle Size
- ~48KB CommonJS bundle
- Tree-shaking friendly
- Minimal dependencies

## 🔒 Security Considerations

### Input Validation
- Schema validation for all inputs
- ID sanitization
- Filename sanitization

### File System Safety
- Restricted to configured directory
- No path traversal
- Safe filename generation

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run build:bundle
```

### Environment Variables
```bash
MCP_BPMN_DIAGRAMS_PATH=/var/bpmn/diagrams
NODE_ENV=production
```

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/server/bundle.cjs"]
```

## 🔍 Debugging

### Debug Mode
```bash
DEBUG=mcp:* npm start
```

### Common Issues

1. **Connection Waypoints Wrong**
   - Check element positions
   - Verify element sizing
   - Ensure proper ID references

2. **Layout Not Working**
   - Verify connections exist
   - Check for circular dependencies
   - Ensure elements have IDs

3. **File Not Saving**
   - Check directory permissions
   - Verify path configuration
   - Check disk space

## 📚 References

- [BPMN 2.0 Specification](https://www.omg.org/spec/BPMN/2.0/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [bpmn-js Documentation](https://github.com/bpmn-io/bpmn-js)

## 🎯 Best Practices

1. **Always use explicit connections** - Avoid connectFrom pattern
2. **Apply auto-layout last** - After all elements and connections
3. **Use meaningful IDs** - For easier debugging
4. **Test with visual tools** - VS Code BPMN Editor recommended
5. **Handle errors gracefully** - Return helpful error messages