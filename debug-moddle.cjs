// Quick test of bpmn-moddle
const BpmnModdle = require('bpmn-moddle');

console.log('Creating BpmnModdle instance...');
const moddle = new BpmnModdle();

console.log('Creating definitions...');
const definitions = moddle.create('bpmn:Definitions', {
  id: 'Definitions_1',
  targetNamespace: 'http://bpmn.io/schema/bpmn'
});

console.log('Definitions created:', definitions);

console.log('Creating process...');
const process = moddle.create('bpmn:Process', {
  id: 'Process_1',
  name: 'Test Process',
  isExecutable: true
});

console.log('Process created:', process);

definitions.rootElements = [process];

console.log('Converting to XML...');
moddle.toXML(definitions, { format: true }, (err, xml) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Success! XML length:', xml.length);
    console.log('XML preview:', xml.substring(0, 200) + '...');
  }
});