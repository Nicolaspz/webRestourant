// components/caixa/FaturaList.tsx
import React, { useState } from 'react';
import FaturaCard from './FaturaCard'; 
import PagamentoModal from './PagamentoModal'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Fatura } from '@/types/product';  // 🔥 Importar do arquivo compartilhado

interface FaturaListProps {
  faturas: Fatura[];
  loading: boolean;
  error?: string | null;
  onPagamentoSuccess: () => void;
  onPreConta?: (fatura: Fatura) => void;
  onPrint?: (fatura: Fatura) => void;
  onFiscalSync?: (fatura: Fatura) => void;
  onFiscalQRCode?: (fatura: Fatura) => void;
}

const FaturaList = ({ faturas, loading, error, onPagamentoSuccess, onPreConta, onPrint, onFiscalSync, onFiscalQRCode }: FaturaListProps) => {
  const [faturaSelecionada, setFaturaSelecionada] = useState<Fatura | null>(null);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);

  const handlePagamento = (fatura: Fatura) => {
    setFaturaSelecionada(fatura);
    setShowPagamentoModal(true);
  };

  const handlePagamentoConcluido = () => {
    setShowPagamentoModal(false);
    setFaturaSelecionada(null);
    onPagamentoSuccess();
  };

  if (loading) {
    return (
      <Card className="min-h-[320px]">
        <CardHeader className="bg-muted/50">
          <CardTitle className="flex items-center gap-2">
            Faturas do Dia
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="A carregar" />
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-[240px] space-y-4 py-6" aria-live="polite">
          <p className="text-sm text-muted-foreground">A carregar faturas…</p>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (faturas.length === 0) {
    return (
      <Card>
        <CardContent className="min-h-[240px] p-8 text-center flex items-center justify-center">
          {error ? (
            <div className="flex max-w-2xl items-start gap-3 text-destructive" role="alert">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          ) : (
            <div className="text-muted-foreground">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              <p>Nenhuma fatura encontrada para esta data</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="bg-muted/50">
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
            Faturas do Dia
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {faturas.map((fatura) => (
              <FaturaCard 
                key={fatura.id}
                fatura={fatura}
                onPagamento={() => handlePagamento(fatura)}
                onPreConta={onPreConta ? () => onPreConta(fatura) : undefined}
                onPrint={onPrint ? () => onPrint(fatura) : undefined}
                onFiscalSync={onFiscalSync ? () => onFiscalSync(fatura) : undefined}
                onFiscalQRCode={onFiscalQRCode ? () => onFiscalQRCode(fatura) : undefined}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {showPagamentoModal &&  faturaSelecionada && (
        <PagamentoModal
          fatura={faturaSelecionada}
          onClose={() => setShowPagamentoModal(false)}
          onSuccess={handlePagamentoConcluido}
        />
      )}
    </>
  );
};

export default FaturaList;
