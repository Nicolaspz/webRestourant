'use client';

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
  const { user } = useContext(AuthContext);
  const [pedidos, setPedidos] = useState<PedidoArea[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [generalStock, setGeneralStock] = useState<any[]>([]); // Produtos do Stock Geral
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Sheet/Dialog States
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isProcessSheetOpen, setIsProcessSheetOpen] = useState(false);
  const [isConfirmSheetOpen, setIsConfirmSheetOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false); // Novo: Para visualizar itens

  // Data States
  const [newPedidoData, setNewPedidoData] = useState({
    areaDestinoId: '',
    observacoes: '',
  });

  // Multi-select for Creation
  const [selectedRequestProducts, setSelectedRequestProducts] = useState<Set<string>>(new Set());
  const [requestQuantities, setRequestQuantities] = useState<Record<string, number>>({});

  const [selectedPedido, setSelectedPedido] = useState<PedidoArea | null>(null);
  const [processStatus, setProcessStatus] = useState<'aprovado' | 'rejeitado' | null>(null);
  const [processObs, setProcessObs] = useState('');
  const [confirmCode, setConfirmCode] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Initial Data
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Carregamento de Stock Geral
  const fetchStock = async (silent = false) => {
    if (!isMounted || !user?.organizationId) return;
    try {
      const stockData = await economatoService.getGeneralStock(user.organizationId);

      // Filtra para mostrar ingrediente ou não-derivados
      const filtered = stockData.filter((item: any) =>
        item.product.isIgredient === true || item.product.isDerived === false
      );

      setGeneralStock(filtered);
    } catch (error) {
      console.error("Erro ao carregar stock geral:", error);
    }
  };

  useEffect(() => {
    async function loadData() {
      if (!isMounted || !user?.organizationId) return;
      try {
        const areasData = await economatoService.getAreas(user.organizationId);
        setAreas(areasData);
        await fetchStock(true);
      } catch (error) {
        console.error("Erro ao carregar áreas:", error);
      }
    }
    loadData();
  }, [isMounted, user?.organizationId]);

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

  if (!isMounted) return null;

  // Handlers
  const openCreateDialog = () => {
    setSelectedRequestProducts(new Set());
    setRequestQuantities({});
    setNewPedidoData({ areaDestinoId: '', observacoes: '' });
    fetchStock(true); // Garante que o stock esteja atualizado ao abrir a modal
    setIsCreateDialogOpen(true);
  };

  const toggleRequestSelection = (productId: string) => {
    const next = new Set(selectedRequestProducts);
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
    }
    setSelectedRequestProducts(next);
  };

  const handleRequestQuantityChange = (productId: string, qtd: number) => {
    setRequestQuantities(prev => ({ ...prev, [productId]: qtd }));
  };

  const handleCreatePedido = async () => {
    if (!user?.organizationId || !user?.id) return;

    if (!newPedidoData.areaDestinoId) {
      toast.warning("Selecione a área de destino.");
      return;
    }

    // Monta itens
    const itens = Array.from(selectedRequestProducts).map(productId => ({
      productId,
      quantity: requestQuantities[productId] || 0
    })).filter(i => i.quantity > 0);

    if (itens.length === 0) {
      toast.warning("Selecione produtos e informe quantidades.");
      return;
    }

    try {
      setIsSubmitting(true);
      // areaOrigemId = null (Stock Geral)
      await economatoService.createPedido({
        areaOrigemId: null,
        areaDestinoId: newPedidoData.areaDestinoId,
        observacoes: newPedidoData.observacoes,
        itens
      }, user.organizationId, user.id);

      toast.success("Pedido ao Stock Geral criado com sucesso!");
      setIsCreateDialogOpen(false);
      fetchPedidos(true);
    } catch (error: any) {
      console.error("Erro ao criar pedido:", error);
      toast.error(error.response?.data?.error || "Erro ao criar pedido");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessPedido = async () => {

    if (!user?.organizationId || !user?.id || !selectedPedido || !processStatus) return;

    try {
      setIsSubmitting(true);

      const response = await api.put(`/pedidos-area/${selectedPedido.id}/processar`,
        { status: processStatus },
        {
          params: {
            organizationId: user.organizationId,
            userId: user.id
          },
          headers: { Authorization: `Bearer ${user?.token}` },
        }
      );


      toast.success(processStatus === 'aprovado'
        ? "Pedido aprovado! O código foi gerado."
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

      await economatoService.confirmPedido(selectedPedido.id, confirmCode, user.organizationId, user.id)
      /*const response = await api.post(`/pedidos-area/${selectedPedido.id}/confirmar`, 
       { confirmCode },
       {
         params: {organizationId: user?.organizationId},
         headers: { Authorization: `Bearer ${user?.token}` },
       }
     );*/

      toast.success("Recebimento confirmado! Stock atualizado.");
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
          <p><strong>Código de Confirmação:</strong> <strong>${pedido.confirmationCode || '-'}</strong></p>
          
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
            <CardTitle>Transferências entre Áreas</CardTitle>
            <CardDescription>Gerencie solicitações de transferência de stock</CardDescription>
          </div>
          <div className="flex gap-2">
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

            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Solicitar Transferência
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
                        Stock Geral
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
                      {pedido.status === 'aprovado' && pedido.confirmationCode ? (
                        <div className="font-mono text-lg font-bold tracking-widest bg-muted px-2 py-1 rounded w-fit">
                          {pedido.confirmationCode}
                        </div>
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

                        {pedido.status === 'pendente' && (user?.role === 'ADMIN' || user?.role === 'SUPER ADMIN') && (
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

                        {pedido.status === 'aprovado' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openConfirmSheet(pedido)}
                          >
                            <Key className="w-3 h-3 mr-2" />
                            Confirmar
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
                    <p className="text-muted-foreground">Código</p>
                    <p className="font-mono font-bold text-blue-600">
                      {selectedPedido.confirmationCode || '-'}
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

        {/* Dialog Создаar Pedido */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Solicitar Stock</DialogTitle>
              <DialogDescription>
                Selecione produtos do <strong>Stock Geral</strong> para transferir.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Área Destino (Quem Recebe)</Label>
                <Select
                  value={newPedidoData.areaDestinoId}
                  onValueChange={(val) => setNewPedidoData({ ...newPedidoData, areaDestinoId: val })}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Input
                  value={newPedidoData.observacoes}
                  onChange={(e) => setNewPedidoData({ ...newPedidoData, observacoes: e.target.value })}
                  placeholder="Ex: reposição de fim de semana"
                />
              </div>

              <div className="border rounded-md">
                <div className="p-3 bg-muted border-b">
                  <h4 className="font-semibold text-sm">Produtos Disponíveis (Stock Geral)</h4>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2">
                  {generalStock.length === 0 ? (
                    <p className="text-center text-muted-foreground p-4">Nenhum ingrediente disponível no stock geral.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Disponível</TableHead>
                          <TableHead className="w-[100px]">Qtd. Pedida</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {generalStock.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedRequestProducts.has(item.product.id)}
                                onCheckedChange={() => toggleRequestSelection(item.product.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{item.product.name}</TableCell>
                            <TableCell>
                              {item.quantity} {item.product.unit}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={!selectedRequestProducts.has(item.product.id)}
                                value={requestQuantities[item.product.id] || ''}
                                onChange={(e) => handleRequestQuantityChange(item.product.id, Number(e.target.value))}
                                className="w-24"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreatePedido} disabled={isSubmitting}>Solicitar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sheet Processar (Aprovar/Rejeitar) */}
        <Sheet open={isProcessSheetOpen} onOpenChange={setIsProcessSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>
                {processStatus === 'aprovado' ? 'Aprovar Pedido' : 'Rejeitar Pedido'}
              </SheetTitle>
              <SheetDescription>
                {processStatus === 'aprovado'
                  ? "Aprovar irá gerar um código de retirada."
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

        {/* Sheet Confirmar Recebimento */}
        <Sheet open={isConfirmSheetOpen} onOpenChange={setIsConfirmSheetOpen}>
          <SheetHeader className="px-6 pt-6 mb-4">
            <SheetTitle>Confirmar Recebimento</SheetTitle>
            <SheetDescription>
              Insira o código fornecido para confirmar a retirada do Stock Geral.
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 space-y-4">
            <div className="space-y-2">
              <Label>Código de Confirmação</Label>
              <Input
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em] font-mono h-16"
                maxLength={6}
              />
            </div>
          </div>
          <SheetFooter className="px-6 pb-6 mt-6">
            <Button
              onClick={handleConfirmReceipt}
              disabled={isSubmitting || confirmCode.length < 4}
              className="w-full"
            >
              Confirmar Retirada
            </Button>
          </SheetFooter>
        </Sheet>

      </CardContent>
    </Card>
  );
}