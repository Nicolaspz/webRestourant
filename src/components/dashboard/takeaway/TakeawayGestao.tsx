'use client';
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { setupAPIClient } from '@/services/api';
import { useSocket } from '@/contexts/SocketContext';
import {
    CheckCircle, XCircle, Clock, Package,
    ChevronDown, ChevronUp, Phone, User, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import TakeawayPaymentModal from './TakeawayPaymentModal';

interface TakeawayItem {
    id: string;
    amount: number;
    Product: {
        id: string;
        name: string;
        banner?: string;
        PrecoVenda: { preco_venda: number }[];
    };
}

interface TakeawayPedido {
    id: string;
    name: string;
    customerPhone?: string;
    takeawayStatus: 'pendente' | 'aprovado' | 'rejeitado';
    created_at: string;
    items: TakeawayItem[];
    takeawayCliente?: { name?: string; phone: string };
    User?: { name: string };
}

function PedidoCard({
    pedido,
    onAprovar,
    onRejeitar,
    isProcessing
}: {
    pedido: TakeawayPedido;
    onAprovar?: (id: string) => void;
    onRejeitar?: (id: string) => void;
    isProcessing: boolean;
}) {
    const [expanded, setExpanded] = useState(false);

    const total = pedido.items.reduce((acc, item) => {
        return acc + (item.Product.PrecoVenda[0]?.preco_venda || 0) * item.amount;
    }, 0);

    const statusConfig = {
        pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
        aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle },
        rejeitado: { label: 'Rejeitado', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
    };

    const cfg = statusConfig[pedido.takeawayStatus];
    const StatusIcon = cfg.icon;

    return (
        <Card className="overflow-hidden border hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {cfg.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {new Date(pedido.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        <h3 className="font-bold text-base">{pedido.name || 'Pedido Takeaway'}</h3>

                        <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                            {pedido.customerPhone && (
                                <span className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5" /> {pedido.customerPhone}
                                </span>
                            )}
                            {pedido.User && (
                                <span className="flex items-center gap-1">
                                    <User className="w-3.5 h-3.5" /> Por: {pedido.User.name}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-primary">
                            {total.toLocaleString('pt-AO')} Kz
                        </p>
                        <p className="text-xs text-muted-foreground">{pedido.items.length} artigo(s)</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 pt-2 space-y-3">
                {/* Itens */}
                <div>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {expanded ? 'Ocultar itens' : 'Ver itens'}
                    </button>

                    {expanded && (
                        <div className="mt-2 space-y-1.5 bg-muted/40 rounded-lg p-3">
                            {pedido.items.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span>{item.amount}× {item.Product.name}</span>
                                    <span className="font-medium">
                                        {((item.Product.PrecoVenda[0]?.preco_venda || 0) * item.amount).toLocaleString('pt-AO')} Kz
                                    </span>
                                </div>
                            ))}
                            <div className="border-t pt-1 mt-1 flex justify-between font-bold text-sm">
                                <span>Total</span>
                                <span>{total.toLocaleString('pt-AO')} Kz</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Acções (apenas para pendentes) */}
                {pedido.takeawayStatus === 'pendente' && onAprovar && onRejeitar && (
                    <div className="flex gap-2 pt-1">
                        <Button
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => onAprovar(pedido.id)}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Aprovar
                        </Button>
                        <Button
                            className="flex-1 gap-1.5"
                            variant="destructive"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => onRejeitar(pedido.id)}
                        >
                            <XCircle className="w-4 h-4" />
                            Rejeitar
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function TakeawayGestao({ organizationId }: { organizationId: string }) {
    const [pedidos, setPedidos] = useState<TakeawayPedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [selectedPedido, setSelectedPedido] = useState<TakeawayPedido | null>(null);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const { socket } = useSocket();

    const apiClient = setupAPIClient();

    const fetchPedidos = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/takeaway/pedidos', {
                params: { organizationId }
            });
            setPedidos(res.data || []);
        } catch (err) {
            console.error('Erro ao carregar pedidos takeaway:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (organizationId) fetchPedidos();
    }, [organizationId]);

    // Socket refresh
    useEffect(() => {
        if (socket && organizationId) {
            const handler = (data: any) => {
                if (data.organizationId === organizationId) {
                    fetchPedidos();
                }
            };
            socket.on('orders_refresh', handler);
            return () => { socket.off('orders_refresh', handler); };
        }
    }, [socket, organizationId]);

    const handleAprovar = (orderId: string) => {
        const pedido = pedidos.find(p => p.id === orderId);
        if (pedido) {
            setSelectedPedido(pedido);
            setIsPaymentOpen(true);
        }
    };

    const handleRejeitar = async (orderId: string) => {
        setProcessing(orderId);
        try {
            await apiClient.put(`/takeaway/pedidos/${orderId}/rejeitar`, { organizationId });
            toast.success('Pedido rejeitado.');
            fetchPedidos();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao rejeitar pedido');
        } finally {
            setProcessing(null);
        }
    };

    const pendentes = pedidos.filter(p => p.takeawayStatus === 'pendente');
    const aprovados = pedidos.filter(p => p.takeawayStatus === 'aprovado');
    const rejeitados = pedidos.filter(p => p.takeawayStatus === 'rejeitado');

    const EmptyState = ({ label }: { label: string }) => (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="w-12 h-12 mb-3 opacity-20" />
            <p>{label}</p>
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            <div className="mb-4">
                <h2 className="text-xl font-bold">Gestão de Pedidos Takeaway</h2>
                <p className="text-sm text-muted-foreground">Aprove ou rejeite os pedidos recebidos. O stock só é descontado após aprovação.</p>
            </div>

            <Tabs defaultValue="pendentes" className="flex-1 flex flex-col">
                <TabsList className="mb-4 w-full justify-start h-auto gap-1 bg-transparent p-0 border-b">
                    <TabsTrigger value="pendentes" className="relative data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2">
                        Pendentes
                        {pendentes.length > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-amber-500 text-white rounded-full">
                                {pendentes.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="aprovados" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2">
                        Aprovados
                        {aprovados.length > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">({aprovados.length})</span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="rejeitados" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2">
                        Rejeitados
                        {rejeitados.length > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">({rejeitados.length})</span>
                        )}
                    </TabsTrigger>
                </TabsList>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        <TabsContent value="pendentes" className="flex-1 overflow-auto">
                            {pendentes.length === 0 ? (
                                <EmptyState label="Sem pedidos pendentes de confirmação" />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {pendentes.map(p => (
                                        <PedidoCard
                                            key={p.id}
                                            pedido={p}
                                            onAprovar={handleAprovar}
                                            onRejeitar={handleRejeitar}
                                            isProcessing={processing === p.id}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="aprovados" className="flex-1 overflow-auto">
                            {aprovados.length === 0 ? (
                                <EmptyState label="Nenhum pedido aprovado hoje" />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {aprovados.map(p => (
                                        <PedidoCard key={p.id} pedido={p} isProcessing={false} />
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="rejeitados" className="flex-1 overflow-auto">
                            {rejeitados.length === 0 ? (
                                <EmptyState label="Nenhum pedido rejeitado" />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {rejeitados.map(p => (
                                        <PedidoCard key={p.id} pedido={p} isProcessing={false} />
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </>
                )}
            </Tabs>

            {selectedPedido && (
                <TakeawayPaymentModal
                    isOpen={isPaymentOpen}
                    onClose={() => {
                        setIsPaymentOpen(false);
                        setSelectedPedido(null);
                    }}
                    pedido={{ ...selectedPedido, organizationId }}
                    onSuccess={fetchPedidos}
                />
            )}
        </div>
    );
}
