import { BpmnEngine } from './core/BpmnEngine.js';
import { ProcessBuilder } from './core/ProcessBuilder.js';

async function testBpmnEngine() {
  console.log('Testing BPMN Engine...\n');

  // Test 1: Create a simple process
  const engine = new BpmnEngine();
  const process = await engine.createProcess('Order Processing');
  console.log('✓ Created process:', process.id);

  // Test 2: Add elements
  const start = await engine.createElement(process.id, {
    type: 'bpmn:StartEvent',
    name: 'Order Received'
  });
  console.log('✓ Added start event:', start.id);

  const task = await engine.createElement(process.id, {
    type: 'bpmn:Task',
    name: 'Process Order',
    position: { x: 250, y: 100 }
  });
  console.log('✓ Added task:', task.id);

  const end = await engine.createElement(process.id, {
    type: 'bpmn:EndEvent',
    name: 'Order Complete',
    position: { x: 400, y: 100 }
  });
  console.log('✓ Added end event:', end.id);

  // Test 3: Connect elements
  await engine.connect(process.id, start.id, task.id);
  await engine.connect(process.id, task.id, end.id);
  console.log('✓ Connected elements');

  // Test 4: Export XML
  const xml = await engine.exportXml(process.id);
  console.log('\n✓ Exported XML (first 200 chars):', xml.substring(0, 200) + '...');

  // Test 5: Process Builder
  console.log('\n\nTesting Process Builder...\n');
  
  const process2 = await engine.createProcess('Approval Process');
  const builder = new ProcessBuilder(engine, process2.id);
  
  await builder
    .startEvent('Request Submitted')
    .userTask('Manager Review', 'manager')
    .gateway('exclusive', 'Approved?')
    .branch('Yes', (b) => {
      b.task('Process Request')
        .endEvent('Request Approved');
    })
    .branch('No', (b) => {
      b.task('Send Rejection')
        .endEvent('Request Rejected');
    })
    .build();

  console.log('✓ Built approval process using fluent API');

  const xml2 = await engine.exportXml(process2.id);
  console.log('✓ Exported XML (first 200 chars):', xml2.substring(0, 200) + '...');
}

// Run tests
testBpmnEngine().catch(console.error);