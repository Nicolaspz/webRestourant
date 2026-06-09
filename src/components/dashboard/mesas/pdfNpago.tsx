import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { API_BASE_URL } from '@/../config';

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

// Função para formatar valores em Kwanzas
const formatarKz = (valor: number | undefined | null): string => {
  return `${(valor ?? 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz`;
};

// Função para renderizar o cabeçalho da organização
const renderizarCabecalhoOrganizacao = (doc: jsPDF, dados: DadosSessao, yPos: number, isTermica = false, isFatura = false): number => {
  const pageWidth = isTermica ? 80 : 210;
  const centerX = pageWidth / 2;

  if (dados.organization) {
    if (dados.organization.imageLogo) {
      const logoUrl = `${API_BASE_URL}/files/${dados.organization.imageLogo}`;
      try {
        const logoWidth = isTermica ? 18 : 25; // Reduzido para 25 em A4
        const logoHeight = isTermica ? 18 : 25;
        doc.addImage(logoUrl, 'PNG', centerX - (logoWidth / 2), yPos, logoWidth, logoHeight);
        yPos += logoHeight + 4;
      } catch (e) {
        console.error("Erro ao carregar logo no PDF", e);
      }
    }

    doc.setFontSize(isTermica ? 13 : 16);
    doc.setFont('helvetica', 'bold');
    doc.text(dados.organization.name.toUpperCase(), centerX, yPos, { align: 'center' });
    yPos += isTermica ? 6 : 7;

    doc.setFontSize(isTermica ? 7 : 9);
    doc.setFont('helvetica', 'normal');
    const orgInfo = `NIF: ${dados.organization.nif} | Tel: ${dados.organization.phone || 'N/A'}`;
    doc.text(orgInfo, centerX, yPos, { align: 'center' });
    yPos += isTermica ? 4 : 5;

    // Endereço (quebrar linha se for térmica)
    const address = dados.organization.address || '';
    if (isTermica) {
      const splitAddress = doc.splitTextToSize(address, 70);
      doc.text(splitAddress, centerX, yPos, { align: 'center' });
      yPos += (splitAddress.length * 4) + 2;
    } else {
      doc.text(address, centerX, yPos, { align: 'center' });
      yPos += 8;
    }

    // Mostrar os dados do cliente
    if (isFatura || dados.clienteNome || dados.clienteNif) {
      const boxWidth = isTermica ? 70 : 170;
      const boxX = (pageWidth - boxWidth) / 2;

      doc.setDrawColor(200, 200, 200);
      doc.rect(boxX, yPos, boxWidth, isTermica ? 15 : 20);
      doc.setFontSize(isTermica ? 7 : 9);
      doc.setFont('helvetica', 'bold');
      doc.text('DADOS DO CLIENTE', boxX + 5, yPos + (isTermica ? 4 : 6));
      doc.setFont('helvetica', 'normal');
      doc.text(`Cliente: ${dados.clienteNome || 'Consumidor Final'}`, boxX + 5, yPos + (isTermica ? 8 : 12));
      doc.text(`NIF: ${dados.clienteNif || '999999999'}`, boxX + 5, yPos + (isTermica ? 12 : 17));
      yPos += isTermica ? 20 : 25;
    }

    doc.setLineWidth(0.3);
    doc.line(isTermica ? 5 : 20, yPos, isTermica ? 75 : 190, yPos);
    yPos += isTermica ? 5 : 8;
  }
  return yPos;
};

export const gerarPDFReciboNaoPago = (dados: DadosSessao) => {
  const doc = new jsPDF();
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  const horaAtual = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  let yPos = 15;
  yPos = renderizarCabecalhoOrganizacao(doc, dados, yPos);

  // Cabeçalho do Recibo
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO — CONSULTA DE MESA', 105, yPos, { align: 'center' });
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${dataAtual} ${horaAtual}`, 105, yPos, { align: 'center' });
  yPos += 10;

  // Informações da mesa
  doc.setFont('helvetica', 'bold');
  doc.text('Informações da Mesa:', 20, yPos);
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Mesa: ${dados.mesaNumero}`, 20, yPos);
  yPos += 5;
  doc.text(`Abertura: ${new Date(dados.abertaEm).toLocaleString('pt-BR')}`, 20, yPos);
  yPos += 5;

  const garcom = dados.abertoPorNome || (dados.pedidos && dados.pedidos.length > 0 ? dados.pedidos[0].atendidoPor : '');
  if (garcom) {
    doc.text(`Aberto por: ${garcom}`, 20, yPos);
    yPos += 5;
  }
  yPos += 5;

  // Lista de pedidos
  dados.pedidos.forEach((pedido) => {
    if (yPos > 240) { doc.addPage(); yPos = 20; }

    autoTable(doc, {
      startY: yPos,
      head: [[`Pedido: ${pedido.nomePedido}${pedido.atendidoPor ? ` (Atendido por: ${pedido.atendidoPor})` : ''}`, 'Qtd', 'Preço Unit.', 'Subtotal']],
      body: pedido.items.map(item => [
        item.produto,
        item.quantidade.toString(),
        formatarKz(item.precoUnitario),
        formatarKz(item.subtotal)
      ]),
      margin: { left: 20, right: 20 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 8 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  });

  // Total geral
  if (yPos > 240) { doc.addPage(); yPos = 20; }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL CONSULTA: ${formatarKz(dados.totalGeral)}`, 105, yPos, { align: 'center' });
  yPos += 15;

  doc.setTextColor(192, 57, 43);
  doc.setFontSize(12);
  doc.text('ESTE DOCUMENTO NÃO SERVE DE FATURA', 105, yPos, { align: 'center' });

  doc.save(`consulta_mesa_${dados.mesaNumero}.pdf`);
};

export const gerarPDFReciboPago = async (dados: DadosSessao, infoPagamento?: { metodo: string, valorPago: number, trocoPara?: number }, isTermica = false) => {
  // Configuração de página
  // A4: [210, 297] | Térmica: [80, 150 + (itens * 10)]
  const pageWidth = isTermica ? 80 : 210;
  const pageHeight = isTermica ? Math.max(200, 150 + (dados.pedidos.length * 30)) : 297;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: isTermica ? [pageWidth, pageHeight] : 'a4'
  });

  const centerX = pageWidth / 2;
  const margin = isTermica ? 5 : 20;

  const dataAtual = new Date().toLocaleDateString('pt-BR');
  const horaAtual = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  let yPos = 10;
  yPos = renderizarCabecalhoOrganizacao(doc, dados, yPos, isTermica, true);

  // Título
  doc.setFontSize(isTermica ? 12 : 16);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE PAGAMENTO', centerX, yPos, { align: 'center' });
  yPos += isTermica ? 6 : 10;

  doc.setFontSize(isTermica ? 8 : 10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${dataAtual} ${horaAtual}`, centerX, yPos, { align: 'center' });
  yPos += isTermica ? 8 : 12;

  // Detalhes da Mesa
  doc.setFontSize(isTermica ? 8 : 10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Mesa: ${dados.mesaNumero}`, margin, yPos);
  yPos += isTermica ? 5 : 6;
  doc.setFont('helvetica', 'normal');
  if (dados.abertaEm) {
    doc.text(`Abertura: ${new Date(dados.abertaEm).toLocaleString('pt-BR')}`, margin, yPos);
    yPos += isTermica ? 5 : 6;
  }
  doc.text(`Doc: ${dados.agtDocumentNo || dados.numero || dados.codigoAbertura}`, margin, yPos);
  yPos += isTermica ? 8 : 12;

  const garcom = dados.abertoPorNome || (dados.pedidos && dados.pedidos.length > 0 ? dados.pedidos[0].atendidoPor : '');
  if (garcom) {
    doc.setFontSize(isTermica ? 7 : 9);
    doc.text(`Aberto por: ${garcom}`, margin, yPos);
    yPos += isTermica ? 6 : 8;
  }

  // Tabela de Itens
  dados.pedidos.forEach((pedido) => {
    if (yPos > pageHeight - 60 && !isTermica) { doc.addPage(); yPos = 20; }

    autoTable(doc, {
      startY: yPos,
      head: [['Produto', 'Qtd', 'Subtotal']],
      body: pedido.items.map(item => [
        item.produto,
        item.quantidade.toString(),
        formatarKz(item.subtotal)
      ]),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [46, 204, 113], textColor: 255 },
      styles: { fontSize: isTermica ? 7 : 9 },
      columnStyles: {
        0: { cellWidth: isTermica ? 40 : 'auto' },
        1: { cellWidth: isTermica ? 10 : 'auto', halign: 'center' },
        2: { cellWidth: isTermica ? 20 : 'auto', halign: 'right' }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + (isTermica ? 5 : 10);
  });

  // Totais
  if (yPos > pageHeight - 80 && !isTermica) { doc.addPage(); yPos = 20; }

  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Cálculo de IVA (14%)
  const grossTotal = dados.totalGeral;
  const netTotal = Number((grossTotal / 1.14).toFixed(2));
  const taxTotal = Number((grossTotal - netTotal).toFixed(2));

  doc.setFontSize(isTermica ? 7 : 9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Subtotal (Base): ${formatarKz(netTotal)}`, margin, yPos);
  yPos += isTermica ? 4 : 5;
  doc.text(`IVA (14%): ${formatarKz(taxTotal)}`, margin, yPos);
  yPos += isTermica ? 6 : 8;

  doc.setFontSize(isTermica ? 10 : 14);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL GERAL: ${formatarKz(grossTotal)}`, centerX, yPos, { align: 'center' });
  yPos += isTermica ? 8 : 12;

  // Info Pagamento
  if (infoPagamento) {
    doc.setFontSize(isTermica ? 7 : 10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Método: ${infoPagamento.metodo.toUpperCase()}`, margin, yPos);
    yPos += isTermica ? 4 : 6;
    doc.text(`Valor Recebido: ${formatarKz(infoPagamento.valorPago)}`, margin, yPos);
    yPos += isTermica ? 4 : 6;
    if (infoPagamento.trocoPara) {
      doc.text(`Troco: ${formatarKz(infoPagamento.trocoPara - infoPagamento.valorPago)}`, margin, yPos);
      yPos += isTermica ? 6 : 10;
    }
  }

  // Status
  doc.setFontSize(isTermica ? 10 : 14);
  doc.setTextColor(46, 204, 113);
  doc.text('STATUS: PAGO', centerX, yPos, { align: 'center' });
  yPos += isTermica ? 8 : 12;

  // --- SEÇÃO AGT ---
  let docRef = '';
  if (dados.observacoes && dados.observacoes.includes('[AGT-DOC:')) {
    const match = dados.observacoes.match(/\[AGT-DOC:(.*?)\]/);
    if (match && match[1]) {
      docRef = match[1];
      doc.setFontSize(isTermica ? 6 : 8);
      doc.setTextColor(100, 100, 100);
      const validationNum = 'FE/232/AGT/2026';
      doc.text(`Doc: ${docRef}`, centerX, yPos, { align: 'center' });
      yPos += isTermica ? 4 : 5;
      doc.setFontSize(isTermica ? 5 : 7);
      const agtText = `Processado por software certificado Cipherpath Fiscal Engine nº ${validationNum}`;
      const splitText = doc.splitTextToSize(agtText, isTermica ? 70 : 190);
      doc.text(splitText, centerX, yPos, { align: 'center' });
      yPos += (splitText.length * (isTermica ? 3 : 4)) + 2;
    }
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(isTermica ? 7 : 9);
  doc.text('Muito obrigado pela sua preferência!', centerX, yPos, { align: 'center' });
  yPos += 5;

  try {
    const qrSize = isTermica ? 30 : 40;
    
    // Se houver espaço, adiciona página em A4
    if (yPos + qrSize > pageHeight - 10 && !isTermica) {
      doc.addPage();
      yPos = 20;
    }

    if (dados.agtQRCode) {
      // Usar QR Code retornado pela AGT Gateway (Base64)
      doc.addImage(dados.agtQRCode, 'PNG', centerX - (qrSize / 2), yPos, qrSize, qrSize);
    } else {
      // Fallback para QR Code gerado localmente (pode não ter todos os dados da AGT)
      const nifEmpresa = dados.organization?.nif || '';
      const nifCliente = dados.clienteNif || '999999999';
      const dataDoc = new Date(dados.fechadaEm).toISOString().split('T')[0];
      const numDoc = dados.numero || dados.id || 'S/N';
      const qrString = `${nifEmpresa};${nifCliente};FT;${dataDoc};${numDoc};${dados.totalGeral.toFixed(2)};0.00;`;
      
      const qrDataUrl = await QRCode.toDataURL(qrString, { margin: 1 });
      doc.addImage(qrDataUrl, 'PNG', centerX - (qrSize / 2), yPos, qrSize, qrSize);
    }
  } catch (err) {
    console.error('Erro ao renderizar QR Code no PDF', err);
  }

  const fileName = isTermica ? `POS_Mesa_${dados.mesaNumero}.pdf` : `A4_Mesa_${dados.mesaNumero}.pdf`;

  if (isTermica) {
    // Configura o PDF para auto-print (adiciona script interno ao PDF)
    doc.autoPrint();
    const pdfDataUri = doc.output('datauristring');

    // Cria um iframe escondido
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = pdfDataUri;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error("Erro na impressão automática:", e);
          // Fallback se o iframe falhar
          doc.save(fileName);
        }
        // Remove o iframe após a tentativa (3 segundos depois)
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }, 1200);
    };
  } else {
    // Para A4, apenas salva/baixa
    doc.save(fileName);
  }
};

