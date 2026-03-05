'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Banknote, CreditCard, Smartphone, ArrowLeftRight, Loader2, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { setupAPIClient } from '@/services/api';
import { parseCookies } from 'nookies';
import { toast } from 'react-toastify';

type MetodoPagamento = 'dinheiro' | 'cartao' | 'multicaixa' | 'transferencia';

interface ItemPreview {
    produto: string;
    quantidade: number;
    precoUnitario: number;
    subtotal: number;
    preparado: boolean;
}

interface PedidoPreview {
    id: string;
    nomePedido: string | null;
    items: ItemPreview[];
}

interface ContaPreview {
    mesaNumero: number;
    abertaEm: string;
    pedidos: PedidoPreview[];
    totalGeral: number;
}

interface ModalPagamentoProps {
    open: boolean;
    mesaId: string;
    mesaNumber: number;
    organizationId: string;
    onClose: () => void;
    onSuccess: (dadosFechamento: any) => void;
}

const METODOS: { value: MetodoPagamento; label: string; icon: React.ReactNode }[] = [
    { value: 'dinheiro', label: 'Dinheiro', icon: <Banknote className="h-5 w-5" /> },
    { value: 'cartao', label: 'Cartão', icon: <CreditCard className="h-5 w-5" /> },
    { value: 'multicaixa', label: 'Multicaixa', icon: <Smartphone className="h-5 w-5" /> },
    { value: 'transferencia', label: 'Transferência', icon: <ArrowLeftRight className="h-5 w-5" /> },
];

export default function ModalPagamento({
    open,
    mesaId, // Destruturado para uso futuro se necessário
    mesaNumber,
    organizationId,
    onClose,
    onSuccess,
}: ModalPagamentoProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [conta, setConta] = useState<ContaPreview | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [loadingConfirm, setLoadingConfirm] = useState(false);
    const [metodo, setMetodo] = useState<MetodoPagamento | null>(null);
    const [valorPago, setValorPago] = useState('');
    const [trocoPara, setTrocoPara] = useState('');

    const { '@servFixe.token': token } = parseCookies();
    const apiClient = setupAPIClient();

    // Verificação de itens preparados
    const temItensPendentes = conta?.pedidos?.some(p => p.items.some(i => !i.preparado)) ?? false;

    // Carregar preview da conta quando o modal abre
    const handleOnOpen = async () => {
        if (!organizationId || !mesaNumber) {
            console.error('❌ OrganizationId ou MesaNumber não fornecidos');
            onClose();
            return;
        }

        setStep(1);
        setMetodo(null);
        setValorPago('');
        setTrocoPara('');
        setConta(null);
        setLoadingPreview(true);
        try {
            const res = await apiClient.get(`/preview_conta/${mesaNumber}`, {
                params: { organizationId },
                headers: { Authorization: `Bearer ${token}` },
            });
            setConta(res.data);
        } catch (error: any) {
            console.error('❌ Erro ao buscar preview:', error);
            toast.error(error?.response?.data?.error || 'Erro ao carregar conta');
            onClose();
        } finally {
            setLoadingPreview(false);
        }
    };

    // Estado para pagamentos múltiplos
    const [isSplit, setIsSplit] = useState(false);
    const [pagamentos, setPagamentos] = useState<Array<{ metodo: MetodoPagamento, valor: number }>>([]);
    const [valorInput, setValorInput] = useState('');

    // Trigger de abertura
    useEffect(() => {
        if (open) {
            handleOnOpen();
            setIsSplit(false);
            setPagamentos([]);
            setValorInput('');
        }
    }, [open, mesaNumber, organizationId]);

    const totalPagoMultiplo = pagamentos.reduce((acc, p) => acc + p.valor, 0);
    const restante = (conta?.totalGeral ?? 0) - totalPagoMultiplo;

    const podeConfirmar = !temItensPendentes && conta && (
        // Caso simples
        (!isSplit && metodo !== null && (
            metodo !== 'dinheiro' || (trocoPara !== '' && Number(trocoPara) >= conta.totalGeral)
        )) ||
        // Caso múltiplo
        (isSplit && Math.abs(restante) < 0.01 && pagamentos.length > 0)
    );

    const addPagamento = () => {
        const valor = Number(valorInput);
        if (!metodo || isNaN(valor) || valor <= 0) {
            toast.error('Selecione um método e insira um valor válido');
            return;
        }
        if (valor > restante + 0.1 && metodo !== 'dinheiro') {
            toast.error('O valor não pode ser superior ao restante');
            return;
        }

        setPagamentos([...pagamentos, { metodo, valor: Math.min(valor, restante > 0 ? restante : valor) }]);
        setValorInput('');
        setMetodo(null);
    };

    const removerPagamento = (index: number) => {
        setPagamentos(pagamentos.filter((_, i) => i !== index));
    };

    const handleConfirmar = async () => {
        if (!conta) return;
        setLoadingConfirm(true);
        try {
            let body: any = {};

            if (isSplit) {
                body = {
                    metodoPagamento: pagamentos[0].metodo,
                    valorPago: conta.totalGeral,
                    pagamentosMultiplos: pagamentos.map(p => ({
                        metodo: p.metodo,
                        valor: p.valor
                    }))
                };
            } else {
                if (!metodo) return;
                body = {
                    metodoPagamento: metodo,
                    valorPago: conta.totalGeral,
                };
                if (metodo === 'dinheiro' && trocoPara && Number(trocoPara) >= conta.totalGeral) {
                    body.trocoPara = Number(trocoPara);
                }
            }

            const resFecho = await apiClient.post(
                `/close_table_pay/${mesaNumber}`,
                body,
                {
                    params: { organizationId },
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            toast.success(`✅ Mesa ${mesaNumber} fechada e paga com sucesso!`);
            onSuccess(resFecho.data);
            onClose();
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Erro ao processar pagamento');
        } finally {
            setLoadingConfirm(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between pr-6">
                        <span className="flex items-center gap-2">
                            {step === 1 ? <>🧾 Conta — Mesa {mesaNumber}</> : <>💳 Pagamento — Mesa {mesaNumber}</>}
                        </span>
                        {step === 2 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setIsSplit(!isSplit); setPagamentos([]); setMetodo(null); }}
                                className="text-xs font-semibold h-7"
                            >
                                {isSplit ? '🔄 Pagamento Único' : '➕ Dividir Conta'}
                            </Button>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-1 py-1 space-y-4">
                    {/* PASSO 1 — Resumo da conta */}
                    {step === 1 && (
                        <div className="space-y-4">
                            {loadingPreview ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-3">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-sm text-muted-foreground">A carregar conta...</p>
                                </div>
                            ) : conta ? (
                                <>
                                    <div className="text-xs text-muted-foreground">
                                        Aberta às {new Date(conta.abertaEm).toLocaleTimeString('pt-PT')}
                                    </div>

                                    {/* Lista de itens */}
                                    <div className="max-h-52 overflow-y-auto space-y-1 border rounded-lg p-3 bg-muted/30">
                                        {conta.pedidos?.flatMap(p => p.items).map((item, i) => (
                                            <div key={i} className="flex justify-between items-center text-sm py-1 border-b last:border-0 border-border/50">
                                                <div className="flex items-center gap-2">
                                                    {!item.preparado && (
                                                        <Badge variant="outline" className="text-[10px] py-0">⏳</Badge>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-foreground">{item.produto}</span>
                                                        <span className="text-[10px] text-muted-foreground font-medium">
                                                            {item.precoUnitario.toFixed(2)} Kz × {item.quantidade}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="font-mono text-xs font-bold">{item.subtotal.toFixed(2)} Kz</span>
                                            </div>
                                        ))}
                                    </div>

                                    {temItensPendentes && (
                                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-2 leading-tight">
                                            <Loader2 className="h-4 w-4 mt-0.5 animate-pulse shrink-0" />
                                            <div>
                                                <p className="font-bold mb-0.5">Pedidos em preparação</p>
                                                <p>A cozinha ainda está a preparar alguns itens. É necessário aguardar a finalização antes de fechar a conta.</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center pt-2 border-t text-lg font-bold">
                                        <span>Total</span>
                                        <span className="text-primary">{conta.totalGeral.toFixed(2)} Kz</span>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    )}

                    {/* PASSO 2 — Pagamento */}
                    {step === 2 && conta && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-2.5 bg-muted rounded-lg border border-border/50">
                                    <p className="text-[9px] uppercase font-bold text-muted-foreground">Total da Conta</p>
                                    <p className="text-base font-bold">{conta.totalGeral.toFixed(2)} Kz</p>
                                </div>
                                <div className={`p-2.5 rounded-lg border ${restante <= 0.01 ? 'bg-green-50 dark:bg-green-900/20 text-green-700 border-green-200' : 'bg-primary/5 text-primary border-primary/20'}`}>
                                    <p className="text-[9px] uppercase font-bold">Faltam</p>
                                    <p className="text-base font-bold">{Math.max(0, restante).toFixed(2)} Kz</p>
                                </div>
                            </div>

                            {isSplit ? (
                                <div className="space-y-3">
                                    {/* Lista de pagamentos já adicionados */}
                                    {pagamentos.length > 0 && (
                                        <div className="space-y-1.5 border rounded-lg p-2 max-h-32 overflow-y-auto bg-muted/20">
                                            {pagamentos.map((p, i) => (
                                                <div key={i} className="flex justify-between items-center p-2 bg-background rounded border border-border/50 text-[11px] shadow-sm">
                                                    <span className="flex items-center gap-2">
                                                        {METODOS.find(m => m.value === p.metodo)?.icon}
                                                        <span className="font-medium text-muted-foreground">{METODOS.find(m => m.value === p.metodo)?.label}</span>
                                                    </span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-foreground">{p.valor.toFixed(2)} Kz</span>
                                                        <button
                                                            onClick={() => removerPagamento(i)}
                                                            className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                                                            title="Remover"
                                                        >
                                                            <Loader2 className="h-3 w-3 rotate-45" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Form para adicionar novo pagamento */}
                                    {restante > 0.01 && (
                                        <div className="p-3 border rounded-lg bg-primary/5 border-primary/20 space-y-3">
                                            <div className="grid grid-cols-4 gap-2">
                                                {METODOS.map(m => (
                                                    <button
                                                        key={m.value}
                                                        onClick={() => setMetodo(m.value)}
                                                        className={`flex flex-col items-center gap-1 p-2 rounded border transition-all ${metodo === m.value ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-background hover:border-primary border-border/50'}`}
                                                    >
                                                        {m.icon}
                                                        <span className="text-[9px] font-medium">{m.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="number"
                                                        value={valorInput}
                                                        onChange={e => setValorInput(e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                                    />
                                                    <span className="absolute right-3 top-2 text-xs text-muted-foreground">Kz</span>
                                                </div>
                                                <Button size="sm" onClick={addPagamento} className="px-4">Add</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        {METODOS.map(m => (
                                            <button
                                                key={m.value}
                                                onClick={() => { setMetodo(m.value); setTrocoPara(''); }}
                                                className={`flex items-center gap-2 p-3.5 rounded-xl border-2 transition-all text-sm font-semibold ${metodo === m.value ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-border/50 hover:border-primary/50'}`}
                                            >
                                                {m.icon} {m.label}
                                                {metodo === m.value && <CheckCircle2 className="h-4 w-4 ml-auto" />}
                                            </button>
                                        ))}
                                    </div>

                                    {metodo === 'dinheiro' && (
                                        <div className="space-y-2 p-3.5 border rounded-xl bg-muted/20 border-border/50">
                                            <label className="text-xs font-bold uppercase text-muted-foreground flex justify-between">
                                                Valor entregue
                                                <span className="text-[10px] lowercase font-normal italic">Troco calculado automaticamente</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={trocoPara}
                                                    onChange={e => setTrocoPara(e.target.value)}
                                                    placeholder={`${conta.totalGeral.toFixed(2)}`}
                                                    className="w-full border-2 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-mono">Kz</span>
                                            </div>
                                            {trocoPara && Number(trocoPara) >= conta.totalGeral && (
                                                <div className="flex justify-between items-center bg-green-500/10 p-2 rounded-md border border-green-500/20">
                                                    <span className="text-xs font-medium text-green-700">Troco a devolver:</span>
                                                    <span className="font-bold text-green-700">{(Number(trocoPara) - conta.totalGeral).toFixed(2)} Kz</span>
                                                </div>
                                            )}
                                            {trocoPara && Number(trocoPara) < conta.totalGeral && (
                                                <p className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                                                    ⚠️ Valor insuficiente para cobrir o total.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {temItensPendentes && (
                                <div className="p-2 border border-destructive/20 bg-destructive/5 rounded-lg text-center animate-pulse">
                                    <p className="text-[10px] text-destructive font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                                        🔒 Ação Bloqueada: Cozinha em progresso
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between gap-3 flex-row p-1 mt-2 border-t pt-4">
                    {step === 1 ? (
                        <>
                            <Button variant="ghost" onClick={onClose} size="sm" className="text-muted-foreground">Cancelar</Button>
                            <Button
                                onClick={() => setStep(2)}
                                disabled={loadingPreview || !conta}
                                className="flex-1 gap-1"
                            >
                                Avançar <ChevronRight className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => setStep(1)} size="sm" className="gap-1 text-muted-foreground h-9">
                                <ChevronLeft className="h-4 w-4" /> Voltar
                            </Button>
                            <Button
                                onClick={handleConfirmar}
                                disabled={!podeConfirmar || loadingConfirm}
                                className={`flex-1 gap-2 text-white shadow-lg ${podeConfirmar ? 'bg-green-600 hover:bg-green-700' : 'bg-muted text-muted-foreground'}`}
                            >
                                {loadingConfirm ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
                                ) : (
                                    <><CheckCircle2 className="h-4 w-4" /> Finalizar Conta</>
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
