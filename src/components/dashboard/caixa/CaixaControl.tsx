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

            {isModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b dark:border-slate-800">
                            <h2 className="text-xl font-bold dark:text-white">
                                {isMyCaixaOpen ? 'Fechar Meu Caixa' : 'Abertura de Caixa'}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                {isMyCaixaOpen
                                    ? 'Informe o valor total presente na gaveta/caixa agora para finalizar o turno.'
                                    : 'Informe o fundo de maneio inicial para iniciar o fluxo de faturação desta sessão.'}
                            </p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount" className="dark:text-slate-200">{isMyCaixaOpen ? 'Valor Final' : 'Valor Inicial'} (Kz)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    autoFocus
                                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                />
                            </div>

                            {isMyCaixaOpen && caixaData && (
                                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md text-sm space-y-1">
                                    <div className="flex justify-between dark:text-slate-300">
                                        <span className="text-slate-500 dark:text-slate-400">Fundo Inicial:</span>
                                        <span className="font-semibold">{caixaData.initialAmount} Kz</span>
                                    </div>
                                    {caixaData.pagamentos && caixaData.pagamentos.length > 0 && (
                                        <div className="flex justify-between dark:text-slate-300">
                                            <span className="text-slate-500 dark:text-slate-400">Total de pagamentos:</span>
                                            <span className="font-semibold">
                                                {caixaData.pagamentos.reduce((sum: number, p: any) => sum + p.valor, 0)} Kz
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={processing} className="dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">
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
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Relatório de Fechamento */}
            {isReportOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b dark:border-slate-800 flex flex-col gap-2">
                            <h2 className="flex items-center gap-2 text-xl font-bold dark:text-white">
                                <LockKeyhole className="w-5 h-5 text-red-500" />
                                Resumo de Fechamento de Caixa
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Relatório detalhado do turno finalizado.
                            </p>
                        </div>

                        {closureReport && (
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                                        <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Vendedor</p>
                                        <p className="font-semibold dark:text-white">{closureReport.vendedor}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                                        <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Fundo Inicial</p>
                                        <p className="font-semibold dark:text-white">{Number(closureReport.valorInicial)?.toFixed(2)} Kz</p>
                                    </div>
                                </div>

                                <div className="p-4 border-2 rounded-xl bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-500/20">
                                    <h4 className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400 mb-3">Vendas do Turno</h4>
                                    <div className="space-y-2 dark:text-slate-200">
                                        {Object.entries(closureReport.totaisPorMetodo || {}).map(([metodo, valor]: [string, any]) => (
                                            <div key={metodo} className="flex justify-between text-sm">
                                                <span className="capitalize">{metodo}</span>
                                                <span className="font-mono">{Number(valor)?.toFixed(2)} Kz</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between text-base font-bold pt-2 border-t dark:border-slate-700/50 mt-2">
                                            <span>Total Vendas</span>
                                            <span className="text-indigo-600 dark:text-indigo-400">{Number(closureReport.totalVendas)?.toFixed(2)} Kz</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 border-2 rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
                                    <div className="space-y-3 dark:text-slate-200">
                                        <div className="flex justify-between text-sm items-center">
                                            <span className="text-slate-500 dark:text-slate-400">Esperado em Dinheiro:</span>
                                            <span className="font-bold underline">{Number(closureReport.totalEsperadoEmDinheiro)?.toFixed(2)} Kz</span>
                                        </div>
                                        <div className="flex justify-between text-sm items-center">
                                            <span className="text-slate-500 dark:text-slate-400">Valor Informado:</span>
                                            <span className="font-bold">{Number(closureReport.valorInformado)?.toFixed(2)} Kz</span>
                                        </div>

                                        <div className={`flex justify-between items-center p-3 rounded-lg border-2 ${closureReport.diferenca === 0 ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' : closureReport.diferenca > 0 ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'}`}>
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

                        <div className="p-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
                            <Button onClick={() => setIsReportOpen(false)} className="w-full">
                                Concluir e Sair
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}