'use client';

import { useCallback, useContext, useState } from 'react';
import { ChefHat, RefreshCw, Wine } from 'lucide-react';
import { AuthContext } from '@/contexts/AuthContext';
import { useOperationalOrders, type OperationalArea } from '@/hooks/useOperationalOrders';
import { OrdersGrid } from '@/components/dashboard/order/OrdersGrid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const AREA = {
  kitchen: {
    title: 'Cozinha',
    description: 'Preparação dos pratos organizada por mesa e em tempo real',
    Icon: ChefHat,
  },
  bar: {
    title: 'Bar',
    description: 'Preparação das bebidas organizada por mesa e em tempo real',
    Icon: Wine,
  },
} as const;

export function OperationalOrdersPage({ area }: { area: OperationalArea }) {
  const { user } = useContext(AuthContext);
  const queue = useOperationalOrders(user?.organizationId, area);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const toggleExpand = useCallback((id: string) => {
    setExpandedOrderId(current => current === id ? null : id);
  }, []);
  const { title, description, Icon } = AREA[area];

  return (
    <div className="min-h-screen bg-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border bg-background p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Icon className="h-7 w-7" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                <Badge variant="secondary">{queue.groupedOrders.length} mesas</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void queue.refresh()} disabled={queue.loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${queue.loading ? 'animate-spin' : ''}`} />Atualizar
          </Button>
        </header>

        <OrdersGrid
          orders={queue.groupedOrders}
          loading={queue.loading}
          expandedOrderId={expandedOrderId}
          pendingItems={queue.pendingItems}
          pendingTables={queue.pendingTables}
          onToggleExpand={toggleExpand}
          onTogglePrepared={queue.togglePrepared}
          onFinish={queue.finishOrders}
        />
      </div>
    </div>
  );
}
