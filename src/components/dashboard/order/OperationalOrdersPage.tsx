'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {api} from '@/services/api';
import {AreaOrdersPanel} from './AreaOrdersPanel';
import { CenterScreenLoader } from '@/components/ui/center-screen-loader';
export function OperationalOrdersPage({area}:{area:'kitchen'|'bar'}){
 const [id,setId]=useState<string|null>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{api.get('/access/areas').then(r=>{const name=area==='bar'?'bar':'cozinha';setId(r.data.find((a:any)=>a.nome.trim().toLowerCase()===name)?.id||null);}).catch(()=>setId(null)).finally(()=>setLoading(false));},[area]);
 if(loading)return <CenterScreenLoader />;
 return id?<AreaOrdersPanel areaId={id}/>:<p>Área indisponível ou não autorizada. <Link href="/dashboard/areas">Ver áreas autorizadas</Link></p>;
}
