'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { CustomerType, PaymentMethod, SplitPayment } from '@/types/checkout';

export function useCheckoutForm(total: number) {
  const idempotencyKey = useRef(crypto.randomUUID());
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [cashReceived, setCashReceived] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('final');
  const [customerName, setCustomerName] = useState('');
  const [customerNif, setCustomerNif] = useState('');
  const [isSplit, setIsSplit] = useState(false);
  const [payments, setPayments] = useState<SplitPayment[]>([]);
  const [paymentInput, setPaymentInput] = useState('');

  const paid = useMemo(() => payments.reduce((sum, payment) => sum + payment.valor, 0), [payments]);
  const remaining = total - paid;
  const customerValid = customerType === 'final' || (customerName.trim().length > 0 && /^\d{9}$/.test(customerNif.trim()));

  const reset = useCallback(() => {
    idempotencyKey.current = crypto.randomUUID();
    setMethod(null); setCashReceived(''); setCustomerType('final'); setCustomerName(''); setCustomerNif('');
    setIsSplit(false); setPayments([]); setPaymentInput('');
  }, []);

  const toggleSplit = useCallback(() => {
    setIsSplit(current => !current); setPayments([]); setPaymentInput(''); setMethod(null); setCashReceived('');
  }, []);

  const addPayment = useCallback(() => {
    const value = Number(paymentInput);
    if (!method || !Number.isFinite(value) || value <= 0) return 'Selecione um método e insira um valor válido.';
    if (value > remaining + 0.1 && method !== 'dinheiro') return 'O valor não pode ser superior ao restante.';
    setPayments(current => [...current, { metodo: method, valor: Math.min(value, remaining > 0 ? remaining : value) }]);
    setPaymentInput(''); setMethod(null);
    return null;
  }, [method, paymentInput, remaining]);

  const removePayment = useCallback((index: number) => setPayments(current => current.filter((_, itemIndex) => itemIndex !== index)), []);
  const canConfirm = useCallback((hasPendingItems: boolean) => !hasPendingItems && customerValid && (
    (!isSplit && method !== null && (method !== 'dinheiro' || (cashReceived !== '' && Number(cashReceived) >= total))) ||
    (isSplit && Math.abs(remaining) < 0.01 && payments.length > 0)
  ), [cashReceived, customerValid, isSplit, method, payments.length, remaining, total]);

  const buildPayload = useCallback(() => {
    const customer = {
      isEmpresa: customerType === 'empresa',
      clienteNome: customerType === 'final' ? undefined : customerName.trim(),
      clienteNif: customerType === 'final' ? undefined : customerNif.trim(),
    };
    if (isSplit) return {
      idempotencyKey: idempotencyKey.current,
      metodoPagamento: payments[0].metodo, valorPago: total, ...customer,
      pagamentosMultiplos: payments.map(payment => ({ metodo: payment.metodo, valor: payment.valor })),
    };
    if (!method) return null;
    return {
      idempotencyKey: idempotencyKey.current,
      metodoPagamento: method, valorPago: total, ...customer,
      ...(method === 'dinheiro' && Number(cashReceived) >= total ? { trocoPara: Number(cashReceived) } : {}),
    };
  }, [cashReceived, customerName, customerNif, customerType, isSplit, method, payments, total]);

  return {
    method, setMethod, cashReceived, setCashReceived, customerType, setCustomerType, customerName, setCustomerName,
    customerNif, setCustomerNif, isSplit, payments, paymentInput, setPaymentInput, remaining,
    reset, toggleSplit, addPayment, removePayment, canConfirm, buildPayload,
  };
}
