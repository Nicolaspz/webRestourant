export type GpayPrintJob = { paymentId: string; state: 'waiting' | 'printing' | 'done' | 'review'; createdAt: number };
export const gpayQueuePrefix = (organizationId: string) => 'gpay-print:' + organizationId + ':';
export function enqueueGpayPrint(organizationId: string, paymentId: string) {
  const key = gpayQueuePrefix(organizationId) + paymentId;
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ paymentId, state: 'waiting', createdAt: Date.now() } satisfies GpayPrintJob));
  window.dispatchEvent(new Event('gpay-print-queue'));
}
