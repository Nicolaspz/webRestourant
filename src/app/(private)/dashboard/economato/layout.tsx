'use client';
import { StockFulfillments } from '@/components/dashboard/economato/StockFulfillments';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Warehouse, 
  Map, 
  ArrowRightLeft, 
  ClipboardList 
} from "lucide-react";
import { useContext, useState } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { Organization } from "@/types/product";
import StockPage from "./stock/page";
import PedidosPage from "./pedidos/page";
import ConsumoPage from "./consumo/page";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { SettingsTabs } from "@/components/settings/SettingsTabs";


export default function EconomatoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  const { user } = useContext(AuthContext)
    const [organization, setOrganization] = useState<Organization | null>(null)
    const [isLoading, setIsLoading] = useState(true)

  const isManager = ['ADMIN', 'SUPER ADMIN', 'ECONOMATO'].includes(user?.role || '');
  const tabs = [
    { id: "Levantamentos", label: "Levantamentos para mesas", icon: "truck", content: <StockFulfillments /> },
         { 
      id: "Stock", 
      label: "Stock/Inventário", 
      icon: "warehouse", // ← string, não componente
      content: <StockPage /> 
    },
    { 
      id: "Pedidos", 
      label: "Pedidos", 
      icon: "arrow-right-left", // ← string
      content: <PedidosPage /> 
    },
    
    { 
      id: "Consumos", 
      label: "Quebras e consumos",
      icon: "clipboard-list", // ← string
      content: <ConsumoPage /> 
    },
  
  ];

  return (
    <div className="flex-1 space-y-6 p-6">
              <SettingsHeader 
                title="Economato"
                description={isManager ? "Aprove as requisições e confirme o levantamento com o código apresentado pelo solicitante. Registe também as quebras e consumos." : "Escolha os produtos, confira a lista e confirme a solicitação. Apresente o seu código ao economato no levantamento."}
              />
              
              <SettingsTabs tabs={tabs.filter(tab => tab.id !== "Consumos" || isManager)} defaultTab="Levantamentos" />
            </div>
  );
}