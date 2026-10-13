'use client';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { economatoService, Area } from '@/services/economato';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StockProductPicker, StockOption } from './StockProductPicker';
import { toast } from 'react-toastify';
import { useAccess } from '@/contexts/AccessContext';

export function StockRequestDialog({ open, onOpenChange, destinationId = '', onSuccess }: {
  open: boolean; onOpenChange: (open: boolean) => void; destinationId?: string; onSuccess?: () => void;
}) {
  const { user } = useContext(AuthContext);
  const { access } = useAccess();
  const [areas, setAreas] = useState<Area[]>([]);
  const [source, setSource] = useState('general');
  const [destination, setDestination] = useState(destinationId);
  const [items, setItems] = useState<StockOption[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState(false);
  const [retry, setRetry] = useState(0);
  const scopedAreas = access?.role === 'SUPER ADMIN' || access?.allAreas
    ? areas
    : areas.filter(area => access?.areaIds.includes(area.id));
  useEffect(() => {
    if (!open) return;
    setSource('general'); setDestination(destinationId); setQuantities({}); setNotes(''); setReview(false);
  }, [open, destinationId]);
  useEffect(() => {
    if (!open || !user?.organizationId) return;
    let active = true;
    setLoading(true); setError(''); setItems([]); setQuantities({});
    Promise.all([economatoService.getAreas(user.organizationId), source === 'general'
      ? economatoService.getGeneralStock(user.organizationId)
      : economatoService.getStockByArea(source, user.organizationId).then(r => r.data)])
      .then(([loadedAreas, stock]) => {
        if (active) {
          const allowed = access?.role === 'SUPER ADMIN' || access?.allAreas
            ? loadedAreas
            : loadedAreas.filter(area => access?.areaIds.includes(area.id));
          setAreas(allowed);
          setDestination(current => allowed.some(area => area.id === current) ? current : allowed[0]?.id || '');
          setItems(stock || []);
        }
      })
      .catch(() => { if (active) setError('Não foi possível carregar as áreas e o stock.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, source, user?.organizationId, retry, access]);
  const submit = async () => {
    if (!user?.organizationId || !user.id || saving) return;
    if (!destination || destination === source) return toast.warning('Selecione uma área de destino diferente da origem.');
    const entries = Object.entries(quantities);
    if (!entries.length || entries.some(([id, quantity]) => {
      const item = items.find(i => i.product.id === id);
      return !item || !Number.isFinite(quantity) || quantity <= 0 || quantity > item.quantity || (!item.product.is_fractional && !Number.isInteger(quantity));
    })) return toast.warning('Selecione produtos e informe quantidades válidas dentro do stock disponível.');
    if (!review) { setReview(true); return; }
    try {
      setSaving(true);
      await economatoService.createPedido({ areaOrigemId: source === 'general' ? null : source, areaDestinoId: destination, observacoes: notes,
        itens: entries.map(([productId, quantity]) => ({ productId, quantity })) }, user.organizationId, user.id);
      toast.success('Solicitação confirmada. O seu código está em Central do Economato > Entrada de stock nas áreas; aguarde a aprovação.');
      onOpenChange(false); onSuccess?.(); window.dispatchEvent(new Event('economato-updated'));
    } catch (e: any) {
      const requestId = e.response?.data?.requestId;
      toast.error(requestId ? `Não foi possível enviar a solicitação. Código: ${requestId}` : (e.response?.data?.error || 'Não foi possível enviar a solicitação.'));
    }
    finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={value => { if (!saving) onOpenChange(value); }}><DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>{review ? 'Conferir entrada de stock' : 'Solicitar entrada de stock'}</DialogTitle><DialogDescription>Transfira produtos do stock geral ou de outra área para uma área de serviço. O stock só muda após aprovação e confirmação da entrega.</DialogDescription></DialogHeader>
    <fieldset disabled={saving} className={review ? "hidden" : "space-y-4"}>
      {!scopedAreas.length ? <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">O seu perfil ainda não tem uma área atribuída. Peça à chefia para configurar as áreas do role.</p> : <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="stock-source">Origem</Label><select id="stock-source" className="h-11 w-full rounded-md border bg-background px-3" value={source} onChange={e => setSource(e.target.value)}><option value="general">Stock Geral</option>{scopedAreas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="stock-destination">Área que recebe</Label><select id="stock-destination" className="h-11 w-full rounded-md border bg-background px-3" value={destination} onChange={e => setDestination(e.target.value)}><option value="">Selecione a área</option>{scopedAreas.filter(a => a.id !== source).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select></div>
      </div>
      }
      <Input placeholder="Observações (opcional)" aria-label="Observações" value={notes} onChange={e => setNotes(e.target.value)} />
      {loading ? <p role="status">A carregar produtos…</p> : error ? <div role="alert">{error} <Button type="button" variant="outline" onClick={() => setRetry(r => r + 1)}>Tentar novamente</Button></div> : <StockProductPicker items={items} quantities={quantities} onChange={setQuantities} />}
    </fieldset>
    {review && <div className="space-y-3">
      <p><strong>Origem:</strong> {source === 'general' ? 'Stock Geral' : areas.find(a => a.id === source)?.nome}</p>
      <p><strong>Destino:</strong> {scopedAreas.find(a => a.id === destination)?.nome}</p>
      <ul className="divide-y rounded border p-3">{Object.entries(quantities).map(([id, quantity]) => {
        const product = items.find(i => i.product.id === id)?.product;
        return <li key={id} className="flex justify-between gap-4 py-2"><span>{product?.name}</span><strong>{quantity} {product?.unit || 'un'}</strong></li>;
      })}</ul>
      {notes && <p>{notes}</p>}
      <p className="text-sm text-muted-foreground">Ao confirmar, o pedido e o código de confirmação da entrega são criados. Só o solicitante vê o código. O economato aprova e regista a saída e a entrada na área de destino.</p>
      <Button variant="outline" disabled={saving} onClick={() => setReview(false)}>Editar lista</Button>
    </div>}
    <DialogFooter><Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={saving || loading || !!error || !destination || !scopedAreas.length || !Object.keys(quantities).length} onClick={submit}>{saving ? 'A enviar…' : review ? 'Confirmar e gerar código' : 'Conferir lista'}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
