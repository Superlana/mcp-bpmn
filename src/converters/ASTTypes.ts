export type NodeType = 
  | 'start'
  | 'end'
  | 'process'
  | 'decision'
  | 'subprocess'
  | 'data'
  | 'terminator';

export type EdgeType = 
  | 'directed'
  | 'labeled'
  | 'dotted';

export interface MermaidNode {
  id: string;
  type: NodeType;
  label: string;
  shape?: string;
  style?: Record<string, string>;
  position?: {
    row?: number;
    column?: number;
  };
}

export interface MermaidEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  style?: Record<string, string>;
}

export interface MermaidSubgraph {
  id: string;
  title: string;
  nodes: string[];
  subgraphs?: MermaidSubgraph[];
}

export interface MermaidAST {
  type: 'flowchart';
  direction: 'TD' | 'TB' | 'LR' | 'RL' | 'BT';
  nodes: MermaidNode[];
  edges: MermaidEdge[];
  subgraphs: MermaidSubgraph[];
}

export interface ParseError {
  line: number;
  column: number;
  message: string;
  code: string;
}

export interface ParseResult {
  ast?: MermaidAST;
  errors: ParseError[];
  warnings: string[];
}