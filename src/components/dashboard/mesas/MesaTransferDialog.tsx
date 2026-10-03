'use client';

import { useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import { setupAPIClient } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Mesa } from '@/types/product';

type TransferItem = { id: string; name: string; amount: number; prepared: boolean; canTransfer: boolean };

export function MesaTransferDialog({ mesa, mesas, onComplete }: { mesa: Mesa; mesas: Mesa[]; onComplete: () => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'table' | 'product'>('table');
  const [targetMesaId, setTargetMesaId] = useState('');
  const [itemId, setItemId] = useState('');
  const [amount, setAmount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const targets = mesas.filter(candidate => candidate.id !== mesa.id && (mode === 'table'
    ? candidate.status === 'livre'
    : candidate.status === 'livre' || candidate.status === 'ocupada'));
  const selectedItem = transferItems.find(item => item.id === itemId);

  async function changeOpen(value: boolean) {
    if (busy) return;
    setOpen(value);
    if (!value) return;
    setLoadingItems(true);
    try {
      const { data } = await setupAPIClient().get(`/mesas/${mesa.id}/transfer-items`);
      setTransferItems(data);
      setItemId('');
      setAmount(1);
    } catch (error: any) {
      setTransferItems([]);
      toast.error(error.response?.data?.error || 'Não foi possível carregar os produtos desta mesa.');
    } finally {
      setLoadingItems(false);
    }
  }

  async function transfer() {
    if (!targetMesaId || (mode === 'product' && (!selectedItem || !selectedItem.canTransfer))) return;
    setBusy(true);
    try {
      const { data } = await setupAPIClient().post('/mesas/transferir', {
        sourceMesaId: mesa.id,
        targetMesaId,
        ...(mode === 'product' ? { itemId, amount } : {}),
      });
      toast.success(mode === 'table'
        ? `Mesa ${data.sourceMesaNumber} transferida para a Mesa ${data.targetMesaNumber}.`
        : `${amount} × ${selectedItem?.name} transferido para a Mesa ${data.targetMesaNumber}.`);
      setOpen(false);
      onComplete();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Não foi possível transferir. Atualize as mesas e tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild><Button type="button" variant="outline" className="w-full gap-2"><ArrowRightLeft className="h-4 w-4" />Transferir</Button></DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Corrigir consumo da Mesa {mesa.number}</DialogTitle>
        <DialogDescription>Transfira a conta inteira para uma mesa livre ou mova uma quantidade de um produto para outra mesa.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={mode === 'table' ? 'default' : 'outline'} disabled={busy} onClick={() => { setMode('table'); setTargetMesaId(''); }}>Mesa inteira</Button>
          <Button type="button" variant={mode === 'product' ? 'default' : 'outline'} disabled={busy} onClick={() => { setMode('product'); setTargetMesaId(''); }}>Produto</Button>
        </div>
        {mode === 'product' && <>
          <div className="space-y-2">
            <Label htmlFor={`transfer-item-${mesa.id}`}>Produto da conta</Label>
            <select id={`transfer-item-${mesa.id}`} className="h-10 w-full rounded-md border bg-background px-3" value={itemId} disabled={busy || loadingItems} onChange={event => { const next = transferItems.find(item => item.id === event.target.value); setItemId(event.target.value); setAmount(next?.amount ?? 1); }}>
              <option value="">Selecione um produto</option>
              {transferItems.map(item => <option key={item.id} value={item.id} disabled={!item.canTransfer}>{item.name} — {item.amount} un. {item.prepared ? '(preparado)' : ''}{!item.canTransfer ? ' (levantamento associado)' : ''}</option>)}
            </select>
            {loadingItems && <p role="status" className="text-xs text-muted-foreground">A carregar produtos da sessão…</p>}
            {!loadingItems && !transferItems.length && <p className="text-xs text-muted-foreground">Esta mesa não tem produtos ativos para transferir.</p>}
            {!loadingItems && transferItems.length > 0 && transferItems.every(item => !item.canTransfer) && <p className="text-xs text-amber-700">Os pedidos têm levantamento de stock associado. Transfira a mesa inteira para preservar o histórico.</p>}
          </div>
          {selectedItem && <div className="space-y-2">
            <Label htmlFor={`transfer-amount-${mesa.id}`}>Quantidade a transferir</Label>
            <input id={`transfer-amount-${mesa.id}`} type="number" min={1} max={selectedItem.amount} step={1} value={amount} disabled={busy} onChange={event => setAmount(Math.min(selectedItem.amount, Math.max(1, Number(event.target.value) || 1)))} className="h-10 w-full rounded-md border bg-background px-3" />
          </div>}
        </>}
        <div className="space-y-2">
          <Label htmlFor={`transfer-target-${mesa.id}`}>Transferir para</Label>
          <select id={`transfer-target-${mesa.id}`} className="h-10 w-full rounded-md border bg-background px-3" value={targetMesaId} disabled={busy} onChange={event => setTargetMesaId(event.target.value)}>
            <option value="">Selecione a mesa de destino</option>
            {targets.map(target => <option key={target.id} value={target.id}>Mesa {target.number} — {target.status === 'livre' ? 'Livre' : 'Em atendimento'}</option>)}
          </select>
          {!targets.length && <p className="text-xs text-muted-foreground">Não há mesas compatíveis disponíveis para esta transferência.</p>}
        </div>
        {mode === 'table' && <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">A conta e os pedidos acompanham a sessão. A mesa de destino precisa estar livre.</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="button" disabled={busy || !targetMesaId || (mode === 'product' && (!itemId || !selectedItem?.canTransfer))} onClick={transfer}>{busy ? 'A transferir…' : 'Confirmar transferência'}</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
