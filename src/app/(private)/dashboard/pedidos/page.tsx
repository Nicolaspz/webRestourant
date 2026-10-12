'use client';
import {useAccess} from '@/contexts/AccessContext';
import Link from 'next/link';

import { useCallback, useContext, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { AuthContext } from '@/contexts/AuthContext';
import { useKitchenOrders } from '@/hooks/useKitchenOrders';
import { OrdersGrid } from '@/components/dashboard/order/OrdersGrid';
import { Badge } from '@/components/ui/badge';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CenterScreenLoader } from '@/components/ui/center-screen-loader';
import { toast } from 'react-toastify';

type RecoverableSession = { id: string; mesaNumero: number; abertaEm: string; fechadaEm: string | null; pedidoCount: number };
type SessionRecoveryEntry = { id: string; mesaNumero: number; userName: string; reason: string; recoveredAt: string };

const OrderManagerModal = dynamic(
  () => import('@/components/dashboard/order/OrderManagerModal').then(module => module.OrderManagerModal),
  { ssr: false },
);

export default function OrdersPage() {
  const {can}=useAccess();
  const { user } = useContext(AuthContext);
  const orders = useKitchenOrders(user?.organizationId);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [managingOrderId, setManagingOrderId] = useState<string | null>(null);
  const [recoverableSessions, setRecoverableSessions] = useState<RecoverableSession[]>([]);
  const [recoveryHistory, setRecoveryHistory] = useState<SessionRecoveryEntry[]>([]);
  const [recoveriesLoading, setRecoveriesLoading] = useState(true);
  const [recoverableLoadError, setRecoverableLoadError] = useState(false);
  const [recoveryHistoryLoadError, setRecoveryHistoryLoadError] = useState(false);
  const [recoveryTarget, setRecoveryTarget] = useState<RecoverableSession | null>(null);
  const [recoveryReason, setRecoveryReason] = useState('');
  const [recovering, setRecovering] = useState(false);
  const canRecoverOrders = can('orders.reopen');

  const loadRecoverableSessions = useCallback(async () => {
    if (!canRecoverOrders || !user?.organizationId) return;
    setRecoveriesLoading(true);
    setRecoverableLoadError(false);
    setRecoveryHistoryLoadError(false);
    const [recoverableResult, historyResult] = await Promise.allSettled([
      api.get('/sessions/recoverable'),
      api.get('/sessions/recovery-history'),
    ]);
    if (recoverableResult.status === 'fulfilled') {
      setRecoverableSessions(recoverableResult.value.data || []);
    } else {
      setRecoverableLoadError(true);
      toast.error(recoverableResult.reason?.response?.data?.error || 'Não foi possível carregar os pedidos recuperáveis.');
    }
    if (historyResult.status === 'fulfilled') {
      setRecoveryHistory(historyResult.value.data || []);
    } else {
      setRecoveryHistoryLoadError(true);
    }
    setRecoveriesLoading(false);
  }, [canRecoverOrders, user?.organizationId]);

  useEffect(() => { void loadRecoverableSessions(); }, [loadRecoverableSessions]);

  const toggleExpand = useCallback((id: string) => setExpandedOrderId(current => current === id ? null : id), []);
  const openManager = useCallback((ids: string[]) => setManagingOrderId(ids[0] || null), []);
  const closeManager = useCallback(() => {
    setManagingOrderId(null);
    void orders.refresh(true);
    void loadRecoverableSessions();
  }, [orders.refresh, loadRecoverableSessions]);

  const recoverSession = async () => {
    if (!recoveryTarget || recoveryReason.trim().length < 5) return;
    setRecovering(true);
    try {
      const response = await api.post(`/sessions/${recoveryTarget.id}/recover`, { reason: recoveryReason.trim() });
      toast.success(response.data?.message || `Mesa ${recoveryTarget.mesaNumero} reaberta.`);
      setRecoveryTarget(null);
      setRecoveryReason('');
      await Promise.all([orders.refresh(true), loadRecoverableSessions()]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Não foi possível recuperar este pedido.');
      await loadRecoverableSessions();
    } finally {
      setRecovering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <DashboardPageHeader
          title="Pedidos"
          description="Acompanhe a preparação e o estado dos pedidos em tempo real."
          meta={<Badge variant="secondary">{orders.groupedOrders.length} mesas</Badge>}
          actions={<Button variant="outline" onClick={() => { void Promise.all([orders.refresh(), loadRecoverableSessions()]); }} disabled={orders.loading || recoveriesLoading}><RefreshCw className={`mr-2 h-4 w-4 ${orders.loading || recoveriesLoading ? 'animate-spin' : ''}`} />Atualizar</Button>}
        />

        {orders.hasPendingStockPickup && <Link href="/dashboard/economato" className="block rounded-xl border-2 border-amber-500 bg-amber-100 p-4 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          Há pedidos com produtos pendentes de receber. Abra os <strong>Levantamentos para mesas</strong> e confirme a entrega com o economato.
        </Link>}
        {canRecoverOrders && <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-semibold">Pedidos fechados recuperáveis</h2><p className="text-sm text-muted-foreground">Apenas sessões sem pagamento ou documento fiscal associado aparecem aqui.</p></div>
            <Button variant="outline" size="sm" onClick={() => void loadRecoverableSessions()} disabled={recoveriesLoading}><RefreshCw className={`mr-2 h-4 w-4 ${recoveriesLoading ? 'animate-spin' : ''}`} />Atualizar</Button>
          </div>
          {recoveriesLoading && recoverableSessions.length === 0 ? <p className="text-sm text-muted-foreground">A carregar pedidos fechados…</p> : recoverableLoadError ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Não foi possível carregar os pedidos fechados recuperáveis.</p> : recoverableSessions.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Não há pedidos fechados disponíveis para recuperação.</p> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recoverableSessions.map(session => <article key={session.id} className="flex items-center justify-between gap-3 rounded-lg border p-4">
              <div><p className="font-semibold">Mesa {session.mesaNumero}</p><p className="text-sm text-muted-foreground">{session.pedidoCount} pedido(s) · fechado {session.fechadaEm ? new Date(session.fechadaEm).toLocaleString('pt-AO') : '—'}</p></div>
              <Button size="sm" onClick={() => { setRecoveryTarget(session); setRecoveryReason(''); }}><RotateCcw className="mr-2 h-4 w-4" />Recuperar</Button>
            </article>)}
          </div>}
          <details className="rounded-lg border px-4 py-3">
            <summary className="cursor-pointer font-medium">Histórico de recuperações ({recoveryHistory.length})</summary>
            {recoveryHistoryLoadError ? <p role="alert" className="mt-3 text-sm text-amber-700">O histórico está temporariamente indisponível. A lista de pedidos recuperáveis continua a funcionar; aplique a migração do banco para ativar o registo de auditoria.</p> : recoveryHistory.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Ainda não há recuperações registadas.</p> : <ul className="mt-3 divide-y">{recoveryHistory.map(entry => <li key={entry.id} className="py-3 text-sm"><p className="font-medium">Mesa {entry.mesaNumero} · {entry.userName}</p><p className="text-muted-foreground">{new Date(entry.recoveredAt).toLocaleString('pt-AO')} · {entry.reason}</p></li>)}</ul>}
          </details>
        </section>}
        <OrdersGrid orders={orders.groupedOrders} loading={orders.loading} expandedOrderId={expandedOrderId}
          pendingItems={orders.pendingItems} pendingTables={orders.pendingTables} onToggleExpand={toggleExpand}
          canPrepare={can("orders.prepare")} canFinish={can("orders.finish")} onManage={can("orders.update") ? openManager : undefined} onUpdateStatus={orders.updateItemStatus} onFinish={orders.finishOrders} />

        {managingOrderId && <OrderManagerModal isOpen onClose={closeManager} orderId={managingOrderId} onOrderUpdated={orders.refresh} />}
        <Dialog open={Boolean(recoveryTarget)} onOpenChange={open => { if (!open && !recovering) setRecoveryTarget(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Recuperar pedido fechado</DialogTitle><DialogDescription>Esta ação reabre a sessão da Mesa {recoveryTarget?.mesaNumero} para continuar o atendimento. O sistema regista quem recuperou e o motivo.</DialogDescription></DialogHeader>
            <label className="space-y-2 text-sm font-medium">Motivo da recuperação<textarea className="min-h-24 w-full rounded-md border bg-background p-3 font-normal" maxLength={500} value={recoveryReason} onChange={event => setRecoveryReason(event.target.value)} placeholder="Ex.: mesa fechada por engano" /></label>
            <DialogFooter><Button variant="outline" disabled={recovering} onClick={() => setRecoveryTarget(null)}>Cancelar</Button><Button disabled={recovering || recoveryReason.trim().length < 5} onClick={() => void recoverSession()}>{recovering ? 'A recuperar…' : 'Confirmar recuperação'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {(orders.loading || (canRecoverOrders && recoveriesLoading)) && <CenterScreenLoader />}
    </div>
  );
}
