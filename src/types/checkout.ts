export type PaymentMethod = 'dinheiro' | 'cartao' | 'transferencia';
export type CustomerType = 'final' | 'singular' | 'empresa';
export type SplitPayment = { metodo: PaymentMethod; valor: number };

export type AccountPreview = {
  sessaoId?: string;
  sessionId?: string;
  mesaNumero: number;
  abertaEm: string;
  pedidos: Array<{ id: string; nomePedido: string | null; items: Array<{
    produto: string; quantidade: number; precoUnitario: number; subtotal: number; preparado: boolean;
  }> }>;
  totalGeral: number;
};
