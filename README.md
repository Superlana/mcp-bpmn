# MCP-BPMN Server

A Model Context Protocol (MCP) server that enables AI agents to create, manipulate, and manage BPMN 2.0 (Business Process Model and Notation) diagrams programmatically.

## 🎯 Overview

MCP-BPMN provides a standardized interface for AI assistants to work with business process diagrams. It generates valid BPMN 2.0 XML files that can be viewed and edited in any BPMN-compliant tool (VS Code BPMN Editor, Camunda Modeler, etc.).

### Key Features

- ✅ **Complete BPMN 2.0 Support**: Events, activities, gateways, pools, and sequences
- ✅ **Mermaid to BPMN Conversion**: Bootstrap BPMN diagrams from Mermaid flowcharts
- ✅ **Smart Auto-Layout**: Automatic positioning with branch handling for gateways
- ✅ **File Persistence**: Save diagrams locally for editing in visual tools
- ✅ **Proper Visual Rendering**: Accurate waypoint calculation for connections
- ✅ **Enterprise-Ready**: Clean API design following BPMN standards
- ✅ **No Browser Dependencies**: Server-side XML generation

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/mcp-bpmn.git
cd mcp-bpmn

# Install dependencies
npm install

# Build the project
npm run build

# Run tests (optional)
npm test
```

### Configuration

#### For Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-bpmn": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-bpmn/dist/server/index.js"]
    }
  }
}
```

#### For Other MCP Clients

Use the compiled CommonJS bundle:

```bash
node dist/server/bundle.cjs
```

## 📚 API Reference

### Stateful Context Management

MCP-BPMN uses a stateful API design where you work with one diagram at a time. All operations apply to the current diagram context, eliminating the need for processId parameters.

### Creation Tools

#### `new_bpmn`
Create a new BPMN process or collaboration diagram and set it as the current context.

```javascript
{
  name: "Order Processing",
  type: "process" // or "collaboration" (optional, defaults to "process")
}
```

#### `new_from_mermaid`
Create a new BPMN diagram from Mermaid code and set it as the current context.

```javascript
{
  name: "My Process",
  mermaidCode: "graph TD\n  A[Start] --> B[Task] --> C[End]"
}
```

### File Operations

#### `open_bpmn`
Open an existing BPMN file and set it as the current context.

```javascript
{
  filename: "my-process.bpmn"
}
```

#### `open_mermaid_file`
Open and convert a Mermaid file to BPMN, setting it as the current context.

```javascript
{
  filename: "my-flowchart.mmd"
}
```

#### `save`
Save the current diagram to its file (requires filename to be set).

```javascript
{}
```

#### `save_as`
Save the current diagram with a new filename.

```javascript
{
  filename: "my-process.bpmn"
}
```

#### `close`
Close the current diagram and clear the context.

```javascript
{}
```

#### `current`
Get information about the current diagram.

```javascript
{}
```

### Element Manipulation Tools

#### `add_event`
Add events (start, end, intermediate, boundary) to the current diagram.

```javascript
{
  eventType: "start", // start, end, intermediate-throw, intermediate-catch, boundary
  name: "Order Received",
  eventDefinition: "message", // optional: message, timer, error, signal, etc.
  position: { x: 100, y: 200 } // optional
}
```

#### `add_activity`
Add activities (tasks, subprocesses) to the current diagram.

```javascript
{
  activityType: "userTask", // task, userTask, serviceTask, scriptTask, etc.
  name: "Review Order",
  position: { x: 250, y: 200 }, // optional
  properties: { assignee: "reviewer" } // optional
}
```

#### `add_gateway`
Add gateways for branching logic to the current diagram.

```javascript
{
  gatewayType: "exclusive", // exclusive, parallel, inclusive, eventBased
  name: "Payment Check",
  position: { x: 400, y: 200 } // optional
}
```

#### `connect`
Connect two elements with a sequence flow in the current diagram.

```javascript
{
  sourceId: "StartEvent_1",
  targetId: "UserTask_1",
  label: "Start Flow", // optional
  condition: "amount > 1000" // optional, for conditional flows
}
```

#### `add_pool`
Add a pool (participant) to a collaboration diagram.

```javascript
{
  name: "Customer",
  position: { x: 100, y: 100 }, // optional
  size: { width: 600, height: 250 } // optional
}
```

#### `add_lane`
Add a lane to a pool (not yet fully implemented).

```javascript
{
  poolId: "Participant_1",
  name: "Sales Department",
  position: "bottom" // optional
}
```

### Query and Manipulation Tools

#### `list_elements`
List all elements in the current diagram.

```javascript
{
  elementType: "bpmn:Task" // optional filter
}
```

#### `get_element`
Get details of a specific element.

```javascript
{
  elementId: "UserTask_1"
}
```

#### `update_element`
Update element properties.

```javascript
{
  elementId: "UserTask_1",
  name: "Updated Task Name",
  properties: { assignee: "john.doe" }
}
```

#### `delete_element`
Delete an element and its connections.

```javascript
{
  elementId: "Task_1"
}
```

### Utility Tools

#### `export`
Export the current diagram as BPMN 2.0 XML.

```javascript
{
  format: "xml", // only xml is currently supported
  formatted: true // optional, defaults to true
}
```

#### `validate`
Validate the current diagram structure.

```javascript
{}
```

#### `auto_layout`
Apply automatic layout to position elements in the current diagram.

```javascript
{
  algorithm: "horizontal" // currently only horizontal is supported
}
```

### File Management Tools

#### `list_diagrams`
List all saved BPMN diagrams.

```javascript
{}
```

#### `delete_diagram_file`
Delete a saved diagram file.

```javascript
{
  filename: "old-process.bpmn"
}
```

#### `get_diagrams_path`
Get the storage path for diagrams.

```javascript
{}
```

## 🔄 Context Management

The MCP-BPMN server uses a stateful design where you work with one diagram at a time:

1. **Create or Open**: Start by creating a new diagram (`new_bpmn`, `new_from_mermaid`) or opening an existing one (`open_bpmn`, `open_mermaid_file`)
2. **Manipulate**: All operations (`add_event`, `connect`, etc.) apply to the current diagram
3. **Save**: Save your work with `save` or `save_as`
4. **Close**: Close the current diagram with `close`

If you try to perform operations without a current context, you'll get a helpful error message:
```
No current context. Please create a diagram first with:
  - new_bpmn(name) to create a new BPMN diagram
  - new_from_mermaid(name, mermaidCode) to convert from Mermaid
  - open_bpmn(filename) to open an existing BPMN file
  - open_mermaid_file(filename) to convert a Mermaid file
```

## 💡 Examples

### Example 1: Creating an Approval Process from Scratch

```javascript
// Step 1: Create a new process (sets it as current context)
await new_bpmn({ name: "Approval Workflow" });

// Step 2: Add elements (all operations apply to current diagram)
await add_event({ eventType: "start", name: "Request Received" });
await add_activity({ activityType: "userTask", name: "Review Request" });
await add_gateway({ gatewayType: "exclusive", name: "Approved?" });
await add_activity({ activityType: "serviceTask", name: "Process Approval" });
await add_activity({ activityType: "userTask", name: "Handle Rejection" });
await add_event({ eventType: "end", name: "Complete" });

// Step 3: Connect elements
await connect({ sourceId: "StartEvent_1", targetId: "UserTask_1" });
await connect({ sourceId: "UserTask_1", targetId: "ExclusiveGateway_1" });
await connect({ sourceId: "ExclusiveGateway_1", targetId: "ServiceTask_1", label: "Yes" });
await connect({ sourceId: "ExclusiveGateway_1", targetId: "UserTask_2", label: "No" });
await connect({ sourceId: "ServiceTask_1", targetId: "EndEvent_1" });
await connect({ sourceId: "UserTask_2", targetId: "EndEvent_1" });

// Step 4: Apply auto-layout for proper positioning
await auto_layout();

// Step 5: Save and export the diagram
await save_as({ filename: "approval-workflow.bpmn" });
const xml = await export();
```

### Example 2: Bootstrap from Mermaid (Recommended for Lower Token Usage)

```javascript
// Step 1: Create from Mermaid syntax (much more concise!)
await new_from_mermaid({ 
  name: "Approval Workflow",
  mermaidCode: `
    graph TD
      A((Request Received)) --> B[Review Request]
      B --> C{Approved?}
      C -->|Yes| D[Process Approval]
      C -->|No| E[Handle Rejection]
      D --> F((Complete))
      E --> F
  `
});

// Step 2: Apply auto-layout (Mermaid conversion includes basic layout)
await auto_layout();

// Step 3: Make additional edits if needed
await update_element({ 
  elementId: "UserTask_1", 
  properties: { assignee: "reviewer" }
});

// Step 4: Save and export
await save_as({ filename: "approval-workflow.bpmn" });
const xml = await export();
```

### Example 3: Working with Multiple Diagrams

```javascript
// Create first diagram
await new_bpmn({ name: "Process A" });
await add_event({ eventType: "start" });
await add_activity({ activityType: "task", name: "Task A" });
await save_as({ filename: "process-a.bpmn" });

// Create second diagram (automatically closes the first)
await new_bpmn({ name: "Process B" });
await add_event({ eventType: "start" });
await add_activity({ activityType: "task", name: "Task B" });
await save_as({ filename: "process-b.bpmn" });

// Go back to first diagram
await open_bpmn({ filename: "process-a.bpmn" });
await add_event({ eventType: "end" });
await save();

// Check current diagram info
const info = await current();
console.log(info); // Shows: { name: "Process A", filename: "process-a.bpmn", ... }
```

## 🗂️ File Storage

BPMN diagrams are automatically saved to your local filesystem:

- **Unix/Linux/Mac**: `~/mcp-bpmn/`
- **Windows**: `%USERPROFILE%\mcp-bpmn\`

Custom path via environment variable:
```bash
export MCP_BPMN_DIAGRAMS_PATH=/custom/path
```

Files are named: `{ProcessId}_{ProcessName}.bpmn`

## 🏗️ Architecture

### Technology Stack
- **TypeScript** - Type-safe development
- **Node.js** - Runtime environment  
- **MCP SDK** - Model Context Protocol implementation
- **Jest** - Testing framework

### Key Components
- `SimpleBpmnEngine` - Core BPMN XML generation without browser dependencies
- `DiagramContext` - Stateful context management for current diagram
- `AutoLayout` - Smart positioning algorithm with branch handling
- `BpmnRequestHandler` - MCP request processing
- `MermaidConverter` - Mermaid to BPMN conversion
- `TypeMappings` - BPMN element type conversions
- `IdGenerator` - Consistent ID generation

### Project Structure

```
mcp-bpmn/
├── src/
│   ├── core/           # Core BPMN engine
│   ├── server/         # MCP server implementation
│   ├── utils/          # Utilities (layout, ID generation)
│   ├── types/          # TypeScript type definitions
│   └── config/         # Configuration
├── tests/
│   ├── unit/          # Unit tests
│   ├── integration/   # Integration tests
│   └── e2e/           # End-to-end tests
├── dist/              # Compiled output
└── docs/              # Documentation
```

## 🧪 Development

### Available Scripts

```bash
npm run build        # Build TypeScript
npm run build:bundle # Build CommonJS bundle
npm run build:watch  # Build with watch mode
npm test            # Run all tests
npm run test:unit   # Run unit tests only
npm run test:e2e    # Run end-to-end tests
npm run lint        # Run ESLint
npm run dev         # Development mode with hot reload
npm start           # Start the MCP server
```

### Testing

The project includes comprehensive test coverage:
- **Unit Tests**: Core functionality testing
- **Integration Tests**: Handler and tool testing
- **E2E Tests**: Full MCP protocol testing

Run tests with:
```bash
npm test                    # All tests
npm run test:coverage       # With coverage report
npm run test:watch         # Watch mode
```

## 📈 Performance

- **Fast XML Generation**: Direct XML string building
- **Efficient Layout**: O(n) complexity for standard flows
- **Minimal Dependencies**: No browser or heavy libraries
- **Bundled Size**: ~48KB CommonJS bundle

## 🐛 Known Limitations

- SVG export not yet implemented (XML only)
- Vertical layout algorithm pending
- Lanes within pools not fully implemented
- Complex gateway merging patterns need manual positioning

## 🚧 Roadmap

- [ ] SVG export support
- [ ] Vertical and radial layout algorithms
- [ ] Enhanced BPMN validation framework
- [x] Mermaid diagram import/export (Completed!)
- [ ] Natural language to BPMN conversion
- [ ] Integration with Camunda/Activiti engines
- [ ] Subprocess expansion support
- [ ] Message flow between pools
- [ ] BPMN execution simulation

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- TypeScript with strict mode
- ESLint configuration provided
- Jest for testing
- Conventional commits

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/mcp-bpmn/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/mcp-bpmn/discussions)
- **Documentation**: See `/docs` folder for detailed guides

## 🙏 Acknowledgments

- Built on the [Model Context Protocol](https://modelcontextprotocol.io/) specification
- Inspired by [bpmn-js](https://github.com/bpmn-io/bpmn-js) for BPMN standards
- Thanks to the Anthropic team for MCP development