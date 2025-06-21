export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ElementDefinition {
  id?: string;
  type: string;
  name?: string;
  position?: Position;
  size?: Size;
  properties?: Record<string, any>;
  connectFrom?: string;
}

export interface ProcessContext {
  id: string;
  name: string;
  type: 'process' | 'collaboration';
  elements: Map<string, any>;
  connections: Map<string, any>;
  xml?: string;
}

export interface BpmnElement {
  id: string;
  type: string;
  businessObject: any;
  di?: any;
}

export interface Connection {
  id: string;
  source: string;
  target: string;
  type: string;
  waypoints?: Position[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  elementId?: string;
  details?: any;
}

export interface ValidationWarning {
  code: string;
  message: string;
  elementId?: string;
  suggestion?: string;
}

export type EventType = 'start' | 'end' | 'intermediate-throw' | 'intermediate-catch' | 'boundary';
export type EventDefinitionType = 'message' | 'timer' | 'error' | 'signal' | 'conditional' | 'escalation' | 'compensation' | 'cancel' | 'terminate';
export type ActivityType = 'task' | 'userTask' | 'serviceTask' | 'scriptTask' | 'businessRuleTask' | 'manualTask' | 'receiveTask' | 'sendTask' | 'subProcess' | 'callActivity';
export type GatewayType = 'exclusive' | 'parallel' | 'inclusive' | 'eventBased' | 'complex';

export interface ExportOptions {
  format?: 'xml' | 'svg';
  formatted?: boolean;
  preamble?: boolean;
}