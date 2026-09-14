export type PaymentDetail = { metodo: string; valor: number; referencia?: string | null };
export function paymentMethodLabel(method: string) {
  const labels: Record<string, string> = { dinheiro: 'Dinheiro', multicaixa: 'Multicaixa', cartao: 'Cartão', transferencia: 'Transferência', online: 'Online' };
  return labels[method] || method.replaceAll('_', ' ');
}
export function paymentSummary(payments: PaymentDetail[] | undefined, fallback: string) {
  const methods = [...new Set((payments || []).map(p => p.metodo))];
  return methods.length > 1 ? 'Pagamento dividido' : paymentMethodLabel(methods[0] || fallback);
}
