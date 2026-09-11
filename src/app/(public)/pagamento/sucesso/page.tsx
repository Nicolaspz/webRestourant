'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PaymentReturnStatus } from '@/components/payment/PaymentReturnStatus';

function Content() {
  const params = useSearchParams();
  return <PaymentReturnStatus transactionId={params.get('transaction') || ''} />;
}
export default function PaymentSuccessPage() {
  return <Suspense><Content /></Suspense>;
}
