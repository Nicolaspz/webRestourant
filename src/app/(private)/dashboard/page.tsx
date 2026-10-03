'use client';

import React, { useContext, useEffect, useState } from "react";
import dynamic from 'next/dynamic';
import { 
  DollarSign, 
  Coffee, 
  Users, 
  Clock,
  TrendingDown
} from "lucide-react";
import { AuthContext } from "@/contexts/AuthContext";
import { setupAPIClient } from "@/services/api";
import dayjs from "dayjs";

// Componentes reutilizáveis
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DateRangeFilter, dateRangePreset } from "@/components/DateRangeFilter";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { RecentOrdersTable } from "@/components/dashboard/RecentOrdersTable";
import { PopularItems } from "@/components/dashboard/PopularItems";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ChartsSection = dynamic(
  () => import('@/components/dashboard/ChartsSection').then(module => module.ChartsSection),
  { ssr: false, loading: () => <div className="grid gap-6 lg:grid-cols-2"><div className="h-80 animate-pulse rounded-xl bg-muted" /><div className="h-80 animate-pulse rounded-xl bg-muted" /></div> },
);

interface DashboardData {
  metrics: {
    totalRevenue: number;
    revenueChange: number;
    totalOrders: number;
    ordersChange: number;
    averageTicket: number;
    averageTicketChange: number;
    pendingOrders: number;
    occupiedTables: number;
    totalTables: number;
  };
  charts: {
    hourlySales: {
      labels: string[];
      data: number[];
    };
    paymentMethods: {
      labels: string[];
      data: number[];
    };
  };
  popularItems: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  recentOrders: Array<{
    id: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  criticalStock: Array<{
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
  }>;
}

// Dados padrão quando não há dados da API
const defaultDashboardData: DashboardData = {
  metrics: {
    totalRevenue: 0,
    revenueChange: 0,
    totalOrders: 0,
    ordersChange: 0,
    averageTicket: 0,
    averageTicketChange: 0,
    pendingOrders: 0,
    occupiedTables: 0,
    totalTables: 0
  },
  charts: {
    hourlySales: {
      labels: [],
      data: []
    },
    paymentMethods: {
      labels: [],
      data: []
    }
  },
  popularItems: [],
  recentOrders: [],
  criticalStock: []
};

export default function Dashboard() {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const apiClient = setupAPIClient();
  

  

  const [dateRange, setDateRange] = useState(() => dateRangePreset('today'));

  const fetchDashboard = async () => {
    if (!user?.organizationId || !user?.token) {

      setIsLoading(false);
      // Se não tem usuário, usa dados padrão
      setDashboardData(defaultDashboardData);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    
    try {
      const response = await apiClient.get(
        `/dash/${user.organizationId}`,
        {
          params: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      // Se a resposta vier vazia ou com estrutura incompleta, usa dados padrão
      const data = response.data || defaultDashboardData;
      setDashboardData({
        ...defaultDashboardData,
        ...data,
        metrics: {
          ...defaultDashboardData.metrics,
          ...data.metrics
        },
        charts: {
          ...defaultDashboardData.charts,
          ...data.charts
        }
      });
    } catch (error) {
      console.error("Erro ao buscar dashboard:", error);
      //console.log('URL que estás a usar:', API_BASE_URL);
      //console.log('URL completa da imagem:', `${API_BASE_URL}/files/33585bc0744bceb27b914d1c2ec8cceb-pudim.webp`);
      setHasError(true);
      // Em caso de erro, usa dados padrão
      setDashboardData(defaultDashboardData);
    } finally {
      setIsLoading(false);
    }
  };

  // Monitora mudanças na autenticação e no dateRange
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'CAIXA') {
        setDashboardData(defaultDashboardData);
        setIsLoading(false);
        return;
      }
      fetchDashboard();
    } else {
      // Se não está autenticado, usa dados padrão
      setDashboardData(defaultDashboardData);
      setIsLoading(false);
    }
  }, [isAuthenticated, user, dateRange]);

  // Usar dados reais ou padrão
  const displayData = dashboardData || defaultDashboardData;

  // Se não estiver autenticado, mostra loading
  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user?.role === 'CAIXA') {
    return <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold">Área do caixa</h1>
      <p className="mt-2 text-muted-foreground">Abra o caixa para começar a atender. O estado das mesas e as ações de abertura e fecho estão na área do caixa.</p>
      <a href="/dashboard/caixa" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 font-medium text-primary-foreground">Ir para o caixa</a>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header com seletor de tempo */}
      <DashboardPageHeader
        title="Resumo do negócio"
        description={`Vendas de ${dayjs(dateRange.startDate).format('DD/MM/YYYY')} a ${dayjs(dateRange.endDate).format('DD/MM/YYYY')}`}
        actions={<DateRangeFilter value={dateRange} onChange={setDateRange} disabled={isLoading} />}
      />

      {/* Conteúdo principal */}
      {isLoading ? (
        <LoadingState />
      ) : hasError ? (
        <ErrorState onRetry={fetchDashboard} />
      ) : (
        <div className="space-y-6">
          {/* Métricas principais - SEMPRE MOSTRA OS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Faturação total"
              value={`${(displayData.metrics.totalRevenue || 0).toLocaleString('pt-AO', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })} kz`}
              change={displayData.metrics.revenueChange || 0}
              icon={<DollarSign className="text-muted-foreground" size={20} />}
            />
            <MetricCard
              title="Total de Pedidos"
              value={(displayData.metrics.totalOrders || 0).toLocaleString()}
              change={displayData.metrics.ordersChange || 0}
              icon={<Coffee className="text-muted-foreground" size={20} />}
            />
            <MetricCard
              title="Consumo médio"
              value={`${(displayData.metrics.averageTicket || 0).toLocaleString('pt-AO', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })} kz`}
              change={displayData.metrics.averageTicketChange || 0}
              icon={<Users className="text-muted-foreground" size={20} />}
            />
            <MetricCard
              title="Pedidos Pendentes"
              value={(displayData.metrics.pendingOrders || 0).toString()}
              icon={<Clock className="text-muted-foreground" size={20} />}
            />
          </div>

          {/* Gráficos - SEMPRE MOSTRA */}
          <ChartsSection 
            hourlySales={displayData.charts.hourlySales} 
            paymentMethods={displayData.charts.paymentMethods} 
          />

          {/* Tabelas e itens populares - SEMPRE MOSTRA (mesmo vazios) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PopularItems items={displayData.popularItems || []} />
            <div className="lg:col-span-2">
              <RecentOrdersTable orders={displayData.recentOrders || []} />
            </div>
          </div>

          {/* Stock a repor - SÓ MOSTRA SE HOUVER ITENS */}
          
{displayData.criticalStock && displayData.criticalStock.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="text-red-600">Stock a repor</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayData.criticalStock.map((item, index) => (
          <div 
            key={item.id || `critical-stock-${index}`} 
            className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50"
          >
            <div>
              <p className="font-medium text-red-800">{item.name}</p>
              <p className="text-sm text-red-600">
                Disponível: {item.currentStock} / Mínimo: {item.minStock}
              </p>
            </div>
            <TrendingDown className="text-red-600" size={20} />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}
        </div>
      )}
    </div>
  );
}
