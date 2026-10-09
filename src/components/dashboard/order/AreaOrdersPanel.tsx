'use client';
import {useContext,useEffect,useState} from 'react';
import {AuthContext} from '@/contexts/AuthContext';
import {useAccess} from '@/contexts/AccessContext';
import {useOrderQueue} from '@/hooks/useOrderQueue';
import {OrdersGrid} from './OrdersGrid';
import {api} from '@/services/api';
import {useSocket} from '@/contexts/SocketContext';
import {Button} from '@/components/ui/button';
import {toast} from 'react-toastify';
export function AreaOrdersPanel({areaId,configurationOnly=false}:{areaId:string;configurationOnly?:boolean}){
 const {user}=useContext(AuthContext);const {can}=useAccess();
 const [areas,setAreas]=useState<{id:string;nome:string}[]>([]);
 const [selected,setSelected]=useState<string[]>([areaId]);
 const [draft,setDraft]=useState<string[]>([areaId]);
 const [ready,setReady]=useState(false),[saving,setSaving]=useState(false),[restricted,setRestricted]=useState(false);
 const [version,setVersion]=useState(0);
 const {socket}=useSocket();
 const canConfigure=user?.role==='SUPER ADMIN';
 const queue=useOrderQueue(ready&&!configurationOnly?user?.organizationId:undefined,`area:${selected.join(',')}`);
 const [title,setTitle]=useState('Pedidos da área'),[expanded,setExpanded]=useState<string|null>(null);
 useEffect(()=>{
  let active=true;
  setReady(false);
  Promise.all([api.get('/access/areas'),api.get(`/area-orders/${areaId}/group`)]).then(([r,group])=>{
   if(!active)return;
   const available=r.data as {id:string;nome:string}[];
   setAreas(available);setTitle(`Pedidos — ${available.find(a=>a.id===areaId)?.nome || 'Área'}`);
   const ids=(group.data.areas as {id:string}[]).map(a=>a.id);
   setSelected(ids);setDraft(ids);setRestricted(Boolean(group.data.restricted));setReady(true);
  }).catch(()=>{if(active)setTitle('Não foi possível carregar a configuração. Tente atualizar.');});
  return()=>{active=false;};
 },[areaId,user?.organizationId,version]);
 useEffect(()=>{
  const reload=()=>setVersion(v=>v+1);
  const changed=(data:{organizationId?:string})=>{if(data.organizationId===user?.organizationId)reload();};
  socket?.on('area_groups_refresh',changed);socket?.on('connect',reload);
  window.addEventListener('focus',reload);
  return()=>{socket?.off('area_groups_refresh',changed);socket?.off('connect',reload);window.removeEventListener('focus',reload);};
 },[socket,user?.organizationId]);
 const selectArea=(id:string)=>{
  const next=draft.includes(id)?draft.filter(value=>value!==id):[...draft,id];
  if(!next.length)return;
  setDraft(next);
 };
 const save=async()=>{
  setSaving(true);
  try{await api.put(`/area-orders/${areaId}/group`,{areaIds:draft});setVersion(v=>v+1);toast.success('Grupo guardado para todos os dispositivos.');}
  catch{toast.error('Não foi possível guardar o grupo. Tente novamente.');}
  finally{setSaving(false);}
 };
 if(configurationOnly) return canConfigure ? <section className="space-y-4">
 <fieldset disabled={saving||!ready} className="rounded-xl border p-4"><legend className="px-2 font-semibold">Configurar áreas agrupadas</legend><div className="flex flex-wrap gap-3">{areas.map(area=><label key={area.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 ${draft.includes(area.id)?'border-blue-600 bg-blue-50 text-blue-900':'bg-background'}`}><input type="checkbox" disabled={area.id===areaId} checked={draft.includes(area.id)} onChange={()=>selectArea(area.id)}/>{area.nome}</label>)}</div><p className="my-3 text-sm">Ao guardar, abrir qualquer área selecionada mostra os pedidos do mesmo grupo em todos os dispositivos. Áreas selecionadas saem dos grupos anteriores. Para separar, deixe apenas a área atual selecionada.</p><Button onClick={save}>{saving?'A guardar…':'Guardar grupo de áreas'}</Button></fieldset>
 {!ready&&<p role="status">{title}</p>}
 </section> : null;
 return <section className="space-y-4"><div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-bold">{title}</h1><Button variant="outline" onClick={()=>{setVersion(v=>v+1);}}>Atualizar</Button></div>
 {restricted&&<p role="status">Algumas áreas do grupo não estão autorizadas para o seu perfil. Peça ao administrador para rever o acesso.</p>}
 {ready&&<OrdersGrid orders={queue.groupedOrders} loading={queue.loading} expandedOrderId={expanded} pendingItems={queue.pendingItems} pendingTables={queue.pendingTables} onToggleExpand={id=>setExpanded(expanded===id?null:id)} onUpdateStatus={queue.updateItemStatus} onFinish={queue.finishOrders} canPrepare={can('areaOrders.prepare')} canFinish={can('areaOrders.prepare')}/>}</section>;
}
