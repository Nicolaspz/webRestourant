'use client';
import {useAccess} from '@/contexts/AccessContext';
import { useContext, useEffect, useRef } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { usePosSettings } from '@/hooks/usePosSettings';
import { useReceiptPrinter, waitForFiscalDocument } from '@/hooks/useReceiptPrinter';
import { setupAPIClient } from '@/services/api';
import { gpayQueuePrefix, type GpayPrintJob } from '@/utils/gpayPrintQueue';
import { toast } from 'react-toastify';

/** Fila por organização e posto. Não depende de manter a mesa/modal aberto. */
export function GpayPaymentMonitor() {
  const {can}=useAccess();
  const allowed=can("invoices.pay") && can("invoices.print");
  const { user } = useContext(AuthContext);
  const { socket } = useSocket();
  const { settings, isLoading } = usePosSettings(user?.organizationId);
  const { printPaidReceipt } = useReceiptPrinter(settings);
  const printer = useRef(printPaidReceipt);
  printer.current = printPaidReceipt;
  useEffect(() => {
    if (!user?.organizationId || !allowed || isLoading || !settings.autoPrint) return;
    const organizationId = user.organizationId;
    const prefix = gpayQueuePrefix(organizationId);
    let active = true, busy = false;
    const check = async () => {
      if (!active || busy || document.hidden) return;
      busy = true;
      try {
        // Web Locks evita imprimir a mesma fila em duas abas deste posto.
        if (!navigator.locks) return;
        await navigator.locks.request(prefix, { ifAvailable: true }, async lock => {
          if (!lock || !active) return;
          const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix));
          for (const key of keys) {
            if (!active) break;
            let job: GpayPrintJob;
            try { job = JSON.parse(localStorage.getItem(key) || 'null'); } catch { continue; }
            if (!job?.paymentId) continue;
            if (job.state === 'printing') {
              localStorage.setItem(key, JSON.stringify({ ...job, state: 'review' }));
              toast.warning('Uma impressão GPay foi interrompida. Confira o papel e reimprima pelo Caixa se necessário.');
              continue;
            }
            if (job.state !== 'waiting') continue;
            try {
              const { data } = await setupAPIClient().get('/reference-payments/' + job.paymentId);
              if (!active || data.status !== 'PAID' || !data.receipt) continue;
              if (['INVALID','REJECTED','FAILED','ERROR'].includes(data.receipt.fiscalStatus)) {
                localStorage.setItem(key, JSON.stringify({ ...job, state: 'review' }));
                toast.warning('Pagamento recebido, mas a fatura fiscal foi rejeitada. Consulte o Caixa.');
                continue;
              }
              // A espera pelo QR não conta como uma tentativa de impressão; pode ser retomada.
              const receipt = await waitForFiscalDocument(data.receipt);
              if (!active) continue;
              localStorage.setItem(key, JSON.stringify({ ...job, state: 'printing' }));
              const printed = await printer.current(receipt, { metodo: receipt.metodoPagamento, valorPago: Number(receipt.valorPago), trocoPara: receipt.trocoPara == null ? undefined : Number(receipt.trocoPara) });
              localStorage.setItem(key, JSON.stringify({ ...job, state: printed ? 'done' : 'review' }));
              if (printed) toast.success('Mesa ' + receipt.mesaNumero + ' paga por referência. Fatura enviada para impressão.');
            } catch {
              // Falha de rede antes da impressão mantém o trabalho para a próxima consulta.
              const current = JSON.parse(localStorage.getItem(key) || 'null');
              if (current?.state === 'printing') localStorage.setItem(key, JSON.stringify({ ...job, state: 'review' }));
            }
          }
        });
      } finally { busy = false; }
    };
    void check();
    const timer = window.setInterval(check, 10000);
    window.addEventListener('gpay-print-queue', check);
    window.addEventListener('focus', check);
    socket?.on('orders_refresh', check);
    return () => { active = false; clearInterval(timer); window.removeEventListener('gpay-print-queue', check); window.removeEventListener('focus', check); socket?.off('orders_refresh', check); };
  }, [allowed, user?.organizationId, user?.role, settings.autoPrint, isLoading, socket]);
  return null;
}
