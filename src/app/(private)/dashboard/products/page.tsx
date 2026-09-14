import { ProductsTable } from "@/components/dashboard/produto/ProductsTable"; 

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Produtos</h1>
        <p className="text-muted-foreground">
          Gerencie produtos, ingredientes e receitas do sistema
        </p>
      </div>
      
      <ProductsTable />
    </div>
  );
}