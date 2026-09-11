const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {jsPDF} = require('jspdf');
const pdf = new jsPDF({unit:'mm',format:[80,120]});
pdf.text('PRE-CONTA - Mesa 2',5,12);pdf.text('Agua 2 x 500 = 1000 Kz',5,25);
const bytes=Buffer.from(pdf.output('arraybuffer'));
const server=http.createServer((req,res)=>{
 if(req.url==='/receipt.pdf'){res.setHeader('Content-Type','application/pdf');return res.end(bytes);}
 if(req.url.startsWith('/pdfjs/')){res.setHeader('Content-Type','text/javascript');return res.end(fs.readFileSync(path.join(__dirname,'../public',req.url)));}
 if(['/printPdf.js','/loadPdfRenderer.js'].includes(req.url)){
 const source=fs.readFileSync(path.join(__dirname,'../src/utils',req.url.replace('.js','.ts')),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace("'./loadPdfRenderer'","'./loadPdfRenderer.js'");
 res.setHeader('Content-Type','text/javascript');return res.end(js);}
 res.setHeader('Content-Type','text/html');
 res.end(`<h1>Teste de impressão</h1><p id="status">A carregar...</p><script type="module">
 import {printPdf} from '/printPdf.js';
 const append=document.body.appendChild.bind(document.body);
 document.body.appendChild=function(el){const result=append(el);if(el.tagName==='IFRAME'){el.contentWindow.print=()=>{const pages=el.contentDocument.querySelectorAll('canvas');if(!pages.length)throw Error('No pages');document.querySelector('#status').textContent='SUCESSO: PDF renderizado, '+pages.length+' página(s), impressão chamada na origem '+el.contentWindow.location.origin;};}return result;};
 try{await printPdf(await (await fetch('/receipt.pdf')).blob());}catch(e){document.querySelector('#status').textContent='ERRO: '+e.stack;}
 </script>`);
});server.listen(3013,'127.0.0.1');
