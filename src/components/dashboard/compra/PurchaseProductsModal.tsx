'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X, Package } from "lucide-react";
import { PurchaseProductsList } from "./PurchaseProductsList";
import { AvailableProductsList } from "./AvailableProductsList";
import { AddToStockButton } from "./AddToStockButton";
import { AuthContext } from "@/contexts/AuthContext";
import { useContext } from "react";

interface Purchase {
  id: string;
  name: string;
  status: boolean;
}

interface PurchaseProductsModalProps {
  purchase: Purchase;
  onClose: () => void;
  onSuccess: () => void;
}

export function PurchaseProductsModal({ purchase, onClose, onSuccess }: PurchaseProductsModalProps) {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<string>("current");
  const [refreshKey, setRefreshKey] = useState(0);
  const [availableVisited, setAvailableVisited] = useState(false);

  const handleAddSuccess = () => {
    setActiveTab("current");
    setRefreshKey(prev => prev + 1);
  };
  const handleavailableSuccess = () => {
    setActiveTab("available");
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm dark:bg-black/90" onClick={onClose} />

      <div className="relative flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl w-full max-w-6xl mx-4 max-h-[90dvh] overflow-hidden">
        <div className="flex shrink-0 items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Gestão de Produtos da Compra</h3>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">{purchase.name}</p>
              <Badge variant={purchase.status ? "default" : "secondary"}>
                {purchase.status ? "Concluída" : "Pendente"}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 bg-gray-50 dark:bg-gray-800/50">
          <Tabs value={activeTab} onValueChange={tab => {
            setActiveTab(tab);
            if (tab === 'available') setAvailableVisited(true);
          }} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <TabsTrigger
                value="current"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-400 transition-colors"
              >
                Produtos na Compra
              </TabsTrigger>
              <TabsTrigger
                value="available"
                disabled={purchase.status}
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Adicionar Produtos
              </TabsTrigger>
            </TabsList>

            <TabsContent forceMount value="current" className="space-y-4 mt-4 data-[state=inactive]:hidden">
              <PurchaseProductsList
                purchaseId={purchase.id}
                onUpdate={handleAddSuccess}
                refreshVersion={refreshKey}
                status={purchase.status}
              />
            </TabsContent>

            <TabsContent forceMount value="available" className="space-y-4 mt-4 data-[state=inactive]:hidden">
              {availableVisited && <AvailableProductsList
                purchaseId={purchase.id}
                onAddSuccess={handleavailableSuccess}
              />}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer com botão de conclusão */}
        {!purchase.status && (
          <div className="shrink-0 p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 justify-between items-center bg-gray-50 dark:bg-gray-900">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Package size={14} className="text-amber-500" />
              Após adicionar todos os itens, clique em concluir para atualizar o stock.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={onClose}>Continuar Editando Depois</Button>
              <AddToStockButton
                purchaseId={purchase.id}
                onSuccess={() => {
                  onSuccess();
                  onClose();
                }}
                status={purchase.status}
                organizationId={user?.organizationId || ''}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
