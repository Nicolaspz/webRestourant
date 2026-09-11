'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useSocket } from '@/contexts/SocketContext';
import { ordersService } from '@/services/orders';
import type { GroupedOrder, Order, OrderItem } from '@/types/orders';

export type OrderQueueArea = 'all' | 'kitchen' | 'bar';

const DRINK_CATEGORY = /bebida|vinho|cocktail|sangria|gin|vodka|whisk|champan|espumante|aguardente|brandy|cognac|cerveja|refrigerante|sumo|água|agua/;
const isDrink = (item: OrderItem) => DRINK_CATEGORY.test(item.Product?.Category?.name?.trim().toLocaleLowerCase() ?? '');
const belongsToArea = (item: OrderItem, area: OrderQueueArea) => area === 'all' || (area === 'bar' ? isDrink(item) : !isDrink(item));

function groupOrders(orders: Order[], area: OrderQueueArea): GroupedOrder[] {
  const groups = new Map<number, GroupedOrder>();
  orders.forEach(order => {
    const table = order.Session?.mesa?.number;
    if (table == null) return;
    const visibleItems = order.items.filter(item => area === 'all' ? true : belongsToArea(item, area) && !item.canceled);
    if (visibleItems.length === 0) return;
    const group = groups.get(table) ?? {
      id: `mesa-${table}`, name: `Mesa ${table}`, created_at: order.created_at,
      Session: order.Session, items: [], orderIds: [], allPrepared: true,
    };
    group.items.push(...visibleItems);
    group.orderIds.push(order.id);
    group.allPrepared = Boolean(group.allPrepared) && order.items.every(item => item.prepared || item.canceled);
    if (order.created_at > group.created_at) group.created_at = order.created_at;
    groups.set(table, group);
  });
  return Array.from(groups.values()).sort((a, b) => a.Session.mesa.number - b.Session.mesa.number);
}

export function useOrderQueue(organizationId?: string, area: OrderQueueArea = 'all') {
  const { socket } = useSocket();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingItems, setPendingItems] = useState<Set<string>>(() => new Set());
  const [pendingTables, setPendingTables] = useState<Set<string>>(() => new Set());
  const suppressSocketUntil = useRef(0);
  const requestId = useRef(0);

  const refresh = useCallback(async (silent = false) => {
    if (!organizationId) return;
    const currentRequest = ++requestId.current;
    if (!silent) setLoading(true);
    try {
      const data = await ordersService.list(organizationId);
      if (currentRequest === requestId.current) setOrders(data);
    } catch {
      if (!silent) toast.error('Não foi possível carregar os pedidos.');
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!socket || !organizationId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handleRefresh = (data: { organizationId?: string }) => {
      if (data.organizationId !== organizationId || Date.now() < suppressSocketUntil.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(true), 180);
    };
    socket.on('orders_refresh', handleRefresh);
    return () => { clearTimeout(timer); socket.off('orders_refresh', handleRefresh); };
  }, [organizationId, refresh, socket]);

  const togglePrepared = useCallback(async (itemId: string, prepared: boolean) => {
    if (!organizationId || pendingItems.has(itemId)) return;
    setPendingItems(current => new Set(current).add(itemId));
    setOrders(current => current.map(order => ({ ...order, items: order.items.map(item => item.id === itemId ? { ...item, prepared } : item) })));
    suppressSocketUntil.current = Date.now() + 900;
    try {
      await ordersService.togglePrepared(itemId, prepared, organizationId);
    } catch {
      setOrders(current => current.map(order => ({ ...order, items: order.items.map(item => item.id === itemId ? { ...item, prepared: !prepared } : item) })));
      toast.error('Não foi possível atualizar o item.');
    } finally {
      setPendingItems(current => { const next = new Set(current); next.delete(itemId); return next; });
    }
  }, [organizationId, pendingItems]);

  const finishOrders = useCallback(async (group: GroupedOrder) => {
    if (!organizationId || pendingTables.has(group.id)) return;
    setPendingTables(current => new Set(current).add(group.id));
    const snapshot = orders;
    setOrders(current => current.filter(order => !group.orderIds.includes(order.id)));
    suppressSocketUntil.current = Date.now() + 1200;
    try {
      await ordersService.finishMany(group.orderIds, organizationId);
    } catch (error: any) {
      setOrders(snapshot);
      toast.error(error?.response?.data?.error || 'Não foi possível fechar os pedidos.');
    } finally {
      setPendingTables(current => { const next = new Set(current); next.delete(group.id); return next; });
    }
  }, [organizationId, orders, pendingTables]);

  const groupedOrders = useMemo(() => groupOrders(orders, area), [area, orders]);
  return { groupedOrders, loading, pendingItems, pendingTables, refresh, togglePrepared, finishOrders };
}
