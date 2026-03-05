'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, Banknote, Landmark } from "lucide-react";
import { setupAPIClient } from '@/services/api';
import { toast } from 'sonner';

interface TakeawayPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    pedido: any;
    onSuccess: () => void;
}

export default function TakeawayPaymentModal({
    isOpen,
    onClose,
    pedido,
    onSuccess
}: TakeawayPaymentModalProps) {
    const [metodoPagamento, setMetodoPagamento] = useState('multicaixa');
    const [valorPago, setValorPago] = useState(0);
    const [trocoPara, setTrocoPara] = useState('');
    const [loading, setLoading] = useState(false);
    const apiClient = setupAPIClient();

    const totalGeral = pedido?.items?.reduce((acc: number, item: any) => {
        let preco = item.Product?.PrecoVenda?.[0]?.preco_venda || 0;

        // Se preço for 0 e for derivado, somamos os ingredientes que impactam preço
        if (preco === 0 && item.Product?.isDerived && item.Product?.recipeItems) {
            preco = item.Product.recipeItems.reduce((sum: number, r: any) => {
                if (r.impactaPreco) {
                    const ingPreco = r.ingredient?.PrecoVenda?.[0]?.preco_venda || 0;
                    return sum + (ingPreco * r.quantity);
                }
                return sum;
            }, 0);
        }

        return acc + (preco * item.amount);
    }, 0) || 0;

    useEffect(() => {
        if (totalGeral > 0) {
            setValorPago(totalGeral);
        }
    }, [totalGeral, isOpen]);

    const metodosPagamento = [
        { value: 'multicaixa', label: 'Multicaixa', icon: <Landmark className="w-4 h-4" /> },
        { value: 'dinheiro', label: 'Dinheiro', icon: <Banknote className="w-4 h-4" /> },
        { value: 'transferencia', label: 'Transferência', icon: <Landmark className="w-4 h-4" /> },
        { value: 'cartao_debito', label: 'Cartão Débito', icon: <CreditCard className="w-4 h-4" /> },
    ];

    const troco = (parseFloat(trocoPara) || 0) > totalGeral ? (parseFloat(trocoPara) - totalGeral) : 0;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await apiClient.put(`/takeaway/pedidos/${pedido.id}/aprovar`, {
                organizationId: pedido.organizationId,
                pagamento: {
                    metodoPagamento,
                    valorPago: Number(valorPago),
                    trocoPara: trocoPara ? Number(trocoPara) : undefined,
                    observacoes: `Pagamento takeaway: ${pedido.name}`
                }
            });

            toast.success('Pedido aprovado e pagamento registado!');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Erro ao processar pagamento');
        } finally {
            setLoading(false);
        }
    };

    if (!pedido) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !loading && !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Pagamento e Aprovação</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Resumo */}
                    <Card className="p-4 bg-primary/5 border-primary/20">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Total do Pedido:</span>
                            <span className="text-2xl font-bold text-primary">
                                {totalGeral.toLocaleString('pt-AO')} Kz
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {pedido.name} — {pedido.items?.length} itens
                        </p>
                    </Card>

                    {/* Método de Pagamento */}
                    <div className="space-y-2">
                        <Label>Método de Pagamento</Label>
                        <Select value={metodoPagamento} onValueChange={setMetodoPagamento}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {metodosPagamento.map(metodo => (
                                    <SelectItem key={metodo.value} value={metodo.value}>
                                        <div className="flex items-center gap-2">
                                            {metodo.icon}
                                            {metodo.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {metodoPagamento === 'dinheiro' ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Valor Recebido</Label>
                                <Input
                                    type="number"
                                    value={trocoPara}
                                    onChange={(e) => setTrocoPara(e.target.value)}
                                    placeholder="Ex: 5000"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Troco</Label>
                                <div className="h-10 flex items-center px-3 rounded-md bg-muted font-bold text-green-600">
                                    {troco.toLocaleString('pt-AO')} Kz
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label>Valor a Confirmar</Label>
                            <Input
                                type="number"
                                value={valorPago}
                                readOnly
                                className="bg-muted font-bold"
                            />
                        </div>
                    )}

                    {metodoPagamento === 'dinheiro' && trocoPara && parseFloat(trocoPara) < totalGeral && (
                        <Alert variant="destructive" className="py-2">
                            <AlertDescription className="text-xs">
                                Valor insuficiente para cobrir o total.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || (metodoPagamento === 'dinheiro' && (parseFloat(trocoPara) || 0) < totalGeral)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            'Confirmar e Aprovar'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
