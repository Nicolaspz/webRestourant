'use client';
import {useState} from 'react';
import {api} from '@/services/api';
import {toast} from 'react-toastify';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
export function TableAreaDialog({mesa,onCreate}:{mesa?:{id:string;number:number;tableAreaId?:string|null};onCreate?:(id:string)=>Promise<void>}) {
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[selected,setSelected]=useState('');
 const [areas,setAreas]=useState<Array<{id:string;name:string}>>([]);
 const [error,setError]=useState('');
 async function show(){setOpen(true);setError('');setSelected(mesa?.tableAreaId || '');setBusy(true);try{const {data}=await api.get('/table-areas');setAreas(data);}catch{setError('Não foi possível carregar as áreas. Feche e tente novamente.');}finally{setBusy(false);}}
 async function save(){setBusy(true);try{if(mesa){await api.patch(`/mesa/${mesa.id}/area`,{tableAreaId:selected});toast.success('Área da mesa alterada');window.dispatchEvent(new Event('table-area-updated'));}else if(onCreate)await onCreate(selected);setOpen(false);}catch(e:any){toast.error(e.response?.data?.error || e.response?.data?.message || 'Não foi possível guardar a mesa.');}finally{setBusy(false);}}
 return <><Button variant={mesa?'outline':'default'} onClick={show}>{mesa?'Alterar área':'Nova mesa'}</Button><Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}><DialogContent><DialogHeader><DialogTitle>{mesa?`Alterar área da mesa ${mesa.number}`:'Criar nova mesa'}</DialogTitle><DialogDescription>Selecione uma área das mesas cadastrada nas configurações.</DialogDescription></DialogHeader>{error && <p role="alert" className="text-destructive">{error}</p>}<label htmlFor="table-area-choice">Área da mesa</label><select id="table-area-choice" className="rounded-md border bg-background p-2" value={selected} disabled={busy} onChange={e=>setSelected(e.target.value)}><option value="">Selecione a área</option>{areas.map(area=><option key={area.id} value={area.id}>{area.name}</option>)}</select>{!busy&&!areas.length&&!error&&<p>Nenhuma área cadastrada.</p>}<a className="text-primary underline" href="/dashboard/settings">Cadastrar áreas nas configurações</a><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</Button><Button disabled={busy||!selected} onClick={save}>{busy?'A guardar...':mesa?'Guardar alteração':'Criar mesa'}</Button></div></DialogContent></Dialog></>;
}
