import {api} from '@/services/api';
import {printPdf} from './printPdf';
import {DEFAULT_POS_SETTINGS, type PosSettings} from '@/types/pos-settings';

// Both the checkout and the history print the saved document snapshot.
export async function buildBillingNoticePdf(id:string, receipt=false, settings:PosSettings=DEFAULT_POS_SETTINGS, wait=false, preview=false) {
 let notice:any;
 let qr:string|undefined;
 for(let attempt=0;attempt<(wait?15:1);attempt++) {
  if(attempt)await new Promise(resolve=>setTimeout(resolve,2000));
  notice=(await api.get(`/billing-notices/${id}`)).data;
  const fiscal=receipt?notice.receiptFatura?.fiscalSubmission:notice;
  if(fiscal?.requestId&&['RECEIVED','PROCESSING','SENT_TO_AGT'].includes(fiscal.status)) {
   try{await api.post(`/billing-notices/${id}/status`);notice=(await api.get(`/billing-notices/${id}`)).data;}catch{/* A later consultation can recover. */}
  }
  const current=receipt?notice.receiptFatura?.fiscalSubmission:notice;
  if(current?.documentNo&&current?.agtRequestId) {
   try {
    const blob=(await api.get(`/billing-notices/${id}/qrcode`,{params:{receipt:receipt?'1':'0'},responseType:'blob'})).data;
    qr=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
    break;
   }catch{/* QR may become available after the document. */}
  }
  if(['REVIEW_REQUIRED','INVALID','REJECTED','FAILED'].includes(current?.status))break;
 }
 const fiscal=receipt?notice.receiptFatura?.fiscalSubmission:notice;
 if(!qr&&!preview)throw new Error('Documento guardado. A impressão fiscal aguarda o número e o QR. Consulte e reimprima em Avisos de cobrança.');
 if(!fiscal)throw new Error('Recibo ainda não disponível.');
 const {jsPDF}=await import('jspdf');const {default:autoTable}=await import('jspdf-autotable');
 const width=settings.paperWidth==='a4'?210:Number(settings.paperWidth);
 const thermal=settings.paperWidth!=='a4';
 const render=(height:number)=>{
 const doc=new jsPDF({unit:'mm',format:[width,height]});const margin=width<100?4:14;
 const money=(value:number)=>Number(value).toLocaleString('pt-AO',{minimumFractionDigits:2,maximumFractionDigits:2})+' Kz';
 doc.setFontSize(width<100?9:14);
 const heading=doc.splitTextToSize(receipt?'AVISO DE COBRANÇA / RECIBO':'AVISO DE COBRANÇA',width-2*margin);
 doc.text(heading,margin,8);doc.setFontSize(8);
 const info=doc.splitTextToSize([fiscal.documentNo,`NIF emissor: ${notice.payload.taxRegistrationNumber}`,`Cliente: ${notice.customerName}`,`NIF: ${notice.customerTaxId||'N/A'}`,`Mesa: ${notice.session.mesa.number}`,`Data: ${new Date(receipt?notice.paidAt:notice.createdAt).toLocaleString('pt-PT')}`,`Estado fiscal: ${fiscal.status}`].join('\n'),width-2*margin);
 const top=10+heading.length*4;doc.text(info,margin,top);
 autoTable(doc,{startY:top+info.length*(8*1.15*25.4/72)+3,margin:{top:5,left:margin,right:margin,bottom:5},styles:{fontSize:width<100?7:10,cellPadding:1.5},head:[['Descrição','Qtd.','Total']],body:receipt?[[`Liquidação de ${notice.documentNo}`,1,money(Number(notice.total))]]:notice.payload.lines.map((l:any)=>[l.productDescription,l.quantity,money(Number(l.creditAmount)+l.taxes.reduce((s:number,t:any)=>s+Number(t.taxContribution),0))]),foot:[['Total','',money(Number(notice.total))]]});
 let y=((doc as any).lastAutoTable.finalY||top)+5;
 doc.setFontSize(8);
 const footer=doc.splitTextToSize(receipt?'Pagamento recebido.':'Por pagar — não comprova pagamento.',width-2*margin);
 const pending=doc.splitTextToSize('Pré-visualização — documento fiscal / QR ainda indisponível.',width-2*margin);
 const footerHeight=footer.length*3.3+3+(qr?35:pending.length*3.3)+5;
 if(y+footerHeight>height){doc.addPage();y=8;}
 doc.text(footer,margin,y);
 const qrY=y+footer.length*3.3+3;
 if(qr)doc.addImage(qr,'PNG',(width-35)/2,qrY,35,35);
 else doc.text(pending,margin,qrY);
 return {doc,end:y+footerHeight};
 };
 // Measure before drawing the final receipt: changing the PDF media box after
 // drawing would shift its contents vertically because PDF coordinates start below.
 const measured=render(thermal?2000:297);
 const final=thermal&&measured.doc.getNumberOfPages()===1
  ?render(Math.max(width+1,Math.ceil(measured.end)+1)):measured;
 return final.doc.output('blob');
}
export async function printBillingNotice(id:string, receipt=false, settings:PosSettings=DEFAULT_POS_SETTINGS, wait=false) {
 const blob=await buildBillingNoticePdf(id,receipt,settings,wait);
 for(let copy=0;copy<settings.copies;copy++)await printPdf(blob);
}
