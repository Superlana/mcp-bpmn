#!/usr/bin/env tsx

import { MermaidConverter } from './src/converters/MermaidConverter.js';
import { promises as fs } from 'fs';
import { join } from 'path';

async function testElkLayout() {
  console.log('🚀 Testing ELK Layout Engine...\n');
  
  try {
    // Initialize converter
    const converter = new MermaidConverter();
    
    // Read the mermaid source file
    const mermaidPath = join(process.cwd(), 'samples', 'mermaid_source', 'o2c-process-mermaid.mermaid');
    console.log(`📖 Reading mermaid source from: ${mermaidPath}`);
    
    const mermaidSource = await fs.readFile(mermaidPath, 'utf-8');
    console.log(`✅ Mermaid source loaded (${mermaidSource.length} characters)\n`);
    
    // Test 1: Original layout engine
    console.log('⚙️  Converting with original layout engine...');
    const originalResult = await converter.convert(mermaidSource, { 
      useElkLayout: false,
      autoLayout: true 
    });
    
    if (!originalResult.xml) {
      console.error('❌ Original conversion failed: No XML output generated');
      process.exit(1);
    }
    
    console.log('✅ Original layout conversion successful!\n');
    
    // Write original result
    const originalOutputPath = join(process.cwd(), 'samples', 'elk-test-original.bpmn');
    await fs.writeFile(originalOutputPath, originalResult.xml);
    console.log(`💾 Original output written to: ${originalOutputPath}`);
    
    // Test 2: ELK layout engine
    console.log('\n⚙️  Converting with ELK layout engine...');
    const elkResult = await converter.convert(mermaidSource, { 
      useElkLayout: true,
      autoLayout: true 
    });
    
    if (!elkResult.xml) {
      console.error('❌ ELK conversion failed: No XML output generated');
      process.exit(1);
    }
    
    console.log('✅ ELK layout conversion successful!\n');
    
    // Write ELK result
    const elkOutputPath = join(process.cwd(), 'samples', 'elk-test-elk.bpmn');
    await fs.writeFile(elkOutputPath, elkResult.xml);
    console.log(`💾 ELK output written to: ${elkOutputPath}`);
    
    // Compare results
    console.log('\n🔍 Comparison:');
    console.log(`- Original XML size: ${originalResult.xml.length} characters`);
    console.log(`- ELK XML size: ${elkResult.xml.length} characters`);
    
    // Check for critical tasks
    const hasInvoiceTaskOriginal = originalResult.xml.includes('Send Invoice') && originalResult.xml.includes('to Customer');
    const hasReminderTaskOriginal = originalResult.xml.includes('Send Payment') && originalResult.xml.includes('Reminder');
    
    const hasInvoiceTaskElk = elkResult.xml.includes('Send Invoice') && elkResult.xml.includes('to Customer');
    const hasReminderTaskElk = elkResult.xml.includes('Send Payment') && elkResult.xml.includes('Reminder');
    
    console.log(`- Original has "Send Invoice to Customer": ${hasInvoiceTaskOriginal}`);
    console.log(`- ELK has "Send Invoice to Customer": ${hasInvoiceTaskElk}`);
    console.log(`- Original has "Send Payment Reminder": ${hasReminderTaskOriginal}`);
    console.log(`- ELK has "Send Payment Reminder": ${hasReminderTaskElk}`);
    
    // Count elements
    const originalTaskCount = (originalResult.xml.match(/<bpmn:task/g) || []).length;
    const elkTaskCount = (elkResult.xml.match(/<bpmn:task/g) || []).length;
    
    const originalGatewayCount = (originalResult.xml.match(/<bpmn:exclusiveGateway/g) || []).length;
    const elkGatewayCount = (elkResult.xml.match(/<bpmn:exclusiveGateway/g) || []).length;
    
    console.log(`\n📊 Element Counts:`);
    console.log(`- Original tasks: ${originalTaskCount}`);
    console.log(`- ELK tasks: ${elkTaskCount}`);
    console.log(`- Original gateways: ${originalGatewayCount}`);
    console.log(`- ELK gateways: ${elkGatewayCount}`);
    
    // Basic validation
    const bothComplete = hasInvoiceTaskOriginal && hasReminderTaskOriginal && hasInvoiceTaskElk && hasReminderTaskElk;
    const countsMatch = originalTaskCount === elkTaskCount && originalGatewayCount === elkGatewayCount;
    
    console.log(`\n🎯 Validation:`);
    console.log(`- Both layouts have critical tasks: ${bothComplete ? '✅' : '❌'}`);
    console.log(`- Element counts match: ${countsMatch ? '✅' : '❌'}`);
    
    if (bothComplete && countsMatch) {
      console.log('\n🎉 ELK layout test completed successfully!');
      console.log(`📁 Compare files: ${originalOutputPath} vs ${elkOutputPath}`);
    } else {
      console.log('\n⚠️  Some validation checks failed. Review the output files.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testElkLayout();