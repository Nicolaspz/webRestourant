'use client';

import { useCallback } from 'react';
import type { PosSettings } from '@/types/pos-settings';
import { api } from '@/services/api';
import { toast } from 'react-toastify';

type PaymentInfo = { metodo: string; valorPago: number; trocoPara?: number };

const FINAL_FAILURES = new Set(['INVALID', 'REJECTED', 'FAILED', 'SUBMISSION_FAILED', 'ERROR']);

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

export async function waitForFiscalDocument(receipt: any) {
  if (!receipt.faturaId || receipt.agtQRCode || !receipt.fiscalStatus) return receipt;

  const provisional = (status?: string, message?: string) => ({
    ...receipt,
    fiscalStatus: status || receipt.fiscalStatus,
    fiscalPending: true,
    provisionalReference: `PROV-${String(receipt.faturaId).slice(0, 8).toUpperCase()}`,
    fiscalMessage: message,
  });
  let requestedSync = false;

  // Espera alguns segundos pela resposta rápida. Se o provedor estiver
  // indisponível, o cliente recebe um comprovativo provisório sem bloquear o caixa.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 2_000));
    let invoice: any;
    try {
      ({ data: invoice } = await api.get(`/faturas/${receipt.faturaId}`));
    } catch {
      return provisional(receipt.fiscalStatus, 'Não foi possível confirmar a resposta fiscal. O pagamento foi registado e a fatura será sincronizada pelo sistema.');
    }
    let submission = invoice.fiscalSubmission;

    if (!requestedSync && submission?.requestId && ['RECEIVED', 'SENT_TO_AGT', 'PROCESSING'].includes(submission.status)) {
      requestedSync = true;
      try {
        const response = await api.post(`/faturas/${receipt.faturaId}/fiscal/sync`);
        submission = response.data;
      } catch {
        // O webhook ou a próxima consulta ainda pode concluir o documento.
      }
    }

    if (FINAL_FAILURES.has(submission?.status)) {
      return provisional(submission.status, submission.message || 'A submissão fiscal ainda não foi aceite.');
    }

    const documentNo = submission?.documentNo || invoice.numero;
    if (documentNo && submission?.agtRequestId) {
      try {
        const qrResponse = await api.get(`/faturas/${receipt.faturaId}/fiscal/qrcode`, { responseType: 'blob' });
        return {
          ...receipt,
          agtDocumentNo: documentNo,
          agtQRCode: await blobToDataUrl(qrResponse.data),
          fiscalStatus: submission.status,
        };
      } catch {
        // O documento pode ser aceite alguns instantes antes de o PNG ficar disponível.
      }
    }
  }
  return provisional(undefined, 'A submissão fiscal continua pendente. O documento será atualizado quando o provedor responder.');
}

export function useReceiptPrinter(settings: PosSettings) {
  const printPaidReceipt = useCallback(async (receipt: any, payment: PaymentInfo, force = false) => {
    let fiscalReceipt = receipt;
    try {
      fiscalReceipt = await waitForFiscalDocument(receipt);
    } catch (error: any) {
      toast.warning(error.message);
      return false;
    }
    // A preferência de impressão automática continua a valer para faturas
    // fiscais prontas. Se a submissão falhar, imprime-se o comprovativo provisório
    // necessário para entregar ao cliente.
    if (!force && !settings.autoPrint && !fiscalReceipt.fiscalPending) return false;

    const printableReceipt = settings.printLogo === false && fiscalReceipt.organization
      ? { ...fiscalReceipt, organization: { ...fiscalReceipt.organization, imageLogo: null } }
      : fiscalReceipt;
    const format = settings.paperWidth === 'a4' ? false : settings.paperWidth;
    const { gerarPDFReciboPago } = await import('@/components/dashboard/mesas/pdfNpago');

    try {
    for (let copy = 0; copy < settings.copies; copy += 1) {
      await gerarPDFReciboPago(printableReceipt, payment, format, true);
    }
    if (fiscalReceipt.fiscalPending) {
      toast.warning('Pagamento registado. Foi impresso um comprovativo provisório; o sistema tentará submeter a fatura. Se continuar pendente, reenvie pelo Caixa.');
    }
    return true;
    } catch (error: any) { toast.warning(error.message || "Não foi possível abrir a impressão. Reimprima pelo Caixa."); return false; }
  }, [settings]);

  return { printPaidReceipt };
}
