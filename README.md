# MCP-BPMN Server

An MCP (Model Context Protocol) server that enables AI agents to programmatically create, modify, and export BPMN 2.0 diagrams using bpmn-js.

## Features

- Create BPMN processes and collaborations
- Add all standard BPMN elements (events, activities, gateways, pools, lanes)
- Connect elements with sequence and message flows
- Import and export BPMN 2.0 XML
- Export diagrams as SVG
- Validate BPMN compliance
- Fluent API for process construction

## Installation

```bash
npm install
npm run build
```

## Usage

### As an MCP Server

Add to your Claude Desktop or other MCP client configuration:

```json
{
  "mcpServers": {
    "mcp-bpmn": {
      "command": "node",
      "args": ["/path/to/mcp-bpmn/dist/server/index.js"]
    }
  }
}
```

### Available Tools

- `bpmn_create_process` - Create a new BPMN process
- `bpmn_add_event` - Add start, end, or intermediate events
- `bpmn_add_activity` - Add tasks and subprocesses
- `bpmn_add_gateway` - Add decision points (exclusive, parallel, etc.)
- `bpmn_connect` - Connect elements with flows
- `bpmn_add_pool` - Add participant pools
- `bpmn_add_lane` - Add lanes to pools
- `bpmn_export` - Export as BPMN XML or SVG
- `bpmn_validate` - Validate BPMN compliance
- `bpmn_list_elements` - List all elements in a process
- `bpmn_update_element` - Update element properties
- `bpmn_delete_element` - Remove elements

## Example Usage (via AI Agent)

```javascript
// Create a simple process
const { processId } = await bpmn_create_process({ 
  name: "Order Processing" 
});

// Add start event
const { elementId: start } = await bpmn_add_event({ 
  processId, 
  eventType: "start",
  name: "Order Received" 
});

// Add task connected to start
const { elementId: task } = await bpmn_add_activity({
  processId,
  activityType: "userTask",
  name: "Review Order",
  connectFrom: start
});

// Add gateway
const { elementId: gateway } = await bpmn_add_gateway({
  processId,
  gatewayType: "exclusive",
  name: "Order Valid?",
  connectFrom: task
});

// Export the process
const { content } = await bpmn_export({ 
  processId,
  format: "xml" 
});
```

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Type check
npm run type-check
```

## Architecture

The server is built with:
- **Core Engine**: Abstracts bpmn-js for simplified operations
- **Element Factory**: Creates BPMN elements with proper defaults
- **Process Builder**: Fluent API for process construction
- **MCP Interface**: Exposes tools to AI agents
- **Type Mappings**: Handles BPMN type conversions
- **Position Calculator**: Auto-layouts elements

## License

MIT