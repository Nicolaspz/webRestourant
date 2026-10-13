'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccess } from '@/contexts/AccessContext';
import { StockFulfillments } from '@/components/dashboard/economato/StockFulfillments';
import { StockTable } from '@/components/dashboard/economato/StockTable';
import { PedidosTable } from '@/components/dashboard/economato/PedidosTable';
import { ConsumoTable } from '@/components/dashboard/economato/ConsumoTable';
import { AreasTable } from '@/components/dashboard/economato/AreasTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const tabPermissions = {
  levantamentos: 'pickups.read',
  stock: 'stock.read',
  reposicao: 'transfers.read',
  consumo: 'consumption.read',
  areas: 'areas.read',
} as const;
type TabKey = keyof typeof tabPermissions;

export default function EconomatoPage() {
  const { can, access } = useAccess();
  const tabs = useMemo(() => (Object.keys(tabPermissions) as TabKey[]).filter(key =>
    key === 'reposicao' ? can('transfers.read') || can('stock.entries.create') : can(tabPermissions[key])
  ), [access]);
  const fallbackTab = tabs[0] || '';
  const [activeTab, setActiveTab] = useState('');
  const selectedTab = tabs.includes(activeTab as TabKey) ? activeTab : fallbackTab;

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab') as TabKey | null;
    if (requestedTab && tabs.includes(requestedTab)) setActiveTab(requestedTab);
  }, [tabs]);

  const changeTab = (value: string) => {
    setActiveTab(value);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.replaceState({}, '', url);
  };

  if (!selectedTab) return <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Não tem acesso às funcionalidades do Economato.</p>;

  return <div className="space-y-5">
    <Tabs value={selectedTab} onValueChange={changeTab}>
      <div className="w-full overflow-x-auto rounded-xl border bg-muted/40 p-2">
        <TabsList className="h-auto min-w-full w-max justify-start gap-1 bg-transparent p-0">
          {tabs.includes('levantamentos') && <TabsTrigger value="levantamentos" className="px-4 py-2.5">Levantamentos de pedidos</TabsTrigger>}
          {tabs.includes('stock') && <TabsTrigger value="stock" className="px-4 py-2.5">Stock por área</TabsTrigger>}
          {tabs.includes('reposicao') && <TabsTrigger value="reposicao" className="px-4 py-2.5">Entrada de stock nas áreas</TabsTrigger>}
          {tabs.includes('consumo') && <TabsTrigger value="consumo" className="px-4 py-2.5">Quebras e consumos</TabsTrigger>}
          {tabs.includes('areas') && <TabsTrigger value="areas" className="px-4 py-2.5">Áreas</TabsTrigger>}
        </TabsList>
      </div>
      {tabs.includes('levantamentos') && <TabsContent value="levantamentos">{selectedTab === 'levantamentos' && <StockFulfillments />}</TabsContent>}
      {tabs.includes('stock') && <TabsContent value="stock">{selectedTab === 'stock' && <StockTable />}</TabsContent>}
      {tabs.includes('reposicao') && <TabsContent value="reposicao">{selectedTab === 'reposicao' && <PedidosTable />}</TabsContent>}
      {tabs.includes('consumo') && <TabsContent value="consumo">{selectedTab === 'consumo' && <ConsumoTable />}</TabsContent>}
      {tabs.includes('areas') && <TabsContent value="areas">{selectedTab === 'areas' && <AreasTable />}</TabsContent>}
    </Tabs>
  </div>;
}
