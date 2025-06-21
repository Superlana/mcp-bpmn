declare module 'bpmn-moddle' {
  export default class BpmnModdle {
    constructor(options?: any);
    create(type: string, attrs?: any): any;
    createDiagram(semantic: any): any;
    fromXML(xml: string, callback: (err: any, definitions: any) => void): void;
    fromXML(xml: string, options: any, callback: (err: any, definitions: any) => void): void;
    toXML(element: any, callback: (err: any, xml: string) => void): void;
    toXML(element: any, options: any, callback: (err: any, xml: string) => void): void;
  }
}