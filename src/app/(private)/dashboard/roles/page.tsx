'use client';
import {useEffect,useState,useContext} from 'react';
import {api} from '@/services/api';
import {AuthContext} from '@/contexts/AuthContext';
import {useAccess} from '@/contexts/AccessContext';
import {toast} from 'react-toastify';
type Role={name:string;permissions:string[];allAreas:boolean;areaIds:string[]};
export default function RolesPage(){
 const {user}=useContext(AuthContext);const {refresh}=useAccess();
 const [roles,setRoles]=useState<Role[]>([]),[catalog,setCatalog]=useState<{key:string;label:string}[]>([]),[areas,setAreas]=useState<{id:string;nome:string}[]>([]);
 const [draft,setDraft]=useState<Role>({name:'',permissions:[],allAreas:false,areaIds:[]});
 const [editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[ready,setReady]=useState(false);
 async function load(){
  try{const [r,c,a]=await Promise.all([api.get('/access/roles'),api.get('/access/catalog'),api.get('/areas',{params:{organizationId:user?.organizationId}})]);setRoles(r.data);setCatalog(c.data);setAreas(a.data.data);setReady(true);}
  catch{toast.error('Não foi possível carregar roles e áreas');}
 }
 useEffect(()=>{void load();},[user?.organizationId]);
 const toggle=(key:'permissions'|'areaIds',value:string)=>setDraft(d=>({...d,[key]:d[key].includes(value)?d[key].filter(v=>v!==value):[...d[key],value]}));
 async function save(){
  setBusy(true);try{await api.put('/access/roles/'+encodeURIComponent(draft.name.trim().toUpperCase()),draft);await load();await refresh();setEditing(true);toast.success('Role guardado. As permissões são verificadas em cada pedido à API.');}catch(e:any){toast.error(e.response?.data?.error||'Não foi possível guardar');}finally{setBusy(false);}
 }
 async function remove(){
  if(!confirm('Remover este role? Só é possível se não houver utilizadores atribuídos.'))return;
  setBusy(true);try{await api.delete('/access/roles/'+encodeURIComponent(draft.name));setDraft({name:'',permissions:[],allAreas:false,areaIds:[]});setEditing(false);await load();}catch(e:any){toast.error(e.response?.data?.error||'Não foi possível remover');}finally{setBusy(false);}
 }
 return <section className="space-y-5"><h1 className="text-2xl font-bold">Roles e permissões</h1><p>SUPER ADMIN tem sempre acesso total nesta organização e não pode ser restringido. Permissões são atribuídas aos roles, não diretamente aos utilizadores.</p>
 <div className="flex flex-wrap gap-2"><button className="border rounded p-2" onClick={()=>{setDraft({name:'',permissions:[],allAreas:false,areaIds:[]});setEditing(false);}}>Novo role</button>{roles.map(r=><button className="border rounded p-2" key={r.name} onClick={()=>{setDraft({...r});setEditing(true);}}>{r.name}</button>)}</div>
 <label className="block">Nome do role<input className="block border rounded p-2 bg-background" disabled={editing||busy} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value.toUpperCase()})}/></label>
 <fieldset className="border rounded p-4 space-y-3" disabled={busy||!ready}><legend>Áreas permitidas nos painéis operacionais</legend>
 <label className="block"><input type="checkbox" checked={draft.allAreas} onChange={e=>setDraft({...draft,allAreas:e.target.checked})}/> Todas as áreas, incluindo futuras</label>
 {!draft.allAreas&&areas.map(a=><label className="block" key={a.id}><input type="checkbox" checked={draft.areaIds.includes(a.id)} onChange={()=>toggle('areaIds',a.id)}/> {a.nome}</label>)}
 <p className="text-sm">O âmbito por área aplica-se aos painéis de área. “Pedidos gerais” permite ver todos os pedidos da organização.</p></fieldset>
 <fieldset disabled={busy||!ready} className="grid gap-3 md:grid-cols-3 border rounded p-4"><legend>Funcionalidades</legend>{catalog.map(p=><label key={p.key}><input type="checkbox" checked={draft.permissions.includes(p.key)} onChange={()=>toggle('permissions',p.key)}/> {p.label}</label>)}</fieldset>
 <div className="flex gap-3"><button className="border rounded p-3" disabled={busy||!ready||!draft.name.trim()} onClick={save}>Guardar role</button>{editing&&<button className="border rounded p-3" disabled={busy} onClick={remove}>Remover role</button>}</div></section>;
}
