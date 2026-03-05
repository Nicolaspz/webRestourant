'use client';

import React, { useContext, useEffect, useState } from "react";
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    PieChart,
    BarChart,
    BrainCircuit,
    FileText,
    AlertCircle
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
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TimeRangeSelector } from "@/components/dashboard/TimeRangeSelector";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TrendData {
    date: string;
    revenue: number;
    costs: number;
}

interface AdvancedMetrics {
    totalRevenue: number;
    totalPurchaseCost: number;
    totalConsumptionCost: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    aiInsights: string;
    trends: TrendData[];
}

export default function AdvancedDashboard() {
    const { user, isAuthenticated } = useContext(AuthContext);
    const [metrics, setMetrics] = useState<AdvancedMetrics | null>(null);
    const [timeRange, setTimeRange] = useState<string>("month");
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const apiClient = setupAPIClient();

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
                },
                headers: { Authorization: `Bearer ${user.token}` }
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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard Avançado</h1>
                    <p className="text-muted-foreground text-lg">
                        Análise detalhada de lucros, custos e decisões auxiliadas por IA.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="flex gap-2">
                        <FileText size={18} />
                        Exportar Relatório Detalhado
                    </Button>
                    <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
                </div>
            </div>

            {/* Métricas Financeiras Core */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Faturamento Bruto"
                    value={`${(metrics?.totalRevenue || 0).toLocaleString('pt-AO')} kz`}
                    icon={<DollarSign className="text-blue-500" size={24} />}
                />
                <MetricCard
                    title="Custos de Compras"
                    value={`${(metrics?.totalPurchaseCost || 0).toLocaleString('pt-AO')} kz`}
                    icon={<ShoppingCart className="text-red-500" size={24} />}
                />
                <MetricCard
                    title="Custo de Consumo Interno"
                    value={`${(metrics?.totalConsumptionCost || 0).toLocaleString('pt-AO')} kz`}
                    icon={<AlertCircle className="text-orange-500" size={24} />}
                />
                <MetricCard
                    title="Lucro Líquido"
                    value={`${(metrics?.netProfit || 0).toLocaleString('pt-AO')} kz`}
                    className={(metrics?.netProfit || 0) >= 0
                        ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                        : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"}
                    icon={<TrendingUp className={(metrics?.netProfit || 0) >= 0 ? "text-green-600" : "text-red-600"} size={24} />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Card de IA */}
                <Card className="lg:col-span-2 border-2 border-primary/20 bg-gradient-to-br from-white to-primary/5 dark:from-gray-900 dark:to-primary/10">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-3 bg-primary rounded-xl">
                            <BrainCircuit className="text-white" size={32} />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">Insights do Assistente IA</CardTitle>
                            <CardDescription>Decisões baseadas em tendências e histórico operacional</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="prose dark:prose-invert max-w-none">
                            {metrics?.aiInsights ? (
                                <p className="text-lg leading-relaxed">{metrics.aiInsights}</p>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 opacity-50">
                                    <BrainCircuit size={48} className="mb-4 animate-pulse" />
                                    <p>Aguardando análise da IA para o período selecionado...</p>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-4">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Sugestão: Ajuste de Preço</Badge>
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Alerta: Desperdício Alto</Badge>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Oportunidade: Item em Alta</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Análise de Margem */}
                <Card>
                    <CardHeader>
                        <CardTitle>Margem de Lucro</CardTitle>
                        <CardDescription>Eficiência operacional por período</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center pt-6">
                        <div className="relative w-48 h-48 flex items-center justify-center">
                            <div className="text-4xl font-bold">{metrics?.profitMargin || 0}%</div>
                            {/* Aqui entraria um gauge chart */}
                            <PieChart className="absolute inset-0 w-full h-full opacity-10" />
                        </div>
                        <div className="mt-8 w-full space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Meta do Mês</span>
                                <span>{metrics?.profitMargin || 0}/45%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${metrics?.profitMargin || 0}%` }}></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Gráficos de Tendência */}
            <Card>
                <CardHeader>
                    <CardTitle>Comparativo: Receita vs Custos</CardTitle>
                    <CardDescription>Acompanhamento diário da saúde financeira</CardDescription>
                </CardHeader>
                <CardContent className="min-h-[400px]">
                    {metrics?.trends && metrics.trends.length > 0 ? (
                        <Bar
                            data={{
                                labels: metrics.trends.map((t: TrendData) => dayjs(t.date).format('DD/MM')),
                                datasets: [
                                    {
                                        label: 'Receita (AKZ)',
                                        data: metrics.trends.map((t: TrendData) => t.revenue),
                                        backgroundColor: 'rgba(59, 130, 246, 0.6)', // Blue
                                        borderColor: 'rgb(59, 130, 246)',
                                        borderWidth: 1
                                    },
                                    {
                                        label: 'Custos (AKZ)',
                                        data: metrics.trends.map((t: TrendData) => t.costs),
                                        backgroundColor: 'rgba(239, 68, 68, 0.6)', // Red
                                        borderColor: 'rgb(239, 68, 68)',
                                        borderWidth: 1
                                    }
                                ]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'top' as const,
                                    },
                                    tooltip: {
                                        mode: 'index' as const,
                                        intersect: false,
                                    },
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: {
                                            callback: (value: any) => `${Number(value).toLocaleString()} kz`
                                        }
                                    }
                                }
                            }}
                            height={400}
                        />
                    ) : (
                        <div className="h-[400px] flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="text-center text-muted-foreground">
                                <BarChart size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Nenhuma tendência disponível para o período selecionado.</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Subcomponente de Badge (caso não esteja disponível globalmente)
function Badge({ children, variant = "default", className = "" }: { children: React.ReactNode, variant?: string, className?: string }) {
    const variants: Record<string, string> = {
        default: "bg-primary text-primary-foreground",
        outline: "border border-input bg-background",
        secondary: "bg-secondary text-secondary-foreground"
    };
    return (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variants[variant], className)}>
            {children}
        </span>
    );
}

function ShoppingCart(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
    )
}
