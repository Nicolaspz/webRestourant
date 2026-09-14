"use client";
import { useContext, useEffect, useState } from 'react';
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
 order: { name?: string; tipoOrder: string; Session?: { mesa: { number: number } } };
 lines: { id: string; productName: string; unit: string; quantity: number; releasedQuantity: number; consumptionAreaName?: string }[];
};
export function StockFulfillments() {
 const { user } = useContext(AuthContext);
 const [items, setItems] = useState<Pickup[]>([]);
 const [error, setError] = useState(false);
 const [loading, setLoading] = useState(false);
 const [saving, setSaving] = useState(false);
 const [selected, setSelected] = useState<Pickup | null>(null);
 const [code, setCode] = useState('');
 const [checked, setChecked] = useState(false);
 const [search, setSearch] = useState('');
 const manager = ['ADMIN', 'SUPER ADMIN', 'ECONOMATO'].includes(user?.role || '');
 const canClaim = ['ADMIN', 'SUPER ADMIN', 'GARCON', 'COZINHA', 'BAR', 'CAIXA'].includes(user?.role || '');
 const refresh = async () => {
   if (!user?.organizationId) return;
   setLoading(true); setError(false);
   try { const { data } = await api.get('/economato/levantamentos'); setItems(data.data); }
   catch { setError(true); } finally { setLoading(false); }
 };
 useEffect(() => {
   void refresh();
   const update = () => { if (!document.hidden) void refresh(); };
   const timer = window.setInterval(update, 30000);
   window.addEventListener('focus', update); window.addEventListener('economato-updated', update);
   return () => { clearInterval(timer); window.removeEventListener('focus', update); window.removeEventListener('economato-updated', update); };
 }, [user?.organizationId]);
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
 const location = (p: Pickup) => p.order.tipoOrder === 'takeaway' ? 'Takeaway' : `Mesa ${p.order.Session?.mesa.number ?? '—'}`;
 const filtered = items.filter(p => `${location(p)} ${p.orderId} ${p.requestedByName || ''} ${p.lines.map(l => l.productName).join(' ')}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
 return <section className="space-y-4">
   <div className="flex justify-between gap-3"><h2 className="text-xl font-semibold">Levantamentos para mesas</h2><Button variant="outline" onClick={refresh} disabled={loading}>{loading ? 'A carregar…' : 'Atualizar'}</Button></div>
   <p className="text-muted-foreground">Requisições automáticas dos pedidos de clientes. O stock fica reservado até o economato conferir os produtos e confirmar o código. O cancelamento antes do levantamento liberta a reserva.</p>
   <Input aria-label="Pesquisar levantamentos" placeholder="Pesquisar mesa, pedido, funcionário ou produto…" value={search} onChange={e => setSearch(e.target.value)} />
   {error ? <p role="alert">Não foi possível carregar. Tente atualizar.</p> : !filtered.length && !loading ? <p>Sem levantamentos encontrados.</p> : filtered.map(p => <article key={p.id} className="rounded-xl border p-5 space-y-3">
     <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{location(p)} · Pedido {p.orderId.slice(0, 8)}</h3><span className={p.status === 'pendente' ? 'text-amber-600' : 'text-muted-foreground'}>{p.status === 'pendente' ? 'Reservado — aguarda levantamento' : p.status === 'entregue' ? 'Entregue pelo economato' : 'Cancelado — reserva libertada'}</span></div>
     <p className="text-sm text-muted-foreground">Requisição {p.id} · {new Date(p.createdAt).toLocaleString('pt-PT')}</p>
     <p className="text-sm">Responsável pelo levantamento: <strong>{p.requestedByName || 'Por atribuir (pedido do cliente)'}</strong></p>
     <ul className="divide-y">{p.lines.map(l => <li key={l.id} className="flex justify-between gap-4 py-2"><span>{l.productName}<small className="block text-muted-foreground">{l.consumptionAreaName || 'Atendimento'}{l.releasedQuantity > 0 ? ` · Cancelado: ${l.releasedQuantity} ${l.unit}` : ''}</small></span><strong>{l.quantity} {l.unit}</strong></li>)}</ul>
     {p.status === 'pendente' && <div className="flex flex-wrap items-center gap-3">
       {p.code && <div className="rounded border bg-muted p-3"><p className="text-xs">Código de levantamento — apresente ao economato</p><strong className="font-mono text-2xl tracking-widest">{p.code}</strong></div>}
       {!p.requestedById && canClaim && <Button disabled={saving} onClick={() => claim(p.id)}>Assumir levantamento e obter código</Button>}
       {manager && <Button disabled={!p.requestedById || saving} onClick={() => { setSelected(p); setCode(''); setChecked(false); }}>Conferir e entregar</Button>}
       {!p.code && p.requestedById && <p className="text-sm text-muted-foreground">O código está disponível apenas para {p.requestedByName}.</p>}
     </div>}
     {p.status === 'entregue' && <p className="rounded bg-muted p-3 text-sm">Entregue por <strong>{p.deliveredByName}</strong> a <strong>{p.receivedByName}</strong> em {p.deliveredAt && new Date(p.deliveredAt).toLocaleString('pt-PT')}. Saída já registada; não faça outra baixa.</p>}
   </article>)}
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
