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
  pedidos: Pedido[];
  totalGeral: number;
  isEmpresa?: boolean;
  clienteNome?: string;
  clienteNif?: string;
  observacoes?: string;
  organization?: OrganizationInfo;
}

// Função para formatar valores em Kwanzas
const formatarKz = (valor: number): string => {
  return `${valor.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz`;
};

// Função para renderizar o cabeçalho da organização
const renderizarCabecalhoOrganizacao = (doc: jsPDF, dados: DadosSessao, yPos: number, isTermica = false): number => {
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

    // Se for empresa, mostrar os dados do cliente
    if (dados.clienteNome || dados.clienteNif) {
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
  yPos += 10;

  // Lista de pedidos
  dados.pedidos.forEach((pedido) => {
    if (yPos > 240) { doc.addPage(); yPos = 20; }

    autoTable(doc, {
      startY: yPos,
      head: [[`Pedido: ${pedido.nomePedido}`, 'Qtd', 'Preço Unit.', 'Subtotal']],
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
  yPos = renderizarCabecalhoOrganizacao(doc, dados, yPos, isTermica);

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
  doc.text(`Sessão: ${dados.codigoAbertura}`, margin, yPos);
  yPos += isTermica ? 8 : 12;

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

  doc.setFontSize(isTermica ? 10 : 14);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL GERAL: ${formatarKz(dados.totalGeral)}`, centerX, yPos, { align: 'center' });
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
  let hashAGT = '';
  if (dados.observacoes && dados.observacoes.includes('[JWS:')) {
    const match = dados.observacoes.match(/\[JWS:(.*?)\]/);
    if (match && match[1]) {
      const parts = match[1].split('.');
      if (parts.length === 3) {
        hashAGT = parts[2].substring(0, 4);
        doc.setFontSize(isTermica ? 6 : 8);
        doc.setTextColor(100, 100, 100);
        const validationNum = dados.organization?.softwareValidationNumber || '0/AGT/2024';
        doc.text(`${hashAGT} - Validação nº ${validationNum}`, centerX, yPos, { align: 'center' });
        yPos += isTermica ? 6 : 8;
      }
    }
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(isTermica ? 7 : 9);
  doc.text('Muito obrigado pela sua preferência!', centerX, yPos, { align: 'center' });
  yPos += 5;

  // QR CODE AGT (Garantir que não fica no limite da página)
  const nifEmpresa = dados.organization?.nif || '';
  const nifCliente = dados.clienteNif || '999999999';
  const dataDoc = new Date(dados.fechadaEm).toISOString().split('T')[0];
  const numDoc = dados.numero || dados.id || 'S/N';
  const qrString = `${nifEmpresa};${nifCliente};FT;${dataDoc};${numDoc};${dados.totalGeral.toFixed(2)};0.00;${hashAGT}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(qrString, { margin: 1 });
    const qrSize = isTermica ? 30 : 40;
    
    // Se não houver espaço, adiciona página em A4. Em térmica a página já foi calculada.
    if (yPos + qrSize > pageHeight - 10 && !isTermica) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.addImage(qrDataUrl, 'PNG', centerX - (qrSize / 2), yPos, qrSize, qrSize);
  } catch (err) {
    console.error('Erro ao gerar QR Code', err);
  }

  const fileName = isTermica ? `POS_Mesa_${dados.mesaNumero}.pdf` : `A4_Mesa_${dados.mesaNumero}.pdf`;
  
  if (isTermica) {
    // Para POS, abre em nova aba para facilitar impressão imediata
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
  } else {
    // Para A4, apenas salva/baixa
    doc.save(fileName);
  }
};

