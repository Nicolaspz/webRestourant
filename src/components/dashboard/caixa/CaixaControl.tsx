'use client';
import {useAccess} from '@/contexts/AccessContext';
import { useState, useContext, useEffect, useRef } from 'react';
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
import { usePosSettings } from '@/hooks/usePosSettings';
import { createCashClosurePdf, printCashDeclaration } from './cashDeclarationPdf';

const parseKzInput = (value: string) => {
    const normalized = value.replace(/\./g, '').replace(',', '.').trim();
    return normalized ? Number(normalized) : NaN;
};

const formatKz = (value: number) => Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatKzDraft = (value: string) => {
    const cleaned = value.replace(/[^\d,]/g, '');
    const commaIndex = cleaned.indexOf(',');
    const integer = (commaIndex >= 0 ? cleaned.slice(0, commaIndex) : cleaned).replace(/\D/g, '');
    const cents = commaIndex >= 0 ? `,${cleaned.slice(commaIndex + 1).replace(/\D/g, '').slice(0, 2)}` : '';
    return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${cents}`;
};

const formatMetodoPagamento = (method: string) => method === 'outro' ? 'Cash' : method;

export function CaixaControl() {
    const { user } = useContext(AuthContext);
    const { socket } = useSocket();
    const [caixaData, setCaixaData] = useState<any>(null);
    const [otherUserHasCaixaOpen, setOtherUserHasCaixaOpen] = useState(false);
    const [otherUserName, setOtherUserName] = useState('');
    const [loading, setLoading] = useState(true);
    const [statusError, setStatusError] = useState(false);
    const statusRequest = useRef(false);
    const [processing, setProcessing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [amount, setAmount] = useState<string>('');
    const [declaredTotals, setDeclaredTotals] = useState<Record<string, string>>({});
    const [closeStage, setCloseStage] = useState<'declaration' | 'closed'>('declaration');
    const [declarationPrinted, setDeclarationPrinted] = useState(false);
    const [printDeclarationRequested, setPrintDeclarationRequested] = useState(false);
    const [closeError, setCloseError] = useState('');
    const [closureReport, setClosureReport] = useState<any>(null);
    const [isReportOpen, setIsReportOpen] = useState(false);

    const {can}=useAccess();
    const isManagement = can('cash.read') || user?.role === 'CAIXA';
    const { settings: posSettings } = usePosSettings(user?.organizationId);

    useEffect(() => {
        if (user?.organizationId && isManagement) {
            loadCaixaStatus();
        }
    }, [user?.id, user?.organizationId, isManagement]);

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
        if (statusRequest.current) return;
        statusRequest.current = true;
        try {
            const apiClient = setupAPIClient();
            const response = await apiClient.get('/caixa/current', {
                params: { organizationId: user?.organizationId },
                timeout: 15000,
            });
            setStatusError(false);

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
            setStatusError(true);
        } finally {
            statusRequest.current = false;
            setLoading(false);
        }
    }

    async function handleOpenCaixa() {
        // Verificar se outro usuário já tem caixa aberto
        if (otherUserHasCaixaOpen) {
            toast.error(`O caixa já está aberto por ${otherUserName}. Apenas um caixa pode estar aberto por vez.`);
            return;
        }

        const val = parseKzInput(amount);
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
        const totals = Object.fromEntries(Object.entries(declaredTotals).map(([key, value]) => [key, value ? parseKzInput(value) : 0]));
        if (Object.values(totals).some(value => !Number.isFinite(value) || value < 0)) {
            toast.error('Informe valores válidos para cada método.');
            return;
        }

        setProcessing(true);
        try {
            const apiClient = setupAPIClient();
            await apiClient.post(`/caixa/declare/${caixaData.id}`, {
                declaredTotals: totals
            });
            setClosureReport({ declaradosPorMetodo: totals, abertoEm: caixaData.openedAt, vendedor: user?.name, valorInicial: caixaData.initialAmount });
            setCloseStage('declaration');
            setDeclarationPrinted(false);
            setCloseError('');
            setPrintDeclarationRequested(true);
            setIsReportOpen(true);
            setIsModalOpen(false);
            toast.success('Declaração registada. Imprima-a antes de confirmar o fecho.');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao fechar caixa');
        } finally {
            setProcessing(false);
        }
    }

    useEffect(() => {
        if (!printDeclarationRequested || !isReportOpen || closeStage !== 'declaration') return;
        let cancelled = false;
        const timer = window.setTimeout(() => {
            printCashDeclaration(closureReport, posSettings.paperWidth).then(() => {
                if (!cancelled) {
                    setDeclarationPrinted(true);
                    setPrintDeclarationRequested(false);
                }
            }).catch((error) => {
                if (!cancelled) {
                    setPrintDeclarationRequested(false);
                    toast.error(error?.message || 'Não foi possível gerar a declaração em PDF.');
                }
            });
        }, 150);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [printDeclarationRequested, isReportOpen, closeStage, closureReport, posSettings.paperWidth]);

    async function handleFinalizeClose() {
        const pdfWindow = window.open('', '_blank');
        if (pdfWindow) pdfWindow.document.title = 'A preparar resumo do fecho';
        setProcessing(true);
        try {
            const apiClient = setupAPIClient();
            const response = await apiClient.post(`/caixa/close/${caixaData.id}`);
            const pdfBlob = createCashClosurePdf(response.data.relatorio, posSettings.paperWidth);
            const pdfUrl = URL.createObjectURL(pdfBlob);
            if (pdfWindow && !pdfWindow.closed) pdfWindow.location.replace(pdfUrl);
            else window.open(pdfUrl, '_blank');
            const downloadLink = document.createElement('a');
            downloadLink.href = pdfUrl;
            downloadLink.download = `resumo-fecho-caixa-${new Date().toISOString().slice(0, 10)}.pdf`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();
            window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 5 * 60_000);
            setClosureReport(response.data.relatorio);
            setCloseStage('closed');
            loadCaixaStatus();
            emitRefresh();
            toast.success('Caixa fechado. Imprima o resumo de conferência.');
        } catch (err: any) {
            if (pdfWindow && !pdfWindow.closed) pdfWindow.close();
            setCloseError(err.response?.data?.error || 'Não foi possível fechar o caixa.');
            toast.error(err.response?.data?.error || 'Erro ao fechar caixa');
        } finally { setProcessing(false); }
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
                        aria-label="Estado e opções do caixa"
                        aria-busy={loading}
                        variant={isMyCaixaOpen ? "outline" : otherUserHasCaixaOpen ? "secondary" : "destructive"}
                        className="gap-2 shrink-0"
                    >
                        <Wallet className="w-4 h-4" />
                        <span className="hidden sm:inline">
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : statusError ? (
                                'Caixa indisponível'
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

                    {loading ? <div role="status" className="p-3 text-sm">A consultar o estado do caixa…</div> : statusError ? (
                        <div className="p-3 space-y-3 text-sm"><p>Não foi possível consultar o caixa. Tente novamente.</p><Button variant="outline" onClick={() => { setLoading(true); return loadCaixaStatus(); }}>Tentar novamente</Button></div>
                    ) : otherUserHasCaixaOpen && !isMyCaixaOpen ? (
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
                                    <span className="font-medium">{formatKz(caixaData.initialAmount)} Kz</span>
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
                                onClick={() => { setAmount(''); setDeclaredTotals({}); setIsModalOpen(true); }}
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
                                ? 'Conte o dinheiro e registe os totais recebidos por cada método. O sistema não mostrará as vendas antes da declaração.'
                                    : 'Informe o fundo de maneio inicial para iniciar o fluxo de faturação desta sessão.'}
                            </p>
                        </div>

                        <div className="p-6 space-y-4">
                            {!isMyCaixaOpen && <div className="space-y-2">
                                <Label htmlFor="amount" className="dark:text-slate-200">Valor Inicial (Kz)</Label>
                                <Input
                                    id="amount"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0,00"
                                    value={amount}
                                    onChange={(e) => setAmount(formatKzDraft(e.target.value))}
                                    onBlur={() => { const value = parseKzInput(amount); if (Number.isFinite(value)) setAmount(formatKz(value)); }}
                                    autoFocus
                                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                />
                            </div>}

                            {isMyCaixaOpen && <div className="space-y-3">{['dinheiro','transferencia','cartao','outro'].map(metodo => <div key={metodo} className="space-y-1"><Label htmlFor={`declared-${metodo}`} className="capitalize">{formatMetodoPagamento(metodo)} (Kz)</Label><Input id={`declared-${metodo}`} type="text" inputMode="decimal" value={declaredTotals[metodo] || ''} onChange={event => setDeclaredTotals(current => ({...current,[metodo]:formatKzDraft(event.target.value)}))} onBlur={() => { const value = parseKzInput(declaredTotals[metodo] || ''); if (Number.isFinite(value)) setDeclaredTotals(current => ({...current,[metodo]:formatKz(value)})); }} placeholder="0,00" /></div>)}</div>}
                        </div>

                        <div className="p-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={processing} className="dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">
                                Cancelar
                            </Button>
                            <Button
                                onClick={isMyCaixaOpen ? handleCloseCaixa : handleOpenCaixa}
                                disabled={processing || (!isMyCaixaOpen && !amount) || (isMyCaixaOpen ? false : otherUserHasCaixaOpen)}
                                className={isMyCaixaOpen ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
                            >
                                {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                {isMyCaixaOpen ? 'Registar declaração' : 'Abrir Caixa'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Relatório de Fechamento */}
            {isReportOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <style jsx global>{`@media print { body * { visibility: hidden !important; } #cash-declaration-print, #cash-declaration-print * , #cash-final-print, #cash-final-print * { visibility: visible !important; } #cash-declaration-print, #cash-final-print { position: fixed; inset: 0; padding: 24px; background: white; color: black; width: 100%; } }`}</style>
                    <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b dark:border-slate-800 flex flex-col gap-2">
                            <h2 className="flex items-center gap-2 text-xl font-bold dark:text-white">
                                <LockKeyhole className="w-5 h-5 text-red-500" />
                                {closeStage === 'declaration' ? 'Declaração Cega do Caixa' : 'Resumo de Fechamento de Caixa'}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {closeStage === 'declaration' ? 'Imprima e assine esta declaração antes de confirmar o fecho.' : 'Conferência entre os valores declarados e os valores registados no sistema.'}
                            </p>
                        </div>

                        {closureReport && closeStage === 'declaration' ? (
                            <div className="p-6 space-y-3" id="cash-declaration-print">
                                {closeError && <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{closeError}</p>}
                                <p>Operador: <strong>{closureReport.vendedor}</strong></p>
                                <p>Abertura: <strong>{new Date(closureReport.abertoEm).toLocaleString()}</strong></p>
                                {Object.entries(closureReport.declaradosPorMetodo || {}).map(([metodo, valor]: [string, any]) => <div className="flex justify-between border-b py-2" key={metodo}><span className="capitalize">{formatMetodoPagamento(metodo)}</span><strong>{formatKz(Number(valor))} Kz</strong></div>)}
                                <div className="flex justify-between border-t pt-3 text-lg"><strong>Total declarado</strong><strong>{formatKz(Object.values(closureReport.declaradosPorMetodo || {}).reduce((sum: number, value: any) => sum + Number(value), 0))} Kz</strong></div>
                            </div>
                        ) : closureReport && (
                            <div id="cash-final-print" className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                                        <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Vendedor</p>
                                        <p className="font-semibold dark:text-white">{closureReport.vendedor}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                                        <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Fundo Inicial</p>
                                        <p className="font-semibold dark:text-white">{formatKz(Number(closureReport.valorInicial))} Kz</p>
                                    </div>
                                </div>

                                <div className="p-4 border-2 rounded-xl bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-500/20">
                                    <h4 className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400 mb-3">Vendas do Turno</h4>
                                    <div className="space-y-2 dark:text-slate-200">
                                        {Object.entries(closureReport.totaisPorMetodo || {}).map(([metodo, valor]: [string, any]) => (
                                            <div key={metodo} className="flex justify-between text-sm">
                                                <span className="capitalize">{formatMetodoPagamento(metodo)}</span>
                                                <span className="font-mono">{formatKz(Number(valor))} Kz</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between text-base font-bold pt-2 border-t dark:border-slate-700/50 mt-2">
                                            <span>Total Vendas</span>
                                            <span className="text-indigo-600 dark:text-indigo-400">{formatKz(Number(closureReport.totalVendas))} Kz</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 border-2 rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
                                    <div className="space-y-3 dark:text-slate-200">
                                        <div className="flex justify-between text-sm items-center">
                                            <span className="text-slate-500 dark:text-slate-400">Esperado em Dinheiro:</span>
                                            <span className="font-bold underline">{formatKz(Number(closureReport.totalEsperadoEmDinheiro))} Kz</span>
                                        </div>
                                        <div className="space-y-1">{Object.entries(closureReport.declaradosPorMetodo || {}).map(([metodo, valor]: [string, any]) => <div className="flex justify-between text-sm" key={metodo}><span className="capitalize">Declarado · {formatMetodoPagamento(metodo)}</span><span className="font-bold">{formatKz(Number(valor))} Kz</span></div>)}</div>
                                        <div className="space-y-1 border-t pt-2">{Object.entries(closureReport.diferencasPorMetodo || {}).map(([metodo, valor]: [string, any]) => <div className="flex justify-between text-sm" key={metodo}><span className="capitalize">Diferença · {formatMetodoPagamento(metodo)}</span><span className="font-bold">{formatKz(Number(valor))} Kz</span></div>)}</div>

                                        <div className={`flex justify-between items-center p-3 rounded-lg border-2 ${closureReport.diferenca === 0 ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' : closureReport.diferenca > 0 ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'}`}>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold uppercase">Situação</span>
                                                <span className="font-bold text-lg">{closureReport.statusFinal}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold uppercase">Diferença</span>
                                                <p className="font-bold text-lg">{formatKz(Number(closureReport.diferenca))} Kz</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2">
                            {closeStage === 'declaration' ? <>
                                <Button variant="outline" onClick={() => setIsReportOpen(false)}>Voltar às mesas</Button>
                                <Button variant="outline" onClick={() => { void printCashDeclaration(closureReport, posSettings.paperWidth).then(() => setDeclarationPrinted(true)).catch((error) => toast.error(error?.message || 'Não foi possível gerar a declaração em PDF.')); }}>Imprimir declaração</Button>
                                <Button disabled={processing || !declarationPrinted} onClick={handleFinalizeClose}>{processing ? 'A fechar…' : 'Confirmar fecho'}</Button>
                            </> : <>
                                <Button variant="outline" onClick={() => window.print()}>Imprimir resumo do dia</Button>
                                <Button onClick={() => setIsReportOpen(false)} className="w-full">Concluir e sair</Button>
                            </>}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
