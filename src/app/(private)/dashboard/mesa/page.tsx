'use client';

import { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { setupAPIClient } from '@/services/api';
import { AuthContext } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';

// Components
import MesaStatusTabs from '@/components/dashboard/mesas/MesaStatusTabs';
import ModalPagamento from '@/components/dashboard/mesas/ModalPagamento';

// Types
import { Mesa } from '@/types/product';
import { parseCookies } from 'nookies';
import { gerarPDFReciboNaoPago, gerarPDFReciboPago } from '@/components/dashboard/mesas/pdfNpago';


export default function GerenciamentoMesasPage() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [activeTab, setActiveTab] = useState('todas');
  const [isLoading, setIsLoading] = useState(true);
  const { '@servFixe.token': token } = parseCookies();

  // Estado do modal de pagamento
  const [modalPagamento, setModalPagamento] = useState<{
    open: boolean;
    mesaId: string;
    mesaNumber: number;
  }>({ open: false, mesaId: '', mesaNumber: 0 });

  const [novaReserva, setNovaReserva] = useState({
    mesaId: '',
    clienteNome: '',
    clienteTelefone: '',
    clienteEmail: '',
    dataReserva: '',
    quantidadePessoas: 4
  });

  const { user } = useContext(AuthContext);
  const apiClient = setupAPIClient();

  useEffect(() => {
    fetchMesas();
  }, []);

  const fetchMesas = async () => {
    try {
      const response = await apiClient.get('/mesas', {
        params: {
          organizationId: user?.organizationId
        },
        headers: {
          Authorization: `Bearer ${token}`
        },
      });

      console.log("mesas", response)

      setMesas(response.data);
    } catch (error) {
      console.error('Erro ao buscar mesas:', error);
      toast.error('Erro ao carregar mesas');
    } finally {
      setIsLoading(false);
    }
  };

  const criarMesa = async () => {
    try {
      const ultimoNumero =
        mesas.length > 0
          ? Math.max(...mesas.map(m => m.number))
          : 0;

      const novoNumero = ultimoNumero + 1;

      await apiClient.post(
        '/mesa',
        {
          numero: novoNumero,
          organizationId: user?.organizationId
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      toast.success(`Mesa ${novoNumero} criada com sucesso!`);
      fetchMesas();
    } catch (error) {
      console.error('Erro ao criar mesa:', error);
      toast.error('Erro ao criar mesa');
    }
  };

  const gerarQRCode = async (mesaId: string, mesaNumber: number) => {
    try {
      const qrData = {
        url: `${window.location.origin}/menu/${user?.organizationId}/${mesaNumber}`,
        mesaId,
        mesaNumber
      };
      console.log("dados de Qr", qrData)
      const response = await apiClient.post('/mesas/gerar-qrcode', qrData);

      setMesas(prev => prev.map(mesa =>
        mesa.id === mesaId ? { ...mesa, qrCodeUrl: response.data.qrCodeUrl } : mesa
      ));

      toast.success('QR Code gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast.error('Erro ao gerar QR Code');
    }
  };

  const criarReserva = async (reservaData: any) => {
    if (!reservaData.mesaId || !reservaData.clienteNome || !reservaData.dataReserva) {
      toast.warning('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await apiClient.post('/reservas', {
        ...reservaData,
        organizationId: user?.organizationId
      });

      toast.success('Reserva criada com sucesso!');
      fetchMesas();
      setNovaReserva({
        mesaId: '',
        clienteNome: '',
        clienteTelefone: '',
        clienteEmail: '',
        dataReserva: '',
        quantidadePessoas: 4
      });
      setActiveTab('ocupadas');
    } catch (error) {
      console.error('Erro ao criar reserva:', error);
      toast.error('Erro ao criar reserva');
    }
  };

  // Abre o modal de pagamento em vez de fechar directamente
  const fecharMesa = (mesaId: string) => {
    const mesa = mesas.find(m => m.id === mesaId);
    if (!mesa) {
      toast.error('Mesa não encontrada');
      return;
    }
    setModalPagamento({ open: true, mesaId, mesaNumber: mesa.number });
  };

  // Callback após pagamento confirmado com sucesso
  const handlePagamentoSucesso = (dadosFechamento: any) => {
    fetchMesas();
    // Gerar PDF do recibo já pago
    if (dadosFechamento) {
      gerarPDFReciboPago(dadosFechamento, {
        metodo: dadosFechamento.metodoPagamento,
        valorPago: dadosFechamento.valorPago,
        trocoPara: dadosFechamento.trocoPara
      });
    }
  };


  const GetFact = async (mesaId: string) => {
    try {
      const mesa = mesas.find(m => m.id === mesaId);

      if (!mesa) {
        toast.error('Mesa não encontrada');
        return;
      }

      // Apenas consultar os dados do consumo - NÃO fecha a mesa
      const response = await apiClient.get(`/fact/${mesa.number}`, {
        params: {
          organizationId: user?.organizationId
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const dadosSessao = response.data;

      toast.info('A gerar PDF do consumo...');

      // Gerar apenas o PDF de consulta - sem fechar mesa nem atualizar
      gerarPDFReciboNaoPago(dadosSessao);

    } catch (error: any) {
      console.error('Erro ao consultar consumo:', error);
      const msg = error?.response?.data?.error || 'Erro ao consultar consumo';
      toast.error(msg);
    }
  };
  const eliminarMesa = async (mesaId: string) => {
    try {
      await apiClient.delete(`/mesa/${mesaId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success('Mesa eliminada com sucesso');
      fetchMesas(); // refresh

    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Erro ao eliminar mesa';

      if (error.response?.status === 409) {
        toast.warning(message);
      } else {
        toast.error(message);
      }
    }
  };

  // Filtrar mesas
  const mesasLivres = mesas.filter(m => m.status === 'livre');
  const mesasOcupadas = mesas.filter(m => m.status === 'ocupada');
  const mesasReservadas = mesas.filter(m => m.status === 'reservada');

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando mesas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Header />

      <MesaStatusTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mesas={mesas}
        mesasLivres={mesasLivres}
        mesasOcupadas={mesasOcupadas}
        mesasReservadas={mesasReservadas}
        user={user}
        onGerarQRCode={gerarQRCode}
        onFecharMesa={fecharMesa}
        onEliminarMesa={eliminarMesa}
        onFactMesa={GetFact}
      />

      {user?.role?.toUpperCase() !== 'GARCON' && user?.role?.toUpperCase() !== 'CAIXA' && (
        <Button onClick={criarMesa} className="flex items-center gap-2 mt-2">
          <Plus className="h-4 w-4" />
          Nova Mesa
        </Button>
      )}

      {/* Modal de Pagamento — aparece ao clicar "Fechar Mesa" */}
      <ModalPagamento
        open={modalPagamento.open}
        mesaId={modalPagamento.mesaId}
        mesaNumber={modalPagamento.mesaNumber}
        organizationId={user?.organizationId ?? ''}
        onClose={() => setModalPagamento(prev => ({ ...prev, open: false }))}
        onSuccess={handlePagamentoSucesso}
      />
    </div>
  );
}

// Subcomponentes da página
const Header = () => (
  <div className="mb-8">
    <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Mesas</h1>
    <p className="text-gray-600">Gerencie mesas, reservas e QR Codes</p>
  </div>
);

