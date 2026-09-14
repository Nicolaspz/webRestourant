'use client';
import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export function TableAreaControls({organizationId,onCreate}:{organizationId:string;onCreate?:(areaId:string)=>Promise<void>}) {
 const [areas,setAreas]=useState<Array<{id:string;name:string}>>([]);
 const [name,setName]=useState(''),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 async function load(){try{const {data}=await api.get('/table-areas');setAreas(data);setError('');}catch{setError('Não foi possível carregar as áreas das mesas.');}}
 useEffect(()=>{void load();},[organizationId]);
 async function add(){setBusy(true);try{const {data}=await api.post('/table-areas',{name});setAreas(current=>[...current,data].sort((a,b)=>a.name.localeCompare(b.name,'pt')));setSelected(data.id);setName('');toast.success('Área das mesas cadastrada');}catch(e:any){toast.error(e.response?.data?.error || 'Não foi possível cadastrar a área.');}finally{setBusy(false);}}
 return <section className="my-5 rounded-xl border p-4 space-y-4"><div><h2 className="text-lg font-semibold">Áreas das mesas</h2><p className="text-sm text-muted-foreground">Locais de atendimento, como Salão e Esplanada. Este cadastro é separado das áreas de consumo e stock dos produtos.</p></div>
 {error && <p role="alert">{error} <Button variant="outline" onClick={load}>Tentar novamente</Button></p>}
 <div className="flex flex-wrap gap-2"><Input className="max-w-sm" aria-label="Nome da área das mesas" placeholder="Nova área das mesas" maxLength={80} value={name} onChange={e=>setName(e.target.value)} /><Button disabled={busy || !name.trim()} onClick={add}>Cadastrar área das mesas</Button></div>
 <ul className="divide-y">{areas.map(area=><li key={area.id} className="py-2">{area.name}</li>)}</ul>
 {!areas.length && !error && <p className="text-sm text-muted-foreground">Nenhuma área das mesas cadastrada.</p>}
 </section>;
}
