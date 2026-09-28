import { api } from '@/services/api';
import type { Order } from '@/types/orders';

export const ordersService = {
  async list(organizationId: string, areaId?: string): Promise<Order[]> {
    if (areaId?.includes(',')) {
      const batches = await Promise.all(areaId.split(',').map(id => ordersService.list(organizationId, id)));
      const merged = new Map<string, Order>();
      for (const batch of batches) for (const order of batch) {
        const previous = merged.get(order.id);
        const items = order.items.map(item => ({...item, awaitingStockPickup: Boolean(order.awaitingStockPickup)}));
        merged.set(order.id, previous ? {...previous, items: [...previous.items, ...items], awaitingStockPickup: previous.awaitingStockPickup || order.awaitingStockPickup} : {...order, items});
      }
      return [...merged.values()];
    }
    const response = await api.get(areaId ? '/area-orders/'+encodeURIComponent(areaId) : '/orders', { params: { organizationId } });
    return response.data;
  },
  togglePrepared(itemId: string, prepared: boolean, organizationId: string, areaId?: string) {
    return api.put(areaId ? `/area-orders/${encodeURIComponent(areaId)}/items/${itemId}` : `/items/${itemId}/toggle-prepared`, { prepared }, { params: { organizationId } });
  },
  finishMany(orderIds: string[], organizationId: string) {
    return api.put('/orders/finish-many', { orderIds, organizationId });
  },
  deliverArea(areaId: string, itemIds: string[], organizationId: string) {
    return api.put(`/area-orders/${encodeURIComponent(areaId)}/deliver`, {itemIds}, {params:{organizationId}});
  },
};
