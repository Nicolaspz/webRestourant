'use client';

import { useOrderQueue, type OrderQueueArea } from '@/hooks/useOrderQueue';

export type OperationalArea = Exclude<OrderQueueArea, 'all'>;

export function useOperationalOrders(organizationId: string | undefined, area: OperationalArea) {
  return useOrderQueue(organizationId, area);
}
