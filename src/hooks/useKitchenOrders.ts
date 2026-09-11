'use client';

import { useOrderQueue } from '@/hooks/useOrderQueue';

export function useKitchenOrders(organizationId?: string) {
  return useOrderQueue(organizationId, 'all');
}
