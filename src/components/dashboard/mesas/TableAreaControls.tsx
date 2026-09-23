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
 const [editing,setEditing]=useState<string|null>(null);
 const [editName,setEditName]=useState('');
 async function saveEdit(id:string){
  setBusy(true);
  try {
   const {data}=await api.patch(`/table-areas/${id}`,{name:editName});
   setAreas(current=>current.map(area=>area.id===id?{...area,name:data.name}:area).sort((a,b)=>a.name.localeCompare(b.name,'pt')));
   setEditing(null);toast.success('Área atualizada');window.dispatchEvent(new Event('table-area-updated'));
  }catch(e:any){toast.error(e.response?.data?.error || 'Não foi possível editar a área.');}finally{setBusy(false);}
 }
 async function removeArea(area:{id:string;name:string}){
  if(!window.confirm(`Remover a área "${area.name}"? Só é possível remover áreas sem mesas associadas.`))return;
  setBusy(true);
  try{await api.delete(`/table-areas/${area.id}`);setAreas(current=>current.filter(item=>item.id!==area.id));if(editing===area.id)setEditing(null);toast.success('Área removida');window.dispatchEvent(new Event('table-area-updated'));}
  catch(e:any){toast.error(e.response?.data?.error || 'Não foi possível remover a área.');}finally{setBusy(false);}
 }
 async function load(){try{const {data}=await api.get('/table-areas');setAreas(data);setError('');}catch{setError('Não foi possível carregar as áreas das mesas.');}}
 useEffect(()=>{void load();},[organizationId]);
 async function add(){setBusy(true);try{const {data}=await api.post('/table-areas',{name});setAreas(current=>[...current,data].sort((a,b)=>a.name.localeCompare(b.name,'pt')));setSelected(data.id);setName('');toast.success('Área das mesas cadastrada');}catch(e:any){toast.error(e.response?.data?.error || 'Não foi possível cadastrar a área.');}finally{setBusy(false);}}
 return <section className="my-5 rounded-xl border p-4 space-y-4"><div><h2 className="text-lg font-semibold">Áreas das mesas</h2><p className="text-sm text-muted-foreground">Locais de atendimento, como Salão e Esplanada. Este cadastro é separado das áreas de consumo e stock dos produtos.</p></div>
 {error && <p role="alert">{error} <Button variant="outline" onClick={load}>Tentar novamente</Button></p>}
 <div className="flex flex-wrap gap-2"><Input className="max-w-sm" aria-label="Nome da área das mesas" placeholder="Nova área das mesas" maxLength={80} value={name} onChange={e=>setName(e.target.value)} /><Button disabled={busy || !name.trim()} onClick={add}>Cadastrar área das mesas</Button></div>
 <ul className="divide-y">{areas.map(area=><li key={area.id} className="flex flex-wrap items-center gap-2 py-2">
 {editing===area.id ? <><Input className="max-w-sm" aria-label={`Novo nome de ${area.name}`} maxLength={80} value={editName} disabled={busy} onChange={e=>setEditName(e.target.value)} /><Button disabled={busy || !editName.trim()} onClick={()=>saveEdit(area.id)}>Guardar</Button><Button variant="outline" disabled={busy} onClick={()=>setEditing(null)}>Cancelar</Button></> : <><span className="flex-1">{area.name}</span><Button variant="outline" disabled={busy} aria-label={`Editar ${area.name}`} onClick={()=>{setEditing(area.id);setEditName(area.name);}}>Editar</Button><Button variant="destructive" disabled={busy} aria-label={`Remover ${area.name}`} onClick={()=>removeArea(area)}>Remover</Button></>}
 </li>)}</ul>
 <p className="text-sm text-muted-foreground">Para remover uma área com mesas, altere primeiro a área dessas mesas na gestão de mesas.</p>
 {!areas.length && !error && <p className="text-sm text-muted-foreground">Nenhuma área das mesas cadastrada.</p>}
 </section>;
}
