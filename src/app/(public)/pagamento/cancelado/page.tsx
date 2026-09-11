'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PaymentReturnStatus } from '@/components/payment/PaymentReturnStatus';

function Content() {
  const params = useSearchParams();
  return <PaymentReturnStatus transactionId={params.get('transaction') || ''} cancelled />;
}
export default function PaymentCancelledPage() {
  return <Suspense><Content /></Suspense>;
}
