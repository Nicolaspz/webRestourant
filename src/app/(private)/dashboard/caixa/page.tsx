'use client'
import React, { useState, useEffect, useContext, useRef } from 'react';
import dynamic from 'next/dynamic';
import CaixaHeader from '@/components/dashboard/caixa/CaixaHeader';
import { AuthContext } from '@/contexts/AuthContext';
import { setupAPIClient } from '@/services/api';
import { useSocket } from '@/contexts/SocketContext';
import { Fatura, Mesa } from '@/types/product';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-toastify';
import { CreditCard, X } from 'lucide-react';
import { usePosSettings } from '@/hooks/usePosSettings';
import { useReceiptPrinter } from '@/hooks/useReceiptPrinter';

const FaturaList = dynamic(() => import('@/components/dashboard/caixa/FaturaList'));
const Estatisticas = dynamic(() => import('@/components/dashboard/caixa/Estatisticas'));
const ModalPagamento = dynamic(() => import('@/components/dashboard/mesas/ModalPagamento'), { ssr: false });

// Definir interface para os parâmetros
interface FaturaParams {
  organizationId: string;
  dataInicio: string;
  dataFim: string;
  status?: string;
}

const CACHE_TTL = 30_000;
type CacheEntry<T> = { data: T; updatedAt: number };

const Caixa = () => {
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('abertas');
  const [estatisticas, setEstatisticas] = useState(null);
  const mesasCache = useRef<CacheEntry<Mesa[]> | null>(null);
  const faturasCache = useRef<Record<string, CacheEntry<Fatura[]>>>({});
  const estatisticasCache = useRef<Record<string, CacheEntry<any>>>({});

  // Estado do modal de pagamento para mesas abertas
  const [fechosAbertos, setFechosAbertos] = useState<Array<{
    mesaId: string;
    mesaNumber: number;
  }>>([]);
  const [fechoAtivo, setFechoAtivo] = useState<number | null>(null);

  const { user } = useContext(AuthContext);
  const { socket } = useSocket();
  const apiClient = setupAPIClient();
  const { settings: posSettings } = usePosSettings(user?.organizationId);
  const { printPaidReceipt } = useReceiptPrinter(posSettings);

  // Função para formatar data
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchMesas = async (silent = false) => {
    if (!user?.organizationId) return;
    if (!silent) setLoading(true);
    try {
      const response = await apiClient.get('/mesas', {
        params: { organizationId: user.organizationId }
      });
      // Filtrar apenas mesas ocupadas para o checkout no caixa
      const mesasOcupadas = response.data.filter((m: Mesa) => m.status === 'ocupada');
      setMesas(mesasOcupadas);
      mesasCache.current = { data: mesasOcupadas, updatedAt: Date.now() };
    } catch (error) {
      console.error('Erro ao buscar mesas:', error);
      if (!silent) {
        setMesas([]);
        toast.error('Não foi possível carregar as mesas abertas.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchFaturas = async (date: Date, status: string | undefined, silent = false) => {
    if (!user?.organizationId) {
      console.error('Organização não encontrada');
      return;
    }

    if (!silent) setLoading(true);
    try {
      const dataInicio = formatDate(date);
      const dataFim = formatDate(date);

      const response = await apiClient.get('/faturas', {
        params: {
          organizationId: user.organizationId,
          dataInicio,
          dataFim,
          ...(status && status !== 'todas' ? { status } : {}),
        },
      });

      setFaturas(response.data || []);
      const cacheKey = `${formatDate(date)}:${status || 'todas'}`;
      faturasCache.current[cacheKey] = { data: response.data || [], updatedAt: Date.now() };
    } catch (error: any) {
      console.error('❌ Erro:', error.response?.data);
      if (!silent) {
        setFaturas([]);
        toast.error(error.response?.data?.error || 'Não foi possível carregar as faturas.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchEstatisticas = async (date: Date) => {
    if (!user?.organizationId) return;

    try {
      const dataInicio = formatDate(date);
      const dataFim = formatDate(date);

      const response = await apiClient.get('/estatisticas/vendas', {
        params: {
          organizationId: user.organizationId,
          inicio: dataInicio,
          fim: dataFim
        }
      });
      setEstatisticas(response.data);
      estatisticasCache.current[formatDate(date)] = { data: response.data, updatedAt: Date.now() };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      setEstatisticas(null);
    }
  };

  // Listener do Socket para atualizações em tempo real
  useEffect(() => {
    if (socket && user?.organizationId) {
      const handleRefresh = (data: any) => {
        if (data.organizationId === user.organizationId) {
          console.log("🔄 Recebido evento de atualização no Caixa");

          const statusMap = {
            'abertas': 'abertas',
            'pendentes': 'pendente',
            'pagas': 'paga',
            'canceladas': 'cancelada',
            'todas': undefined
          } as const;

          const currentStatus = statusMap[activeTab as keyof typeof statusMap];
          if (activeTab === 'abertas') {
            fetchMesas(true);
          } else {
            fetchFaturas(selectedDate, currentStatus, true);
          }
          fetchEstatisticas(selectedDate);
        }
      };

      socket.on('orders_refresh', handleRefresh);

      return () => {
        socket.off('orders_refresh', handleRefresh);
      };
    }
  }, [socket, user, selectedDate, activeTab]);

  useEffect(() => {
    if (user?.organizationId) {
      const statusMap = {
        'abertas': 'abertas',
        'pendentes': 'pendente',
        'pagas': 'paga',
        'canceladas': 'cancelada',
        'todas': undefined
      } as const;

      const currentStatus = statusMap[activeTab as keyof typeof statusMap];
      if (activeTab === 'abertas') {
        const cached = mesasCache.current;
        if (cached) setMesas(cached.data);
        if (!cached || Date.now() - cached.updatedAt >= CACHE_TTL) fetchMesas(Boolean(cached));
      } else {
        const cacheKey = `${formatDate(selectedDate)}:${currentStatus || 'todas'}`;
        const cached = faturasCache.current[cacheKey];
        if (cached) setFaturas(cached.data);
        if (!cached || Date.now() - cached.updatedAt >= CACHE_TTL) {
          fetchFaturas(selectedDate, currentStatus, Boolean(cached));
        }
      }
      const statsKey = formatDate(selectedDate);
      const cachedStats = estatisticasCache.current[statsKey];
      if (cachedStats) setEstatisticas(cachedStats.data);
      if (!cachedStats || Date.now() - cachedStats.updatedAt >= CACHE_TTL) fetchEstatisticas(selectedDate);
    }
  }, [selectedDate, activeTab, user?.organizationId]);

  // O socket dá resposta imediata; este fallback cobre reconexões, outros
  // dispositivos e eventos perdidos sem apagar o conteúdo que já está visível.
  useEffect(() => {
    if (!user?.organizationId) return;
    const refreshCurrentView = () => {
      if (document.visibilityState !== 'visible') return;
      if (activeTab === 'abertas') void fetchMesas(true);
      else {
        const statusMap: Record<string, string | undefined> = {
          pendentes: 'pendente', pagas: 'paga', canceladas: 'cancelada', todas: undefined,
        };
        void fetchFaturas(selectedDate, statusMap[activeTab], true);
      }
    };
    const timer = window.setInterval(refreshCurrentView, CACHE_TTL);
    window.addEventListener('focus', refreshCurrentView);
    document.addEventListener('visibilitychange', refreshCurrentView);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshCurrentView);
      document.removeEventListener('visibilitychange', refreshCurrentView);
    };
  }, [activeTab, selectedDate, user?.organizationId]);

  const handlePagamentoSuccess = async (dadosFechamento?: any) => {
    if (activeTab === 'abertas' && dadosFechamento) {
      const [printed] = await Promise.all([
        printPaidReceipt(dadosFechamento, {
          metodo: dadosFechamento.metodoPagamento,
          valorPago: dadosFechamento.valorPago,
          trocoPara: dadosFechamento.trocoPara
        }),
        fetchMesas(true),
        fetchEstatisticas(selectedDate),
      ]);
      return printed;
    } else if (activeTab === 'abertas') {
      fetchMesas();
    } else {
      const statusMap = {
        'pendentes': 'pendente',
        'pagas': 'paga',
        'canceladas': 'cancelada',
        'todas': undefined
      };
      fetchFaturas(selectedDate, statusMap[activeTab as keyof typeof statusMap]);
    }
    fetchEstatisticas(selectedDate);
    return false;
  };

  const openCheckoutMesa = (mesa: Mesa) => {
    setFechosAbertos(current => current.some(item => item.mesaNumber === mesa.number)
      ? current
      : [...current, { mesaId: mesa.id, mesaNumber: mesa.number }]);
    setFechoAtivo(mesa.number);
  };

  const fecharJanelaConta = (mesaNumber: number) => {
    setFechosAbertos(current => current.filter(item => item.mesaNumber !== mesaNumber));
    setFechoAtivo(current => current === mesaNumber ? null : current);
  };

  const consultaEmCurso = useRef(false);
  const [imprimindoPreConta, setImprimindoPreConta] = useState(false);

  const imprimirPreConta = async (endpoint: string) => {
    if (!user?.organizationId || consultaEmCurso.current) return;
    consultaEmCurso.current = true;
    setImprimindoPreConta(true);
    try {
      const { data } = await apiClient.get(endpoint, {
        params: { organizationId: user.organizationId },
      });
      const { gerarPDFReciboNaoPago } = await import('@/components/dashboard/mesas/pdfNpago');
      await gerarPDFReciboNaoPago(
        posSettings.printLogo ? data : { ...data, organization: { ...data.organization, imageLogo: null } },
        posSettings.paperWidth === 'a4' ? false : posSettings.paperWidth,
        true,
      );
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || 'Erro ao imprimir a pré-conta.');
    } finally {
      consultaEmCurso.current = false;
      setImprimindoPreConta(false);
    }
  };

  const atualizarEstadoFiscal = async (fatura: Fatura) => {
    try {
      const action = fatura.fiscalSubmission?.requestId ? 'sync' : 'retry';
      await apiClient.post(`/faturas/${fatura.id}/fiscal/${action}`);
      toast.success(action === 'sync' ? 'Estado fiscal atualizado.' : 'Submissão fiscal reenviada.');
      await fetchFaturas(selectedDate, activeTab === 'pagas' ? 'paga' : undefined);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Não foi possível atualizar o estado fiscal.');
    }
  };

  const abrirQRCodeFiscal = async (fatura: Fatura) => {
    try {
      const response = await apiClient.get(`/faturas/${fatura.id}/fiscal/qrcode`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'O QR Code fiscal ainda não está disponível.');
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 p-4">
      <div className="max-w-[90vw] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Caixa do Restaurante</h1>
            <p className="text-muted-foreground">
              Gerencie faturas e pagamentos do seu estabelecimento
            </p>
          </div>
        </div>

        {!user?.organizationId && (
          <div className="bg-destructive/15 border border-destructive/50 text-destructive dark:text-destructive-foreground px-4 py-3 rounded-lg">
            ❌ OrganizationId não encontrado. Verifique se está logado.
          </div>
        )}

        <CaixaHeader
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            {activeTab === 'abertas' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? (
                  <p>A carregar mesas...</p>
                ) : mesas.length > 0 ? (
                  mesas.map(mesa => (
                    <Card key={mesa.id} className="hover:shadow-md transition-shadow border-2">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-xl">Mesa {mesa.number}</CardTitle>
                          <Badge className="bg-blue-500">Aberta</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                          <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                          Em consumo
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          disabled={imprimindoPreConta}
                          onClick={() => imprimirPreConta(`/fact/${mesa.number}`)}
                        >
                          Pré-conta
                        </Button>
                        <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" onClick={() => openCheckoutMesa(mesa)}>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Pagar
                        </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="col-span-full p-8 text-center text-muted-foreground">
                    Nenhuma mesa ocupada no momento.
                  </Card>
                )}
              </div>
            ) : (
              <FaturaList
                faturas={faturas}
                loading={loading}
                onPagamentoSuccess={handlePagamentoSuccess}
                onPreConta={fatura => imprimirPreConta(`/factid/${fatura.id}`)}
                onFiscalSync={atualizarEstadoFiscal}
                onPrint={async fatura => {
                  try {
                    const {data} = await apiClient.get('/factid/'+fatura.id, {params:{organizationId:user?.organizationId}});
                    await printPaidReceipt({...data, fiscalStatus:fatura.fiscalSubmission?.status, agtDocumentNo:fatura.fiscalSubmission?.documentNo || fatura.numero}, {metodo:data.metodoPagamento,valorPago:Number(data.valorPago),trocoPara:Number(data.trocoPara)||undefined}, true);
                  } catch(error:any) { toast.error(error.response?.data?.error || 'Não foi possível carregar a fatura para impressão'); }
                }}
                onFiscalQRCode={abrirQRCodeFiscal}
              />
            )}
          </div>

          <div className="lg:col-span-1">
            <Estatisticas data={estatisticas} />
          </div>
        </div>
      </div>

      {fechosAbertos.map(fecho => (
        <ModalPagamento
          key={fecho.mesaId}
          open
          visible={fechoAtivo === fecho.mesaNumber}
          mesaId={fecho.mesaId}
          mesaNumber={fecho.mesaNumber}
          organizationId={user?.organizationId || ''}
          onMinimize={() => setFechoAtivo(null)}
          onClose={() => fecharJanelaConta(fecho.mesaNumber)}
          onSuccess={async (dados) => { const printed = await handlePagamentoSuccess(dados); fecharJanelaConta(fecho.mesaNumber); return printed; }}
        />
      ))}

      {fechosAbertos.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-[90] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 gap-2 overflow-x-auto rounded-2xl border bg-background/95 p-2 shadow-2xl backdrop-blur">
          {fechosAbertos.map(fecho => (
            <div key={fecho.mesaId} className={`flex min-w-max items-center rounded-xl border ${fechoAtivo === fecho.mesaNumber ? 'border-primary bg-primary/10' : 'bg-muted/40'}`}>
              <button type="button" onClick={() => setFechoAtivo(fecho.mesaNumber)} className="flex min-h-12 items-center gap-2 px-4 font-semibold"><CreditCard className="h-4 w-4" />Mesa {fecho.mesaNumber}</button>
              <button type="button" onClick={() => fecharJanelaConta(fecho.mesaNumber)} aria-label={`Fechar pagamento da mesa ${fecho.mesaNumber}`} className="mr-1 rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Caixa;
