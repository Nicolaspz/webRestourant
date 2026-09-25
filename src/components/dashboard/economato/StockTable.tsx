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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  AlertTriangle,
  Plus,
  RefreshCw,
  ArrowRightLeft
} from "lucide-react";
import { toast } from 'react-toastify';
import { AuthContext } from "@/contexts/AuthContext";
import { economatoService, Area, EconomatoItem } from "@/services/economato";
import { api } from "@/services/apiClients";

export function StockTable() {
 const {can}=useAccess();
  const { user } = useContext(AuthContext);

  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");
  const [stockItems, setStockItems] = useState<EconomatoItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'product' | 'ingredient'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  // Sheet State
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isAdjustSheetOpen, setIsAdjustSheetOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false); // Modal Solicitar
  const [selectedItem, setSelectedItem] = useState<EconomatoItem | null>(null);

  // Forms
  const [addData, setAddData] = useState({ productId: '', quantity: 0 });
  const [adjustData, setAdjustData] = useState({ quantity: 0, reason: '', obs: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Areas
  useEffect(() => {
    async function loadAreas() {
      if (!user?.organizationId) return;
      try {
        const data = await economatoService.getAreas(user.organizationId);
        setAreas(data);
        if (data.length > 0) setSelectedAreaId(data[0].id);

        // Load general products (for filtering)
        const prodResponse = await api.get('/produts', {
          params: { organizationId: user.organizationId }
        });
        setProducts(prodResponse.data);
      } catch (error) {
        console.error("Erro ao carregar áreas:", error);
      }
    }
    loadAreas();
  }, [user?.organizationId]);

  // Load Stock Items (Area)
  const fetchStock = async () => {
    if (!selectedAreaId || !user?.organizationId) return;
    try {
      setIsLoading(true);
      const data = await economatoService.getStockByArea(selectedAreaId, user.organizationId);
      setStockItems(data.data || []);
    } catch (error) {
      console.error("Erro ao carregar stock:", error);
      toast.error("Erro ao carregar stock");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, [selectedAreaId, user?.organizationId]);

  useEffect(() => {
    const refresh = () => { void fetchStock(); };
    window.addEventListener('economato-updated', refresh);
    return () => window.removeEventListener('economato-updated', refresh);
  }, [selectedAreaId, user?.organizationId]);

  const filteredItems = stockItems.filter(item => {
    if (filterType === 'all') return true;
    if (filterType === 'ingredient') return item.product.isIgredient;
    if (filterType === 'product') return !item.product.isIgredient;
    return true;
  });

  // Handlers
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organizationId) return;

    try {
      setIsSubmitting(true);
      await economatoService.addStock({
        areaId: selectedAreaId,
        productId: addData.productId,
        quantity: Number(addData.quantity)
      }, user.organizationId);

      toast.success("Produto adicionado ao stock!");
      setIsAddSheetOpen(false);
      setAddData({ productId: '', quantity: 0 });
      fetchStock();
    } catch (error) {
      console.error("Erro ao adicionar stock:", error);
      toast.error("Erro ao adicionar stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAdd = () => {
    setAddData({ productId: '', quantity: 0 });
    setIsAddSheetOpen(true);
  };

  const handleOpenAdjust = (item: EconomatoItem) => {
    setSelectedItem(item);
    setAdjustData({ quantity: item.quantity, reason: 'Contagem', obs: '' });
    setIsAdjustSheetOpen(true);
  };

  const handleAdjustStock = async () => {
    if (!selectedItem || !user?.organizationId || !user?.id) return;

    try {
      setIsSubmitting(true);
      await economatoService.adjustStock({
        areaId: selectedItem.areaId,
        productId: selectedItem.productId,
        novaQuantidade: Number(adjustData.quantity),
        motivo: adjustData.reason,
        observacoes: adjustData.obs
      }, user.organizationId, user.id);

      toast.success("Stock ajustado com sucesso!");
      setIsAdjustSheetOpen(false);
      fetchStock();
    } catch (error) {
      console.error("Erro ao ajustar:", error);
      toast.error("Erro ao ajustar stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="space-y-1">
            <CardTitle>Inventário por Área</CardTitle>
            <CardDescription>Visualize e gerencie o stock em cada localização.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione a Área" />
              </SelectTrigger>
              <SelectContent>
                {areas.map(area => (
                  <SelectItem key={area.id} value={area.id}>{area.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => setIsRequestDialogOpen(true)} disabled={!selectedAreaId}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Solicitar Stock
            </Button>

            <Sheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
               {/*  <SheetTrigger asChild>
                <Button onClick={handleOpenAdd} disabled={!selectedAreaId}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Item
                </Button>
              </SheetTrigger>
              */}
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Adicionar Item ao Stock</SheetTitle>
                  <SheetDescription>Selecione um produto para começar a rastrear nesta área.</SheetDescription>
                </SheetHeader>
                <form onSubmit={handleAddStock} className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label>Produto</Label>
                    <Select
                      value={addData.productId}
                      onValueChange={(val) => setAddData({ ...addData, productId: val })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade Inicial</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={addData.quantity}
                      onChange={(e) => setAddData({ ...addData, quantity: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <SheetFooter>
                    <Button type="submit" disabled={isSubmitting}>Adicionar</Button>
                  </SheetFooter>
                </form>
              </SheetContent>
            </Sheet>

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
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade (Atual)</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product.name}</TableCell>
                  <TableCell>
                    <span className="text-lg">{item.quantity}</span>
                    <span className="text-muted-foreground text-sm ml-1">{item.product.unit}</span>
                  </TableCell>
                  <TableCell>{item.minQuantity || '-'}</TableCell>
                  <TableCell>
                    {item.minQuantity && item.quantity <= item.minQuantity ? (
                      <span className="text-red-600 flex items-center text-sm font-medium">
                        <AlertTriangle className="w-4 h-4 mr-1" /> Baixo
                      </span>
                    ) : (
                      <span className="text-green-600 text-sm">OK</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!can('stock.update')}
                      onClick={() => handleOpenAdjust(item)}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Ajuste
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Sheet Ajuste */}
        <Sheet open={isAdjustSheetOpen} onOpenChange={setIsAdjustSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Ajuste de Stock</SheetTitle>
              <SheetDescription>
                Atualizar a quantidade manual (inventário físico).
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 pt-6">
              <div className="mb-4">
                <p className="font-medium">{selectedItem?.product.name}</p>
                <p className="text-sm text-muted-foreground">Atual: {selectedItem?.quantity} {selectedItem?.product.unit}</p>
              </div>

              <div className="space-y-2">
                <Label>Nova Quantidade</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData({ ...adjustData, quantity: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select
                  value={adjustData.reason}
                  onValueChange={(val) => setAdjustData({ ...adjustData, reason: val })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contagem">Contagem Física (Inventário)</SelectItem>
                    <SelectItem value="Correção">Correção de Erro</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Input
                  value={adjustData.obs}
                  onChange={(e) => setAdjustData({ ...adjustData, obs: e.target.value })}
                />
              </div>
            </div>
            <SheetFooter className="mt-6">
              <Button onClick={handleAdjustStock} disabled={isSubmitting}>Confirmar Ajuste</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <StockRequestDialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen} destinationId={selectedAreaId} />
      </CardContent>
    </Card>
  );
}
