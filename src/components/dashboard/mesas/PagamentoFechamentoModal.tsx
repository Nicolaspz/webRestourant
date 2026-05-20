// components/dashboard/mesas/PagamentoFechamentoModal.tsx
'use client';

import React, { useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { toast } from 'react-toastify';
import { setupAPIClient } from '@/services/api';
import { formatCurrency } from '@/utils/formatCurrency'; 
import { gerarPDFReciboPago } from './pdfNpago';

interface PagamentoFechamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  mesaNumber: number;
  dadosSessao: any;
  onSuccess: () => void;
}

export function PagamentoFechamentoModal({ 
  isOpen, 
  onClose, 
  mesaNumber, 
  dadosSessao, 
  onSuccess 
}: PagamentoFechamentoModalProps) {
  const [tipoPagamento, setTipoPagamento] = useState<'unico' | 'multiplo'>('unico');
  const [metodoPagamento, setMetodoPagamento] = useState('dinheiro');
  const [valorPago, setValorPago] = useState(dadosSessao?.totalGeral || 0);
  const [trocoPara, setTrocoPara] = useState('');
  const [formatoImpressao, setFormatoImpressao] = useState<'termica' | 'a4'>('termica');
  const [loading, setLoading] = useState(false);
  const apiClient = setupAPIClient();

  const metodosPagamento = [
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'cartao', label: 'Cartão Débito' },
    { value: 'multicaixa', label: 'Multicaixa' },
    { value: 'transferencia', label: 'Transferência' },
  ];

  const calcularTroco = () => {
    if (metodoPagamento === 'dinheiro' && trocoPara) {
      return parseFloat(trocoPara) - dadosSessao.totalGeral;
    }
    return 0;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        mesaNumber,
        organizationId: dadosSessao.organization?.id,
        pagamento: {
          metodo: metodoPagamento,
          valorPago: valorPago,
          ...(metodoPagamento === 'dinheiro' && trocoPara && { trocoPara: parseFloat(trocoPara) })
        }
      };

      const response = await apiClient.post('/mesas/fechar-com-pagamento', payload);

      toast.success('Mesa fechada e pagamento processado com sucesso!');
      
      // Gerar PDF do recibo pago
      const dadosRecibo = response.data.recibo || response.data;
      if (dadosRecibo) {
        // Passar informações de pagamento e formato
        gerarPDFReciboPago(
          dadosRecibo, 
          { 
            metodo: metodoPagamento, 
            valorPago: valorPago, 
            trocoPara: trocoPara ? parseFloat(trocoPara) : undefined 
          },
          formatoImpressao === 'termica'
        );
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  if (!dadosSessao) return null;

  const troco = calcularTroco();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Fechar Mesa {mesaNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Resumo */}
          <Card className="p-4 bg-muted/50">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total a Pagar:</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(dadosSessao.totalGeral)}
              </span>
            </div>
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
                    {metodo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {metodoPagamento === 'dinheiro' && (
            <>
              <div className="space-y-2">
                <Label>Valor Pago</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={valorPago}
                  onChange={(e) => setValorPago(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label>Troco Para (opcional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={trocoPara}
                  onChange={(e) => setTrocoPara(e.target.value)}
                  placeholder="Deixar em branco para calcular troco"
                />
              </div>

              {troco > 0 && (
                <Alert>
                  <AlertDescription>
                    Troco: {formatCurrency(troco)}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* Formato de Impressão */}
          <div className="space-y-3 pt-2">
            <Label>Formato de Impressão</Label>
            <RadioGroup 
              value={formatoImpressao} 
              onValueChange={(val: any) => setFormatoImpressao(val)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="termica" id="termica" />
                <Label htmlFor="termica" className="font-normal cursor-pointer">Térmica (80mm)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="a4" id="a4" />
                <Label htmlFor="a4" className="font-normal cursor-pointer">A4</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar Pagamento e Fechar Mesa'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}