export type PaymentMethod = 'dinheiro' | 'cartao' | 'multicaixa' | 'transferencia';
export type CustomerType = 'final' | 'singular' | 'empresa';
export type SplitPayment = { metodo: PaymentMethod; valor: number };

export type AccountPreview = {
  mesaNumero: number;
  abertaEm: string;
  pedidos: Array<{ id: string; nomePedido: string | null; items: Array<{
    produto: string; quantidade: number; precoUnitario: number; subtotal: number; preparado: boolean;
  }> }>;
  totalGeral: number;
};
