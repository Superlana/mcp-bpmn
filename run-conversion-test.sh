#!/bin/bash

echo "🚀 MCP-BPMN Conversion Test Runner"
echo "=================================="
echo

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo
fi

# Check if build exists
if [ ! -d "dist" ]; then
    echo "🔨 Building project..."
    npm run build
    echo
fi

# Run the standalone conversion test
echo "🧪 Running standalone conversion test..."
echo "========================================"
npx tsx test-conversion.ts
echo

# Run the jest test suite
echo "🧪 Running Jest test suite..."
echo "=============================="
npm test -- tests/integration/mermaid-conversion.test.ts
echo

echo "✅ All tests completed!"
echo "📁 Check the 'samples/converted-output.bpmn' file for the conversion result."