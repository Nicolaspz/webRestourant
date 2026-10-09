'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cachedGet, setupAPIClient } from '@/services/api';
import { useSocket } from '@/contexts/SocketContext';
import { Mesa } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProductImage } from '@/components/ProductImage';
import { toast } from 'react-toastify';
import { Armchair, ArrowLeft, CreditCard, Loader2, Minus, Plus, Printer, Search, Send, X } from 'lucide-react';

type PosProduct = {
  id: string;
  name: string;
  description?: string;
  banner?: string | null;
  isIgredient: boolean;
  isDerived?: boolean;
  Category?: { id: string; name: string } | null;
  PrecoVenda?: Array<{ preco_venda: number | string }>;
};
type CartLine = { product: PosProduct; quantity: number };
type MesaOrderItem = { id: string; amount: number; canceled?: boolean; prepared: boolean; status?: 'pendente' | 'em_preparacao' | 'pronto'; deliveredAt?: string | null; Product?: { name: string } };
type MesaOrder = { id: string; name?: string | null; draft: boolean; items: MesaOrderItem[] };

const money = new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const amountOf = (product: PosProduct) => Number(product.PrecoVenda?.[0]?.preco_venda ?? 0);
const getMesaToken = (userId: string | undefined, mesaId: string) => `POS-${userId || 'caixa'}-${mesaId}`;

export function CashierPOS({
  organizationId,
  userId,
  mesas,
  loadingMesas,
  caixaAberto,
  onRefreshMesas,
  onOpenCheckout,
  onPrintConsumption,
  mode = 'cashier',
}: {
  organizationId: string;
  userId?: string;
  mesas: Mesa[];
  loadingMesas: boolean;
  caixaAberto: boolean;
  onRefreshMesas: () => Promise<void> | void;
  onOpenCheckout: (mesa: Mesa) => void;
  onPrintConsumption: (mesaNumber: number) => void;
  mode?: 'cashier' | 'waiter';
}) {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsRefreshing, setProductsRefreshing] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [mesaSearch, setMesaSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [selectedMesaId, setSelectedMesaId] = useState('');
  const [tableTab, setTableTab] = useState<'ocupadas' | 'livres'>('ocupadas');
  const [productEntryOpen, setProductEntryOpen] = useState(false);
  const [carts, setCarts] = useState<Record<string, CartLine[]>>({});
  const [busy, setBusy] = useState(false);
  const [emptyMesaToClose, setEmptyMesaToClose] = useState<Mesa | null>(null);
  const [mesaOrders, setMesaOrders] = useState<MesaOrder[]>([]);
  const requestKey = useRef<string | null>(null);
  const { socket } = useSocket();
  const api = useMemo(() => setupAPIClient(), []);
  const isWaiter = mode === 'waiter';

  const loadMesaOrders = useCallback(async (mesaId: string) => {
    if (!isWaiter || !mesaId) return;
    try {
      const { data } = await api.get('/pos/tables/orders', { params: { organizationId, mesaId } });
      setMesaOrders(data || []);
    } catch {
      setMesaOrders([]);
    }
  }, [api, isWaiter, organizationId]);

  const loadProducts = useCallback(async (force = false) => {
    if (!organizationId) return;
    if (force) setProductsRefreshing(true);
    else setProductsLoading(true);
    try {
      const { data } = await cachedGet<PosProduct[]>('/pos/products', { organizationId }, 120_000, force);
      setProducts((data || []).filter(product => product.isIgredient === false && !['ingrediente', 'ingredientes'].includes(product.Category?.name?.trim().toLocaleLowerCase('pt') || '')));
    } catch {
      toast.error('Não foi possível carregar os produtos do POS.');
    } finally {
      setProductsLoading(false);
      setProductsRefreshing(false);
    }
  }, [organizationId]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);
  useEffect(() => {
    if (!selectedMesaId && mesas.length) {
      const first = mesas.find(mesa => mesa.status === 'ocupada') || mesas.find(mesa => mesa.status === 'livre');
      if (first) setSelectedMesaId(first.id);
    } else if (selectedMesaId && !mesas.some(mesa => mesa.id === selectedMesaId)) {
      setSelectedMesaId('');
    }
  }, [mesas, selectedMesaId]);
  useEffect(() => {
    if (!socket || !organizationId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = (event: { organizationId?: string }) => {
      if (event.organizationId !== organizationId) return;
      clearTimeout(timer);
      timer = setTimeout(() => { void onRefreshMesas(); if (isWaiter && productEntryOpen && selectedMesaId) void loadMesaOrders(selectedMesaId); }, 250);
    };
    socket.on('orders_refresh', refresh);
    return () => { clearTimeout(timer); socket.off('orders_refresh', refresh); };
  }, [socket, organizationId, onRefreshMesas, isWaiter, productEntryOpen, selectedMesaId, loadMesaOrders]);

  const selectedMesa = mesas.find(mesa => mesa.id === selectedMesaId);
  const cart = selectedMesa ? carts[selectedMesa.id] || [] : [];
  const categories = useMemo(() => ['Todas', ...Array.from(new Set(products.map(product => product.Category?.name || 'Sem categoria'))).sort((a, b) => a.localeCompare(b, 'pt'))], [products]);
  const visibleProducts = useMemo(() => {
    const search = productSearch.trim().toLocaleLowerCase('pt');
    return products.filter(product => {
      const categoryName = product.Category?.name || 'Sem categoria';
      return (category === 'Todas' || category === categoryName) && (!search || `${product.name} ${product.description || ''} ${categoryName}`.toLocaleLowerCase('pt').includes(search));
    });
  }, [products, productSearch, category]);
  const visibleMesas = useMemo(() => {
    const search = mesaSearch.trim().toLocaleLowerCase('pt');
    const status = tableTab === 'ocupadas' ? 'ocupada' : 'livre';
    return mesas.filter(mesa => mesa.status === status && (!search || `mesa ${mesa.number} ${mesa.areaName || ''}`.toLocaleLowerCase('pt').includes(search)));
  }, [mesas, mesaSearch, tableTab]);
  const occupiedCount = mesas.filter(mesa => mesa.status === 'ocupada').length;
  const freeCount = mesas.filter(mesa => mesa.status === 'livre').length;
  const waiterCanServe = (mesa: Mesa) => mesa.status === 'livre'
    || mesa.sessaoAtiva?.userId === userId
    || mesa.sessaoAtiva?.ownerRole === 'CAIXA';
  const cartTotal = cart.reduce((total, line) => total + amountOf(line.product) * line.quantity, 0);

  const addProduct = (product: PosProduct) => {
    if (!selectedMesa) { toast.info('Selecione uma mesa primeiro.'); return; }
    setCarts(current => {
      const currentCart = current[selectedMesa.id] || [];
      const found = currentCart.find(line => line.product.id === product.id);
      return { ...current, [selectedMesa.id]: found
        ? currentCart.map(line => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line)
        : [...currentCart, { product, quantity: 1 }] };
    });
  };

  const adjustQuantity = (productId: string, delta: number) => {
    if (!selectedMesa) return;
    setCarts(current => {
      const updated = (current[selectedMesa.id] || []).map(line => line.product.id === productId ? { ...line, quantity: line.quantity + delta } : line).filter(line => line.quantity > 0);
      return { ...current, [selectedMesa.id]: updated };
    });
  };

  const beginProductEntry = async (mesa: Mesa) => {
    if (!caixaAberto || busy) return;
    setSelectedMesaId(mesa.id);
    if (isWaiter) void loadMesaOrders(mesa.id);
    setCategory('Todas');
    setProductSearch('');
    setProductEntryOpen(true);
    if (mesa.status !== 'livre') return;

    setBusy(true);
    try {
      const { data } = await api.post(isWaiter ? '/pos/tables/open-waiter' : '/pos/tables/open', { mesaId: mesa.id });
      if (!isWaiter) toast.success(data?.reusedExistingSession
        ? `A Mesa ${mesa.number} já tinha um atendimento ativo; sessão recuperada.`
        : `Mesa ${mesa.number} aberta.`);
      await onRefreshMesas();
    } catch (error: any) {
      setProductEntryOpen(false);
      toast.error(error.response?.data?.error || 'Não foi possível abrir esta mesa.');
      await onRefreshMesas();
    } finally { setBusy(false); }
  };

  const sendOrder = async () => {
    if (!selectedMesa || !cart.length || busy || !caixaAberto) return;
    setBusy(true);
    try {
      const idempotencyKey = requestKey.current || crypto.randomUUID();
      requestKey.current = idempotencyKey;
      await api.post('/orders/with-stock', {
        tableNumber: selectedMesa.number,
        organizationId,
        items: cart.map(line => ({ productId: line.product.id, amount: line.quantity })),
        customerName: `Caixa — Mesa ${selectedMesa.number}`,
        clientToken: getMesaToken(userId, selectedMesa.id),
        idempotencyKey,
      });
      setCarts(current => ({ ...current, [selectedMesa.id]: [] }));
      requestKey.current = null;
      toast.success(`Pedido enviado para a Mesa ${selectedMesa.number}.`);
      if (isWaiter) void loadMesaOrders(selectedMesa.id);
      setTableTab('ocupadas');
      setProductEntryOpen(false);
      await onRefreshMesas();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Não foi possível enviar o pedido. O carrinho foi mantido.');
    } finally { setBusy(false); }
  };

  const closeMesa = async (mesa: Mesa) => {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await api.post('/pos/tables/close-empty', { mesaId: mesa.id, confirm: false });
      if (data?.reason === 'has_orders') {
        // Se já existe qualquer pedido, o checkout habitual continua obrigatório.
        onOpenCheckout(mesa);
      } else {
        setEmptyMesaToClose(mesa);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Não foi possível fechar a mesa.');
    } finally { setBusy(false); }
  };

  const confirmCloseEmptyMesa = async () => {
    if (!emptyMesaToClose || busy) return;
    const mesa = emptyMesaToClose;
    setBusy(true);
    try {
      const { data } = await api.post('/pos/tables/close-empty', { mesaId: mesa.id, confirm: true });
      if (data?.closed) {
        setEmptyMesaToClose(null);
        toast.success(`Mesa ${mesa.number} fechada sem cobrança.`);
        await onRefreshMesas();
      } else if (data?.reason === 'has_orders') {
        setEmptyMesaToClose(null);
        onOpenCheckout(mesa);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Não foi possível fechar a mesa.');
    } finally { setBusy(false); }
  };

  return <><div className="min-h-full bg-muted/20 p-3 sm:p-5 lg:p-6">
    <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
      {!isWaiter && !caixaAberto && <Card><CardContent className="p-4 text-sm text-muted-foreground">Abra o caixa no cabeçalho para começar a atender.</CardContent></Card>}

      <section className="rounded-2xl border bg-background p-3 shadow-sm sm:p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Mesas</h1>
            <p className="text-sm text-muted-foreground">Escolha uma mesa para consultar, fechar ou adicionar um pedido.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={mesaSearch} onChange={event => setMesaSearch(event.target.value)} placeholder="Pesquisar mesa" className="pl-9" /></div>
            <Button type="button" variant="outline" disabled={loadingMesas || productsRefreshing} onClick={() => { void onRefreshMesas(); void loadProducts(true); if (isWaiter && selectedMesaId) void loadMesaOrders(selectedMesaId); }} aria-label="Atualizar mesas e produtos"><Loader2 className={`h-4 w-4 ${(loadingMesas || productsRefreshing) ? 'animate-spin' : 'hidden'}`} />{!(loadingMesas || productsRefreshing) && 'Atualizar'}</Button>
          </div>
        </div>
        <div role="tablist" aria-label="Estado das mesas" className="mb-4 inline-flex rounded-xl bg-muted p-1">
          <button type="button" role="tab" aria-selected={tableTab === 'ocupadas'} onClick={() => { setTableTab('ocupadas'); setProductEntryOpen(false); }} className={`rounded-lg px-4 py-2 text-sm font-medium ${tableTab === 'ocupadas' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}>Ocupadas <span className="ml-1">({occupiedCount})</span></button>
          <button type="button" role="tab" aria-selected={tableTab === 'livres'} onClick={() => { setTableTab('livres'); setProductEntryOpen(false); }} className={`rounded-lg px-4 py-2 text-sm font-medium ${tableTab === 'livres' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}>Livres <span className="ml-1">({freeCount})</span></button>
        </div>

        {!productEntryOpen && (loadingMesas ? <p className="py-6 text-center text-sm text-muted-foreground">A carregar mesas…</p>
          : visibleMesas.length ? <div className="pos-table-grid">{visibleMesas.map(mesa => isWaiter ? <button key={mesa.id} type="button" disabled={busy || !waiterCanServe(mesa)} onClick={() => void beginProductEntry(mesa)} className="rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-55"><div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Armchair className="h-5 w-5" /></span><div><h2 className="font-semibold">Mesa {mesa.number}</h2><p className="text-xs text-muted-foreground">{mesa.areaName || 'Restaurante'}</p></div></div><Badge variant={mesa.status === 'ocupada' ? 'default' : 'secondary'}>{mesa.status === 'ocupada' ? 'Ocupada' : 'Livre'}</Badge></div><p className="text-sm text-muted-foreground">{waiterCanServe(mesa) ? 'Selecionar mesa' : `Em atendimento por ${mesa.sessaoAtiva?.ownerName || 'outro funcionário'}`}</p></button> : <article key={mesa.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Armchair className="h-5 w-5" /></span><div><h2 className="font-semibold">Mesa {mesa.number}</h2><p className="text-xs text-muted-foreground">{mesa.areaName || 'Restaurante'}</p></div></div><Badge variant={tableTab === 'ocupadas' ? 'default' : 'secondary'}>{tableTab === 'ocupadas' ? 'Ocupada' : 'Livre'}</Badge></div>
            {tableTab === 'ocupadas' ? <div className="grid gap-2 sm:grid-cols-2"><Button type="button" disabled={!caixaAberto || busy} onClick={() => void beginProductEntry(mesa)}><Plus className="mr-2 h-4 w-4" />Adicionar pedido</Button><Button type="button" variant="outline" disabled={busy} onClick={() => onPrintConsumption(mesa.number)}><Printer className="mr-2 h-4 w-4" />Consultar consumo</Button><Button type="button" variant="outline" className="sm:col-span-2 border-destructive/25 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={!caixaAberto || busy} onClick={() => void closeMesa(mesa)}><CreditCard className="mr-2 h-4 w-4" />Fechar mesa</Button></div>
              : <Button type="button" className="w-full" disabled={!caixaAberto || busy} onClick={() => void beginProductEntry(mesa)}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Armchair className="mr-2 h-4 w-4" />}Abrir mesa</Button>}
          </article>)}</div>
          : <div className="rounded-xl border border-dashed p-8 text-center"><p className="font-medium">{tableTab === 'ocupadas' ? 'Não há mesas ocupadas.' : 'Não há mesas livres.'}</p>{mesaSearch && <p className="mt-1 text-sm text-muted-foreground">Tente outra pesquisa.</p>}</div>)}
      </section>

      {productEntryOpen && selectedMesa && <>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3">
          <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Novo pedido</p><h2 className="text-lg font-bold">Mesa {selectedMesa.number}</h2></div>
          <Button type="button" variant="outline" disabled={busy} onClick={() => setProductEntryOpen(false)}><ArrowLeft className="mr-2 h-4 w-4" />Voltar às mesas</Button>
        </div>
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0 rounded-2xl border bg-background p-3 shadow-sm sm:p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Selecionar produtos</h2><p className="text-xs text-muted-foreground">Toque num produto para o adicionar ao pedido.</p></div><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input autoComplete="off" value={productSearch} onChange={event => setProductSearch(event.target.value)} placeholder="Pesquisar produto" className="pl-9" /></div></div>
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{categories.map(option => <Button key={option} type="button" size="sm" variant={category === option ? 'default' : 'outline'} onClick={() => setCategory(option)} className="shrink-0">{option}</Button>)}</div>
            {productsLoading ? <div className="pos-product-grid">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-60 animate-pulse rounded-xl bg-muted" />)}</div>
              : visibleProducts.length ? <div className="pos-product-grid">{visibleProducts.map(product => <button key={product.id} type="button" disabled={!caixaAberto || busy} onClick={() => addProduct(product)} className="group overflow-hidden rounded-xl border bg-card text-left transition-all hover:border-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"><ProductImage banner={product.banner} name={product.name} className="aspect-[4/3] w-full bg-muted object-cover" /><span className="block p-2.5"><span className="block truncate text-[11px] text-muted-foreground">{product.Category?.name || 'Sem categoria'}</span><span className="mt-1 block line-clamp-2 min-h-9 text-sm font-semibold">{product.name}</span><span className="mt-1.5 flex items-center justify-between gap-2"><span className="text-sm font-bold text-primary">{money.format(amountOf(product))} Kz</span><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Plus className="h-4 w-4" /></span></span></span></button>)}</div>
              : <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{productSearch ? 'Nenhum produto corresponde à pesquisa.' : 'Não há produtos disponíveis.'}</div>}
          </section>

          <aside className="flex min-w-0 flex-col rounded-2xl border bg-background shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100dvh-7rem)]">
            <div className="border-b p-4"><h2 className="font-semibold">Pedido da Mesa {selectedMesa.number}</h2><p className="text-xs text-muted-foreground">{cart.reduce((sum, line) => sum + line.quantity, 0)} artigo(s) no novo pedido</p></div>
            {isWaiter && <div className="border-b p-4"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Pedidos enviados</h3><Button type="button" variant="ghost" size="sm" onClick={() => void loadMesaOrders(selectedMesa.id)}>Atualizar</Button></div><div className="max-h-40 space-y-2 overflow-y-auto">{mesaOrders.flatMap(order => order.items.filter(item => !item.canceled).map(item => {
              const status = item.deliveredAt ? 'Entregue' : item.status === 'em_preparacao' ? 'Em preparação' : item.prepared || item.status === 'pronto' ? 'Pronto' : order.draft ? 'Por enviar' : 'Pendente';
              const color = status === 'Entregue' ? 'bg-sky-100 text-sky-800' : status === 'Pronto' ? 'bg-emerald-100 text-emerald-800' : status === 'Em preparação' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700';
              return <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-sm"><span className="min-w-0 truncate">{item.amount}× {item.Product?.name || 'Produto'}</span><Badge className={`shrink-0 ${color}`}>{status}</Badge></div>;
            }))}{mesaOrders.every(order => order.items.every(item => item.canceled)) && <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">Ainda não há pedidos enviados.</p>}</div></div>}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{cart.length ? <div className="space-y-2">{cart.map(line => <div key={line.product.id} className="flex items-center gap-2 rounded-lg border p-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{line.product.name}</p><p className="text-xs text-muted-foreground">{money.format(amountOf(line.product) * line.quantity)} Kz</p></div><Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={busy} onClick={() => adjustQuantity(line.product.id, -1)} aria-label={`Diminuir ${line.product.name}`}><Minus className="h-3 w-3" /></Button><span className="w-6 text-center text-sm">{line.quantity}</span><Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={busy} onClick={() => adjustQuantity(line.product.id, 1)} aria-label={`Aumentar ${line.product.name}`}><Plus className="h-3 w-3" /></Button></div>)}</div> : <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Selecione os produtos para montar o pedido.</p>}</div>
            <div className="border-t bg-muted/30 p-4"><div className="mb-3 flex items-center justify-between"><span className="font-semibold">Total</span><strong className="text-lg">{money.format(cartTotal)} Kz</strong></div><Button type="button" className="w-full" disabled={!caixaAberto || !cart.length || busy} onClick={sendOrder}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{busy ? 'A enviar…' : 'Enviar pedido'}</Button></div>
          </aside>
        </div>
      </>}
    </div>
  </div>
  <Dialog open={!!emptyMesaToClose} onOpenChange={open => { if (!open && !busy) setEmptyMesaToClose(null); }}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Fechar Mesa {emptyMesaToClose?.number}</DialogTitle>
        <DialogDescription>Esta mesa foi aberta, mas ainda não tem pedidos. Pode encerrá-la sem registar cobrança.</DialogDescription>
      </DialogHeader>
      <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">A lista de pedidos está vazia.</div>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setEmptyMesaToClose(null)}>Voltar</Button>
        <Button type="button" disabled={busy} onClick={() => void confirmCloseEmptyMesa()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Fechar sem cobrar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog></>;
}
