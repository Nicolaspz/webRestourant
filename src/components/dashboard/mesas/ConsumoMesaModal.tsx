
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from '@/utils/formatCurrency'; 
import { Printer } from 'lucide-react';

interface ConsumoMesaModalProps {
  isOpen: boolean;
  onClose: () => void;
  dadosSessao: any;
  onImprimir: () => void;
}

export function ConsumoMesaModal({ isOpen, onClose, dadosSessao, onImprimir }: ConsumoMesaModalProps) {
  if (!dadosSessao) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Consumo da Mesa {dadosSessao.mesaNumero}</span>
            <Button variant="outline" size="sm" onClick={onImprimir}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 p-4">
            {/* Cabeçalho */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Abertura</p>
                  <p className="font-medium">
                    {new Date(dadosSessao.abertaEm).toLocaleString('pt-PT')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecho</p>
                  <p className="font-medium">
                    {dadosSessao.fechadaEm 
                      ? new Date(dadosSessao.fechadaEm).toLocaleString('pt-PT')
                      : 'Mesa ainda aberta'}
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de Pedidos */}
            {dadosSessao.pedidos?.map((pedido: any, idx: number) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">{pedido.nomePedido}</h3>
                  <span className="text-sm text-muted-foreground">
                    {new Date(pedido.criadoEm).toLocaleTimeString('pt-PT')}
                  </span>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="border-b text-sm">
                      <th className="text-left py-2">Item</th>
                      <th className="text-center py-2">Qtd</th>
                      <th className="text-right py-2">Preço</th>
                      <th className="text-right py-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedido.items?.map((item: any, itemIdx: number) => (
                      <tr key={itemIdx} className="border-b last:border-0">
                        <td className="py-2">{item.produto}</td>
                        <td className="text-center py-2">{item.quantidade}</td>
                        <td className="text-right py-2">{formatCurrency(item.precoUnitario)}</td>
                        <td className="text-right py-2">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Total Geral */}
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>TOTAL GERAL</span>
                <span className="text-primary">{formatCurrency(dadosSessao.totalGeral)}</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}