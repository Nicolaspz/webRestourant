import type { Metadata } from 'next';
import { OperationalOrdersPage } from '@/components/dashboard/order/OperationalOrdersPage';

export const metadata: Metadata = { title: 'ServeFixe - Cozinha' };

export default function KitchenPage() {
  return <OperationalOrdersPage area="kitchen" />;
}
