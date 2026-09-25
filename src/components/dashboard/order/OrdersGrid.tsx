import { ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderCard } from './OrderCard';
import type { GroupedOrder } from '@/types/orders';

type Props = {
  canPrepare?: boolean;
  canFinish?: boolean;
  orders: GroupedOrder[];
  loading: boolean;
  expandedOrderId: string | null;
  pendingItems: Set<string>;
  pendingTables: Set<string>;
  onToggleExpand: (id: string) => void;
  onManage?: (ids: string[]) => void;
  onTogglePrepared: (id: string, prepared: boolean) => void;
  onFinish: (order: GroupedOrder) => void;
};

export function OrdersGrid({ orders, loading, expandedOrderId, pendingItems, pendingTables, ...actions }: Props) {
  if (loading) return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Card key={index}><CardHeader><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-44" /></CardHeader><CardContent className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></CardContent></Card>)}</div>;
  if (orders.length === 0) return <Card className="border-dashed"><CardContent className="flex min-h-72 flex-col items-center justify-center text-center"><div className="mb-4 rounded-2xl bg-muted p-4"><ClipboardList className="h-8 w-8 text-muted-foreground" /></div><h2 className="font-semibold">Nenhum pedido pendente</h2><p className="mt-1 text-sm text-muted-foreground">Os novos pedidos aparecerão automaticamente.</p></CardContent></Card>;

  return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{orders.map(order => <OrderCard key={order.id} order={order} expanded={expandedOrderId === order.id} pendingItems={pendingItems} finishing={pendingTables.has(order.id)} onToggleExpand={actions.onToggleExpand} onManage={actions.onManage} onTogglePrepared={actions.onTogglePrepared} onFinish={actions.onFinish} canPrepare={actions.canPrepare} canFinish={actions.canFinish} />)}</div>;
}
