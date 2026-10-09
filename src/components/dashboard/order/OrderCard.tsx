'use client';

import { memo } from 'react';
import { Check, ChefHat, CircleCheck, Eye, Loader2, Settings2, LockKeyhole, PackageOpen, PackageCheck, Play } from 'lucide-react';
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
  canPrepare?: boolean;
  canFinish?: boolean;
  order: GroupedOrder;
  expanded: boolean;
  pendingItems: Set<string>;
  finishing: boolean;
  onToggleExpand: (id: string) => void;
  onManage?: (orderIds: string[]) => void;
  onUpdateStatus: (itemId: string, status: 'pendente' | 'em_preparacao' | 'pronto' | 'entregue') => void;
  onFinish: (order: GroupedOrder) => void;
};

export const OrderCard = memo(function OrderCard({ canPrepare = true, canFinish = true, order, expanded, pendingItems, finishing, onToggleExpand, onManage, onUpdateStatus, onFinish }: Props) {
  const allPrepared = order.allPrepared ?? (order.items.length > 0 && order.items.every(item => item.prepared || item.canceled));
  const allDelivered = order.items.length > 0 && order.items.every(item => item.deliveredAt || item.canceled);
  const visibleItems = expanded ? order.items : order.items.slice(0, 3);

  return (
    <Card className={`overflow-hidden transition-colors ${allPrepared ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">{order.name}
              {allDelivered ? <Badge className="bg-sky-700 hover:bg-sky-700">Entregue</Badge> : allPrepared && !order.awaitingStockPickup ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Pronto</Badge> : order.items.some(item => item.status === 'em_preparacao') ? <Badge className="bg-amber-600 hover:bg-amber-600">Em preparação</Badge> : null}
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
          const rawStatus = item.deliveredAt ? 'entregue' : item.status ?? (item.prepared ? 'pronto' : 'pendente');
          const status = rawStatus in {
            pendente: true, em_preparacao: true, pronto: true, entregue: true,
          } ? rawStatus as 'pendente' | 'em_preparacao' | 'pronto' | 'entregue' : 'pendente';
          const blocked = Boolean(item.awaitingStockPickup && status !== 'pronto' && status !== 'entregue');
          const state = {
            pendente: { label: 'Pendente', next: 'em_preparacao' as const, action: 'Iniciar preparação', icon: <Play className="h-4 w-4" />, style: 'border-slate-200 bg-slate-50 text-slate-700 dark:bg-slate-900' },
            em_preparacao: { label: 'Em preparação', next: 'pronto' as const, action: 'Marcar pronto', icon: <ChefHat className="h-4 w-4" />, style: 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200' },
            pronto: { label: 'Pronto', next: 'entregue' as const, action: 'Marcar entregue', icon: <CircleCheck className="h-4 w-4" />, style: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200' },
            entregue: { label: 'Entregue', next: null, action: 'Entregue', icon: <PackageCheck className="h-4 w-4" />, style: 'border-sky-300 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200' },
          }[status];
          return <div key={item.id} className={`flex min-h-12 flex-wrap items-center gap-3 rounded-xl border px-3 py-2 ${item.canceled ? 'bg-destructive/5 opacity-60' : state.style}`}>
            <div className="min-w-0 flex-1"><p className={`truncate text-sm font-medium ${item.canceled ? 'line-through' : ''}`}>{item.amount}× {item.Product.name}</p>{item.notes && <p className="text-sm font-semibold text-amber-700 whitespace-pre-wrap break-words">Observação: {item.notes}</p>}{item.canceled && <p className="text-xs text-destructive">Cancelado</p>}</div>
            {item.areaName && <Badge variant="outline">{item.areaName}</Badge>}
            {!item.canceled && !blocked && <Badge className={status === 'pendente' ? 'bg-slate-600' : status === 'em_preparacao' ? 'bg-amber-600' : status === 'pronto' ? 'bg-emerald-600' : 'bg-sky-700'}>{state.label}</Badge>}
            {blocked && !item.canceled && <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Aguarda economato</span>}
            {!item.canceled && state.next && <Button variant="outline" size="sm" disabled={!canPrepare || pending || blocked} title={blocked ? 'Aguarda confirmação de entrega pelo economato' : undefined} className="h-8 shrink-0 bg-background" onClick={() => onUpdateStatus(item.id, state.next!)} aria-label={`Avançar ${item.Product.name}: ${state.action}`}>
              {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : blocked ? <LockKeyhole className="mr-1.5 h-4 w-4 text-amber-700" /> : state.icon}{state.action}
            </Button>}
          </div>;
        })}
        {!expanded && order.items.length > 3 && <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => onToggleExpand(order.id)}>Ver mais {order.items.length - 3} itens</Button>}
        {canFinish && allDelivered && <Button className="mt-3 w-full bg-sky-700 hover:bg-sky-800" disabled={finishing || order.awaitingStockPickup} onClick={() => onFinish(order)}>
          {finishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Fechar pedidos entregues
        </Button>}
      </CardContent>
    </Card>
  );
});
