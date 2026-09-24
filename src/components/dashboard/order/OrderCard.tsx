'use client';

import { memo } from 'react';
import { Check, Circle, CircleCheck, Eye, Loader2, Settings2, LockKeyhole, PackageOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { GroupedOrder } from '@/types/orders';

const timeAgo = (value: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `há ${hours} h` : `há ${Math.floor(hours / 24)} d`;
};

type Props = {
  order: GroupedOrder;
  expanded: boolean;
  pendingItems: Set<string>;
  finishing: boolean;
  onToggleExpand: (id: string) => void;
  onManage?: (orderIds: string[]) => void;
  onTogglePrepared: (itemId: string, prepared: boolean) => void;
  onFinish: (order: GroupedOrder) => void;
};

export const OrderCard = memo(function OrderCard({ order, expanded, pendingItems, finishing, onToggleExpand, onManage, onTogglePrepared, onFinish }: Props) {
  const allPrepared = order.allPrepared ?? (order.items.length > 0 && order.items.every(item => item.prepared || item.canceled));
  const visibleItems = expanded ? order.items : order.items.slice(0, 3);

  return (
    <Card className={`overflow-hidden transition-colors ${allPrepared ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">Mesa {order.Session.mesa.number}
              {allPrepared && !order.awaitingStockPickup && <Badge className="bg-emerald-600 hover:bg-emerald-600">Pronto</Badge>}
            </CardTitle>
            <CardDescription>{order.orderIds.length} pedido(s) · atualizado {timeAgo(order.created_at)}</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onToggleExpand(order.id)} aria-label="Mostrar itens"><Eye className="h-4 w-4" /></Button>
            {onManage && <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onManage(order.orderIds)} aria-label="Gerir pedido"><Settings2 className="h-4 w-4" /></Button>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {order.awaitingStockPickup && <div role="status" className="flex gap-3 rounded-xl border-2 border-amber-500 bg-amber-100 p-3 text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          <PackageOpen className="h-6 w-6 shrink-0" aria-hidden="true" />
          <div><p className="font-bold">Levantamento pendente no economato</p><p className="text-sm">Confirme a entrega dos produtos no economato. Os itens bloqueados serão liberados automaticamente após a confirmação.</p></div>
        </div>}
        {visibleItems.map(item => {
          const pending = pendingItems.has(item.id);
          const blocked = Boolean(item.awaitingStockPickup && !item.prepared);
          return <div key={item.id} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 ${item.canceled ? 'bg-destructive/5 opacity-60' : item.prepared ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30' : 'bg-muted/30'}`}>
            <div className="min-w-0 flex-1"><p className={`truncate text-sm font-medium ${item.canceled ? 'line-through' : ''}`}>{item.amount}× {item.Product.name}</p>{item.notes && <p className="text-sm font-semibold text-amber-700 whitespace-pre-wrap break-words">Observação: {item.notes}</p>}{item.canceled && <p className="text-xs text-destructive">Cancelado</p>}</div>
            {blocked && !item.canceled && <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Aguarda economato</span>}
            {!item.canceled && <Button variant="ghost" size="icon" disabled={pending || blocked} title={blocked ? 'Aguarda confirmação de entrega pelo economato' : undefined} className="h-9 w-9 shrink-0" onClick={() => onTogglePrepared(item.id, !item.prepared)} aria-label={blocked ? 'Marcação bloqueada: aguarda economato' : item.prepared ? 'Marcar como pendente' : 'Marcar como feito'}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : blocked ? <LockKeyhole className="h-5 w-5 text-amber-700" /> : item.prepared ? <CircleCheck className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5" />}
            </Button>}
          </div>;
        })}
        {!expanded && order.items.length > 3 && <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => onToggleExpand(order.id)}>Ver mais {order.items.length - 3} itens</Button>}
        {allPrepared && <Button className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700" disabled={finishing || order.awaitingStockPickup} onClick={() => onFinish(order)}>
          {finishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Fechar pedidos
        </Button>}
      </CardContent>
    </Card>
  );
});
