# MCP-BPMN Tests

## Test Structure

- `unit/` - Unit tests for individual components
  - `utils/` - Tests for utility functions (IdGenerator, PositionCalculator, TypeMappings)
  - Core component tests would go here

- `integration/` - Integration tests
  - `BpmnEngine.test.ts` - Tests for the BPMN engine
  - `handlers.test.ts` - Tests for MCP request handlers

- `fixtures/` - Test data
  - Sample BPMN files for testing

- `mocks/` - Mock implementations
  - `bpmn-js.js` - Mock for bpmn-js library

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- IdGenerator.test.ts
```

## Current Status

- ✅ Unit tests: All passing (36 tests)
- ⚠️  Integration tests: Need environment setup for bpmn-js DOM dependencies

The integration tests require a more complex setup due to bpmn-js needing a DOM environment. In a real deployment, these would run in a browser environment or with a more sophisticated DOM mock.

## Writing New Tests

1. Place unit tests in `tests/unit/`
2. Place integration tests in `tests/integration/`
3. Follow the existing patterns for test structure
4. Use the mock implementations when testing components that depend on bpmn-js