import { api } from '@/services/api';
import type { Order } from '@/types/orders';

export const ordersService = {
  async list(organizationId: string, areaId?: string): Promise<Order[]> {
    const response = await api.get(areaId ? '/area-orders/'+encodeURIComponent(areaId) : '/orders', { params: { organizationId } });
    return response.data;
  },
  togglePrepared(itemId: string, prepared: boolean, organizationId: string, areaId?: string) {
    return api.put(areaId ? `/area-orders/${encodeURIComponent(areaId)}/items/${itemId}` : `/items/${itemId}/toggle-prepared`, { prepared }, { params: { organizationId } });
  },
  finishMany(orderIds: string[], organizationId: string) {
    return api.put('/orders/finish-many', { orderIds, organizationId });
  },
};
