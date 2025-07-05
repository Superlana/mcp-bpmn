#!/usr/bin/env tsx

import { MermaidConverter } from './src/converters/MermaidConverter.js';
import { promises as fs } from 'fs';
import { join } from 'path';

async function runConversionTest() {
  console.log('🚀 Starting Mermaid to BPMN conversion test...\n');
  
  try {
    // Initialize converter
    const converter = new MermaidConverter();
    
    // Read the mermaid source file
    const mermaidPath = join(process.cwd(), 'samples', 'mermaid_source', 'o2c-process-mermaid.mermaid');
    console.log(`📖 Reading mermaid source from: ${mermaidPath}`);
    
    const mermaidSource = await fs.readFile(mermaidPath, 'utf-8');
    console.log(`✅ Mermaid source loaded (${mermaidSource.length} characters)\n`);
    
    // Convert mermaid to BPMN
    console.log('⚙️  Converting mermaid to BPMN...');
    let result;
    
    try {
      result = await converter.convert(mermaidSource);
    } catch (error) {
      console.error('❌ Conversion failed with error:', error);
      process.exit(1);
    }
    
    if (!result.xml) {
      console.error('❌ Conversion failed: No XML output generated');
      console.error('Result:', result);
      process.exit(1);
    }
    
    console.log('✅ Conversion successful!\n');
    
    // Write the result to output file
    const outputPath = join(process.cwd(), 'samples', 'converted-output.bpmn');
    await fs.writeFile(outputPath, result.xml);
    console.log(`💾 Output written to: ${outputPath}\n`);
    
    // Analysis
    console.log('🔍 Analysis:');
    console.log(`- BPMN XML size: ${result.xml.length} characters`);
    // Check for tasks with HTML entities
    const hasInvoiceTask = result.xml.includes('Send Invoice') && result.xml.includes('to Customer');
    const hasReminderTask = result.xml.includes('Send Payment') && result.xml.includes('Reminder');
    
    console.log(`- Contains "Send Invoice to Customer": ${hasInvoiceTask}`);
    console.log(`- Contains "Send Payment Reminder": ${hasReminderTask}`);
    
    // Check for invalid end event flows
    const endEventMatches = result.xml.match(/<bpmn:endEvent[^>]*id="([^"]*)"[^>]*>/g) || [];
    const endEventIds = endEventMatches.map(match => {
      const idMatch = match.match(/id="([^"]*)"/);
      return idMatch ? idMatch[1] : '';
    }).filter(id => id);
    
    let hasInvalidFlows = false;
    for (const endEventId of endEventIds) {
      if (result.xml.includes(`sourceRef="${endEventId}"`)) {
        hasInvalidFlows = true;
        break;
      }
    }
    
    console.log(`- Has invalid end event flows: ${hasInvalidFlows}`);
    
    // Count elements
    const taskCount = (result.xml.match(/<bpmn:task/g) || []).length;
    const gatewayCount = (result.xml.match(/<bpmn:exclusiveGateway/g) || []).length;
    const startEventCount = (result.xml.match(/<bpmn:startEvent/g) || []).length;
    const endEventCount = (result.xml.match(/<bpmn:endEvent/g) || []).length;
    const sequenceFlowCount = (result.xml.match(/<bpmn:sequenceFlow/g) || []).length;
    
    // Validate node and task counts
    console.log('\n📊 Element Count Validation:');
    const expectedNodes = 32; // From mermaid source analysis
    const expectedTasks = 22; // From mermaid source analysis (corrected count)
    const expectedGateways = 6; // From mermaid source analysis  
    const expectedStartEvents = 1; // Should be 1
    const expectedEndEvents = 3; // Should be 3 (End1, End2, End3)
    
    const totalElements = taskCount + gatewayCount + startEventCount + endEventCount;
    
    console.log(`- Total elements: ${totalElements} (expected: ${expectedNodes})`);
    console.log(`- Tasks: ${taskCount} (expected: ${expectedTasks}) ${taskCount === expectedTasks ? '✅' : '❌'}`);
    console.log(`- Gateways: ${gatewayCount} (expected: ${expectedGateways}) ${gatewayCount === expectedGateways ? '✅' : '❌'}`);
    console.log(`- Start Events: ${startEventCount} (expected: ${expectedStartEvents}) ${startEventCount === expectedStartEvents ? '✅' : '❌'}`);
    console.log(`- End Events: ${endEventCount} (expected: ${expectedEndEvents}) ${endEventCount === expectedEndEvents ? '✅' : '❌'}`);
    console.log(`- Sequence Flows: ${sequenceFlowCount}`);
    
    // Compare with expected files
    console.log('📊 Comparing with reference files:');
    
    try {
      const goodBpmnPath = join(process.cwd(), 'samples', 'good', 'order-to-cash-process_manual.bpmn');
      const goodBpmn = await fs.readFile(goodBpmnPath, 'utf-8');
      
      const goodHasInvoiceTask = goodBpmn.includes('Send Invoice to Customer');
      const goodHasReminderTask = goodBpmn.includes('Send Payment Reminder');
      
      console.log(`- Good BPMN has "Send Invoice to Customer": ${goodHasInvoiceTask}`);
      console.log(`- Good BPMN has "Send Payment Reminder": ${goodHasReminderTask}`);
      
      const badBpmnPath = join(process.cwd(), 'samples', 'bad', 'order-to-cash-process.bpmn');
      const badBpmn = await fs.readFile(badBpmnPath, 'utf-8');
      
      const badHasInvoiceTask = badBpmn.includes('Send Invoice to Customer');
      const badHasReminderTask = badBpmn.includes('Send Payment Reminder');
      
      console.log(`- Bad BPMN has "Send Invoice to Customer": ${badHasInvoiceTask}`);
      console.log(`- Bad BPMN has "Send Payment Reminder": ${badHasReminderTask}`);
      
      // Check for invalid flows in bad BPMN
      const badEndEventMatches = badBpmn.match(/<bpmn:endEvent[^>]*id="([^"]*)"[^>]*>/g) || [];
      const badEndEventIds = badEndEventMatches.map(match => {
        const idMatch = match.match(/id="([^"]*)"/);
        return idMatch ? idMatch[1] : '';
      }).filter(id => id);
      
      let badHasInvalidFlows = false;
      for (const endEventId of badEndEventIds) {
        if (badBpmn.includes(`sourceRef="${endEventId}"`)) {
          badHasInvalidFlows = true;
          break;
        }
      }
      
      console.log(`- Bad BPMN has invalid end event flows: ${badHasInvalidFlows}`);
      
    } catch (error) {
      console.log('⚠️  Could not read reference files for comparison');
    }
    
    console.log('\n🎉 Conversion test completed successfully!');
    console.log(`📁 Check the output file: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runConversionTest();