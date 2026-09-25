'use client';
import {createContext,useContext,useEffect,useState,useCallback,ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {AuthContext} from './AuthContext';
import {api} from '@/services/api';
type Access={role:string;permissions:string[];allAreas:boolean;areaIds:string[]};
export const screenPermissions:Record<string,string>={
 '/dashboard/roles':'super','/dashboard/areas':'areaOrders.read','/dashboard/cozinha':'areaOrders.read','/dashboard/bar':'areaOrders.read',
 '/dashboard/pedidos':'orders.read','/dashboard/mesa':'tables.read','/dashboard/cardapio':'tables.read',
 '/dashboard/category':'categories.read','/dashboard/takeaway':'orders.read','/dashboard/products':'products.read',
 '/dashboard/igredient':'recipes.read','/dashboard/stock':'stock.read','/dashboard/economato/areas':'areas.read',
 '/dashboard/economato':'pickups.read','/dashboard/caixa':'cash.read','/dashboard/compra':'purchases.read',
 '/dashboard/economato/stock':'stock.read','/dashboard/economato/pedidos':'transfers.read','/dashboard/economato/consumo':'consumption.read',
 '/dashboard/fornecedores':'suppliers.read','/dashboard/advanced':'advanced.read','/dashboard/users':'users.read',
 '/dashboard/settings':'settings.read','/dashboard':'dashboard.read',
};
const Context=createContext({access:null as Access|null,loading:true,can:(_key:string):boolean=>false,canScreen:(_path:string):boolean=>false,refresh:async()=>{}});
export const useAccess=()=>useContext(Context);
export function AccessProvider({children}:{children:ReactNode}) {
 const {user}=useContext(AuthContext);
 const [access,setAccess]=useState<Access|null>(null);
 const [loading,setLoading]=useState(true);
 const refresh=useCallback(async()=>{
  if(!user?.id){setAccess(null);setLoading(false);return;}
  try{setAccess((await api.get('/access')).data);}catch{setAccess(null);}finally{setLoading(false);}
 },[user?.id]);
 useEffect(()=>{setAccess(null);setLoading(true);void refresh();const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};},[refresh]);
 const can=(key:string)=>!!access&&(access.role==='SUPER ADMIN'||(key!=='super'&&access.permissions.includes(key)));
 const canScreen=(path:string)=>{
  const route=Object.keys(screenPermissions).sort((a,b)=>b.length-a.length).find(route=>path===route||(route!=='/dashboard'&&path.startsWith(route+'/')));
  return !!route&&can(screenPermissions[route]);
 };
 return <Context.Provider value={{access,loading,can,canScreen,refresh}}>{children}</Context.Provider>;
}
export function AccessGate({children}:{children:ReactNode}) {
 const path=usePathname();const {loading,access,canScreen}=useAccess();
 if(loading) return <p role="status" className="p-6">A validar permissões…</p>;
 if(!access) return <p role="alert" className="p-6">Não foi possível validar o acesso. Atualize a página ou inicie sessão novamente.</p>;
 if(!canScreen(path)) return <section className="p-6 space-y-4"><h1>Sem acesso a esta tela</h1><p>Peça ao SUPER ADMIN para atualizar o seu role.</p><nav className="flex flex-col gap-3">{Object.keys(screenPermissions).filter(canScreen).map(url=><Link key={url} href={url}>{url.replace('/dashboard/','').replace('/dashboard','Painel')}</Link>)}</nav></section>;
 return <>{children}</>;
}
