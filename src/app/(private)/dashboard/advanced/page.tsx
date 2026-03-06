'use client';

import React, { useContext, useEffect, useState } from "react";
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    PieChart,
    BrainCircuit,
    Download,
    Users,
    Package,
    History
} from "lucide-react";
import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import { AuthContext } from "@/contexts/AuthContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
import { setupAPIClient } from "@/services/api";
import dayjs from "dayjs";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TimeRangeSelector } from "@/components/dashboard/TimeRangeSelector";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TrendData {
    date: string;
    revenue: number;
    costs: number;
    purchases: number;
}

interface WaiterData {
    name: string;
    ordersCount: number;
    itemsCount: number;
}

interface CategorySales {
    category: string;
    revenue: number;
    cost: number;
    quantity: number;
    profit: number;
}

interface PurchasedProduct {
    name: string;
    quantity: number;
    totalSpent: number;
    unit: string;
}

interface AdvancedMetrics {
    totalRevenue: number;
    totalPurchaseCost: number;
    totalConsumptionCost: number;
    totalCOGS: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    aiInsights: string;
    trends: TrendData[];
    topWaiters: WaiterData[];
    salesByCategory: CategorySales[];
    topPurchasedProducts: PurchasedProduct[];
}

export default function AdvancedDashboard() {
    const { user, isAuthenticated } = useContext(AuthContext);
    const [metrics, setMetrics] = useState<AdvancedMetrics | null>(null);
    const [timeRange, setTimeRange] = useState<string>("month");
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const apiClient = setupAPIClient();

    // Funções de Exportação
    const exportFinancials = () => {
        if (!metrics) return;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Relatorio Financeiro Avancado", 14, 20);
        doc.setFontSize(11);
        doc.text(`Periodo: ${timeRange} | Gerado em: ${dayjs().format('DD/MM/YYYY HH:mm')}`, 14, 30);

        autoTable(doc, {
            startY: 40,
            head: [['Descricao', 'Valor (Kz)']],
            body: [
                ['Faturamento Bruto', (metrics.totalRevenue || 0).toLocaleString()],
                ['Novas Compras (Gastos Estoque)', (metrics.totalPurchaseCost || 0).toLocaleString()],
                ['Custo de Mercadoria Vendida (COGS)', (metrics.totalCOGS || 0).toLocaleString()],
                ['Lucro Bruto', (metrics.grossProfit || 0).toLocaleString()],
                ['Consumo Interno/Perdas', (metrics.totalConsumptionCost || 0).toLocaleString()],
                ['Lucro Liquido Final', (metrics.netProfit || 0).toLocaleString()],
                ['Margem de Lucro', `${metrics.profitMargin}%`],
            ],
        });
        doc.save(`financeiro_${timeRange}_${dayjs().format('YYYYMMDD')}.pdf`);
    };

    const exportWaiters = () => {
        if (!metrics?.topWaiters) return;
        const doc = new jsPDF();
        doc.text("Desempenho de Garcons", 14, 20);
        autoTable(doc, {
            startY: 30,
            head: [['Garcom', 'Pedidos', 'Itens Vendidos']],
            body: metrics.topWaiters.map(w => [w.name, w.ordersCount, w.itemsCount]),
        });
        doc.save(`garcons_${timeRange}.pdf`);
    };

    const exportCategories = () => {
        if (!metrics?.salesByCategory) return;
        const doc = new jsPDF();
        doc.text("Vendas por Categoria", 14, 20);
        autoTable(doc, {
            startY: 30,
            head: [['Categoria', 'Qtd', 'Receita', 'Custo', 'Lucro']],
            body: metrics.salesByCategory.map(c => [
                c.category,
                c.quantity,
                c.revenue.toLocaleString(),
                c.cost.toLocaleString(),
                c.profit.toLocaleString()
            ]),
        });
        doc.save(`categorias_${timeRange}.pdf`);
    };

    const exportPurchases = () => {
        if (!metrics?.topPurchasedProducts) return;
        const doc = new jsPDF();
        doc.text("Analise de Compras e Fornecedores", 14, 20);
        autoTable(doc, {
            startY: 30,
            head: [['Produto', 'Quantidade', 'Total Gasto (Kz)']],
            body: metrics.topPurchasedProducts.map(p => [
                p.name,
                `${p.quantity} ${p.unit}`,
                p.totalSpent.toLocaleString()
            ]),
        });
        doc.save(`compras_${timeRange}.pdf`);
    };

    // Função para calcular o range de datas
    const getDateRange = (range: string) => {
        const today = dayjs();
        switch (range) {
            case "today":
                return {
                    startDate: today.format("YYYY-MM-DD"),
                    endDate: today.format("YYYY-MM-DD")
                };
            case "week":
                return {
                    startDate: today.startOf('week').format("YYYY-MM-DD"),
                    endDate: today.endOf('week').format("YYYY-MM-DD")
                };
            case "month":
                return {
                    startDate: today.startOf('month').format("YYYY-MM-DD"),
                    endDate: today.endOf('month').format("YYYY-MM-DD")
                };
            default:
                return {
                    startDate: today.format("YYYY-MM-DD"),
                    endDate: today.format("YYYY-MM-DD")
                };
        }
    };

    const fetchAdvancedData = async () => {
        if (!user?.organizationId) return;

        setIsLoading(true);
        setHasError(false);

        const { startDate, endDate } = getDateRange(timeRange);

        try {
            const response = await apiClient.get(`/dash/advanced/${user.organizationId}`, {
                params: {
                    timeRange,
                    startDate,
                    endDate
                }
            });
            setMetrics(response.data);
        } catch (error) {
            console.error("Erro ao buscar dados avançados:", error);
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated && user) {
            fetchAdvancedData();
        }
    }, [isAuthenticated, user, timeRange]);

    if (isLoading) return <LoadingState />;
    if (hasError) return <ErrorState onRetry={fetchAdvancedData} />;

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard Avançado</h1>
                    <p className="text-muted-foreground text-lg">
                        Análise de ROI, desempenho de equipa e categorias.
                    </p>
                </div>
                <div className="flex gap-2">
                    <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
                </div>
            </div>

            {/* Métricas Financeiras Core */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Receita de Vendas"
                    value={`${(metrics?.totalRevenue || 0).toLocaleString('pt-AO')} kz`}
                    icon={<DollarSign className="text-blue-500" size={24} />}
                    description="Total faturado"
                />
                <MetricCard
                    title="Gastos em Compras"
                    value={`${(metrics?.totalPurchaseCost || 0).toLocaleString('pt-AO')} kz`}
                    icon={<TrendingDown className="text-red-500" size={24} />}
                    description="Total investido em estoque"
                />
                <MetricCard
                    title="Custo (COGS)"
                    value={`${(metrics?.totalCOGS || 0).toLocaleString('pt-AO')} kz`}
                    icon={<Package className="text-orange-500" size={24} />}
                    description="Custo real do que foi vendido"
                />
                <MetricCard
                    title="Lucro Líquido"
                    value={`${(metrics?.netProfit || 0).toLocaleString('pt-AO')} kz`}
                    className={(metrics?.netProfit || 0) >= 0
                        ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                        : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"}
                    icon={<TrendingUp className={(metrics?.netProfit || 0) >= 0 ? "text-green-600" : "text-red-600"} size={24} />}
                    description="Receita - COGS - Consumo"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Card de IA */}
                <Card className="lg:col-span-2 border-2 border-primary/20 bg-gradient-to-br from-white to-primary/5 dark:from-gray-900 dark:to-primary/10">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary rounded-xl">
                                <BrainCircuit className="text-white" size={32} />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">Insights do Assistente IA</CardTitle>
                                <CardDescription>Decisões baseadas em tendências e histórico operacional</CardDescription>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => {
                            if (!metrics) return;
                            const doc = new jsPDF();
                            doc.text("IA Insights", 14, 20);
                            doc.setFontSize(10);
                            doc.text(metrics.aiInsights || "", 14, 30, { maxWidth: 180 });
                            doc.save("ai_insights.pdf");
                        }}>
                            <Download size={20} className="text-muted-foreground" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="prose dark:prose-invert max-w-none">
                            {metrics?.aiInsights ? (
                                <p className="text-lg font-medium leading-relaxed italic text-primary/80">"{metrics.aiInsights}"</p>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 opacity-50">
                                    <BrainCircuit size={48} className="mb-4 animate-pulse" />
                                    <p>Aguardando análise da IA para o período selecionado...</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Análise de Margem */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Eficiência</CardTitle>
                        <Button variant="ghost" size="icon" onClick={exportFinancials}>
                            <Download size={20} className="text-muted-foreground" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center pt-6">
                        <div className="relative w-40 h-40 flex items-center justify-center rounded-full border-8 border-primary/10">
                            <div className="text-4xl font-bold">{metrics?.profitMargin || 0}%</div>
                            <PieChart className="absolute inset-0 w-full h-full opacity-5 p-4" />
                        </div>
                        <div className="mt-8 w-full space-y-4">
                            <div className="flex justify-between text-sm font-medium">
                                <span>Margem de Lucro</span>
                                <span className={metrics?.profitMargin && metrics.profitMargin > 30 ? "text-green-600" : "text-amber-600"}>
                                    {metrics?.profitMargin || 0}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(metrics?.profitMargin || 0, 100)}%` }}></div>
                            </div>
                            <p className="text-xs text-muted-foreground text-center italic">
                                Meta recomendada para restauração: 25% - 40%
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Garçons */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="text-primary" size={20} />
                            <CardTitle>Top Garçons</CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" onClick={exportWaiters}>
                            <Download size={18} />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {metrics?.topWaiters && metrics.topWaiters.length > 0 ? (
                                metrics.topWaiters.map((waiter, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                                {i + 1}
                                            </div>
                                            <span className="font-semibold text-sm">{waiter.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold">{waiter.itemsCount} itens</div>
                                            <div className="text-xs text-muted-foreground">{waiter.ordersCount} pedidos</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center py-10 text-muted-foreground">Sem dados de atendimento.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Compras */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package className="text-primary" size={20} />
                            <CardTitle>Top Compras</CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" onClick={exportPurchases}>
                            <Download size={18} />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {metrics?.topPurchasedProducts && metrics.topPurchasedProducts.length > 0 ? (
                                metrics.topPurchasedProducts.map((product, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600">
                                                {i + 1}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm">{product.name}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase">{product.quantity} {product.unit}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-black text-orange-600">{product.totalSpent.toLocaleString()} Kz</div>
                                            <div className="text-[9px] text-muted-foreground uppercase">Investido</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center py-10 text-muted-foreground">Sem dados de compras.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Gráfico de Histórico */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <History className="text-primary" size={20} />
                            <CardTitle>Fluxo de Caixa</CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => {
                            if (!metrics) return;
                            const doc = new jsPDF();
                            doc.text("Tendencias Diarias", 14, 20);
                            autoTable(doc, {
                                startY: 30,
                                head: [['Data', 'Receita', 'Custos (COGS)', 'Compras Est']],
                                body: metrics.trends.map(t => [t.date, t.revenue, t.costs, t.purchases])
                            });
                            doc.save("tendencias.pdf");
                        }}>
                            <Download size={18} />
                        </Button>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {metrics?.trends && metrics.trends.length > 0 ? (
                            <Bar
                                data={{
                                    labels: metrics.trends.map((t: TrendData) => dayjs(t.date).format('DD/MM')),
                                    datasets: [
                                        {
                                            label: 'Receita',
                                            data: metrics.trends.map((t: TrendData) => t.revenue),
                                            backgroundColor: 'rgba(59, 130, 246, 0.8)',
                                            borderRadius: 4,
                                        },
                                        {
                                            label: 'Custos Ops',
                                            data: metrics.trends.map((t: TrendData) => t.costs),
                                            backgroundColor: 'rgba(239, 68, 68, 0.8)',
                                            borderRadius: 4,
                                        },
                                        {
                                            label: 'Compras Estoque',
                                            data: metrics.trends.map((t: TrendData) => t.purchases),
                                            backgroundColor: 'rgba(16, 185, 129, 0.8)',
                                            borderRadius: 4,
                                        }
                                    ]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: true, position: 'bottom' } },
                                    scales: { y: { beginAtZero: true, grid: { display: false } } }
                                }}
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center opacity-30 italic">Sem tendências...</div>
                        )}
                    </CardContent>
                </Card>

                {/* Vendas por Categoria */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Desempenho por Categoria</CardTitle>
                            <CardDescription>Analise ROI por categoria</CardDescription>
                        </div>
                        <Button variant="secondary" size="sm" onClick={exportCategories} className="gap-2">
                            <Download size={16} />
                            PDF
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="pb-3 font-medium">Categoria</th>
                                        <th className="pb-3 font-medium text-right">Qtd</th>
                                        <th className="pb-3 font-medium text-right">Lucro</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {metrics?.salesByCategory && metrics.salesByCategory.length > 0 ? (
                                        metrics.salesByCategory.map((cat, i) => (
                                            <tr key={i} className="hover:bg-muted/50 transition-colors text-[12px]">
                                                <td className="py-2 font-semibold">{cat.category}</td>
                                                <td className="py-2 text-right">{cat.quantity}</td>
                                                <td className="py-2 text-right font-bold text-green-600">{cat.profit.toLocaleString()} kz</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={3} className="py-10 text-center text-muted-foreground">Sem dados.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
