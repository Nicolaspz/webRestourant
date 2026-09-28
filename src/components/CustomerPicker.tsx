'use client';
import {useEffect,useState,useRef} from 'react';
import {api} from '@/services/api';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useAccess} from '@/contexts/AccessContext';
import {toast} from 'react-toastify';
export type Customer={id:string;name:string;taxId?:string;kind:string;phone?:string;email?:string;address?:string};
export function CustomerPicker({name,nif,onChange,disabled=false}:{name:string;nif:string;onChange:(name:string,nif:string)=>void;disabled?:boolean}) {
 const [rows,setRows]=useState<Customer[]>([]),[mode,setMode]=useState('manual'),[kind,setKind]=useState('PARTICULAR');
 const [busy,setBusy]=useState(false),[failed,setFailed]=useState(false);const lock=useRef(false);const {can}=useAccess();
 const load=()=>api.get('/customers').then(r=>{setRows(r.data);setFailed(false);}).catch(()=>setFailed(true));
 useEffect(()=>{if(can('invoices.read'))void load();},[can('invoices.read')]);
 async function save(){if(lock.current)return;lock.current=true;setBusy(true);try{const r=await api.post('/customers',{name,taxId:nif,kind});setRows(v=>[...v,r.data]);setMode(r.data.id);toast.success('Cliente guardado.');}catch(e:any){toast.error(e.response?.data?.error||'Não foi possível guardar.');}finally{lock.current=false;setBusy(false);}}
 return <fieldset disabled={disabled||busy} className="space-y-3 rounded-xl border p-4"><legend className="px-2 font-semibold">Cliente</legend>
 {can('invoices.read')&&<label className="block text-sm">Selecionar cliente<select className="mt-1 h-10 w-full rounded border bg-background px-3" value={mode} onChange={e=>{setMode(e.target.value);const c=rows.find(r=>r.id===e.target.value);onChange(c?.name||'',c?.taxId||'');}}><option value="manual">Preencher manualmente</option>{rows.map(c=><option key={c.id} value={c.id}>{c.name} {c.taxId?`— ${c.taxId}`:''}</option>)}</select></label>}
 {failed&&<button type="button" className="text-sm underline" onClick={()=>void load()}>Recarregar clientes</button>}
 <div className="grid gap-3 sm:grid-cols-2"><label>Nome / empresa<Input required readOnly={mode!=='manual'} value={name} onChange={e=>onChange(e.target.value,nif)}/></label><label>NIF (opcional)<Input readOnly={mode!=='manual'} value={nif} onChange={e=>onChange(name,e.target.value)}/></label></div>
 {mode==='manual'&&can('proformas.create')&&<div className="flex flex-wrap gap-2"><select aria-label="Tipo de cliente" className="rounded border bg-background px-3" value={kind} onChange={e=>setKind(e.target.value)}><option value="PARTICULAR">Particular</option><option value="EMPRESA">Empresa</option></select><Button type="button" variant="outline" disabled={!name.trim()||busy} onClick={save}>{busy?'A guardar…':'Guardar cliente para reutilizar'}</Button><span className="self-center text-xs text-muted-foreground">Opcional — pode emitir sem cadastrar.</span></div>}
 </fieldset>;
}
