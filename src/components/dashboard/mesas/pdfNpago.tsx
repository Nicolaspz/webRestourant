import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  imageLogo: string | null;
}

interface DadosSessao {
  mesaNumero: number;
  codigoAbertura: string;
  abertaEm: Date;
  fechadaEm: Date;
  pedidos: Pedido[];
  totalGeral: number;
  organization?: OrganizationInfo;
}

// Função para formatar valores em Kwanzas
const formatarKz = (valor: number): string => {
  return `${valor.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz`;
};

// Função para renderizar o cabeçalho da organização
const renderizarCabecalhoOrganizacao = (doc: jsPDF, dados: DadosSessao, yPos: number): number => {
  if (dados.organization) {
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(dados.organization.name.toUpperCase(), 105, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIF: ${dados.organization.nif}`, 105, yPos, { align: 'center' });
    yPos += 6;
    doc.text(dados.organization.address, 105, yPos, { align: 'center' });
    yPos += 10;

    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
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

  let yPos = 20;
  yPos = renderizarCabecalhoOrganizacao(doc, dados, yPos);

  // Cabeçalho do Recibo
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO NÃO PAGO', 105, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${dataAtual} ${horaAtual}`, 105, yPos, { align: 'center' });
  yPos += 12;

  // Informações da mesa
  doc.setFont('helvetica', 'bold');
  doc.text('Informações da Mesa:', 20, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.text(`Mesa: ${dados.mesaNumero}`, 20, yPos);
  yPos += 6;
  doc.text(`Código de Abertura: ${dados.codigoAbertura}`, 20, yPos);
  yPos += 6;
  doc.text(`Abertura: ${new Date(dados.abertaEm).toLocaleString('pt-BR')}`, 20, yPos);
  yPos += 6;
  doc.text(`Fechamento: ${new Date(dados.fechadaEm).toLocaleString('pt-BR')}`, 20, yPos);
  yPos += 15;

  // Lista de pedidos
  dados.pedidos.forEach((pedido) => {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(`Pedido: ${pedido.nomePedido}`, 20, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Criado em: ${new Date(pedido.criadoEm).toLocaleString('pt-BR')}`, 20, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [['Produto', 'Qtd', 'Preço Unit.', 'Subtotal']],
      body: pedido.items.map(item => [
        item.produto,
        item.quantidade.toString(),
        formatarKz(item.precoUnitario),
        formatarKz(item.subtotal)
      ]),
      margin: { left: 20, right: 20 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 9 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  });

  // Total geral
  if (yPos > 220) { doc.addPage(); yPos = 20; }
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL GERAL: ${formatarKz(dados.totalGeral)}`, 105, yPos, { align: 'center' });
  yPos += 20;

  // Status
  doc.setTextColor(192, 57, 43);
  doc.text('STATUS: NÃO PAGO', 105, yPos, { align: 'center' });
  yPos += 10;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Muito obrigado pela sua preferência!', 105, yPos, { align: 'center' });

  doc.save(`recibo_mesa_${dados.mesaNumero}_${dataAtual.replace(/\//g, '-')}.pdf`);
};

export const gerarPDFReciboPago = (dados: DadosSessao, infoPagamento?: { metodo: string, valorPago: number, trocoPara?: number }) => {
  const doc = new jsPDF();
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  const horaAtual = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  let yPos = 20;
  yPos = renderizarCabecalhoOrganizacao(doc, dados, yPos);

  // Cabeçalho do Recibo
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE PAGAMENTO', 105, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${dataAtual} ${horaAtual}`, 105, yPos, { align: 'center' });
  yPos += 12;

  // Informações da mesa
  doc.setFont('helvetica', 'bold');
  doc.text('Informações da Mesa:', 20, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.text(`Mesa: ${dados.mesaNumero}`, 20, yPos);
  yPos += 6;
  doc.text(`Código de Abertura: ${dados.codigoAbertura}`, 20, yPos);
  yPos += 6;
  doc.text(`Abertura: ${new Date(dados.abertaEm).toLocaleString('pt-BR')}`, 20, yPos);
  yPos += 6;
  doc.text(`Fechamento: ${new Date(dados.fechadaEm).toLocaleString('pt-BR')}`, 20, yPos);
  yPos += 15;

  // Lista de pedidos
  dados.pedidos.forEach((pedido) => {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(`Pedido: ${pedido.nomePedido}`, 20, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dataPedido = pedido.criadoEm ? new Date(pedido.criadoEm).toLocaleString('pt-BR') : 'N/A';
    doc.text(`Criado em: ${dataPedido}`, 20, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [['Produto', 'Qtd', 'Preço Unit.', 'Subtotal']],
      body: pedido.items.map(item => [
        item.produto,
        item.quantidade.toString(),
        formatarKz(item.precoUnitario),
        formatarKz(item.subtotal)
      ]),
      margin: { left: 20, right: 20 },
      headStyles: { fillColor: [46, 204, 113], textColor: 255 },
      styles: { fontSize: 9 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  });

  // Total geral
  if (yPos > 220) { doc.addPage(); yPos = 20; }
  doc.line(20, yPos, 190, yPos);
  yPos += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL GERAL: ${formatarKz(dados.totalGeral)}`, 105, yPos, { align: 'center' });
  yPos += 15;

  // Detalhes do Pagamento
  if (infoPagamento) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Método: ${infoPagamento.metodo.toUpperCase()}`, 20, yPos);
    yPos += 6;
    doc.text(`Valor Pago: ${formatarKz(infoPagamento.valorPago)}`, 20, yPos);
    yPos += 6;
    if (infoPagamento.trocoPara) {
      doc.text(`Troco para: ${formatarKz(infoPagamento.trocoPara)}`, 20, yPos);
      yPos += 6;
      doc.text(`Troco: ${formatarKz(Math.abs(infoPagamento.trocoPara - infoPagamento.valorPago))}`, 20, yPos);
      yPos += 6;
    }
    yPos += 10;
  }

  // Status
  doc.setFontSize(16);
  doc.setTextColor(46, 204, 113);
  doc.text('STATUS: PAGO', 105, yPos, { align: 'center' });
  yPos += 12;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Muito obrigado pela sua preferência!', 105, yPos, { align: 'center' });

  doc.save(`recibo_PAGO_mesa_${dados.mesaNumero}_${dataAtual.replace(/\//g, '-')}.pdf`);
};
