'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Loader2, XCircle } from 'lucide-react';
import { setupAPIClient } from '@/services/api';

export function PaymentReturnStatus({ transactionId, cancelled = false }: { transactionId: string; cancelled?: boolean }) {
  const [status, setStatus] = useState(cancelled ? 'CANCELLED' : 'PENDING');

  useEffect(() => {
    if (!transactionId || cancelled) return;
    let active = true;
    const check = async () => {
      try {
        const { data } = await setupAPIClient().get(`/online-payments/status/${encodeURIComponent(transactionId)}`);
        if (active) setStatus(data.status);
      } catch { /* O webhook ou a próxima consulta pode concluir o pagamento. */ }
    };
    check();
    const timer = window.setInterval(check, 3_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [cancelled, transactionId]);

  const paid = status === 'PAID';
  const failed = cancelled || ['FAILED', 'EXPIRED', 'CANCELLED'].includes(status);
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <section className="w-full max-w-md space-y-5 rounded-3xl border bg-background p-8 text-center shadow-xl">
        {paid ? <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" /> : failed ? <XCircle className="mx-auto h-16 w-16 text-red-500" /> : <div className="relative mx-auto w-fit"><Clock3 className="h-16 w-16 text-amber-500" /><Loader2 className="absolute -right-2 -top-2 h-6 w-6 animate-spin text-primary" /></div>}
        <div><h1 className="text-2xl font-bold">{paid ? 'Pagamento confirmado' : failed ? 'Pagamento não concluído' : 'A confirmar pagamento'}</h1><p className="mt-2 text-muted-foreground">{paid ? 'O restaurante já recebeu a confirmação. A sua fatura será processada.' : failed ? 'Pode voltar ao restaurante e solicitar um novo link.' : 'Aguarde enquanto recebemos a confirmação segura do provedor.'}</p></div>
        <p className="text-xs text-muted-foreground">Pode fechar esta página quando o estado estiver confirmado.</p>
      </section>
    </main>
  );
}
