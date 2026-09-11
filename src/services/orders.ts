import { api } from '@/services/api';
import type { Order } from '@/types/orders';

export const ordersService = {
  async list(organizationId: string): Promise<Order[]> {
    const response = await api.get('/orders', { params: { organizationId } });
    return response.data;
  },
  togglePrepared(itemId: string, prepared: boolean, organizationId: string) {
    return api.put(`/items/${itemId}/toggle-prepared`, { prepared }, { params: { organizationId } });
  },
  finishMany(orderIds: string[], organizationId: string) {
    return api.put('/orders/finish-many', { orderIds, organizationId });
  },
};
