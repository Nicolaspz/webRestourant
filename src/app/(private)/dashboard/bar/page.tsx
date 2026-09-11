import type { Metadata } from 'next';
import { OperationalOrdersPage } from '@/components/dashboard/order/OperationalOrdersPage';

export const metadata: Metadata = { title: 'ServeFixe - Bar' };

export default function BarPage() {
  return <OperationalOrdersPage area="bar" />;
}
