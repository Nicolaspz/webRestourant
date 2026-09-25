'use client';
import {useContext,useEffect,useState} from 'react';
import {AuthContext} from '@/contexts/AuthContext';
import {useAccess} from '@/contexts/AccessContext';
import {useOrderQueue} from '@/hooks/useOrderQueue';
import {OrdersGrid} from './OrdersGrid';
import {api} from '@/services/api';
export function AreaOrdersPanel({areaId}:{areaId:string}){
 const {user}=useContext(AuthContext);const {can}=useAccess();
 const queue=useOrderQueue(user?.organizationId,('area:'+areaId) as any);
 const [title,setTitle]=useState('Pedidos da área'),[expanded,setExpanded]=useState<string|null>(null);
 useEffect(()=>{api.get('/access/areas').then(r=>setTitle(r.data.find((a:any)=>a.id===areaId)?.nome||'Área não autorizada')).catch(()=>setTitle('Área não autorizada'));},[areaId]);
 return <section className="space-y-4"><h1 className="text-2xl font-bold">{title}</h1><p>Mostra apenas itens destinados a esta área. A conclusão do pedido completo é feita na gestão geral.</p><button onClick={()=>queue.refresh()}>Atualizar</button>
 <OrdersGrid orders={queue.groupedOrders} loading={queue.loading} expandedOrderId={expanded} pendingItems={queue.pendingItems} pendingTables={queue.pendingTables} onToggleExpand={id=>setExpanded(expanded===id?null:id)} onTogglePrepared={queue.togglePrepared} onFinish={queue.finishOrders} canPrepare={can('areaOrders.prepare')} canFinish={false}/></section>;
}
