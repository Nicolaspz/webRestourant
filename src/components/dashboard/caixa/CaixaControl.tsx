'use client';
import { useState, useContext, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthContext } from '@/contexts/AuthContext';
import { setupAPIClient } from '@/services/api';
import { Wallet, LockKeyhole, LockOpen, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSocket } from '@/contexts/SocketContext';

export function CaixaControl() {
    const { user } = useContext(AuthContext);
    const { socket } = useSocket();
    const [caixaData, setCaixaData] = useState<any>(null);
    const [otherUserHasCaixaOpen, setOtherUserHasCaixaOpen] = useState(false);
    const [otherUserName, setOtherUserName] = useState('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [amount, setAmount] = useState<string>('');
    const [closureReport, setClosureReport] = useState<any>(null);
    const [isReportOpen, setIsReportOpen] = useState(false);

    const isManagement = user?.role?.toUpperCase() === 'CAIXA' || user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'SUPER ADMIN';

    useEffect(() => {
        if (user?.organizationId && isManagement) {
            loadCaixaStatus();
        }
    }, [user, isManagement]);

    // Listen for socket events to update caixa if others close/open it
    useEffect(() => {
        if (socket && user?.organizationId && isManagement) {
            const handleRefresh = (data: any) => {
                if (data.organizationId === user.organizationId) {
                    loadCaixaStatus();
                }
            };
            socket.on('orders_refresh', handleRefresh);
            return () => {
                socket.off('orders_refresh', handleRefresh);
            };
        }
    }, [socket, user, isManagement]);

    async function loadCaixaStatus() {
        setLoading(true);
        try {
            const apiClient = setupAPIClient();
            const response = await apiClient.get('/caixa/current', {
                params: { organizationId: user?.organizationId }
            });

            if (response.data && !response.data.isClosed) {
                // Caixa do próprio usuário está aberto
                setCaixaData(response.data);
                setOtherUserHasCaixaOpen(false);
            } else if (response.data && response.data.hasOtherUserOpen) {
                // Outro usuário tem caixa aberto
                setCaixaData(null);
                setOtherUserHasCaixaOpen(true);
                setOtherUserName(response.data.otherUserName);
            } else {
                // Ninguém tem caixa aberto
                setCaixaData(null);
                setOtherUserHasCaixaOpen(false);
                setOtherUserName('');
            }
        } catch (err) {
            console.error(err);
            setCaixaData(null);
            setOtherUserHasCaixaOpen(false);
        } finally {
            setLoading(false);
        }
    }

    async function handleOpenCaixa() {
        // Verificar se outro usuário já tem caixa aberto
        if (otherUserHasCaixaOpen) {
            toast.error(`O caixa já está aberto por ${otherUserName}. Apenas um caixa pode estar aberto por vez.`);
            return;
        }

        const val = parseFloat(amount.replace(',', '.'));
        if (isNaN(val) || val < 0) {
            toast.error('Informe um valor inicial válido.');
            return;
        }

        setProcessing(true);
        try {
            const apiClient = setupAPIClient();
            await apiClient.post('/caixa/open', {
                organizationId: user?.organizationId,
                initialAmount: val
            });
            toast.success('Caixa aberto com sucesso!');
            setIsModalOpen(false);
            setAmount('');
            loadCaixaStatus();
            emitRefresh();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao abrir caixa');
        } finally {
            setProcessing(false);
        }
    }

    async function handleCloseCaixa() {
        const val = parseFloat(amount.replace(',', '.'));
        if (isNaN(val) || val < 0) {
            toast.error('Informe o valor final em caixa.');
            return;
        }

        setProcessing(true);
        try {
            const apiClient = setupAPIClient();
            const response = await apiClient.post(`/caixa/close/${caixaData.id}`, {
                finalAmount: val
            });

            // Armazenar relatório para mostrar ao usuário
            setClosureReport(response.data.relatorio);
            setIsReportOpen(true);

            toast.success('Caixa fechado com sucesso!');
            setIsModalOpen(false);
            setAmount('');
            loadCaixaStatus();
            emitRefresh();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao fechar caixa');
        } finally {
            setProcessing(false);
        }
    }

    function emitRefresh() {
        if (socket && user?.organizationId) {
            // Emitir evento para atualizar outros usuários
            socket.emit('caixa_refresh', {
                organizationId: user?.organizationId
            });
        }
    }

    const isMyCaixaOpen = !!caixaData;

    if (!isManagement) return null;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant={isMyCaixaOpen ? "outline" : otherUserHasCaixaOpen ? "secondary" : "destructive"}
                        className="gap-2 shrink-0"
                    >
                        <Wallet className="w-4 h-4" />
                        <span className="hidden sm:inline">
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isMyCaixaOpen ? (
                                'Meu Caixa: Aberto'
                            ) : otherUserHasCaixaOpen ? (
                                `Caixa: ${otherUserName}`
                            ) : (
                                'Caixa Fechado'
                            )}
                        </span>
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800">
                    <DropdownMenuLabel>Controle de Caixa</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {otherUserHasCaixaOpen && !isMyCaixaOpen ? (
                        // Mostrar mensagem de caixa ocupado por outro usuário
                        <>
                            <div className="px-2 py-4 text-sm text-center">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                                <p className="font-medium text-amber-600 dark:text-amber-400">
                                    Caixa ocupado
                                </p>
                                <p className="text-muted-foreground mt-1">
                                    Aberto por: <span className="font-semibold">{otherUserName}</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Apenas um caixa pode estar aberto por vez
                                </p>
                            </div>
                        </>
                    ) : isMyCaixaOpen ? (
                        // Mostrar detalhes do caixa do usuário atual
                        <>
                            <div className="px-2 py-1.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Fundo inicial:</span>
                                    <span className="font-medium">{caixaData.initialAmount} Kz</span>
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className="text-muted-foreground">Aberto às:</span>
                                    <span className="font-medium">
                                        {new Date(caixaData.openedAt).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => { setAmount(''); setIsModalOpen(true); }}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                            >
                                <LockKeyhole className="w-4 h-4 mr-2" />
                                Fechar Meu Caixa
                            </DropdownMenuItem>
                        </>
                    ) : (
                        // Mostrar opção de abrir caixa (quando ninguém tem caixa aberto)
                        <DropdownMenuItem
                            onClick={() => {
                                if (!otherUserHasCaixaOpen) {
                                    setAmount('');
                                    setIsModalOpen(true);
                                }
                            }}
                            disabled={otherUserHasCaixaOpen}
                            className="text-green-600 focus:text-green-600 focus:bg-green-50 cursor-pointer"
                        >
                            <LockOpen className="w-4 h-4 mr-2" />
                            Abrir Caixa
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isMyCaixaOpen ? 'Fechar Meu Caixa' : 'Abertura de Caixa'}</DialogTitle>
                        <DialogDescription>
                            {isMyCaixaOpen
                                ? 'Informe o valor total presente na gaveta/caixa agora para finalizar o turno.'
                                : 'Informe o fundo de maneio inicial para iniciar o fluxo de faturação desta sessão.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">{isMyCaixaOpen ? 'Valor Final' : 'Valor Inicial'} (Kz)</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {isMyCaixaOpen && caixaData && (
                            <div className="p-3 bg-muted rounded-md text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Fundo Inicial:</span>
                                    <span className="font-semibold">{caixaData.initialAmount} Kz</span>
                                </div>
                                {caixaData.pagamentos && caixaData.pagamentos.length > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Total de pagamentos:</span>
                                        <span className="font-semibold">
                                            {caixaData.pagamentos.reduce((sum: number, p: any) => sum + p.valor, 0)} Kz
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={isMyCaixaOpen ? handleCloseCaixa : handleOpenCaixa}
                            disabled={processing || !amount || (isMyCaixaOpen ? false : otherUserHasCaixaOpen)}
                            className={isMyCaixaOpen ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
                        >
                            {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            {isMyCaixaOpen ? 'Confirmar Fecho' : 'Abrir Caixa'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Relatório de Fechamento */}
            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LockKeyhole className="w-5 h-5 text-red-500" />
                            Resumo de Fechamento de Caixa
                        </DialogTitle>
                        <DialogDescription>
                            Relatório detalhado do turno finalizado.
                        </DialogDescription>
                    </DialogHeader>

                    {closureReport && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="p-3 bg-muted rounded-lg border border-border/50">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Vendedor</p>
                                    <p className="font-semibold">{closureReport.vendedor}</p>
                                </div>
                                <div className="p-3 bg-muted rounded-lg border border-border/50">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Fundo Inicial</p>
                                    <p className="font-semibold">{Number(closureReport.valorInicial)?.toFixed(2)} Kz</p>
                                </div>
                            </div>

                            <div className="p-4 border-2 rounded-xl bg-primary/5 border-primary/10">
                                <h4 className="text-xs font-bold uppercase text-primary mb-3">Vendas do Turno</h4>
                                <div className="space-y-2">
                                    {Object.entries(closureReport.totaisPorMetodo || {}).map(([metodo, valor]: [string, any]) => (
                                        <div key={metodo} className="flex justify-between text-sm">
                                            <span className="capitalize">{metodo}</span>
                                            <span className="font-mono">{Number(valor)?.toFixed(2)} Kz</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between text-base font-bold pt-2 border-t mt-2">
                                        <span>Total Vendas</span>
                                        <span className="text-primary">{Number(closureReport.totalVendas)?.toFixed(2)} Kz</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-2 rounded-xl bg-muted/30 border-muted">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm items-center">
                                        <span className="text-muted-foreground">Esperado em Dinheiro:</span>
                                        <span className="font-bold underline">{Number(closureReport.totalEsperadoEmDinheiro)?.toFixed(2)} Kz</span>
                                    </div>
                                    <div className="flex justify-between text-sm items-center">
                                        <span className="text-muted-foreground">Valor Informado:</span>
                                        <span className="font-bold">{Number(closureReport.valorInformado)?.toFixed(2)} Kz</span>
                                    </div>

                                    <div className={`flex justify-between items-center p-3 rounded-lg border-2 ${closureReport.diferenca === 0 ? 'bg-green-50 border-green-200 text-green-700' : closureReport.diferenca > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase">Situação</span>
                                            <span className="font-bold text-lg">{closureReport.statusFinal}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold uppercase">Diferença</span>
                                            <p className="font-bold text-lg">{Number(closureReport.diferenca)?.toFixed(2)} Kz</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button onClick={() => setIsReportOpen(false)} className="w-full">
                            Concluir e Sair
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}