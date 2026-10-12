"use client";
import {ActionForm} from '@/components/ui/action-feedback';

import {useAccess} from '@/contexts/AccessContext';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { AuthContext } from '@/contexts/AuthContext';
import { api } from '@/services/apiClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Loader2 } from 'lucide-react';
import { CenterScreenLoader } from '@/components/ui/center-screen-loader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'react-toastify';

type Pickup = {
 id: string; orderId: string; status: string; code?: string; createdAt: string; deliveredAt?: string;
 requestedById?: string; requestedByName?: string; deliveredByName?: string; receivedByName?: string;
 order: { name?: string; tipoOrder: string; User?: { id: string; name: string }; Session?: { mesa: { number: number } } };
 lines: { id: string; productName: string; unit: string; quantity: number; releasedQuantity: number; consumptionAreaName?: string }[];
};
const formatDate = (value: string) => new Date(value).toLocaleString('pt-PT', { timeZone: 'Africa/Luanda' });
export function StockFulfillments() {
 const {can}=useAccess();
 const { user } = useContext(AuthContext);
 const { socket } = useSocket();
 const [items, setItems] = useState<Pickup[]>([]);
 const [error, setError] = useState(false);
 const [loading, setLoading] = useState(false);
 const [blockingLoading, setBlockingLoading] = useState(false);
 const [saving, setSaving] = useState(false);
 const [confirmError, setConfirmError] = useState('');
 const [selected, setSelected] = useState<Pickup | null>(null);
 const [detailsPickup, setDetailsPickup] = useState<Pickup | null>(null);
 const [checked, setChecked] = useState(false);
 const [draftCode, setDraftCode] = useState('');
 const [lookupCode, setLookupCode] = useState('');
 const [showAll, setShowAll] = useState(false);
 const [page, setPage] = useState(1);
 const [total, setTotal] = useState(0);
 const [pageSize, setPageSize] = useState(25);
 const requestVersion = useRef(0);
 const manager = can('pickups.deliver');
 const canReadCodes = can('pickups.codes.read');
 const refresh = useCallback(async (blocking = true) => {
   if (!user?.organizationId || (!canReadCodes && !showAll && !/^\d{6}$/.test(lookupCode))) { setItems([]); setLoading(false); setBlockingLoading(false); return; }
   const version = ++requestVersion.current;
   setLoading(true); setBlockingLoading(blocking); setError(false);
   try {
     const params = showAll ? { page } : canReadCodes ? { status: 'pendente', page } : { status: 'pendente', search: lookupCode, page: 1 };
     const { data } = await api.get('/economato/levantamentos', { params });
     if (version !== requestVersion.current) return;
     setItems(data.data);
     setTotal(data.total);
     setPageSize(data.pageSize);
   } catch { if (version === requestVersion.current) setError(true); }
   finally { if (version === requestVersion.current) { setLoading(false); setBlockingLoading(false); } }
 }, [user?.organizationId, lookupCode, showAll, page, canReadCodes]);
 useEffect(() => {
   if (!canReadCodes && !showAll && !/^\d{6}$/.test(lookupCode)) { setItems([]); setLoading(false); return; }
   void refresh();
   const update = () => { if (!document.hidden) void refresh(false); };
   const timer = window.setInterval(update, 30000);
   window.addEventListener('focus', update); window.addEventListener('economato-updated', update);
   const onOrders = (event: { organizationId?: string }) => { if (event.organizationId === user?.organizationId) update(); };
   socket?.on('orders_refresh', onOrders); socket?.on('connect', update);
   return () => { requestVersion.current++; clearInterval(timer); window.removeEventListener('focus', update); window.removeEventListener('economato-updated', update); socket?.off('orders_refresh', onOrders); socket?.off('connect', update); };
 }, [refresh, socket, user?.organizationId, lookupCode, showAll, canReadCodes]);
 const confirm = async () => {
   if (!selected || saving || !checked || !/^\d{6}$/.test(lookupCode)) return;
   setConfirmError('');
   setSaving(true);
   try {
     await api.post(`/economato/levantamentos/${selected.id}/confirmar`, { code: lookupCode, items: selected.lines.map(l => ({ id: l.id, quantity: l.quantity })) });
     setSelected(null); setLookupCode(''); setDraftCode('');
     await refresh(false);
     window.dispatchEvent(new Event('economato-updated'));
     toast.success('Entrega registada. O atendimento do pedido pode continuar.');
   } catch (e: any) {
     const message = e.response?.data?.error || 'Não foi possível confirmar o levantamento.';
     setConfirmError(message);
     toast.error(message);
   }
   finally { setSaving(false); }
 };
 const location = (p: Pickup) => p.order.tipoOrder === 'takeaway' ? 'Takeaway' : p.order.tipoOrder === 'balcao' ? 'Balcão' : `Mesa ${p.order.Session?.mesa.number ?? '—'}`;
 return <section className="space-y-4">
   <h2 className="text-xl font-semibold">Levantamento de produtos</h2>
   <p className="text-muted-foreground">Pesquise um código para registar uma entrega ou consulte o histórico completo de levantamentos.</p>
   <div className="flex flex-wrap gap-2">
     {!canReadCodes && <Button type="button" variant={!showAll ? 'default' : 'outline'} onClick={() => { setBlockingLoading(false); setShowAll(false); setItems([]); setError(false); setPage(1); setLookupCode(''); setDraftCode(''); }}>Pesquisar por código</Button>}
     {canReadCodes && <Button type="button" variant={!showAll ? 'default' : 'outline'} onClick={() => { setBlockingLoading(true); setShowAll(false); setItems([]); setError(false); setPage(1); }}>Pendentes da minha área</Button>}
     <Button type="button" variant={showAll ? 'default' : 'outline'} onClick={() => { setBlockingLoading(true); setShowAll(true); setItems([]); setError(false); setLookupCode(''); setPage(1); }}>Ver todos os levantamentos</Button>
   </div>
   {!canReadCodes && !showAll && <ActionForm className="flex max-w-xl flex-col gap-2 sm:flex-row" onSubmit={e => {
     e.preventDefault();
     if (!/^\d{6}$/.test(draftCode)) { toast.error('Introduza o código de levantamento de seis dígitos.'); return; }
     setItems([]); setError(false);
     if (lookupCode === draftCode) void refresh(true); else { setBlockingLoading(true); setLookupCode(draftCode); }
   }}>
     <Input aria-label="Código de levantamento" inputMode="numeric" autoComplete="one-time-code" placeholder="Código de levantamento" value={draftCode} onChange={e => { const value = e.target.value.replace(/\D/g, '').slice(0, 6); setDraftCode(value); if (value !== lookupCode) { setLookupCode(''); setItems([]); } }} className="font-mono tracking-widest" />
     <Button type="submit" disabled={loading || draftCode.length !== 6}>{loading ? 'A pesquisar…' : 'Pesquisar código'}</Button>
   </ActionForm>}
   {(showAll || canReadCodes) && <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{total} levantamento(s) {showAll ? 'registado(s)' : 'pendente(s) na(s) sua(s) área(s)'}.</p><Button type="button" variant="outline" onClick={() => void refresh(true)} disabled={loading}>{loading ? 'A carregar…' : 'Atualizar lista'}</Button></div>}
   {error ? <p role="alert" className="text-destructive">{showAll ? 'Não foi possível carregar o histórico.' : 'Não foi possível pesquisar o código. Tente novamente.'}</p> : null}
   {!showAll && lookupCode && !loading && !error && !items.length && <p role="status" className="rounded-lg border border-dashed p-5 text-muted-foreground">Nenhum levantamento pendente encontrado para este código.</p>}
   {items.map(p => <article key={p.id} className="flex max-w-3xl flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4">
     <div className="min-w-0 space-y-1"><h3 className="truncate font-semibold">{p.lines[0]?.consumptionAreaName || 'Stock geral'} · {location(p)} · Pedido {p.orderId.slice(0, 8)}</h3>
       <p className="text-sm text-muted-foreground">{formatDate(p.createdAt)} · {p.lines.length} produto(s) · Solicitado por {p.requestedByName || 'Pedido de cliente'}</p>
       <span className={`text-sm ${p.status === 'pendente' ? 'text-amber-600' : 'text-muted-foreground'}`}>{p.status === 'pendente' ? 'Reservado — aguarda levantamento' : p.status === 'entregue' ? 'Entregue pelo economato' : 'Cancelado — reserva libertada'}</span>
     </div>
     {canReadCodes && p.status === 'pendente' && p.code && <p className="rounded-md bg-primary/5 p-3 text-sm">Código para apresentar ao Economato: <strong className="ml-2 font-mono text-lg tracking-widest">{p.code}</strong></p>}
     <div className="flex flex-wrap items-center gap-2">
       <Button type="button" variant="outline" size="sm" onClick={() => setDetailsPickup(p)}><FileText className="mr-2 h-4 w-4" />Detalhes</Button>
       {p.status === 'pendente' && manager && <>
         <Button disabled={!p.requestedById || saving} size="sm" onClick={() => { setSelected(p); setChecked(false); setConfirmError(''); }}>Conferir e entregar</Button>
       </>}
     </div>
   </article>)}
   {(showAll || canReadCodes) && !loading && !error && items.length === 0 && <p className="rounded-lg border border-dashed p-5 text-muted-foreground">{showAll ? 'Ainda não há levantamentos registados.' : 'Não há levantamentos pendentes nas suas áreas.'}</p>}
   {(showAll || canReadCodes) && <div className="flex items-center justify-between gap-3"><Button variant="outline" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</Button><span>Página {page} de {Math.max(1, Math.ceil(total / pageSize))}</span><Button variant="outline" disabled={loading || page * pageSize >= total} onClick={() => setPage(value => value + 1)}>Seguinte</Button></div>}
   {(blockingLoading || saving) && <CenterScreenLoader />}
   <Dialog open={!!detailsPickup} onOpenChange={open => { if (!open) setDetailsPickup(null); }}><DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto">
     <DialogHeader><DialogTitle>Detalhes do levantamento</DialogTitle><DialogDescription>{detailsPickup && `${location(detailsPickup)} · Pedido ${detailsPickup.orderId.slice(0, 8)} · ${formatDate(detailsPickup.createdAt)}`}</DialogDescription></DialogHeader>
     {detailsPickup && <div className="space-y-4"><div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-sm"><p>Área: <strong>{detailsPickup.lines[0]?.consumptionAreaName || 'Stock geral'}</strong></p><p>Estado: <strong>{detailsPickup.status === 'pendente' ? 'Pendente' : detailsPickup.status === 'entregue' ? 'Entregue' : 'Cancelado'}</strong></p><p>Pedido criado por: <strong>{detailsPickup.order.User?.name || 'Cliente / não registado'}</strong></p><p>Solicitado por: <strong>{detailsPickup.requestedByName || 'Pedido de cliente'}</strong></p></div><ul className="divide-y">{detailsPickup.lines.map(line => <li key={line.id} className="flex justify-between gap-4 py-3 text-sm"><span>{line.productName}<small className="block text-muted-foreground">{line.consumptionAreaName || 'Atendimento'}{line.releasedQuantity > 0 ? ` · Cancelado: ${line.releasedQuantity} ${line.unit}` : ''}</small></span><strong>{line.quantity} {line.unit}</strong></li>)}</ul>{detailsPickup.status === 'entregue' && <p className="rounded-lg bg-muted p-3 text-sm">Entregue por <strong>{detailsPickup.deliveredByName}</strong> a <strong>{detailsPickup.receivedByName}</strong>{detailsPickup.deliveredAt && ` em ${formatDate(detailsPickup.deliveredAt)}`}. Saída já registada; não faça outra baixa.</p>}</div>}
     <DialogFooter><Button variant="outline" onClick={() => setDetailsPickup(null)}>Fechar</Button></DialogFooter>
   </DialogContent></Dialog>
   <Dialog open={!!selected} onOpenChange={open => { if (!open && !saving) setSelected(null); }}><DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
     <DialogHeader><DialogTitle>Conferir entrega do economato</DialogTitle><DialogDescription>{selected && location(selected)} · Pedido {selected?.orderId.slice(0, 8)}. Entregue os produtos a {selected?.requestedByName}.</DialogDescription></DialogHeader>
     <ul>{selected?.lines.filter(l => l.quantity > 0).map(l => <li className="flex justify-between gap-3 py-2" key={l.id}><span>{l.productName}</span><strong>{l.quantity} {l.unit}</strong></li>)}</ul>
     {saving && <div role="status" aria-live="polite" className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
       <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
       <div><p className="font-semibold">A processar o levantamento…</p><p className="mt-1 text-muted-foreground">Estamos a registar a saída do stock e a confirmar a entrega. Aguarde sem fechar esta janela.</p></div>
     </div>}
     {confirmError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{confirmError}</p>}
     <ActionForm className="space-y-4" onSubmit={e => { e.preventDefault(); return confirm(); }}>
       <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} disabled={saving} />Conferi os produtos e as quantidades e estou a entregá-los ao funcionário indicado.</label>
       <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={() => setSelected(null)}>Cancelar</Button><Button type="submit" aria-busy={saving} disabled={saving || !checked || !/^\d{6}$/.test(lookupCode)}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}{saving ? 'A processar levantamento…' : 'Confirmar entrega'}</Button></DialogFooter>
     </ActionForm>
   </DialogContent></Dialog>
 </section>;
}
