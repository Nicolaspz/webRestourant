import { AreasTable } from '@/components/dashboard/economato/AreasTable';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';

export function AreasView() {
  return <div className="space-y-6 p-6">
    <DashboardPageHeader title="Áreas" description="Configure as áreas de armazenamento e operação do restaurante." />
    <AreasTable />
  </div>;
}
