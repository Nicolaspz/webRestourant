"use client";
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { AuthContext } from '@/contexts/AuthContext';
import { api } from '@/services/apiClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'react-toastify';

type Pickup = {
 id: string; orderId: string; status: string; code?: string; createdAt: string; deliveredAt?: string;
 requestedById?: string; requestedByName?: string; deliveredByName?: string; receivedByName?: string;
 order: { name?: string; tipoOrder: string; User?: { id: string; name: string }; Session?: { mesa: { number: number } } };
 lines: { id: string; productName: string; unit: string; quantity: number; releasedQuantity: number; consumptionAreaName?: string }[];
};
const todayFilters = () => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Africa/Luanda', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  return { search: '', status: '', startDate: today, endDate: today, dateField: 'createdAt' };
};
const formatDate = (value: string) => new Date(value).toLocaleString('pt-PT', { timeZone: 'Africa/Luanda' });
export function StockFulfillments() {
 const { user } = useContext(AuthContext);
 const { socket } = useSocket();
 const [items, setItems] = useState<Pickup[]>([]);
 const [error, setError] = useState(false);
 const [loading, setLoading] = useState(false);
 const [saving, setSaving] = useState(false);
 const [selected, setSelected] = useState<Pickup | null>(null);
 const [code, setCode] = useState('');
 const [checked, setChecked] = useState(false);
 const [filters, setFilters] = useState(todayFilters);
 const [draftFilters, setDraftFilters] = useState(filters);
 const [page, setPage] = useState(1);
 const [total, setTotal] = useState(0);
 const [pageSize, setPageSize] = useState(25);
 const [exporting, setExporting] = useState(false);
 const requestVersion = useRef(0);
 const manager = ['ADMIN', 'SUPER ADMIN', 'ECONOMATO'].includes(user?.role || '');
 const canClaim = ['ADMIN', 'SUPER ADMIN', 'GARCON', 'COZINHA', 'BAR', 'CAIXA'].includes(user?.role || '');
 const refresh = useCallback(async () => {
   if (!user?.organizationId) return;
   const version = ++requestVersion.current;
   setLoading(true); setError(false);
   try {
     const { data } = await api.get('/economato/levantamentos', { params: { ...filters, page } });
     if (version !== requestVersion.current) return;
     const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize));
     if (page > lastPage) { setPage(lastPage); return; }
     setItems(data.data); setTotal(data.total); setPageSize(data.pageSize);
   } catch { if (version === requestVersion.current) setError(true); }
   finally { if (version === requestVersion.current) setLoading(false); }
 }, [user?.organizationId, filters, page]);
 useEffect(() => {
   void refresh();
   const update = () => { if (!document.hidden) void refresh(); };
   const timer = window.setInterval(update, 30000);
   window.addEventListener('focus', update); window.addEventListener('economato-updated', update);
   const onOrders = (event: { organizationId?: string }) => { if (event.organizationId === user?.organizationId) update(); };
   socket?.on('orders_refresh', onOrders); socket?.on('connect', update);
   return () => { requestVersion.current++; clearInterval(timer); window.removeEventListener('focus', update); window.removeEventListener('economato-updated', update); socket?.off('orders_refresh', onOrders); socket?.off('connect', update); };
 }, [refresh, socket, user?.organizationId]);
 const exportReport = async () => {
   setExporting(true);
   try {
     const { data } = await api.get('/economato/levantamentos/exportar', { params: filters, responseType: 'blob' });
     const url = URL.createObjectURL(data);
     const link = document.createElement('a'); link.href = url; link.download = `levantamentos-${filters.startDate || 'inicio'}-${filters.endDate || 'atual'}.csv`;
     document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
   } catch (e: any) {
     let message = 'Não foi possível exportar os levantamentos.';
     try { const body = e.response?.data; message = (body instanceof Blob ? JSON.parse(await body.text()) : body)?.error || message; } catch {}
     toast.error(message);
   } finally { setExporting(false); }
 };
 const claim = async (id: string) => {
   setSaving(true);
   try { await api.post(`/economato/levantamentos/${id}/assumir`); await refresh(); toast.success('Levantamento atribuído a si. Apresente o código ao economato.'); }
   catch (e: any) { toast.error(e.response?.data?.error || 'Não foi possível assumir o levantamento.'); }
   finally { setSaving(false); }
 };
 const confirm = async () => {
   if (!selected || saving || !checked || !/^\d{6}$/.test(code)) return;
   setSaving(true);
   try {
     await api.post(`/economato/levantamentos/${selected.id}/confirmar`, { code, items: selected.lines.map(l => ({ id: l.id, quantity: l.quantity })) });
     setSelected(null); setCode(''); await refresh();
     window.dispatchEvent(new Event('economato-updated'));
     toast.success('Entrega registada. O atendimento do pedido pode continuar.');
   } catch (e: any) { toast.error(e.response?.data?.error || 'Não foi possível confirmar o levantamento.'); }
   finally { setSaving(false); }
 };
 const location = (p: Pickup) => p.order.tipoOrder === 'takeaway' ? 'Takeaway' : p.order.tipoOrder === 'balcao' ? 'Balcão' : `Mesa ${p.order.Session?.mesa.number ?? '—'}`;
 return <section className="space-y-4">
   <div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-semibold">Levantamentos dos pedidos</h2><div className="flex gap-2">{manager && <Button variant="outline" onClick={exportReport} disabled={exporting || loading || error}>{exporting ? 'A exportar…' : 'Exportar CSV'}</Button>}<Button variant="outline" onClick={refresh} disabled={loading}>{loading ? 'A carregar…' : 'Atualizar'}</Button></div></div>
   <p className="text-muted-foreground">Requisições automáticas dos pedidos de clientes. O stock fica reservado até o economato conferir os produtos e confirmar o código. O cancelamento antes do levantamento liberta a reserva.</p>
   <form className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={e => {
     e.preventDefault();
     if (draftFilters.startDate && draftFilters.endDate && draftFilters.startDate > draftFilters.endDate) { toast.error('A data inicial deve ser anterior ou igual à final.'); return; }
     setPage(1); setFilters({ ...draftFilters });
   }}>
     <div className="space-y-1"><Label htmlFor="pickup-search">Pesquisar</Label><Input id="pickup-search" maxLength={150} placeholder="Mesa, pedido, funcionário, produto ou área…" value={draftFilters.search} onChange={e => setDraftFilters({ ...draftFilters, search: e.target.value })} /></div>
     <div className="space-y-1"><Label htmlFor="pickup-status">Estado</Label><select id="pickup-status" className="h-10 w-full rounded-md border bg-background px-3" value={draftFilters.status} onChange={e => setDraftFilters({ ...draftFilters, status: e.target.value })}><option value="">Todos</option><option value="pendente">Pendentes</option><option value="entregue">Entregues</option><option value="cancelado">Cancelados</option></select></div>
     <div className="space-y-1"><Label htmlFor="pickup-date-field">Filtrar por data de</Label><select id="pickup-date-field" className="h-10 w-full rounded-md border bg-background px-3" value={draftFilters.dateField} onChange={e => setDraftFilters({ ...draftFilters, dateField: e.target.value })}><option value="createdAt">Solicitação</option><option value="deliveredAt">Entrega</option></select></div>
     <div className="space-y-1"><Label htmlFor="pickup-start">Desde (Luanda)</Label><Input id="pickup-start" type="date" value={draftFilters.startDate} onChange={e => setDraftFilters({ ...draftFilters, startDate: e.target.value })} /></div>
     <div className="space-y-1"><Label htmlFor="pickup-end">Até, inclusive (Luanda)</Label><Input id="pickup-end" type="date" value={draftFilters.endDate} onChange={e => setDraftFilters({ ...draftFilters, endDate: e.target.value })} /></div>
     <div className="flex items-end gap-2"><Button type="submit">Aplicar filtros</Button><Button type="button" variant="outline" onClick={() => { const defaults = todayFilters(); setDraftFilters(defaults); setFilters(defaults); setPage(1); }}>Repor hoje</Button></div>
   </form>
   <p className="text-sm text-muted-foreground">{total} levantamento(s) nos filtros aplicados. Datas na hora de Luanda. A exportação inclui todas as páginas filtradas, uma linha por produto, sem códigos de confirmação.</p>
   {error ? <p role="alert">Não foi possível carregar. Tente atualizar ou rever os filtros.</p> : !items.length && !loading ? <p>Sem levantamentos encontrados.</p> : items.map(p => <article key={p.id} className="rounded-xl border p-5 space-y-3">
     <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{location(p)} · Pedido {p.orderId.slice(0, 8)}</h3><span className={p.status === 'pendente' ? 'text-amber-600' : 'text-muted-foreground'}>{p.status === 'pendente' ? 'Reservado — aguarda levantamento' : p.status === 'entregue' ? 'Entregue pelo economato' : 'Cancelado — reserva libertada'}</span></div>
     <p className="text-sm text-muted-foreground">Levantamento {p.id} · {formatDate(p.createdAt)} · {p.lines.length} produto(s) agrupados</p>
     <p className="text-sm">Pedido criado por: <strong>{p.order.User?.name || 'Cliente / não registado'}</strong></p>
     <p className="text-sm">Responsável pelo levantamento: <strong>{p.requestedByName || 'Por atribuir (pedido do cliente)'}</strong></p>
     <ul className="divide-y">{p.lines.map(l => <li key={l.id} className="flex justify-between gap-4 py-2"><span>{l.productName}<small className="block text-muted-foreground">{l.consumptionAreaName || 'Atendimento'}{l.releasedQuantity > 0 ? ` · Cancelado: ${l.releasedQuantity} ${l.unit}` : ''}</small></span><strong>{l.quantity} {l.unit}</strong></li>)}</ul>
     {p.status === 'pendente' && <div className="flex flex-wrap items-center gap-3">
       {p.code && <div className="rounded border bg-muted p-3"><p className="text-xs">Código de levantamento — apresente ao economato</p><strong className="font-mono text-2xl tracking-widest">{p.code}</strong></div>}
       {!p.requestedById && canClaim && <Button disabled={saving} onClick={() => claim(p.id)}>Assumir levantamento e obter código</Button>}
       {manager && <Button disabled={!p.requestedById || saving} onClick={() => { setSelected(p); setCode(''); setChecked(false); }}>Conferir e entregar</Button>}
       {!p.code && p.requestedById && <p className="text-sm text-muted-foreground">O código está disponível apenas para {p.requestedByName}.</p>}
     </div>}
     {p.status === 'entregue' && <p className="rounded bg-muted p-3 text-sm">Entregue por <strong>{p.deliveredByName}</strong> a <strong>{p.receivedByName}</strong> em {p.deliveredAt && formatDate(p.deliveredAt)}. Saída já registada; não faça outra baixa.</p>}
   </article>)}
   <div className="flex items-center justify-between gap-3"><Button variant="outline" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</Button><span>Página {page} de {Math.max(1, Math.ceil(total / pageSize))}</span><Button variant="outline" disabled={loading || page * pageSize >= total} onClick={() => setPage(value => value + 1)}>Seguinte</Button></div>
   <Dialog open={!!selected} onOpenChange={open => { if (!open && !saving) setSelected(null); }}><DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
     <DialogHeader><DialogTitle>Conferir entrega do economato</DialogTitle><DialogDescription>{selected && location(selected)} · Pedido {selected?.orderId.slice(0, 8)}. Entregue os produtos a {selected?.requestedByName} e peça o código.</DialogDescription></DialogHeader>
     <ul>{selected?.lines.filter(l => l.quantity > 0).map(l => <li className="flex justify-between gap-3 py-2" key={l.id}><span>{l.productName}</span><strong>{l.quantity} {l.unit}</strong></li>)}</ul>
     <form className="space-y-4" onSubmit={e => { e.preventDefault(); void confirm(); }}>
       <Label htmlFor="stock-pickup-code">Código apresentado pelo funcionário</Label><Input autoFocus id="stock-pickup-code" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="Seis dígitos" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required pattern="[0-9]{6}" maxLength={6} readOnly={saving} className="h-14 text-center font-mono text-xl tracking-widest" />
       <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} disabled={saving} />Conferi os produtos e as quantidades e estou a entregá-los ao funcionário indicado.</label>
       <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={() => setSelected(null)}>Cancelar</Button><Button type="submit" disabled={saving || !checked || !/^\d{6}$/.test(code)}>{saving ? 'A confirmar…' : 'Confirmar entrega'}</Button></DialogFooter>
     </form>
   </DialogContent></Dialog>
 </section>;
}
