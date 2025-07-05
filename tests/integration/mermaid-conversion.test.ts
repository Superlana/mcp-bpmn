import { MermaidConverter } from '../../src/converters/MermaidConverter.js';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('Mermaid to BPMN Conversion', () => {
  let converter: MermaidConverter;
  let mermaidSource: string;
  let expectedBpmn: string;
  let badBpmn: string;

  beforeAll(async () => {
    converter = new MermaidConverter();
    
    // Read the mermaid source file
    const mermaidPath = join(process.cwd(), 'samples', 'mermaid_source', 'o2c-process-mermaid.mermaid');
    mermaidSource = await fs.readFile(mermaidPath, 'utf-8');
    
    // Read the expected good BPMN file
    const goodBpmnPath = join(process.cwd(), 'samples', 'good', 'order-to-cash-process_manual.bpmn');
    expectedBpmn = await fs.readFile(goodBpmnPath, 'utf-8');
    
    // Read the bad BPMN file for comparison
    const badBpmnPath = join(process.cwd(), 'samples', 'bad', 'order-to-cash-process.bpmn');
    badBpmn = await fs.readFile(badBpmnPath, 'utf-8');
  });

  describe('Conversion Process', () => {
    test('should successfully convert mermaid to BPMN', async () => {
      const result = await converter.convert(mermaidSource);
      
      expect(result.xml).toBeDefined();
      expect(result.xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.xml).toContain('<bpmn:definitions');
      
      // Write the result to a new file for inspection
      const outputPath = join(process.cwd(), 'samples', 'test-output.bpmn');
      await fs.writeFile(outputPath, result.xml);
      
      console.log(`✅ Conversion successful! Output written to: ${outputPath}`);
    });

    test('should include Send Invoice to Customer task', async () => {
      const result = await converter.convert(mermaidSource);
      
      expect(result.xml).toBeDefined();
      // Check for parts of the task name (handles HTML entities)
      expect(result.xml).toContain('Send Invoice');
      expect(result.xml).toContain('to Customer');
      
      // Check that the task is properly defined as a task element
      expect(result.xml).toMatch(/<bpmn:task[^>]*name="Send Invoice[^"]*to Customer"/);
    });

    test('should include Send Payment Reminder task', async () => {
      const result = await converter.convert(mermaidSource);
      
      expect(result.xml).toBeDefined();
      // Check for parts of the task name (handles HTML entities)
      expect(result.xml).toContain('Send Payment');
      expect(result.xml).toContain('Reminder');
      
      // Check that the task is properly defined as a task element
      expect(result.xml).toMatch(/<bpmn:task[^>]*name="Send Payment[^"]*Reminder"/);
    });

    test('should not have invalid end event flows', async () => {
      const result = await converter.convert(mermaidSource);
      
      expect(result.xml).toBeDefined();
      
      // Extract all end events
      const endEventMatches = result.xml.match(/<bpmn:endEvent[^>]*id="([^"]*)"[^>]*>/g) || [];
      const endEventIds = endEventMatches.map(match => {
        const idMatch = match.match(/id="([^"]*)"/);
        return idMatch ? idMatch[1] : '';
      }).filter(id => id);
      
      // Check that no end events are sources of sequence flows
      for (const endEventId of endEventIds) {
        expect(result.xml).not.toMatch(new RegExp(`sourceRef="${endEventId}"`));
      }
    });

    test('should have proper task sequence flows', async () => {
      const result = await converter.convert(mermaidSource);
      
      expect(result.xml).toBeDefined();
      
      // Check that Generate Invoice flows to Send Invoice to Customer
      const generateInvoiceMatch = result.xml.match(/<bpmn:task[^>]*name="Generate[^"]*Invoice"[^>]*id="([^"]*)"[^>]*>/);
      const sendInvoiceMatch = result.xml.match(/<bpmn:task[^>]*name="Send Invoice[^"]*to Customer"[^>]*id="([^"]*)"[^>]*>/);
      
      if (generateInvoiceMatch && sendInvoiceMatch) {
        const generateInvoiceId = generateInvoiceMatch[1];
        const sendInvoiceId = sendInvoiceMatch[1];
        
        // Check that there's a flow from Generate Invoice to Send Invoice to Customer
        expect(result.xml).toMatch(new RegExp(`sourceRef="${generateInvoiceId}"[^>]*targetRef="${sendInvoiceId}"`));
      }
    });

    test('should have all required BPMN elements', async () => {
      const result = await converter.convert(mermaidSource);
      
      expect(result.xml).toBeDefined();
      
      // Check for start event
      expect(result.xml).toMatch(/<bpmn:startEvent/);
      
      // Check for end events
      expect(result.xml).toMatch(/<bpmn:endEvent/);
      
      // Check for tasks
      expect(result.xml).toMatch(/<bpmn:task/);
      
      // Check for exclusive gateways
      expect(result.xml).toMatch(/<bpmn:exclusiveGateway/);
      
      // Check for sequence flows
      expect(result.xml).toMatch(/<bpmn:sequenceFlow/);
      
      // Check for diagram elements
      expect(result.xml).toMatch(/<bpmndi:BPMNDiagram/);
      expect(result.xml).toMatch(/<bpmndi:BPMNShape/);
      expect(result.xml).toMatch(/<bpmndi:BPMNEdge/);
    });

    test('should preserve all mermaid nodes', async () => {
      const result = await converter.convert(mermaidSource);
      
      expect(result.xml).toBeDefined();
      
      // Key task keywords that should be present (handling HTML entities)
      const expectedTaskKeywords = [
        'Sales', 'Order', 'Credit', 'Check', 'Perform', 'Confirmation',
        'Inventory', 'Availability', 'Allocate', 'Pick', 'Pack',
        'Quality', 'Shipping', 'Generate', 'Invoice', 'Send', 
        'Payment', 'Terms', 'Reminder', 'Collections',
        'Bank', 'Reconciliation', 'Update', 'Customer', 'Close'
      ];
      
      for (const keyword of expectedTaskKeywords) {
        expect(result.xml).toContain(keyword);
      }
    });

    test('should have correct element counts', async () => {
      const result = await converter.convert(mermaidSource);
      
      expect(result.xml).toBeDefined();
      
      // Count elements
      const taskCount = (result.xml.match(/<bpmn:task/g) || []).length;
      const gatewayCount = (result.xml.match(/<bpmn:exclusiveGateway/g) || []).length;
      const startEventCount = (result.xml.match(/<bpmn:startEvent/g) || []).length;
      const endEventCount = (result.xml.match(/<bpmn:endEvent/g) || []).length;
      
      // Expected counts based on mermaid source analysis
      expect(taskCount).toBe(22); // 22 tasks including Q and U (corrected count)
      expect(gatewayCount).toBe(6); // 6 gateways (B, E, I, S, V, X)
      expect(startEventCount).toBe(1); // 1 start event
      expect(endEventCount).toBe(3); // 3 end events (End1, End2, End3)
      
      // Validate specific statistics if available
      if (result.statistics) {
        expect(result.statistics.tasks).toBe(22);
        expect(result.statistics.gateways).toBe(6);
        expect(result.statistics.events).toBe(4); // 1 start + 3 end
      }
    });
  });

  describe('Comparison with Expected Output', () => {
    test('should match expected task structure', async () => {
      const result = await converter.convert(mermaidSource);
      
      expect(result.xml).toBeDefined();
      
      // Check that both generated and expected BPMN have the critical tasks (handle HTML entities)
      expect(result.xml).toContain('Send Invoice');
      expect(result.xml).toContain('to Customer');
      expect(result.xml).toContain('Send Payment');
      expect(result.xml).toContain('Reminder');
      
      expect(expectedBpmn).toContain('Send Invoice to Customer');
      expect(expectedBpmn).toContain('Send Payment Reminder');
    });

    test('should not have the same issues as bad BPMN', async () => {
      const result = await converter.convert(mermaidSource);
      
      expect(result.xml).toBeDefined();
      
      // Check that we don't have the same structural issues as the bad BPMN
      // The bad BPMN has flows from end events, which should not happen
      const badFlowPattern = /sourceRef="EndEvent_[^"]*"/;
      
      expect(result.xml).not.toMatch(badFlowPattern);
      expect(badBpmn).toMatch(badFlowPattern); // Confirm the bad BPMN has this issue
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid mermaid syntax gracefully', async () => {
      const invalidMermaid = 'invalid mermaid syntax here';
      
      try {
        await converter.convert(invalidMermaid);
        // If we get here, the converter should have thrown an error
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle empty mermaid input', async () => {
      try {
        await converter.convert('');
        // If we get here, the converter should have thrown an error
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});