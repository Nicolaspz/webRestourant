'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {api} from '@/services/api';
import {toast} from 'react-toastify';
export default function AreaPanels(){
 const [areas,setAreas]=useState<{id:string;nome:string}[]>([]);
 const [error,setError]=useState('');
 useEffect(()=>{api.get('/access/areas').then(r=>setAreas(r.data)).catch(()=>setError('Não foi possível carregar as áreas autorizadas'));},[]);
 return <section className="space-y-4"><h1 className="text-2xl font-bold">Pedidos por área</h1><p>Abra o painel no computador da área. O acesso exige login e permissão.</p>{error&&<p role="alert">{error}</p>}{areas.map(a=>{
 const url='/dashboard/areas/'+a.id+'/pedidos';
 return <div key={a.id} className="border rounded p-4 flex flex-wrap gap-4"><strong>{a.nome}</strong><Link href={url}>Abrir pedidos</Link><button onClick={async()=>{try{await navigator.clipboard.writeText(location.origin+url);toast.success('Link copiado');}catch{toast.error('Não foi possível copiar; abra o painel e copie o endereço');}}}>Copiar link</button></div>;
 })}</section>;
}
