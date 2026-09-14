'use client';
import { StockProductPicker, StockOption } from './StockProductPicker';

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
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { 
  Loader2,
  Plus,
  AlertCircle,
  Users,
  UtensilsCrossed,
  Clock,
  LayoutDashboard
} from "lucide-react";
import { useMemo } from "react";
import { toast } from 'react-toastify';
import { AuthContext } from "@/contexts/AuthContext";
import { economatoService, Area, ConsumoInterno } from "@/services/economato";
import { api } from "@/services/apiClients";

export function ConsumoTable() {
  const { user } = useContext(AuthContext);
  const [consumos, setConsumos] = useState<ConsumoInterno[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [products, setProducts] = useState<StockOption[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState(false);
  const [stockRetry, setStockRetry] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [areaFilter, setAreaFilter] = useState<string>('all');

  // Sheet State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  const [newData, setNewData] = useState({
    areaId: '',
    productId: '',
    quantity: 0,
    motivo: '',
    observacoes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Relatório de Resumo
  const stats = useMemo(() => {
    const report = {
      total: consumos.length,
      quebras: consumos.filter(c => c.motivo === 'Quebra').length,
      staff: consumos.filter(c => c.motivo === 'Refeição Staff').length,
      validades: consumos.filter(c => c.motivo === 'Validade').length,
      outros: consumos.filter(c => !['Quebra', 'Refeição Staff', 'Validade'].includes(c.motivo)).length,
    };
    return report;
  }, [consumos]);

  // Carregar dados iniciais
  useEffect(() => {
    async function loadData() {
      if (!user?.organizationId) return;
      try {
        const areasData = await economatoService.getAreas(user.organizationId);
        setAreas(areasData);
        
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    }
    loadData();
  }, [user?.organizationId]);

  useEffect(() => {
    if (!isSheetOpen || !newData.areaId || !user?.organizationId) return;
    let active = true;
    setProducts([]); setStockLoading(true); setStockError(false);
    const request = newData.areaId === 'general'
      ? economatoService.getGeneralStock(user.organizationId)
      : economatoService.getStockByArea(newData.areaId, user.organizationId).then(r => r.data);
    request.then(data => { if (active) setProducts(data || []); })
      .catch(() => { if (active) setStockError(true); })
      .finally(() => { if (active) setStockLoading(false); });
    return () => { active = false; };
  }, [isSheetOpen, newData.areaId, user?.organizationId, stockRetry]);
  const selectedStock = products.find(p => p.product.id === newData.productId);

  // Carregar Consumos
  const fetchConsumos = async () => {
    if (!user?.organizationId) return;
    try {
      setIsLoading(true);
      const params: any = {};
      if (areaFilter !== 'all') params.areaId = areaFilter;

      const data = await economatoService.getConsumos(params, user.organizationId);
      setConsumos(data.data || []);
    } catch (error) {
      console.error("Erro ao carregar consumos:", error);
      toast.error("Erro ao carregar consumos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConsumos();
  }, [areaFilter, user?.organizationId]);

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organizationId) return;
    if (!user?.id) return;

    if (!selectedStock || !newData.motivo || !Number.isFinite(newData.quantity) || newData.quantity <= 0 || newData.quantity > selectedStock.quantity || (!selectedStock.product.is_fractional && !Number.isInteger(newData.quantity))) {
      toast.warning('Selecione o local, o produto, o motivo e uma quantidade válida dentro do disponível.');
      return;
    }
    try {
      setIsSubmitting(true);
      await economatoService.createConsumo({
        areaId: newData.areaId === 'general' ? null : newData.areaId,
        productId: newData.productId,
        quantity: Number(newData.quantity),
        motivo: newData.motivo,
        observacoes: newData.observacoes
      }, user.organizationId, user.id);

      toast.success("Consumo registrado com sucesso!");
      setIsSheetOpen(false);
      setNewData({
        areaId: '',
        productId: '',
        quantity: 0,
        motivo: '',
        observacoes: ''
      });
      fetchConsumos();
      window.dispatchEvent(new Event("economato-updated"));
    } catch (error: any) {
      console.error("Erro ao registrar consumo:", error);
      toast.error(error.response?.data?.error || "Erro ao registrar consumo");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-blue-600" />
              Total Registos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-2xl font-bold">{stats.total}</span>
          </CardContent>
        </Card>

        <Card className="bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-800">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              Quebras
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-2xl font-bold text-red-700">{stats.quebras}</span>
          </CardContent>
        </Card>

        <Card className="bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-800">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-600">
              <Users className="w-4 h-4" />
              Staff
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-2xl font-bold text-green-700">{stats.staff}</span>
          </CardContent>
        </Card>

        <Card className="bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-600">
              <Clock className="w-4 h-4" />
              Validade
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-2xl font-bold text-orange-700">{stats.validades}</span>
          </CardContent>
        </Card>

        <Card className="bg-gray-50/50 border-gray-100 dark:bg-gray-900/10 dark:border-gray-800">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600">
              <Plus className="w-4 h-4" />
              Outros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-2xl font-bold text-gray-700">{stats.outros}</span>
          </CardContent>
        </Card>
      </div>
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <CardTitle>Histórico de Consumo Interno</CardTitle>
            <CardDescription>Registe quebras, refeições de staff e outros consumos internos</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filtrar por Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Áreas</SelectItem>
                <SelectItem value="general">Stock Geral</SelectItem>
                {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="destructive">
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Quebra/Consumo
                </Button>
              </SheetTrigger>
              <SheetContent className="sm:max-w-2xl overflow-y-auto p-6">
                <SheetHeader>
                  <SheetTitle>Registrar Quebra / Consumo</SheetTitle>
                  <SheetDescription>Escolha onde ocorreu a quebra ou consumo: Stock Geral ou uma área. A baixa desconta apenas esse local.</SheetDescription>
                </SheetHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label>Área (Baixa de Stock)</Label>
                    <Select 
                      value={newData.areaId} 
                      onValueChange={(val) => setNewData({...newData, areaId: val, productId: '', quantity: 0})}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione a área" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Stock Geral</SelectItem>
                        {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {newData.areaId && <div className="space-y-2">
                    <Label>Produto no local selecionado</Label>
                    {stockLoading ? <p>A carregar stock…</p> : stockError ? <div role="alert">Erro ao carregar stock. <Button type="button" variant="outline" onClick={() => setStockRetry(r => r + 1)}>Tentar novamente</Button></div> : <StockProductPicker single items={products} quantities={newData.productId ? { [newData.productId]: newData.quantity } : {}} onChange={next => setNewData({ ...newData, productId: Object.keys(next)[0] || '', quantity: 0 })} />}
                  </div>}

                  <div className="space-y-2">
                    <Label>Quantidade {selectedStock ? `(${selectedStock.product.unit || 'un'}) — disponível: ${selectedStock.quantity}` : ''}</Label>
                    <Input 
                      type="number"
                      min={selectedStock?.product.is_fractional ? "0.001" : "1"}
                      max={selectedStock?.quantity}
                      step={selectedStock?.product.is_fractional ? "any" : "1"}
                      value={newData.quantity}
                      onChange={(e) => setNewData({...newData, quantity: Number(e.target.value)})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Motivo</Label>
                    <Select 
                      value={newData.motivo} 
                      onValueChange={(val) => setNewData({...newData, motivo: val})}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Quebra">Quebra / Avaria</SelectItem>
                        <SelectItem value="Refeição Staff">Refeição Staff</SelectItem>
                        <SelectItem value="Degustação">Degustação</SelectItem>
                        <SelectItem value="Validade">Validade Expirada</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Input 
                      value={newData.observacoes}
                      onChange={(e) => setNewData({...newData, observacoes: e.target.value})}
                    />
                  </div>
                  
                  <SheetFooter>
                    <Button type="submit" variant="destructive" disabled={isSubmitting || stockLoading || stockError || !selectedStock || !newData.motivo || newData.quantity <= 0}>
                      Registrar Baixa
                    </Button>
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
                <TableHead>Data</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Qtd.</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consumos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                consumos.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.criadoEm).toLocaleDateString()} {new Date(item.criadoEm).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</TableCell>
                    <TableCell>{item.area?.nome || "Stock Geral"}</TableCell>
                    <TableCell>{item.product?.name}</TableCell>
                    <TableCell>{item.quantity} {item.product?.unit || 'un'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.motivo}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.observacoes || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
      </Card>
    </div>
  );
}