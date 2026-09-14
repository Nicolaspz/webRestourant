const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
function load(file, deps = {}) {
 const source=fs.readFileSync(path.join(__dirname,'../src',file),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const context={exports:{},require:name=>deps[name] || require(name)};
 vm.runInNewContext(code,context); return context.exports;
}
const helpers=load('utils/paymentDetails.ts');
const payments=[{metodo:'dinheiro',valor:1000},{metodo:'multicaixa',valor:2000},{metodo:'transferencia',valor:3000}];
assert.equal(helpers.paymentSummary(payments,'dinheiro'),'Pagamento dividido');
assert.equal(helpers.paymentSummary(undefined,'dinheiro'),'Dinheiro');
const {buildReceiptPdf}=load('components/dashboard/mesas/pdfNpago.tsx',{'@/utils/paymentDetails':helpers,'@/utils/printPdf':{printPdf(){}},'@/../config':{getMediaUrl:x=>x}});
const data={mesaNumero:2,codigoAbertura:'S1',pedidos:[{items:[{produto:'Agua',quantidade:1,precoUnitario:6000,subtotal:6000}]}],totalGeral:6000,pagamentos:payments};
const pdf=buildReceiptPdf(data,{metodo:'dinheiro',valorPago:6000},'80',true).output();
assert.ok(pdf.includes('PAGAMENTO DIVIDIDO'));
assert.ok(pdf.includes('Dinheiro:'));
assert.ok(pdf.includes('Multicaixa:'));
const compact=pdf.replace(/\s/g,'');
assert.ok(compact.includes('Dinheiro:1000,00Kz'));
assert.ok(compact.includes('Multicaixa:2000,00Kz'));
assert.ok(compact.includes('3000,00Kz'));
const unpaid=buildReceiptPdf(data,undefined,'80',false).output();
assert.ok(!unpaid.includes('PAGAMENTO DIVIDIDO'));
console.log('Pagamento dividido: métodos e valores no PDF; pré-conta e método único validados.');

