import { ProductsTable } from "@/components/dashboard/produto/ProductsTable"; 
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <DashboardPageHeader title="Gestão de Produtos" description="Gerencie produtos, ingredientes, preços e fichas técnicas do restaurante." />
      
      <ProductsTable />
    </div>
  );
}
