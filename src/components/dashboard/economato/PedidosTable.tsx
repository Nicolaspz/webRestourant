'use client';
import {useAccess} from '@/contexts/AccessContext';
import { StockRequestDialog } from './StockRequestDialog';

import { useState, useEffect, useContext } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Key,
  FileText,
  Printer
} from "lucide-react";
import { toast } from 'react-toastify';
import { AuthContext } from "@/contexts/AuthContext";
import { economatoService, Area, PedidoArea } from "@/services/economato";
import { api } from "@/services/apiClients";

export function PedidosTable() {
 const {can}=useAccess();
  const { user } = useContext(AuthContext);
  const [pedidos, setPedidos] = useState<PedidoArea[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Sheet/Dialog States
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isProcessSheetOpen, setIsProcessSheetOpen] = useState(false);
  const [isConfirmSheetOpen, setIsConfirmSheetOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false); // Novo: Para visualizar itens

  const [selectedPedido, setSelectedPedido] = useState<PedidoArea | null>(null);
  const [processStatus, setProcessStatus] = useState<'aprovado' | 'rejeitado' | null>(null);
  const [processObs, setProcessObs] = useState('');
  const [confirmCode, setConfirmCode] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Initial Data
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch Pedidos
  const fetchPedidos = async (silent = false) => {
    if (!isMounted || !user?.organizationId) return;
    try {
      if (!silent) setIsLoading(true);
      const params: any = {};
      if (statusFilter !== 'todos') params.status = statusFilter;

      const data = await economatoService.getPedidos(params, user.organizationId);
      setPedidos(data || []);
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, [isMounted, statusFilter, user?.organizationId]);

  useEffect(() => {
    if (!isMounted) return;
    const refresh = () => { void fetchPedidos(true); };
    window.addEventListener('focus', refresh);
    window.addEventListener('economato-updated', refresh);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('economato-updated', refresh); };
  }, [isMounted, statusFilter, user?.organizationId]);

  if (!isMounted) return null;

  // Handlers
  const openCreateDialog = () => setIsCreateDialogOpen(true);

  const handleProcessPedido = async () => {

    if (!user?.organizationId || !user?.id || !selectedPedido || !processStatus) return;

    try {
      setIsSubmitting(true);

      const response = await api.put(`/pedidos-area/${selectedPedido.id}/processar`,
        { status: processStatus, observacoes: processObs },
        {
          params: {
            organizationId: user.organizationId,
            userId: user.id
          },
        }
      );


      toast.success(processStatus === 'aprovado'
        ? "Pedido aprovado. Peça o código ao solicitante no levantamento."
        : "Pedido rejeitado.");

      setIsProcessSheetOpen(false);
      fetchPedidos(true);
    } catch (error: any) {
      console.error("Erro ao processar pedido:", error);
      toast.error(error.response?.data?.error || "Erro ao processar pedido");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!user?.organizationId || !user?.id || !selectedPedido || !confirmCode) return;

    try {
      setIsSubmitting(true);
      await economatoService.confirmPedido(selectedPedido.id, confirmCode, user.organizationId, user.id)


      toast.success("Entrega confirmada! Stock atualizado.");
      window.dispatchEvent(new Event("economato-updated"));
      setIsConfirmSheetOpen(false);
      setConfirmCode('');
      fetchPedidos(true);
    } catch (error: any) {
      console.error("Erro ao confirmar:", error);
      toast.error(error.response?.data?.error || "Código inválido ou erro ao confirmar");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Openers
  const openProcessSheet = (pedido: PedidoArea, status: 'aprovado' | 'rejeitado') => {
    setSelectedPedido(pedido);
    setProcessStatus(status);
    setProcessObs('');
    setIsProcessSheetOpen(true);
  };

  const openConfirmSheet = (pedido: PedidoArea) => {
    setSelectedPedido(pedido);
    setConfirmCode('');
    setIsDetailsOpen(false);
    setIsProcessSheetOpen(false);
    setIsConfirmSheetOpen(true);
  };

  const handlePrintPedido = (pedido: PedidoArea) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = pedido.itens.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product?.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity} ${item.product?.unit}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Pedido de Stock - ${pedido.id.substring(0, 8)}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            .footer { margin-top: 30px; font-size: 0.8em; text-align: center; color: #666; }
            .status { font-weight: bold; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Requisição de Stock</h1>
            <p>Economato Central - ${user?.name_org || 'Sistema'}</p>
          </div>
          <p><strong>ID:</strong> ${pedido.id}</p>
          <p><strong>Data:</strong> ${new Date(pedido.criadoEm).toLocaleString()}</p>
          <p><strong>Destino:</strong> ${pedido.areaDestino.nome}</p>
          <p><strong>Status:</strong> <span class="status">${pedido.status}</span></p>
          <p><strong>Código de Confirmação:</strong> <strong>${pedido.criadoPor === user?.id ? pedido.confirmationCode || '-' : 'Disponível apenas para o solicitante'}</strong></p>
          
          <h3>Produtos:</h3>
          <table>
            <thead>
              <tr style="background: #f4f4f4;">
                <th style="padding: 8px; text-align: left;">Produto</th>
                <th style="padding: 8px; text-align: center;">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          ${pedido.observacoes ? `<p><strong>Observações:</strong> ${pedido.observacoes}</p>` : ''}
          
          <div class="footer">
            <p>Gerado por: ${user?.name || 'Sistema'} em ${new Date().toLocaleString()}</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente': return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case 'aprovado': return <Badge variant="default" className="bg-blue-600"><CheckCircle className="w-3 h-3 mr-1" /> Aguardando Retirada</Badge>;
      case 'processado': return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Entregue</Badge>;
      case 'rejeitado': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejeitado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <CardTitle>Pedidos de stock</CardTitle>
            <CardDescription>Confira a lista e confirme a solicitação → aguarde aprovação → apresente o código ao economato → receba os produtos.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => fetchPedidos()}>Atualizar</Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="aprovado">Aguardando</SelectItem>
                <SelectItem value="processado">Concluídos</SelectItem>
                <SelectItem value="rejeitado">Rejeitados</SelectItem>
              </SelectContent>
            </Select>

            <Button disabled={!can("transfers.create")} onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Solicitar Stock
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Origem <ArrowRight className="inline w-3 h-3" /> Destino</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="w-[150px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum pedido encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                pedidos.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell>{new Date(pedido.criadoEm).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-700">
                        {pedido.areaOrigem?.nome || "Stock Geral"}
                      </span>
                      <span className="mx-2 text-muted-foreground">➔</span>
                      <span className="font-medium text-green-700">{pedido.areaDestino.nome}</span>
                    </TableCell>
                    <TableCell>
                      {pedido.itens.map(item => (
                        <div key={item.id} className="text-sm">
                          {item.quantity} {item.product?.unit || 'un'} - <strong>{item.product?.name}</strong>
                        </div>
                      ))}
                    </TableCell>
                    <TableCell>{getStatusBadge(pedido.status)}</TableCell>
                    <TableCell>
                      {['pendente', 'aprovado'].includes(pedido.status) && pedido.confirmationCode ? (
                        pedido.criadoPor === user?.id ? (
                          <div className="font-mono text-lg font-bold tracking-widest bg-orange-100 text-orange-700 px-2 py-1 rounded w-fit border border-orange-200">
                            {pedido.confirmationCode}
                            <span className="block font-sans text-xs font-normal tracking-normal">Apresente ao responsável na entrega.</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs">Código Seguro</Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPedido(pedido);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <FileText className="w-3 h-3 mr-2" />
                          Itens
                        </Button>

                        {pedido.status === 'pendente' && can('transfers.update') && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-green-50 text-green-700 border-green-200"
                              onClick={() => openProcessSheet(pedido, 'aprovado')}
                            >
                              Aprovar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-red-50 text-red-700 border-red-200"
                              onClick={() => openProcessSheet(pedido, 'rejeitado')}
                            >
                              Rejeitar
                            </Button>
                          </>
                        )}

                        {pedido.status === 'aprovado' && can('transfers.update') && (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => openConfirmSheet(pedido)}
                          >
                            <Key className="w-3 h-3 mr-2" />
                            Confirmar Entrega
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {/* Dialog Detalhes do Pedido */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Detalhes da Requisição</DialogTitle>
              <DialogDescription>
                Informações completas do pedido de transferência.
              </DialogDescription>
            </DialogHeader>

            {selectedPedido && (
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Status</p>
                    {getStatusBadge(selectedPedido.status)}
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Data</p>
                    <p className="font-medium">{new Date(selectedPedido.criadoEm).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Destino</p>
                    <p className="font-medium">{selectedPedido.areaDestino.nome}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Código de Retirada</p>
                    <p className="font-mono font-bold text-blue-600">
                      {selectedPedido.criadoPor === user?.id 
                        ? (selectedPedido.confirmationCode || '-') 
                        : '*******'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold border-b pb-1">Produtos Solicitados</h4>
                  <div className="space-y-1">
                    {selectedPedido.itens.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm py-1 border-b border-dashed last:border-0">
                        <span>{item.product?.name}</span>
                        <span className="font-mono">{item.quantity} {item.product?.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedPedido.observacoes && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Observações</p>
                    <p className="text-sm bg-muted p-2 rounded">{selectedPedido.observacoes}</p>
                  </div>
                )}

                <div className="flex justify-between gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      handlePrintPedido(selectedPedido);
                    }}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                  <Button variant="default" className="flex-1" onClick={() => setIsDetailsOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <StockRequestDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onSuccess={() => fetchPedidos(true)} />

        {/* Sheet Processar (Aprovar/Rejeitar) */}
        <Sheet open={isProcessSheetOpen} onOpenChange={setIsProcessSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>
                {processStatus === 'aprovado' ? 'Aprovar Pedido' : 'Rejeitar Pedido'}
              </SheetTitle>
              <SheetDescription>
                {processStatus === 'aprovado'
                  ? "Aprovar autoriza o levantamento. O código permanece visível apenas para quem solicitou."
                  : "Rejeitar irá cancelar a solicitação."}
              </SheetDescription>
            </SheetHeader>
            <div className="py-6 space-y-4">
              <div className="bg-muted p-4 rounded-md text-sm">
                <p><strong>De:</strong> {selectedPedido?.areaOrigem?.nome || "Stock Geral"}</p>
                <p><strong>Para:</strong> {selectedPedido?.areaDestino.nome}</p>
                <div className="mt-2">
                  <strong>Itens:</strong>
                  <ul className="list-disc pl-4 mt-1">
                    {selectedPedido?.itens.map(item => (
                      <li key={item.id}>
                        {item.product.name} - {item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações da Resposta</Label>
                <Input
                  value={processObs}
                  onChange={(e) => setProcessObs(e.target.value)}
                />
              </div>
            </div>
            <SheetFooter>
              <Button
                disabled={isSubmitting}
                variant={processStatus === 'aprovado' ? 'default' : 'destructive'}
                onClick={handleProcessPedido}
              >
                Confirmar {processStatus === 'aprovado' ? 'Aprovação' : 'Rejeição'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Dialog open={isConfirmSheetOpen} onOpenChange={value => { if (!isSubmitting) setIsConfirmSheetOpen(value); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar levantamento</DialogTitle>
              <DialogDescription>Peça o código ao solicitante e confira os produtos entregues. Ao confirmar, o stock é transferido e o pedido fica recebido.</DialogDescription>
            </DialogHeader>
            <form onSubmit={e => { e.preventDefault(); void handleConfirmReceipt(); }} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="pickup-code">Código de levantamento (6 dígitos)</Label>
                <Input id="pickup-code" autoFocus type="text" inputMode="numeric" autoComplete="one-time-code"
                  value={confirmCode} onChange={e => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Digite o código" className="h-14 text-center text-xl font-mono tracking-widest bg-background text-foreground"
                  readOnly={isSubmitting} maxLength={6} required pattern="[0-9]{6}" />
                <p className="text-sm text-muted-foreground">O botão fica disponível depois de inserir os seis dígitos.</p>
              </div>
              <DialogFooter><Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setIsConfirmSheetOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting || !/^\d{6}$/.test(confirmCode)}>{isSubmitting ? 'A confirmar…' : 'Confirmar entrega e recebimento'}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </CardContent>
    </Card>
  );
}
