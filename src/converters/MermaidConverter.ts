import { MermaidParser } from './MermaidParser.js';
import { SimpleBpmnGenerator } from '../core/SimpleBpmnGenerator.js';
import { LayoutEngine } from '../core/LayoutEngine.js';
import type { ConversionResult } from './types.js';
import type { 
  MermaidAST
} from './ASTTypes.js';

export interface ConversionOptions {
  autoLayout?: boolean;
  validateOutput?: boolean;
  includeDataObjects?: boolean;
  preview?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  suggestions?: string[];
  supportedFeatures?: string[];
  unsupportedFeatures?: string[];
}

export interface AnalysisResult {
  nodeCount: number;
  edgeCount: number;
  subgraphCount: number;
  complexity: 'simple' | 'medium' | 'complex';
  estimatedBpmnElements: {
    tasks: number;
    gateways: number;
    events: number;
    pools: number;
    flows: number;
  };
}

export class MermaidConverter {
  private parser: MermaidParser;
  private simpleGenerator: SimpleBpmnGenerator;
  private layoutEngine: LayoutEngine;

  constructor() {
    this.parser = new MermaidParser();
    this.simpleGenerator = new SimpleBpmnGenerator();
    this.layoutEngine = new LayoutEngine();
  }

  async convert(
    mermaidCode: string, 
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    const warnings: string[] = [];

    const parseResult = this.parser.parse(mermaidCode);
    
    if (!parseResult.ast) {
      throw new Error(`Failed to parse Mermaid diagram: ${parseResult.errors.map(e => e.message).join(', ')}`);
    }

    warnings.push(...parseResult.warnings);

    const ast = parseResult.ast;
    const processName = this.generateProcessName(ast);

    // Always use simple generator for direct XML generation
    const layout = options.autoLayout !== false 
      ? ast.subgraphs.length > 0 
        ? this.layoutEngine.layoutWithPools(ast) 
        : this.layoutEngine.layout(ast)
      : undefined;
    
    const result = this.simpleGenerator.generateBpmn(ast, processName, layout);
    result.warnings.push(...warnings);
    
    if (options.validateOutput) {
      // Basic validation
      if (!result.xml.includes('startEvent') && ast.nodes.some(n => n.type === 'start')) {
        result.warnings.push('Start event may not be properly converted');
      }
      if (!result.xml.includes('endEvent') && ast.nodes.some(n => n.type === 'end')) {
        result.warnings.push('End event may not be properly converted');
      }
    }
    
    // Add stats for compatibility
    result.stats = {
      nodeCount: ast.nodes.length,
      edgeCount: ast.edges.length
    };
    
    return result;
  }

  async canConvert(mermaidCode: string): Promise<ValidationResult> {
    try {
      const parseResult = this.parser.parse(mermaidCode);
      
      if (!parseResult.ast) {
        return {
          valid: false,
          errors: parseResult.errors.map(e => e.message),
          suggestions: [
            'Check Mermaid syntax',
            'Ensure all nodes are properly defined',
            'Verify edge connections'
          ]
        };
      }

      const supportedFeatures = this.identifySupportedFeatures(parseResult.ast);
      const unsupportedFeatures = this.identifyUnsupportedFeatures(mermaidCode);

      return {
        valid: true,
        errors: [],
        supportedFeatures,
        unsupportedFeatures,
        suggestions: unsupportedFeatures.length > 0 
          ? [`Note: The following features will be approximated: ${unsupportedFeatures.join(', ')}`]
          : undefined
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        suggestions: ['Ensure valid Mermaid flowchart syntax']
      };
    }
  }

  async analyze(mermaidCode: string): Promise<AnalysisResult> {
    const parseResult = this.parser.parse(mermaidCode);
    
    if (!parseResult.ast) {
      throw new Error('Failed to parse Mermaid diagram');
    }

    const ast = parseResult.ast;
    const nodeCount = ast.nodes.length;
    const edgeCount = ast.edges.length;
    const subgraphCount = ast.subgraphs.length;

    const decisionNodes = ast.nodes.filter(n => n.type === 'decision').length;
    const complexity = this.calculateComplexity(nodeCount, edgeCount, decisionNodes);

    return {
      nodeCount,
      edgeCount,
      subgraphCount,
      complexity,
      estimatedBpmnElements: {
        // Count process/subprocess nodes (excluding unlabeled starting nodes) plus end nodes with specific labels as tasks
        tasks: ast.nodes.filter(n => {
          if (n.type === 'process' || n.type === 'subprocess') {
            // Don't count unlabeled nodes that are likely start events
            if (n.label === n.id && ast.edges.filter(e => e.target === n.id).length === 0) {
              return false;
            }
            return true;
          }
          // Count end nodes with specific labels (not generic "end") as tasks
          if (n.type === 'end' && !n.label.toLowerCase().match(/^(end|stop|finish)$/)) {
            return true;
          }
          return false;
        }).length,
        gateways: decisionNodes,
        events: ast.nodes.filter(n => ['start', 'end', 'terminator'].includes(n.type)).length,
        pools: subgraphCount,
        flows: edgeCount
      }
    };
  }




  private generateProcessName(ast: MermaidAST): string {
    const startNode = ast.nodes.find(n => n.type === 'start');
    if (startNode) {
      return startNode.label.replace(/start|begin/gi, '').trim() || 'Converted Process';
    }
    return 'Converted Process';
  }


  private calculateComplexity(
    nodeCount: number,
    edgeCount: number,
    decisionCount: number
  ): 'simple' | 'medium' | 'complex' {
    const score = nodeCount + (edgeCount * 0.5) + (decisionCount * 2);
    
    if (score < 10) return 'simple';
    if (score < 20) return 'medium';
    return 'complex';
  }

  private identifySupportedFeatures(ast: MermaidAST): string[] {
    const features: string[] = [];
    
    // Tasks: Any node can represent a task in the converted BPMN
    // Even start/end nodes with rectangular shapes in Mermaid can be tasks
    if (ast.nodes.length > 0) {
      features.push('Tasks');
    }
    if (ast.nodes.some(n => n.type === 'decision')) features.push('Gateways');
    if (ast.nodes.some(n => ['start', 'end', 'terminator'].includes(n.type))) features.push('Events');
    if (ast.subgraphs.length > 0) features.push('Pools/Swimlanes');
    if (ast.edges.some(e => e.label)) features.push('Labeled flows');
    
    return features;
  }

  private identifyUnsupportedFeatures(mermaidCode: string): string[] {
    const unsupported: string[] = [];
    
    if (mermaidCode.includes('linkStyle')) unsupported.push('Link styles');
    if (mermaidCode.includes('click')) unsupported.push('Click events');
    if (mermaidCode.includes(':::')) unsupported.push('CSS classes');
    if (mermaidCode.includes('style ')) unsupported.push('Inline styles');
    
    return unsupported;
  }
}