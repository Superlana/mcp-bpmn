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

### Core Process Tools

#### `bpmn_create_process`
Create a new BPMN process or collaboration diagram.

```javascript
{
  name: "Order Processing",
  type: "process" // or "collaboration"
}
```

#### `bpmn_add_event`
Add events (start, end, intermediate, boundary) to the process.

```javascript
{
  processId: "Process_1",
  eventType: "start", // start, end, intermediate-throw, intermediate-catch, boundary
  name: "Order Received",
  eventDefinition: "message", // optional: message, timer, error, signal, etc.
  position: { x: 100, y: 200 } // optional
}
```

#### `bpmn_add_activity`
Add activities (tasks, subprocesses) to the process.

```javascript
{
  processId: "Process_1",
  activityType: "userTask", // task, userTask, serviceTask, scriptTask, etc.
  name: "Review Order",
  position: { x: 250, y: 200 }, // optional
  properties: { assignee: "reviewer" } // optional
}
```

#### `bpmn_add_gateway`
Add gateways for branching logic.

```javascript
{
  processId: "Process_1",
  gatewayType: "exclusive", // exclusive, parallel, inclusive, eventBased
  name: "Payment Check",
  position: { x: 400, y: 200 } // optional
}
```

#### `bpmn_connect`
Connect two elements with a sequence flow.

```javascript
{
  processId: "Process_1",
  sourceId: "StartEvent_1",
  targetId: "UserTask_1",
  label: "Start Flow", // optional
  condition: "amount > 1000" // optional, for conditional flows
}
```

### Layout and Export Tools

#### `bpmn_auto_layout`
Apply automatic layout to position elements.

```javascript
{
  processId: "Process_1",
  algorithm: "horizontal" // currently only horizontal is supported
}
```

#### `bpmn_export`
Export the process as BPMN 2.0 XML.

```javascript
{
  processId: "Process_1",
  format: "xml", // only xml is currently supported
  formatted: true
}
```

### Diagram Management Tools

- `bpmn_list_diagrams` - List all saved BPMN diagrams
- `bpmn_load_diagram` - Load a saved diagram
- `bpmn_delete_diagram` - Delete a saved diagram
- `bpmn_get_diagrams_path` - Get the storage path for diagrams

### Element Management Tools

- `bpmn_list_elements` - List all elements in a process
- `bpmn_get_element` - Get details of a specific element
- `bpmn_update_element` - Update element properties
- `bpmn_delete_element` - Delete an element

### Mermaid Conversion Tools

#### `bpmn_convert_mermaid`
Convert a Mermaid flowchart to BPMN 2.0 format.

```javascript
{
  mermaidCode: "graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Process]\n  B -->|No| D[End]",
  processName: "My Process",
  saveToFile: true,
  filename: "converted-process.bpmn"
}
```

#### `bpmn_import_mermaid`
Import a Mermaid diagram as an editable BPMN process.

```javascript
{
  mermaidCode: "graph TD\n  A[Start] --> B[Task] --> C[End]",
  processName: "Imported Process",
  autoLayout: true
}
```

## 💡 Examples

### Example 1: Creating an Approval Process from Scratch

```javascript
// Step 1: Create the process
await bpmn_create_process({ name: "Approval Workflow" });

// Step 2: Add elements
await bpmn_add_event({ processId, eventType: "start", name: "Request Received" });
await bpmn_add_activity({ processId, activityType: "userTask", name: "Review Request" });
await bpmn_add_gateway({ processId, gatewayType: "exclusive", name: "Approved?" });
await bpmn_add_activity({ processId, activityType: "serviceTask", name: "Process Approval" });
await bpmn_add_activity({ processId, activityType: "userTask", name: "Handle Rejection" });
await bpmn_add_event({ processId, eventType: "end", name: "Complete" });

// Step 3: Connect elements explicitly
await bpmn_connect({ processId, sourceId: "StartEvent_1", targetId: "UserTask_1" });
await bpmn_connect({ processId, sourceId: "UserTask_1", targetId: "ExclusiveGateway_1" });
await bpmn_connect({ processId, sourceId: "ExclusiveGateway_1", targetId: "ServiceTask_1", label: "Yes" });
await bpmn_connect({ processId, sourceId: "ExclusiveGateway_1", targetId: "UserTask_2", label: "No" });
await bpmn_connect({ processId, sourceId: "ServiceTask_1", targetId: "EndEvent_1" });
await bpmn_connect({ processId, sourceId: "UserTask_2", targetId: "EndEvent_1" });

// Step 4: Apply auto-layout for proper positioning
await bpmn_auto_layout({ processId });

// Step 5: Export the diagram
const xml = await bpmn_export({ processId });
```

### Example 2: Bootstrap from Mermaid (Recommended for Lower Token Usage)

```javascript
// Step 1: Define process in Mermaid syntax (much more concise!)
const mermaidCode = `
graph TD
  A((Request Received)) --> B[Review Request]
  B --> C{Approved?}
  C -->|Yes| D[Process Approval]
  C -->|No| E[Handle Rejection]
  D --> F((Complete))
  E --> F
`;

// Step 2: Import as editable BPMN process
const result = await bpmn_import_mermaid({ 
  mermaidCode, 
  processName: "Approval Workflow",
  autoLayout: true 
});

// Step 3: Make additional edits if needed
await bpmn_update_element({ 
  processId: result.processId, 
  elementId: "UserTask_1", 
  properties: { assignee: "reviewer" }
});

// Step 4: Export the final diagram
const xml = await bpmn_export({ processId: result.processId });
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
- `AutoLayout` - Smart positioning algorithm with branch handling
- `BpmnRequestHandler` - MCP request processing
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
- [ ] BPMN validation framework
- [ ] Mermaid diagram import/export
- [ ] Natural language to BPMN conversion
- [ ] Integration with Camunda/Activiti engines
- [ ] Subprocess expansion support
- [ ] Message flow between pools

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