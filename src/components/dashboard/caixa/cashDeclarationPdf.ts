import jsPDF from 'jspdf';
import { printPdf } from '@/utils/printPdf';

type PaperWidth = '58' | '80' | 'a4';

const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}) + ' Kz';

const paymentName = (method: string) => method === 'outro' ? 'Cash' : method;

function buildDeclaration(data: any, paperWidth: PaperWidth, pageHeight = 297) {
  const thermal = paperWidth !== 'a4';
  const width = paperWidth === '58' ? 58 : paperWidth === '80' ? 80 : 210;
  const margin = thermal ? 4 : 18;
  const usableWidth = width - margin * 2;
  const baseFont = thermal ? (width === 58 ? 8 : 9) : 11;
  const doc = new jsPDF({ unit: 'mm', format: thermal ? [width, pageHeight] : 'a4' });
  let y = thermal ? 7 : 18;
  const lineHeight = (size: number) => size * 0.3528 * 1.35;

  const text = (value: string, options: { bold?: boolean; center?: boolean; size?: number } = {}) => {
    const size = options.size || baseFont;
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(25, 39, 63);
    const lines = doc.splitTextToSize(value, usableWidth);
    for (const textLine of lines) {
      if (thermal && y + lineHeight(size) > pageHeight - 5) {
        doc.addPage([width, pageHeight]);
        y = 7;
      }
      doc.text(textLine, options.center ? width / 2 : margin, y, { align: options.center ? 'center' : 'left' });
      y += lineHeight(size);
    }
    y += thermal ? 1 : 2;
  };
  const rule = () => {
    doc.setDrawColor(190, 198, 210);
    doc.line(margin, y, width - margin, y);
    y += thermal ? 3 : 5;
  };

  text('DECLARAÇÃO CEGA DO CAIXA', { bold: true, center: true, size: thermal ? (width === 58 ? 9 : 11) : 18 });
  text('Valores declarados por método de pagamento', { center: true, size: thermal ? (width === 58 ? 7 : 8) : 10 });
  rule();
  text(`Operador: ${data.vendedor || '—'}`, { bold: true });
  const openedAt = data.abertoEm ? new Date(data.abertoEm).toLocaleString('pt-PT') : '—';
  text(`Abertura: ${openedAt}`);
  rule();

  const entries = Object.entries(data.declaradosPorMetodo || {}) as Array<[string, number]>;
  for (const [method, amount] of entries) {
    const name = paymentName(method);
    const value = money(Number(amount));
    const amountWidth = width === 58 ? usableWidth * 0.52 : usableWidth * 0.45;
    const nameLines = doc.splitTextToSize(name, usableWidth - amountWidth - 1);
    const valueLines = doc.splitTextToSize(value, amountWidth);
    const rows = Math.max(nameLines.length, valueLines.length);
    for (let index = 0; index < rows; index++) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(baseFont);
      doc.setTextColor(25, 39, 63);
      if (nameLines[index]) doc.text(nameLines[index], margin, y);
      if (valueLines[index]) doc.text(valueLines[index], width - margin, y, { align: 'right' });
      y += lineHeight(baseFont);
    }
    y += thermal ? 1 : 2;
    rule();
  }

  const total = entries.reduce((sum, [, amount]) => sum + Number(amount || 0), 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(thermal ? (width === 58 ? 9 : 11) : 14);
  doc.setTextColor(25, 39, 63);
  doc.text('TOTAL DECLARADO', margin, y);
  doc.text(money(total), width - margin, y, { align: 'right' });
  y += lineHeight(thermal ? baseFont + 1 : 14) + (thermal ? 5 : 10);

  text('Declaração emitida antes da conferência com as vendas do sistema.', { center: true, size: thermal ? (width === 58 ? 6 : 7) : 9 });
  y += thermal ? 5 : 12;
  doc.setDrawColor(130, 142, 160);
  if (thermal) {
    doc.line(margin, y, width - margin, y);
    y += 4;
    text('Assinatura do operador');
  } else {
    doc.line(margin, y, width / 2 - 8, y);
    doc.line(width / 2 + 8, y, width - margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.text('Assinatura do operador', margin, y);
    doc.text('Conferência / responsável', width / 2 + 8, y);
  }
  return { doc, contentHeight: y + (thermal ? 8 : 0) };
}

export async function printCashDeclaration(data: any, paperWidth: PaperWidth) {
  let { doc, contentHeight } = buildDeclaration(data, paperWidth);
  if (paperWidth !== 'a4' && doc.getNumberOfPages() === 1 && contentHeight < 297) {
    ({ doc } = buildDeclaration(data, paperWidth, Math.max(80, Math.ceil(contentHeight))));
  }
  await printPdf(doc.output('blob'));
}

function buildClosureSummary(data: any, paperWidth: PaperWidth, pageHeight = 297) {
  const thermal = paperWidth !== 'a4';
  const width = paperWidth === '58' ? 58 : paperWidth === '80' ? 80 : 210;
  const margin = thermal ? 4 : 18;
  const usableWidth = width - margin * 2;
  const font = thermal ? (width === 58 ? 7 : 8) : 10;
  const doc = new jsPDF({ unit: 'mm', format: thermal ? [width, pageHeight] : 'a4' });
  let y = thermal ? 7 : 18;
  const lineHeight = (size: number) => size * 0.3528 * 1.35;
  const write = (value: string, options: { bold?: boolean; center?: boolean; size?: number } = {}) => {
    const size = options.size || font;
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(25, 39, 63);
    for (const row of doc.splitTextToSize(value, usableWidth)) {
      doc.text(row, options.center ? width / 2 : margin, y, { align: options.center ? 'center' : 'left' });
      y += lineHeight(size);
    }
    y += thermal ? 1 : 2;
  };
  const rule = () => {
    doc.setDrawColor(190, 198, 210);
    doc.line(margin, y, width - margin, y);
    y += thermal ? 3 : 5;
  };

  write('RESUMO DO FECHO DE CAIXA', { bold: true, center: true, size: thermal ? (width === 58 ? 8 : 10) : 17 });
  write('Comparação da declaração com as vendas registadas', { center: true, size: thermal ? (width === 58 ? 6 : 7) : 9 });
  rule();
  write(`Operador: ${data.vendedor || '—'}`, { bold: true });
  write(`Abertura: ${data.abertoEm ? new Date(data.abertoEm).toLocaleString('pt-PT') : '—'}`);
  write(`Fecho: ${data.fechadoEm ? new Date(data.fechadoEm).toLocaleString('pt-PT') : new Date().toLocaleString('pt-PT')}`);
  write(`Fundo inicial: ${money(Number(data.valorInicial))}`);
  rule();

  const declared = data.declaradosPorMetodo || {};
  const recorded = data.totaisPorMetodo || {};
  const differences = data.diferencasPorMetodo || {};
  const methods = [...new Set([...Object.keys(declared), ...Object.keys(recorded), ...Object.keys(differences)])];
  for (const method of methods) {
    write(paymentName(method).toUpperCase(), { bold: true });
    write(`Declarado: ${money(Number(declared[method] || 0))}`);
    write(`Vendas no sistema: ${money(Number(recorded[method] || 0))}`);
    write(`Diferença: ${money(Number(differences[method] || 0))}`);
    rule();
  }

  write(`TOTAL DECLARADO: ${money(Number(data.totalDeclarado))}`, { bold: true });
  write(`TOTAL DE VENDAS: ${money(Number(data.totalVendas))}`, { bold: true });
  write(`DIFERENÇA TOTAL: ${money(Number(data.diferenca))}`, { bold: true });
  write(`Esperado em dinheiro com fundo inicial: ${money(Number(data.totalEsperadoEmDinheiro))}`);
  write(`Resultado: ${String(data.statusFinal || '').replace(/[📈📉🆗]/g, '').trim()}`);
  rule();
  write('Resumo do turno para conferência entre valores declarados e valores registados.', { center: true, size: thermal ? (width === 58 ? 6 : 7) : 9 });

  return { doc, contentHeight: y + (thermal ? 8 : 0) };
}

export function createCashClosurePdf(data: any, paperWidth: PaperWidth) {
  let { doc, contentHeight } = buildClosureSummary(data, paperWidth);
  if (paperWidth !== 'a4' && doc.getNumberOfPages() === 1 && contentHeight < 297) {
    ({ doc } = buildClosureSummary(data, paperWidth, Math.max(100, Math.ceil(contentHeight))));
  }
  return doc.output('blob');
}
