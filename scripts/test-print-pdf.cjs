const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { test } = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/printPdf.ts'), 'utf8').replace('import.meta.url', "'https://app.test/print.js'");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function setup(fail = false) {
  const events = [], canvases = [], timers = [];
  const page = { getViewport: ({scale}) => ({width: 226.77 * scale, height: 400 * scale}), render: ({canvas}) => ({promise: Promise.resolve().then(() => { assert.ok(canvas); if(fail) throw Error('render failed'); events.push('render'); })}), cleanup(){} };
  const pdfjs = {GlobalWorkerOptions: {}, getDocument: () => ({promise: Promise.resolve({numPages: 2, getPage: async () => page}), destroy: async () => events.push('destroy')})};
  const doc = {head: {appendChild(){}}, body: {appendChild(c){canvases.push(c);}}, createElement: () => ({style:{}})};
  const frame = {style:{}, contentDocument:doc, contentWindow:{focus(){}, print(){events.push('print');}}, remove(){events.push('remove');}, set src(value){throw Error('Must not navigate to native PDF viewer');}};
  const context = {exports:{}, require: name => {assert.equal(name,'./loadPdfRenderer'); return {loadPdfRenderer: async () => pdfjs};}, URL, Uint8Array, document:{createElement:()=>frame, body:{appendChild(){events.push('append');}}}, window:{setTimeout(fn,delay){if(delay===100)fn();else timers.push(fn);}}};
  vm.runInNewContext(compiled,context);
  return {run:()=>context.exports.printPdf({arrayBuffer:async()=>new ArrayBuffer(0)}), events, canvases, timers};
}
 test('renders every PDF page before printing a same-origin HTML frame',async()=>{
  const app=setup(); await app.run();
  assert.deepEqual(app.events,['append','render','render','print','destroy']);
  assert.equal(app.canvases.length,2);
  assert.match(app.canvases[0].style.width,/mm$/);
  app.timers[0](); assert.equal(app.events.at(-1),'remove');
 });
 test('render failure cleans up and never prints incomplete pages',async()=>{
  const app=setup(true); await assert.rejects(app.run(),/render failed/);
  assert.ok(!app.events.includes('print'));
  assert.ok(app.events.includes('remove'));
  assert.ok(app.events.includes('destroy'));
 });
