import { PedidosTable } from "@/components/dashboard/economato/PedidosTable";

export default function PedidosPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reposição de áreas</h1>
        <p className="text-muted-foreground">
          Aprove e registe a saída de stock geral ou de outra área para a área que o solicitou. A quantidade só muda após a confirmação da entrega.
        </p>
      </div>

      <PedidosTable />
    </div>
  );
}
