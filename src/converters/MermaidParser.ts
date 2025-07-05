import type { 
  MermaidAST, 
  MermaidNode, 
  MermaidEdge, 
  MermaidSubgraph,
  NodeType,
  EdgeType,
  ParseResult,
  ParseError
} from './ASTTypes.js';

export class MermaidParser {
  private nodePatterns = {
    data: /^\[\[([^\]]+)\]\]/, // Check data first (double brackets)
    subprocess: /^\[\/([^\/]+)\/\]/, // Then subprocess (slashes)
    process: /^\[([^\]]+)\]/, // Then regular process
    decision: /^\{([^}]+)\}/,
    terminator: /^\(\(([^)]+)\)\)/
  };

  private edgePatterns = {
    labeled: /--\|([^|]+)\|-->/,
    dotted: /-.+->/,
    directed: /-->/
  };

  private directionPattern = /^(graph|flowchart)\s+(TD|TB|LR|RL|BT)/i;
  private nodeDefinitionPattern = /^(\w+)(\[|\{|\(|\[\/)/;
  private subgraphPattern = /^subgraph\s+(\w+)\s*\[([^\]]+)\]/i;

  parse(mermaidCode: string): ParseResult {
    const errors: ParseError[] = [];
    const warnings: string[] = [];
    const lines = mermaidCode.split('\n');
    
    const ast: MermaidAST = {
      type: 'flowchart',
      direction: 'TD',
      nodes: [],
      edges: [],
      subgraphs: []
    };

    const nodeMap = new Map<string, MermaidNode>();
    const currentSubgraph: string[] = [];
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('%%')) {
        continue;
      }

      try {
        if (this.directionPattern.test(trimmed)) {
          const match = trimmed.match(this.directionPattern);
          if (match) {
            ast.direction = match[2] as MermaidAST['direction'];
          }
          continue;
        }

        if (trimmed.startsWith('subgraph')) {
          const subgraph = this.parseSubgraph(trimmed, lineNumber);
          if (subgraph) {
            ast.subgraphs.push(subgraph);
            currentSubgraph.push(subgraph.id);
          }
          continue;
        }

        if (trimmed === 'end') {
          currentSubgraph.pop();
          continue;
        }

        // Check for multiple edges on the same line (e.g., A --> B --> C)
        const multiEdgeMatch = trimmed.match(/(\w+(?:\[.+?\]|\{.+?\}|\(.+?\))?)(\s*--[>.-]+\s*\w+(?:\[.+?\]|\{.+?\}|\(.+?\))?)+/);
        if (multiEdgeMatch) {
          const parts = trimmed.split(/\s*--[>.-]+\s*/);
          for (let i = 0; i < parts.length - 1; i++) {
            const sourcePart = parts[i].trim();
            const targetPart = parts[i + 1].trim();
            
            // Try to parse with shape first
            const sourceWithShape = this.parseNodeWithShape(sourcePart);
            const targetWithShape = this.parseNodeWithShape(targetPart);
            
            // Extract node IDs
            const sourceId = sourceWithShape?.id || sourcePart.match(/^(\w+)/)?.[1];
            const targetId = targetWithShape?.id || targetPart.match(/^(\w+)/)?.[1];
            
            if (sourceId && targetId) {
              // Create nodes if they don't exist
              if (!nodeMap.has(sourceId)) {
                const node = sourceWithShape || this.createNodeFromId(sourceId);
                nodeMap.set(sourceId, node);
                ast.nodes.push(node);
              }
              if (!nodeMap.has(targetId)) {
                const node = targetWithShape || this.createNodeFromId(targetId);
                nodeMap.set(targetId, node);
                ast.nodes.push(node);
              }
              
              // Create edge
              ast.edges.push({
                id: `${sourceId}_to_${targetId}`,
                source: sourceId,
                target: targetId,
                type: 'directed'
              });
              
              // Handle subgraph membership
              if (currentSubgraph.length > 0) {
                const subgraph = ast.subgraphs.find(s => s.id === currentSubgraph[currentSubgraph.length - 1]);
                if (subgraph) {
                  if (!subgraph.nodes.includes(sourceId)) subgraph.nodes.push(sourceId);
                  if (!subgraph.nodes.includes(targetId)) subgraph.nodes.push(targetId);
                }
              }
            }
          }
          continue;
        }
        
        const edgeMatch = this.parseEdge(trimmed);
        if (edgeMatch) {
          const { source, target, edge } = edgeMatch;
          
          // Parse source node
          if (!source.includes('|')) {
            // Try to parse the source as a node with shape
            const sourceWithShape = this.parseNodeWithShape(source);
            if (sourceWithShape && !nodeMap.has(sourceWithShape.id)) {
              nodeMap.set(sourceWithShape.id, sourceWithShape);
              ast.nodes.push(sourceWithShape);
            } else if (!nodeMap.has(source)) {
              const sourceNode = this.createNodeFromId(source);
              nodeMap.set(source, sourceNode);
              ast.nodes.push(sourceNode);
            }
          }
          
          // Parse target node
          if (!target.includes('|')) {
            // Try to parse the target as a node with shape
            const targetWithShape = this.parseNodeWithShape(target);
            if (targetWithShape && !nodeMap.has(targetWithShape.id)) {
              nodeMap.set(targetWithShape.id, targetWithShape);
              ast.nodes.push(targetWithShape);
            } else if (!nodeMap.has(target)) {
              const targetNode = this.createNodeFromId(target);
              nodeMap.set(target, targetNode);
              ast.nodes.push(targetNode);
            }
          }
          
          ast.edges.push(edge);
          
          if (currentSubgraph.length > 0) {
            const subgraph = ast.subgraphs.find(s => s.id === currentSubgraph[currentSubgraph.length - 1]);
            if (subgraph) {
              if (!subgraph.nodes.includes(source)) subgraph.nodes.push(source);
              if (!subgraph.nodes.includes(target)) subgraph.nodes.push(target);
            }
          }
          
          continue;
        }

        const nodeMatch = this.parseNode(trimmed);
        if (nodeMatch) {
          if (nodeMap.has(nodeMatch.id)) {
            warnings.push(`Duplicate node definition: ${nodeMatch.id} at line ${lineNumber}`);
          } else {
            nodeMap.set(nodeMatch.id, nodeMatch);
            ast.nodes.push(nodeMatch);
            
            if (currentSubgraph.length > 0) {
              const subgraph = ast.subgraphs.find(s => s.id === currentSubgraph[currentSubgraph.length - 1]);
              if (subgraph && !subgraph.nodes.includes(nodeMatch.id)) {
                subgraph.nodes.push(nodeMatch.id);
              }
            }
          }
          continue;
        }

        if (trimmed && !trimmed.startsWith('classDef') && !trimmed.startsWith('class') && !trimmed.startsWith('style')) {
          warnings.push(`Unrecognized syntax at line ${lineNumber}: ${trimmed}`);
        }
      } catch (error) {
        errors.push({
          line: lineNumber,
          column: 0,
          message: error instanceof Error ? error.message : 'Parse error',
          code: trimmed
        });
      }
    }

    this.inferNodeTypes(ast);
    this.validateAST(ast, errors, warnings);

    return {
      ast: errors.length === 0 ? ast : undefined,
      errors,
      warnings
    };
  }

  private parseNode(line: string): MermaidNode | null {
    const match = line.match(this.nodeDefinitionPattern);
    if (!match) return null;

    const id = match[1];
    let type: NodeType = 'process';
    let label = id;

    for (const [nodeType, pattern] of Object.entries(this.nodePatterns)) {
      const remainingLine = line.slice(id.length);
      const shapeMatch = remainingLine.match(pattern);
      if (shapeMatch) {
        type = nodeType as NodeType;
        label = shapeMatch[1].trim();
        break;
      }
    }

    return {
      id,
      type,
      label
    };
  }

  private parseNodeWithShape(text: string): MermaidNode | null {
    // Try to match patterns like A((Start)) or B{Decision}
    const patterns = [
      { regex: /^(\w+)\[\[([^\]]+)\]\]$/, type: 'data' as NodeType },
      { regex: /^(\w+)\[\/([^\/]+)\/\]$/, type: 'subprocess' as NodeType },
      { regex: /^(\w+)\[([^\]]+)\]$/, type: 'process' as NodeType },
      { regex: /^(\w+)\{([^}]+)\}$/, type: 'decision' as NodeType },
      { regex: /^(\w+)\(\(([^)]+)\)\)$/, type: 'terminator' as NodeType }
    ];

    for (const { regex, type } of patterns) {
      const match = text.match(regex);
      if (match) {
        return {
          id: match[1],
          type,
          label: match[2].trim()
        };
      }
    }

    return null;
  }

  private parseEdge(line: string): { source: string; target: string; edge: MermaidEdge } | null {
    let edgeType: EdgeType = 'directed';
    let label: string | undefined;

    // Check for labeled edges first (e.g., A -->|Yes| B)
    const labeledMatch = line.match(/(\w+(?:\[.+?\]|\{.+?\}|\(.+?\))?)\s*-->\s*\|([^|]+)\|\s*(\w+(?:\[.+?\]|\{.+?\}|\(.+?\))?)/);
    if (labeledMatch) {
      const sourcePart = labeledMatch[1];
      const targetPart = labeledMatch[3];
      label = labeledMatch[2].trim();
      edgeType = 'labeled';
      
      // Extract just the ID from source and target
      const sourceId = sourcePart.match(/^(\w+)/)?.[1] || sourcePart;
      const targetId = targetPart.match(/^(\w+)/)?.[1] || targetPart;
      
      return {
        source: sourcePart, // Return full source with shape for node creation
        target: targetPart, // Return full target with shape for node creation
        edge: {
          id: `${sourceId}_to_${targetId}`,
          source: sourceId,
          target: targetId,
          type: edgeType,
          label
        }
      };
    }

    // Check for dotted edges with label (e.g., A -.->|Label| B)
    const dottedLabelMatch = line.match(/(\w+(?:\[.+?\]|\{.+?\}|\(.+?\))?)\s*-\.->\s*\|([^|]+)\|\s*(\w+(?:\[.+?\]|\{.+?\}|\(.+?\))?)/);
    if (dottedLabelMatch) {
      const sourcePart = dottedLabelMatch[1];
      const targetPart = dottedLabelMatch[3];
      label = dottedLabelMatch[2].trim();
      edgeType = 'dotted';
      
      // Extract just the ID from source and target
      const sourceId = sourcePart.match(/^(\w+)/)?.[1] || sourcePart;
      const targetId = targetPart.match(/^(\w+)/)?.[1] || targetPart;
      
      return {
        source: sourcePart, // Return full source with shape for node creation
        target: targetPart, // Return full target with shape for node creation
        edge: {
          id: `${sourceId}_to_${targetId}`,
          source: sourceId,
          target: targetId,
          type: edgeType,
          label
        }
      };
    }

    // Check for dotted edges (e.g., A -.-> B)
    if (this.edgePatterns.dotted.test(line)) {
      edgeType = 'dotted';
    }

    // Parse regular edges
    const parts = line.split(/--[\|>.-]+/);
    if (parts.length !== 2) return null;

    const sourcePart = parts[0].trim();
    const targetPart = parts[1].trim();

    // Extract node ID from source (handles A[Label], A{Label}, A((Label)), etc.)
    const sourceMatch = sourcePart.match(/^(\w+)/);
    const targetMatch = targetPart.match(/^(\w+)/);

    if (!sourceMatch || !targetMatch) return null;

    const source = sourceMatch[1];
    const target = targetMatch[1];

    return {
      source: sourcePart, // Return full source with shape for node creation
      target: targetPart, // Return full target with shape for node creation
      edge: {
        id: `${source}_to_${target}`,
        source,
        target,
        type: edgeType,
        label
      }
    };
  }

  private parseSubgraph(line: string, _lineNumber: number): MermaidSubgraph | null {
    const match = line.match(this.subgraphPattern);
    if (!match) return null;

    return {
      id: match[1],
      title: match[2].trim(),
      nodes: []
    };
  }

  private createNodeFromId(id: string): MermaidNode {
    // Check if the ID contains shape information
    for (const [nodeType, pattern] of Object.entries(this.nodePatterns)) {
      if (pattern.test(id)) {
        const match = id.match(pattern);
        if (match) {
          return {
            id: id.replace(pattern, '').trim() || id,
            type: nodeType as NodeType,
            label: match[1].trim()
          };
        }
      }
    }
    
    return {
      id,
      type: 'process',
      label: id
    };
  }

  private inferNodeTypes(ast: MermaidAST): void {
    for (const node of ast.nodes) {
      // Skip if already has a specific type other than 'terminator' and 'process'
      if (node.type !== 'terminator' && node.type !== 'process') continue;
      
      const incomingEdges = ast.edges.filter(e => e.target === node.id);
      const outgoingEdges = ast.edges.filter(e => e.source === node.id);
      
      // Check for explicit start/end keywords in labels (must be whole words)
      const lowerLabel = node.label.toLowerCase();
      if (/\b(start|begin)\b/.test(lowerLabel)) {
        node.type = 'start';
      } else if (/\b(end|stop|finish|complete)\b/.test(lowerLabel) || /^end\d*$/i.test(node.id)) {
        node.type = 'end';
      } 
      // Only classify as start/end based on connections if the node type is 'terminator'
      // AND it truly has no incoming or no outgoing edges
      else if (node.type === 'terminator') {
        if (incomingEdges.length === 0 && outgoingEdges.length > 0) {
          node.type = 'start';
        } else if (outgoingEdges.length === 0 && incomingEdges.length > 0) {
          node.type = 'end';
        } else {
          // If terminator has both incoming and outgoing, treat as process
          node.type = 'process';
        }
      }
      // For nodes that were initially parsed as 'process', keep them as process
      // unless they match specific start/end criteria
      else if (node.type === 'process') {
        // Only change process nodes to start/end if they clearly match the pattern
        if (incomingEdges.length === 0 && outgoingEdges.length > 0 && 
            /\b(start|begin)\b/.test(lowerLabel)) {
          node.type = 'start';
        } else if (outgoingEdges.length === 0 && incomingEdges.length > 0 && 
                   /\b(end|stop|finish|complete)\b/.test(lowerLabel)) {
          node.type = 'end';
        }
        // Otherwise, keep as process
      }
    }
  }

  private validateAST(ast: MermaidAST, errors: ParseError[], warnings: string[]): void {
    const nodeIds = new Set(ast.nodes.map(n => n.id));
    
    for (const edge of ast.edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push({
          line: 0,
          column: 0,
          message: `Edge references undefined source node: ${edge.source}`,
          code: `${edge.source} --> ${edge.target}`
        });
      }
      if (!nodeIds.has(edge.target)) {
        errors.push({
          line: 0,
          column: 0,
          message: `Edge references undefined target node: ${edge.target}`,
          code: `${edge.source} --> ${edge.target}`
        });
      }
    }

    const startNodes = ast.nodes.filter(n => n.type === 'start');
    const endNodes = ast.nodes.filter(n => n.type === 'end');
    
    if (startNodes.length === 0) {
      warnings.push('No explicit start node found. Consider adding a start event.');
    }
    if (endNodes.length === 0) {
      warnings.push('No explicit end node found. Consider adding an end event.');
    }

    for (const node of ast.nodes) {
      const incoming = ast.edges.filter(e => e.target === node.id);
      const outgoing = ast.edges.filter(e => e.source === node.id);
      
      if (incoming.length === 0 && node.type !== 'start') {
        warnings.push(`Node "${node.id}" has no incoming connections`);
      }
      if (outgoing.length === 0 && node.type !== 'end') {
        warnings.push(`Node "${node.id}" has no outgoing connections`);
      }
    }
  }
}