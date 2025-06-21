declare module 'bpmn-js' {
  export default class BpmnModeler {
    constructor(options: any);
    importXML(xml: string): Promise<{ warnings: any[] }>;
    saveXML(options?: any): Promise<{ xml: string }>;
    saveSVG(options?: any): Promise<{ svg: string }>;
    get(name: string): any;
  }
}

declare module 'bpmn-js/lib/Modeler.js' {
  export default class BpmnModeler {
    constructor(options: any);
    importXML(xml: string): Promise<{ warnings: any[] }>;
    saveXML(options?: any): Promise<{ xml: string }>;
    saveSVG(options?: any): Promise<{ svg: string }>;
    get(name: string): any;
  }
}