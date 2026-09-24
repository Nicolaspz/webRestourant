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
    group.items.push(...visibleItems.map(item => ({ ...item, awaitingStockPickup: Boolean(order.awaitingStockPickup) })));
    group.awaitingStockPickup = Boolean(group.awaitingStockPickup || order.awaitingStockPickup);
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
      if (data.organizationId !== organizationId) return;
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(true), Math.max(180, suppressSocketUntil.current - Date.now()));
    };
    socket.on('orders_refresh', handleRefresh);
    const reconnect = () => void refresh(true);
    socket.on('connect', reconnect);
    return () => { clearTimeout(timer); socket.off('orders_refresh', handleRefresh); socket.off('connect', reconnect); };
  }, [organizationId, refresh, socket]);

  // Recover missed events when the socket is unavailable or the tab resumes.
  useEffect(() => {
    if (!organizationId) return;
    const recover = () => { if (document.visibilityState === 'visible') void refresh(true); };
    const timer = setInterval(recover, 15000);
    window.addEventListener('focus', recover);
    return () => { clearInterval(timer); window.removeEventListener('focus', recover); };
  }, [organizationId, refresh]);

  const togglePrepared = useCallback(async (itemId: string, prepared: boolean) => {
    if (!organizationId || pendingItems.has(itemId)) return;
    if (prepared && orders.some(order => order.awaitingStockPickup && order.items.some(item => item.id === itemId))) {
      toast.warning('Aguarda entrega pelo economato. A marcação será ativada após a confirmação.');
      return;
    }
    setPendingItems(current => new Set(current).add(itemId));
    setOrders(current => current.map(order => ({ ...order, items: order.items.map(item => item.id === itemId ? { ...item, prepared } : item) })));
    suppressSocketUntil.current = Date.now() + 900;
    try {
      await ordersService.togglePrepared(itemId, prepared, organizationId);
    } catch (error: any) {
      setOrders(current => current.map(order => ({ ...order, items: order.items.map(item => item.id === itemId ? { ...item, prepared: !prepared } : item) })));
      toast.error(error?.response?.data?.error || 'Não foi possível atualizar o item.');
      void refresh(true);
    } finally {
      setPendingItems(current => { const next = new Set(current); next.delete(itemId); return next; });
    }
  }, [organizationId, pendingItems, orders, refresh]);

  const finishOrders = useCallback(async (group: GroupedOrder) => {
    if (!organizationId || pendingTables.has(group.id)) return;
    if (group.awaitingStockPickup) {
      toast.warning('Confirme a entrega pelo economato antes de fechar os pedidos.');
      return;
    }
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
  const hasPendingStockPickup = orders.some(order => {
    if (!order.awaitingStockPickup || !order.Session?.mesa) return false;
    if (area === 'all') return true;
    return order.pendingStockAreas?.some(name => name?.trim().toLocaleLowerCase() === (area === 'bar' ? 'bar' : 'cozinha')) ?? false;
  });
  return { groupedOrders, hasPendingStockPickup, loading, pendingItems, pendingTables, refresh, togglePrepared, finishOrders };
}
