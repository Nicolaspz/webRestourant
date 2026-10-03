import { ConsumoTable } from "@/components/dashboard/economato/ConsumoTable";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export default function ConsumoPage() {
  return (
    <div className="p-6 space-y-6">
      <DashboardPageHeader title="Quebras e consumo interno" description="Registe perdas e saídas de stock que não correspondem a vendas." />

      <ConsumoTable />
    </div>
  );
}
