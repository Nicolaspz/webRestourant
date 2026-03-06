'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Banknote, CreditCard, Smartphone, ArrowLeftRight, Loader2, CheckCircle2, ChevronRight, ChevronLeft, X } from 'lucide-react';
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

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background border border-border shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header Custom */}
                <div className="flex items-center justify-between p-6 border-b bg-muted/30">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {step === 1 ? <>🧾 Conta — Mesa {mesaNumber}</> : <>💳 Pagamento — Mesa {mesaNumber}</>}
                        </h2>
                        {step === 2 && (
                            <button
                                onClick={() => { setIsSplit(!isSplit); setPagamentos([]); setMetodo(null); }}
                                className="text-xs font-semibold text-primary hover:underline text-left mt-1"
                            >
                                {isSplit ? '🔄 Pagamento Único' : '➕ Dividir Conta'}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* PASSO 1 — Resumo da conta */}
                    {step === 1 && (
                        <div className="space-y-4">
                            {loadingPreview ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-3">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-sm text-muted-foreground font-medium">A carregar consumos...</p>
                                </div>
                            ) : conta ? (
                                <>
                                    <div className="text-xs text-muted-foreground font-medium">
                                        Sessão iniciada às {new Date(conta.abertaEm).toLocaleTimeString('pt-PT')}
                                    </div>

                                    {/* Lista de itens */}
                                    <div className="space-y-1 border rounded-xl p-4 bg-muted/20">
                                        {conta.pedidos?.flatMap(p => p.items).map((item, i) => (
                                            <div key={i} className="flex justify-between items-center text-sm py-2 border-b last:border-0 border-border/50">
                                                <div className="flex items-center gap-3">
                                                    {!item.preparado && (
                                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5 bg-amber-500/10 border-amber-500/20 text-amber-600">PENDENTE</Badge>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-foreground">{item.produto}</span>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {item.precoUnitario.toLocaleString()} Kz × {item.quantidade}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-foreground">{(item.subtotal).toLocaleString()} Kz</span>
                                            </div>
                                        ))}
                                    </div>

                                    {temItensPendentes && (
                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-3">
                                            <div className="mt-0.5 p-1 bg-amber-500 rounded-full shrink-0">
                                                <Loader2 className="h-3 w-3 animate-spin text-white" />
                                            </div>
                                            <div>
                                                <p className="font-bold mb-0.5">Pedidos ainda na cozinha</p>
                                                <p className="opacity-80">Pode avançar com o fecho, mas recorde-se que alguns itens ainda não foram marcados como preparados.</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center pt-4 border-t border-dashed text-xl font-extrabold uppercase tracking-tight">
                                        <span>Total Geral</span>
                                        <span className="text-primary">{conta.totalGeral.toLocaleString()} Kz</span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-10 opacity-50">Não foi possível carregar os dados.</div>
                            )}
                        </div>
                    )}

                    {/* PASSO 2 — Pagamento */}
                    {step === 2 && conta && (
                        <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-muted rounded-xl border border-border/50 shadow-sm">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Total Final</p>
                                    <p className="text-lg font-black text-foreground">{conta.totalGeral.toLocaleString()} Kz</p>
                                </div>
                                <div className={`p-3 rounded-xl border-2 transition-colors shadow-sm ${restante <= 0.01 ? 'bg-green-500/10 text-green-700 border-green-500/30' : 'bg-primary/5 text-primary border-primary/20'}`}>
                                    <p className="text-[10px] uppercase font-bold mb-1 tracking-wider">Falta Pagar</p>
                                    <p className="text-lg font-black">{Math.max(0, restante).toLocaleString()} Kz</p>
                                </div>
                            </div>

                            {isSplit ? (
                                <div className="space-y-4">
                                    {pagamentos.length > 0 && (
                                        <div className="space-y-2 border rounded-xl p-3 max-h-40 overflow-y-auto bg-muted/10">
                                            {pagamentos.map((p, i) => (
                                                <div key={i} className="flex justify-between items-center p-3 bg-background rounded-lg border border-border text-xs shadow-sm group">
                                                    <span className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                                                            {METODOS.find(m => m.value === p.metodo)?.icon}
                                                        </div>
                                                        <span className="font-bold text-muted-foreground">{METODOS.find(m => m.value === p.metodo)?.label}</span>
                                                    </span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-black text-foreground">{p.valor.toLocaleString()} Kz</span>
                                                        <button
                                                            onClick={() => removerPagamento(i)}
                                                            className="text-muted-foreground hover:text-destructive p-1.5 hover:bg-destructive/10 rounded-full transition-all"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {restante > 0.01 && (
                                        <div className="p-4 border rounded-2xl bg-primary/5 border-primary/20 space-y-4 shadow-inner">
                                            <div className="grid grid-cols-4 gap-2">
                                                {METODOS.map(m => (
                                                    <button
                                                        key={m.value}
                                                        onClick={() => setMetodo(m.value)}
                                                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${metodo === m.value ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105' : 'bg-background hover:border-primary/40 border-border/50'}`}
                                                    >
                                                        {m.icon}
                                                        <span className="text-[10px] font-bold uppercase tracking-tighter">{m.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="number"
                                                        value={valorInput}
                                                        onChange={e => setValorInput(e.target.value)}
                                                        placeholder="Valor a adicionar"
                                                        className="w-full bg-background border-2 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                                                    />
                                                    <span className="absolute right-4 top-3 text-[10px] font-black text-muted-foreground">Kz</span>
                                                </div>
                                                <Button size="sm" onClick={addPagamento} className="px-6 rounded-xl shadow-md h-auto">ADD</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        {METODOS.map(m => (
                                            <button
                                                key={m.value}
                                                onClick={() => { setMetodo(m.value); setTrocoPara(''); }}
                                                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-sm font-bold ${metodo === m.value ? 'border-primary bg-primary/10 text-primary shadow-md scale-[1.02]' : 'border-border/50 hover:border-primary/40 hover:bg-muted/50'}`}
                                            >
                                                <div className={`p-2 rounded-xl ${metodo === m.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                    {m.icon}
                                                </div>
                                                {m.label}
                                                {metodo === m.value && <div className="ml-auto bg-primary rounded-full p-1"><CheckCircle2 className="h-3 w-3 text-white" /></div>}
                                            </button>
                                        ))}
                                    </div>

                                    {metodo === 'dinheiro' && (
                                        <div className="space-y-3 p-4 border-2 rounded-2xl bg-muted/10 border-border/40 animate-in slide-in-from-top-2">
                                            <label className="text-[11px] font-black uppercase text-muted-foreground flex justify-between tracking-widest">
                                                Valor entregue
                                                <span className="text-[9px] lowercase font-normal italic opacity-60">Troco automático</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={trocoPara}
                                                    onChange={e => setTrocoPara(e.target.value)}
                                                    placeholder={`${conta.totalGeral.toLocaleString()}`}
                                                    className="w-full bg-background border-2 rounded-xl px-4 py-3 text-lg font-black focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none shadow-sm transition-all"
                                                />
                                                <span className="absolute right-4 top-4 text-xs font-black text-muted-foreground/60">Kz</span>
                                            </div>
                                            {trocoPara && Number(trocoPara) >= conta.totalGeral && (
                                                <div className="flex justify-between items-center bg-green-500/20 p-3 rounded-xl border border-green-500/30">
                                                    <span className="text-xs font-bold text-green-700 dark:text-green-400">Troco Disponível:</span>
                                                    <span className="text-lg font-black text-green-700 dark:text-green-400">{(Number(trocoPara) - conta.totalGeral).toLocaleString()} Kz</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {temItensPendentes && (
                                <div className="p-3 border border-destructive/20 bg-destructive/5 rounded-xl text-center animate-pulse">
                                    <p className="text-[10px] text-destructive font-black uppercase tracking-wider flex items-center justify-center gap-2">
                                        🔒 BLOQUEADO: Cozinha em progresso
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Custom */}
                <div className="p-6 border-t bg-muted/30 flex gap-3">
                    {step === 1 ? (
                        <>
                            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-12 font-bold text-muted-foreground border-2">CANCELAR</Button>
                            <Button
                                onClick={() => setStep(2)}
                                disabled={loadingPreview || !conta}
                                className="flex-[2] rounded-xl h-12 font-black gap-2 shadow-lg"
                            >
                                CONTINUAR <ChevronRight className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-xl h-12 font-bold text-muted-foreground border-2 flex gap-1">
                                <ChevronLeft className="h-4 w-4" /> VOLTAR
                            </Button>
                            <Button
                                onClick={handleConfirmar}
                                disabled={!podeConfirmar || loadingConfirm}
                                className={`flex-[2] rounded-xl h-12 font-black gap-2 shadow-xl transition-all ${podeConfirmar ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/20' : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'}`}
                            >
                                {loadingConfirm ? (
                                    <><Loader2 className="h-5 w-5 animate-spin" /> PROCESSANDO...</>
                                ) : (
                                    <><CheckCircle2 className="h-5 w-5" /> CONCLUIR E PAGAR</>
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
