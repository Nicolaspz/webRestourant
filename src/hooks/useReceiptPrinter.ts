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

  for (let attempt = 0; attempt < 15; attempt += 1) {
    if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 2_000));
    const { data: invoice } = await api.get(`/faturas/${receipt.faturaId}`);
    let submission = invoice.fiscalSubmission;

    if (submission?.requestId && ['RECEIVED', 'SENT_TO_AGT', 'PROCESSING'].includes(submission.status)) {
      try {
        const response = await api.post(`/faturas/${receipt.faturaId}/fiscal/sync`);
        submission = response.data;
      } catch {
        // O webhook ou a próxima consulta ainda pode concluir o documento.
      }
    }

    if (FINAL_FAILURES.has(submission?.status)) {
      throw new Error(submission?.message || 'A submissão fiscal foi rejeitada');
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
  throw new Error('O pagamento foi concluído, mas o QR fiscal ainda está em processamento. Imprima a fatura pelo Caixa quando o estado estiver aceite.');
}

export function useReceiptPrinter(settings: PosSettings) {
  const printPaidReceipt = useCallback(async (receipt: any, payment: PaymentInfo, force = false) => {
    if (!force && !settings.autoPrint) return false;

    let fiscalReceipt = receipt;
    try {
      fiscalReceipt = await waitForFiscalDocument(receipt);
    } catch (error: any) {
      toast.warning(error.message);
      return false;
    }

    const printableReceipt = settings.printLogo === false && fiscalReceipt.organization
      ? { ...fiscalReceipt, organization: { ...fiscalReceipt.organization, imageLogo: null } }
      : fiscalReceipt;
    const format = settings.paperWidth === 'a4' ? false : settings.paperWidth;
    const { gerarPDFReciboPago } = await import('@/components/dashboard/mesas/pdfNpago');

    try {
    for (let copy = 0; copy < settings.copies; copy += 1) {
      await gerarPDFReciboPago(printableReceipt, payment, format, true);
    }
    return true;
    } catch (error: any) { toast.warning(error.message || "Não foi possível abrir a impressão. Reimprima pelo Caixa."); return false; }
  }, [settings]);

  return { printPaidReceipt };
}
