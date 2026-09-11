const assert=require('node:assert/strict');
const {gerarPDFReciboPago,gerarPDFReciboNaoPago}=require('./receipt.cjs');
let calls=0, downloads=0;
global.window={setTimeout(fn,ms){if(ms===500)queueMicrotask(fn);return 1;}};
global.document={createElement(tag){assert.equal(tag,'iframe');return {style:{},remove(){},contentWindow:{focus(){},print(){calls++;},addEventListener(){}}};},body:{appendChild(frame){queueMicrotask(()=>frame.onload());}}};
const data={mesaNumero:1,codigoAbertura:'TESTE',abertaEm:new Date(),fechadaEm:new Date(),pedidos:[{items:[{produto:'Produto de teste',quantidade:1,precoUnitario:100,subtotal:100}]}],totalGeral:100};
(async()=>{for(const format of ['58','80',false]){await gerarPDFReciboPago(data,{metodo:'dinheiro',valorPago:100},format,true);await gerarPDFReciboNaoPago(data,format,true);}assert.equal(calls,6);console.log('PASS: recibo e consulta chamam impressão nos 3 formatos (6 casos).');})().catch(e=>{console.error(e);process.exitCode=1;});
