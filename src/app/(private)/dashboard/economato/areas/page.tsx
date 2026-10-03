import { AreasTable } from "@/components/dashboard/economato/AreasTable";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export default function AreasPage() {
  return (
    <div className="p-6 space-y-6">
      <DashboardPageHeader title="Áreas" description="Configure as áreas de armazenamento e operação do restaurante." />

      <AreasTable />
    </div>
  );
}
