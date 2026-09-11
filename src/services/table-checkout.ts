import { api } from '@/services/api';
import type { AccountPreview } from '@/types/checkout';

export const tableCheckoutService = {
  async preview(tableNumber: number, organizationId: string): Promise<AccountPreview> {
    const response = await api.get(`/preview_conta/${tableNumber}`, { params: { organizationId } });
    return response.data;
  },
  async closeAndPay(tableNumber: number, organizationId: string, payload: Record<string, unknown>) {
    const response = await api.post(`/close_table_pay/${tableNumber}`, payload, { params: { organizationId } });
    return response.data;
  },
};
