'use client';
import {createContext,useContext,useEffect,useState,useCallback,useRef,ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {AuthContext} from './AuthContext';
import {cachedGet} from '@/services/api';
type Access={role:string;permissions:string[];allAreas:boolean;areaIds:string[]};
export const screenPermissions:Record<string,string>={
 '/dashboard/clientes':'invoices.read',
 '/dashboard/cobrancas':'invoices.read',
 '/dashboard/proformas':'proformas.read',
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
 const scope = `${user?.id || ''}:${user?.organizationId || ''}:${user?.token || ''}`;
 const activeScope = useRef(scope);
 activeScope.current = scope;
 const load=useCallback(async(force=false)=>{
  if(!user?.id){setAccess(null);setLoading(false);return;}
  try{
   const response=await cachedGet<Access>('/access',{},60000,force);
   if(activeScope.current===scope)setAccess(response.data);
  }
  catch(error:any){
   if(activeScope.current===scope){
    const status=error?.response?.status;
    // Falhas transitórias de rede/servidor não devem remover permissões
    // que já foram validadas nesta sessão. Uma recusa explícita invalida-as.
    if(status===401||status===403)setAccess(null);
   }
  }
  finally{if(activeScope.current===scope)setLoading(false);}
 },[scope,user?.id]);
 const refresh=useCallback(()=>load(true),[load]);
 useEffect(()=>{
  setAccess(null);setLoading(true);void load();
  const revalidate=()=>{if(document.visibilityState==='visible')void load();};
  const timer=setInterval(revalidate,60000);
  window.addEventListener('focus',revalidate);
  return()=>{clearInterval(timer);window.removeEventListener('focus',revalidate);};
 },[load]);
 const can=(key:string)=>!!access&&(access.role==='SUPER ADMIN'||(key!=='super'&&access.permissions.includes(key)));
 const canScreen=(path:string)=>{
  const route=Object.keys(screenPermissions).sort((a,b)=>b.length-a.length).find(route=>path===route||(route!=='/dashboard'&&path.startsWith(route+'/')));
  return !!route&&can(screenPermissions[route]);
 };
 return <Context.Provider value={{access,loading,can,canScreen,refresh}}>{children}</Context.Provider>;
}
export function AccessGate({children}:{children:ReactNode}) {
 const path=usePathname();const {loading,access,canScreen,refresh}=useAccess();
 if(loading) return <p role="status" className="p-6">A validar permissões…</p>;
 if(!access) return <section role="alert" className="m-6 rounded-xl border bg-card p-6 text-card-foreground">
  <p>Não foi possível validar o acesso neste momento.</p>
  <button type="button" onClick={()=>void refresh()} className="mt-3 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Tentar novamente</button>
 </section>;
 if(!canScreen(path)) return <section className="p-6"><h1>Acesso negado</h1></section>;
 return <>{children}</>;
}
