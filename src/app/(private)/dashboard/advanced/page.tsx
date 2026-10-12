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
    netRevenue: number;
    totalTaxAmount: number;
    totalPurchaseCost: number;
    totalConsumptionCost: number;
    totalCOGS: number;
    grossProfit: number;
    netProfit: number;
    totalPaidInvoices?: number;
    averageTicket?: number;
    totalDiscounts?: number;
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
        doc.text("Relatorio Financeiro", 14, 20);
        doc.setFontSize(11);
        doc.text(`Periodo: ${timeRange} | Gerado em: ${dayjs().format('DD/MM/YYYY HH:mm')}`, 14, 30);

        autoTable(doc, {
            startY: 40,
            head: [['Descricao', 'Valor (Kz)']],
            body: [
                ['Total recebido com IVA', (metrics.totalRevenue || 0).toLocaleString()],
                ['Receita sem IVA', (metrics.netRevenue || 0).toLocaleString()],
                ['IVA incluído', (metrics.totalTaxAmount || 0).toLocaleString()],
                ['Compras registadas (quantidade × preço unitário)', (metrics.totalPurchaseCost || 0).toLocaleString()],
                ['Custo estimado das vendas (COGS)', (metrics.totalCOGS || 0).toLocaleString()],
                ['Resultado bruto estimado', (metrics.grossProfit || 0).toLocaleString()],
                ['Consumo interno', (metrics.totalConsumptionCost || 0).toLocaleString()],
                ['Resultado após consumo interno (antes de despesas gerais e impostos)', (metrics.netProfit || 0).toLocaleString()],
                ['Margem após consumo interno', `${metrics.profitMargin}%`],
                ['Faturas pagas', String(metrics.totalPaidInvoices ?? '—')],
                ['Ticket médio', (metrics.averageTicket || 0).toLocaleString()],
                ['Descontos concedidos', (metrics.totalDiscounts || 0).toLocaleString()],
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
            head: [['Categoria', 'Qtd', 'Receita', 'Custo estimado', 'Resultado estimado', 'Margem estimada']],
            body: metrics.salesByCategory.map(c => [
                c.category,
                c.quantity,
                c.revenue.toLocaleString(),
                c.cost.toLocaleString(),
                c.profit.toLocaleString(),
                c.revenue > 0 ? `${((c.profit / c.revenue) * 100).toFixed(1)}%` : '—'
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
            case "week": {
                const monday = today.subtract((today.day() + 6) % 7, 'day');
                return {
                    startDate: monday.format("YYYY-MM-DD"),
                    endDate: monday.add(6, 'day').format("YYYY-MM-DD")
                };
            }
            case "month":
                return {
                    startDate: today.startOf('month').format("YYYY-MM-DD"),
                    endDate: today.endOf('month').format("YYYY-MM-DD")
                };
            case "last30":
                return {
                    startDate: today.subtract(29, 'day').format("YYYY-MM-DD"),
                    endDate: today.format("YYYY-MM-DD")
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
                        <h1 className="text-3xl font-bold tracking-tight">Análise financeira</h1>
                    <p className="text-muted-foreground text-lg">
                        Valores de vendas pagas no período. Custos de receita são estimativas baseadas nos movimentos de stock e lotes registados.
                    </p>
                </div>
                <div className="flex gap-2">
                    <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
                </div>
            </div>

            {/* Métricas Financeiras Core */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <MetricCard
                    title="Receita sem IVA"
                    value={`${(metrics?.netRevenue || 0).toLocaleString('pt-AO')} kz`}
                    icon={<DollarSign className="text-blue-500" size={24} />}
                    description={`Recebido com IVA: ${(metrics?.totalRevenue || 0).toLocaleString('pt-AO')} Kz · IVA: ${(metrics?.totalTaxAmount || 0).toLocaleString('pt-AO')} Kz · ${metrics?.totalPaidInvoices ?? 0} faturas · ticket médio ${(metrics?.averageTicket || 0).toLocaleString('pt-AO')} Kz`}
                />
                <MetricCard
                    title="Compras registadas"
                    value={`${(metrics?.totalPurchaseCost || 0).toLocaleString('pt-AO')} kz`}
                    icon={<TrendingDown className="text-red-500" size={24} />}
                    description="Quantidade × preço unitário; representa entradas de stock, não custo das vendas."
                />
                <MetricCard
                    title="Custo estimado das vendas"
                    value={`${(metrics?.totalCOGS || 0).toLocaleString('pt-AO')} kz`}
                    icon={<Package className="text-orange-500" size={24} />}
                    description="COGS estimado a partir dos movimentos e lotes disponíveis."
                />
                <MetricCard
                    title="Resultado bruto estimado"
                    value={`${(metrics?.grossProfit || 0).toLocaleString('pt-AO')} kz`}
                    icon={<TrendingUp className="text-blue-500" size={24} />}
                    description="Vendas pagas − custo estimado das vendas."
                />
                <MetricCard
                    title="Consumo interno"
                    value={`${(metrics?.totalConsumptionCost || 0).toLocaleString('pt-AO')} kz`}
                    icon={<Package className="text-amber-600" size={24} />}
                    description="Valor estimado pelos lotes associados ao consumo."
                />
                <MetricCard
                    title="Descontos concedidos"
                    value={`${(metrics?.totalDiscounts || 0).toLocaleString('pt-AO')} kz`}
                    icon={<TrendingDown className="text-amber-600" size={24} />}
                    description="Descontos em itens não cancelados de faturas pagas."
                />
                <MetricCard
                    title="Resultado após consumo"
                    value={`${(metrics?.netProfit || 0).toLocaleString('pt-AO')} kz`}
                    className={(metrics?.netProfit || 0) >= 0
                        ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                        : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"}
                    icon={<TrendingUp className={(metrics?.netProfit || 0) >= 0 ? "text-green-600" : "text-red-600"} size={24} />}
                    description="Antes de despesas gerais, salários e impostos. Não representa lucro líquido contabilístico."
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
                        <CardTitle className="text-2xl">Leitura do período</CardTitle>
                        <CardDescription>Resumo automático baseado nas vendas e custos registados</CardDescription>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => {
                            if (!metrics) return;
                            const doc = new jsPDF();
                            doc.text("Resumo do período", 14, 20);
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
                                    <p>Sem vendas ou custos suficientes para gerar um resumo neste período.</p>
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
                                <span>Margem após consumo interno</span>
                                <span className={metrics?.profitMargin && metrics.profitMargin > 30 ? "text-green-600" : "text-amber-600"}>
                                    {metrics?.profitMargin || 0}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(metrics?.profitMargin || 0, 100)}%` }}></div>
                            </div>
                            <p className="text-xs text-muted-foreground text-center italic">
                                Resultado estimado sobre a receita paga. Despesas gerais e impostos não estão incluídos.
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
                                <CardTitle>Vendas, custos e compras registadas</CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => {
                            if (!metrics) return;
                            const doc = new jsPDF();
                            doc.text("Tendencias Diarias", 14, 20);
                            autoTable(doc, {
                                startY: 30,
                                head: [['Data', 'Vendas pagas', 'Custos estimados', 'Compras registadas']],
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
                                            label: 'Vendas pagas',
                                            data: metrics.trends.map((t: TrendData) => t.revenue),
                                            backgroundColor: 'rgba(59, 130, 246, 0.8)',
                                            borderRadius: 4,
                                        },
                                        {
                                            label: 'Custos estimados (COGS + consumo)',
                                            data: metrics.trends.map((t: TrendData) => t.costs),
                                            backgroundColor: 'rgba(239, 68, 68, 0.8)',
                                            borderRadius: 4,
                                        },
                                        {
                                            label: 'Compras registadas (stock)',
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
                            <CardDescription>Receita sem IVA; custo calculado pelo último lote disponível no período.</CardDescription>
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
                                        <th className="pb-3 font-medium text-right">Receita</th>
                                        <th className="pb-3 font-medium text-right">Custo est.</th>
                                        <th className="pb-3 font-medium text-right">Resultado</th>
                                        <th className="pb-3 font-medium text-right">Margem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {metrics?.salesByCategory && metrics.salesByCategory.length > 0 ? (
                                        metrics.salesByCategory.map((cat, i) => (
                                            <tr key={i} className="hover:bg-muted/50 transition-colors text-[12px]">
                                                <td className="py-2 font-semibold">{cat.category}</td>
                                                <td className="py-2 text-right">{cat.quantity}</td>
                                                <td className="py-2 text-right">{cat.revenue.toLocaleString()} kz</td>
                                                <td className="py-2 text-right">{cat.cost.toLocaleString()} kz</td>
                                                <td className={`py-2 text-right font-bold ${cat.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{cat.profit.toLocaleString()} kz</td>
                                                <td className="py-2 text-right">{cat.revenue > 0 ? `${((cat.profit / cat.revenue) * 100).toFixed(1)}%` : '—'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Sem dados.</td></tr>
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
