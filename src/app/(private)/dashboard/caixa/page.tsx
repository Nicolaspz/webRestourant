'use client'
import React, { useState, useEffect, useContext } from 'react';
import CaixaHeader from '@/components/dashboard/caixa/CaixaHeader';
import FaturaList from '@/components/dashboard/caixa/FaturaList';
import Estatisticas from '@/components/dashboard/caixa/Estatisticas';
import { AuthContext } from '@/contexts/AuthContext';
import { setupAPIClient } from '@/services/api';
import { useSocket } from '@/contexts/SocketContext';
import { Fatura, Mesa } from '@/types/product';
import ModalPagamento from '@/components/dashboard/mesas/ModalPagamento';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { gerarPDFReciboPago } from '@/components/dashboard/mesas/pdfNpago';

// Definir interface para os parâmetros
interface FaturaParams {
  organizationId: string;
  dataInicio: string;
  dataFim: string;
  status?: string;
}

const Caixa = () => {
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('pendentes');
  const [estatisticas, setEstatisticas] = useState(null);

  // Estado do modal de pagamento para mesas abertas
  const [modalPagamentoMesa, setModalPagamentoMesa] = useState<{
    open: boolean;
    mesaId: string;
    mesaNumber: number;
  }>({ open: false, mesaId: '', mesaNumber: 0 });

  const { user } = useContext(AuthContext);
  const { socket } = useSocket();
  const apiClient = setupAPIClient();

  // Função para formatar data
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const fetchMesas = async () => {
    if (!user?.organizationId) return;
    setLoading(true);
    try {
      const response = await apiClient.get('/mesas', {
        params: { organizationId: user.organizationId }
      });
      // Filtrar apenas mesas ocupadas para o checkout no caixa
      const mesasOcupadas = response.data.filter((m: Mesa) => m.status === 'ocupada');
      setMesas(mesasOcupadas);
    } catch (error) {
      console.error('❌ Erro ao buscar mesas:', error);
      setMesas([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFaturas = async (date: Date, status: string | undefined) => {
    if (!user?.organizationId) {
      console.error('❌ OrganizationId não encontrado');
      return;
    }

    setLoading(true);
    try {
      const dataInicio = formatDate(date);
      const dataFim = formatDate(date);

      const url = `/faturas?organizationId=${user.organizationId}&dataInicio=${dataInicio}&dataFim%3A=${dataFim}${status && status !== 'todas' ? `&status=${status}` : ''}`;

      console.log('🌐 URL correta:', url);

      const response = await apiClient.get(url);
      console.log("✅ Faturas recebidas:", response.data);

      setFaturas(response.data || []);
    } catch (error: any) {
      console.error('❌ Erro:', error.response?.data);
      setFaturas([]);
    } finally {
      setLoading(false);
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
      console.log("📊 Estatistica venda:", response.data);
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
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
            fetchMesas();
          } else {
            fetchFaturas(selectedDate, currentStatus);
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
        fetchMesas();
      } else {
        fetchFaturas(selectedDate, currentStatus);
      }
      fetchEstatisticas(selectedDate);
    }
  }, [selectedDate, activeTab, user?.organizationId]);

  const handlePagamentoSuccess = (dadosFechamento?: any) => {
    if (activeTab === 'abertas' && dadosFechamento) {
      // Gerar recibo pago para mesas fechadas agora
      gerarPDFReciboPago(dadosFechamento, {
        metodo: dadosFechamento.metodoPagamento,
        valorPago: dadosFechamento.valorPago,
        trocoPara: dadosFechamento.trocoPara
      });
      fetchMesas();
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
  };

  const openCheckoutMesa = (mesa: Mesa) => {
    setModalPagamentoMesa({
      open: true,
      mesaId: mesa.id,
      mesaNumber: mesa.number
    });
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
                    <Card key={mesa.id} className="hover:shadow-md transition-shadow cursor-pointer border-2" onClick={() => openCheckoutMesa(mesa)}>
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
                        <Button className="w-full gap-2 bg-green-600 hover:bg-green-700">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Pagar e Fechar
                        </Button>
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
              />
            )}
          </div>

          <div className="lg:col-span-1">
            <Estatisticas data={estatisticas} />
          </div>
        </div>
      </div>

      {modalPagamentoMesa.open && (
        <ModalPagamento
          open={modalPagamentoMesa.open}
          mesaId={modalPagamentoMesa.mesaId}
          mesaNumber={modalPagamentoMesa.mesaNumber}
          organizationId={user?.organizationId || ''}
          onClose={() => setModalPagamentoMesa(prev => ({ ...prev, open: false }))}
          onSuccess={handlePagamentoSuccess}
        />
      )}
    </div>
  );
};

export default Caixa;