'use client';
import Link from 'next/link';

import { useCallback, useContext, useState } from 'react';
import dynamic from 'next/dynamic';
import { ChefHat, RefreshCw } from 'lucide-react';
import { AuthContext } from '@/contexts/AuthContext';
import { useKitchenOrders } from '@/hooks/useKitchenOrders';
import { OrdersGrid } from '@/components/dashboard/order/OrdersGrid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const OrderManagerModal = dynamic(
  () => import('@/components/dashboard/order/OrderManagerModal').then(module => module.OrderManagerModal),
  { ssr: false },
);

export default function OrdersPage() {
  const { user } = useContext(AuthContext);
  const orders = useKitchenOrders(user?.organizationId);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [managingOrderId, setManagingOrderId] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string) => setExpandedOrderId(current => current === id ? null : id), []);
  const openManager = useCallback((ids: string[]) => setManagingOrderId(ids[0] || null), []);
  const closeManager = useCallback(() => {
    setManagingOrderId(null);
    void orders.refresh(true);
  }, [orders.refresh]);

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border bg-background p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary"><ChefHat className="h-7 w-7" /></div>
            <div><div className="flex items-center gap-2"><h1 className="text-2xl font-bold tracking-tight">Pedidos</h1><Badge variant="secondary">{orders.groupedOrders.length} mesas</Badge></div><p className="text-sm text-muted-foreground">Atualização imediata e sincronização em tempo real</p></div>
          </div>
          <Button variant="outline" onClick={() => void orders.refresh()} disabled={orders.loading}><RefreshCw className={`mr-2 h-4 w-4 ${orders.loading ? 'animate-spin' : ''}`} />Atualizar</Button>
        </header>

        {orders.hasPendingStockPickup && <Link href="/dashboard/economato" className="block rounded-xl border-2 border-amber-500 bg-amber-100 p-4 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          Há pedidos com produtos pendentes de receber. Abra os <strong>Levantamentos para mesas</strong> e confirme a entrega com o economato.
        </Link>}
        <OrdersGrid orders={orders.groupedOrders} loading={orders.loading} expandedOrderId={expandedOrderId}
          pendingItems={orders.pendingItems} pendingTables={orders.pendingTables} onToggleExpand={toggleExpand}
          onManage={openManager} onTogglePrepared={orders.togglePrepared} onFinish={orders.finishOrders} />

        {managingOrderId && <OrderManagerModal isOpen onClose={closeManager} orderId={managingOrderId} onOrderUpdated={orders.refresh} />}
      </div>
    </div>
  );
}
