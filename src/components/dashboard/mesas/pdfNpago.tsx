import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getMediaUrl } from '@/../config';
import { printPdf } from '@/utils/printPdf';
import { paymentSummary, paymentMethodLabel, type PaymentDetail } from '@/utils/paymentDetails';

interface ItemPedido {
  produto: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

interface Pedido {
  id: string;
  nomePedido: string;
  criadoEm: Date;
  items: ItemPedido[];
  atendidoPor?: string;
}

interface OrganizationInfo {
  name: string;
  address: string;
  nif: string;
  phone?: string;
  imageLogo: string | null;
  softwareValidationNumber?: string;
}

interface DadosSessao {
  pagamentos?: PaymentDetail[];
  id?: string;
  numero?: string;
  mesaNumero: number;
  codigoAbertura: string;
  abertaEm: Date;
  fechadaEm: Date;
  abertoPorNome?: string;
  pedidos: Pedido[];
  totalGeral: number;
  isEmpresa?: boolean;
  clienteNome?: string;
  clienteNif?: string;
  observacoes?: string;
  agtQRCode?: string;
  agtDocumentNo?: string;
  organization?: OrganizationInfo;
}


export type ReceiptFormat = boolean | '58' | '80';
type PaymentInfo = { metodo: string; valorPago: number; trocoPara?: number };
const money = (value: unknown) => Number(value ?? 0).toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz';

/** Um único modelo para consulta e recibo; preços sempre vêm do consumo guardado. */
export function buildReceiptPdf(dados: DadosSessao, payment?: PaymentInfo, format: ReceiptFormat = '80', paid = true, pageHeight = 297) {
  const thermal = Boolean(format);
  const width = thermal ? (format === '58' ? 58 : 80) : 210;
  const height = pageHeight;
  const margin = thermal ? 4 : 18;
  const usable = width - margin * 2;
  const font = thermal ? (width === 58 ? 9 : 10) : 11;
  const lineHeight = font * 0.3528 * 1.3;
  const doc = new jsPDF({ unit: 'mm', format: thermal ? [width, height] : 'a4' });
  let y = thermal ? 7 : 18;
  function space(amount: number) { if (y + amount > height - 12) { doc.addPage(); y = thermal ? 7 : 18; } }
  function text(value: string, options: { bold?: boolean; center?: boolean; size?: number } = {}) {
    const size = options.size ?? font;
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines: string[] = doc.splitTextToSize(value, usable);
    const step = size * 0.3528 * 1.3;
    for (const line of lines) { space(step + 2); doc.text(line, options.center ? width / 2 : margin, y, { align: options.center ? 'center' : 'left' }); y += step; }
    y += 1;
  }
  function rule() { space(4); doc.setDrawColor(0); doc.setLineWidth(0.2); doc.line(margin,y,width-margin,y); y += 7; }
  const org = dados.organization;
  if (org) {
    if (org.imageLogo) { try { doc.addImage(getMediaUrl(org.imageLogo),'PNG',width/2-8,y,16,16); y+=20; } catch { /* Logótipo indisponível não impede a impressão. */ } }
    text(org.name.toUpperCase(), { bold:true, center:true, size:thermal?12:17 });
    text('NIF: '+org.nif, {center:true});
    if (org.phone) text('Tel: '+org.phone, {center:true});
    if (org.address) text(org.address, {center:true});
  }
  rule();
  text(paid ? 'RECIBO DE PAGAMENTO' : 'PRÉ-CONTA', {bold:true,center:true,size:thermal?12:16});
  if (!paid) text('POR PAGAR - NÃO SERVE DE FATURA', {bold:true,center:true});
  text('Mesa: '+dados.mesaNumero, {bold:true});
  const date = paid ? dados.fechadaEm || dados.abertaEm : new Date();
  if (date) text((paid?'Data: ':'Consulta: ')+new Date(date).toLocaleString('pt-PT'));
  if (dados.abertaEm) text('Abertura: '+new Date(dados.abertaEm).toLocaleString('pt-PT'));
  text('Doc: '+(paid ? dados.agtDocumentNo || dados.numero || dados.codigoAbertura : dados.codigoAbertura));
  const waiter = dados.abertoPorNome || dados.pedidos?.find(p=>p.atendidoPor)?.atendidoPor;
  if (waiter) text('Atendido por: '+waiter);
  if (paid || dados.clienteNome || dados.clienteNif) { rule(); text('Cliente: '+(dados.clienteNome || 'Consumidor Final')); text('NIF: '+(dados.clienteNif || '999999999')); }
  rule();
  const items = dados.pedidos.flatMap(p=>p.items);
  autoTable(doc, {
    startY:y, head:[['Produto / Quantidade','Subtotal']],
    body:items.map(item=>[item.produto+'\n'+item.quantidade+' x '+money(item.precoUnitario),money(item.subtotal)]),
    margin:{top:thermal?7:18,left:margin,right:margin,bottom:12},
    showHead:'everyPage', rowPageBreak:'avoid', theme:'plain',
    styles:{fontSize:font,cellPadding:thermal?1.5:3,overflow:'linebreak',textColor:0,lineColor:180,lineWidth:{bottom:0.1}},
    headStyles:{fontStyle:'bold',fillColor:255,textColor:0},
    columnStyles:{0:{cellWidth:usable-(thermal?(width===58?22:27):45)},1:{cellWidth:thermal?(width===58?22:27):45,halign:'right'}}
  });
  y=(doc as any).lastAutoTable.finalY+6;
  space(lineHeight*4);rule();
  if (paid) {
    const net = Number((Number(dados.totalGeral)/1.14).toFixed(2));
    text('Subtotal (Base): '+money(net));
    text('IVA (14%): '+money(Number(dados.totalGeral)-net));
  }
  text((paid?'TOTAL PAGO: ':'TOTAL A PAGAR: ')+money(dados.totalGeral),{bold:true,center:true,size:thermal?12:16});
  if (paid && payment) {
    text('Método: '+paymentSummary(dados.pagamentos, payment.metodo || '').toUpperCase());
    if (dados.pagamentos && dados.pagamentos.length > 1) {
      for (const part of dados.pagamentos) text(paymentMethodLabel(part.metodo)+': '+money(part.valor));
    }
    text('Valor pago: '+money(payment.valorPago));
    if (payment.trocoPara != null && Number(payment.trocoPara)>0) { text('Entregue: '+money(payment.trocoPara)); text('Troco: '+money(Number(payment.trocoPara)-Number(payment.valorPago))); }
  }
  text(paid?'STATUS: PAGO':'AGUARDA PAGAMENTO',{bold:true,center:true});
  if (paid && dados.agtDocumentNo) {
    text(org?.softwareValidationNumber ? 'Processado por CipherPath Fiscal Engine n.º '+org.softwareValidationNumber : 'Processado por CipherPath Fiscal Engine',{center:true,size:thermal?8:10});
  }
  if (paid && dados.agtQRCode) { const qr=thermal?26:32;space(qr+5);try{doc.addImage(dados.agtQRCode,'PNG',width/2-qr/2,y,qr,qr);y+=qr+4;}catch{ text('QR fiscal indisponível. Consulte a fatura no Caixa.',{center:true}); } }
  if (paid && dados.agtDocumentNo && !dados.agtQRCode) text('QR fiscal em processamento. Consulte a fatura no Caixa.',{center:true});
  text('Obrigado pela sua preferência!',{center:true});
  if (thermal && pageHeight === 297 && doc.getNumberOfPages() === 1 && y + 20 < 297) return buildReceiptPdf(dados, payment, format, paid, Math.max(80, y + 20));
  for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);doc.setFontSize(8);doc.text('Mesa '+dados.mesaNumero+' | '+page+'/'+doc.getNumberOfPages(),width/2,doc.internal.pageSize.getHeight()-5,{align:'center'});}
  return doc;
}
export async function gerarPDFReciboNaoPago(dados: DadosSessao, format: ReceiptFormat = '80', autoPrint = true) {
 const doc = buildReceiptPdf(dados,undefined,format,false);
 if(autoPrint) await printPdf(doc.output('blob')); else doc.save('consulta_mesa_'+dados.mesaNumero+'.pdf');
 return doc;
}
export async function gerarPDFReciboPago(dados: DadosSessao, payment?: PaymentInfo, format: ReceiptFormat = '80', autoPrint = true) {
 const doc = buildReceiptPdf(dados,payment,format,true);
 if(autoPrint) await printPdf(doc.output('blob')); else doc.save('recibo_mesa_'+dados.mesaNumero+'.pdf');
 return doc;
}
