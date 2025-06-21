/**
 * Wrapper module for bpmn-js to handle CommonJS/ESM interop
 */

// Cache the loaded modules
let BpmnModeler: any;
let BpmnViewer: any;

/**
 * Get the BpmnModeler class
 */
export async function getBpmnModeler() {
  if (!BpmnModeler) {
    const mod = await import('bpmn-js/lib/Modeler.js');
    BpmnModeler = mod.default;
  }
  return BpmnModeler;
}

/**
 * Get the BpmnViewer class
 */
export async function getBpmnViewer() {
  if (!BpmnViewer) {
    const mod = await import('bpmn-js/lib/Viewer.js');
    BpmnViewer = mod.default;
  }
  return BpmnViewer;
}

/**
 * Create a new BpmnModeler instance
 */
export async function createModeler(options: any) {
  const Modeler = await getBpmnModeler();
  return new Modeler(options);
}

/**
 * Create a new BpmnViewer instance
 */
export async function createViewer(options: any) {
  const Viewer = await getBpmnViewer();
  return new Viewer(options);
}

// Re-export types
export type { default as BpmnModeler } from 'bpmn-js/lib/Modeler.js';
export type { default as BpmnViewer } from 'bpmn-js/lib/Viewer.js';