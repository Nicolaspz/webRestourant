import { StockTable } from "@/components/dashboard/economato/StockTable";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export default function StockPage() {
  return (
    <div className="p-6 space-y-6">
      <DashboardPageHeader title="Stock por área" description="Consulte as quantidades disponíveis em cada área do restaurante." />

      <StockTable />
    </div>
  );
}
