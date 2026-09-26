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
 const [search,setSearch]=useState('');
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
 return <section className="mx-auto max-w-6xl space-y-6 pb-8"><h1 className="text-2xl font-bold">Roles e permissões</h1><p>SUPER ADMIN tem sempre acesso total nesta organização e não pode ser restringido. Permissões são atribuídas aos roles, não diretamente aos utilizadores.</p>
 <div aria-label="Selecionar perfil para configurar" className="flex flex-wrap gap-2 rounded-xl border bg-muted/40 p-3"><button disabled={busy} aria-pressed={!editing} className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${!editing ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-transparent bg-background hover:bg-accent'}`} onClick={()=>{setDraft({name:'',permissions:[],allAreas:false,areaIds:[]});setEditing(false);}}>Novo role</button>{roles.map(r=><button disabled={busy} aria-pressed={editing&&draft.name===r.name} className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${editing&&draft.name===r.name ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-transparent bg-background hover:bg-accent'}`} key={r.name} onClick={()=>{setDraft({...r});setEditing(true);}}>{r.name}</button>)}</div>
 <div className="rounded-xl border bg-card p-5 space-y-3"><h2 className="text-lg font-semibold">{editing ? `A configurar: ${draft.name}` : 'Criar novo perfil'}</h2><label className="block text-sm font-medium">Nome do role<input className="block border rounded p-2 bg-background" disabled={editing||busy} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value.toUpperCase()})}/></label><p className="text-sm text-muted-foreground">{draft.permissions.length} permissões selecionadas. As alterações só são aplicadas ao guardar.</p></div>
 <fieldset className="border rounded p-4 space-y-3" disabled={busy||!ready}><legend>Áreas permitidas nos painéis operacionais</legend>
 <label className="block"><input type="checkbox" checked={draft.allAreas} onChange={e=>setDraft({...draft,allAreas:e.target.checked})}/> Todas as áreas, incluindo futuras</label>
 {!draft.allAreas&&areas.map(a=><label className="block" key={a.id}><input type="checkbox" checked={draft.areaIds.includes(a.id)} onChange={()=>toggle('areaIds',a.id)}/> {a.nome}</label>)}
 <p className="text-sm">O âmbito por área aplica-se aos painéis de área. “Pedidos gerais” permite ver todos os pedidos da organização.</p></fieldset>
 <section className="rounded-xl border bg-card p-5 space-y-5">
 <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="font-semibold">Funcionalidades</h2><label className="text-sm">Pesquisar permissões<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ex.: pedidos, produtos…" className="ml-2 rounded-lg border bg-background p-2"/></label></div>
 {!ready&&<p role="status" className="text-sm text-muted-foreground">A aguardar o carregamento dos perfis e permissões.</p>}
 {Object.entries(catalog.filter(p=>(p.label+' '+p.key).toLocaleLowerCase().includes(search.toLocaleLowerCase())).reduce<Record<string,typeof catalog>>((groups,p)=>{const key=p.key.split('.')[0];(groups[key]??=[]).push(p);return groups;},{})).map(([group,items])=><fieldset key={group} disabled={busy||!ready} className="grid gap-2 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-3"><legend className="px-2 text-sm font-semibold">{items[0].label.split(' — ')[0].split(' - ')[0]} <span className="font-normal text-muted-foreground">({items.filter(p=>draft.permissions.includes(p.key)).length}/{items.length})</span></legend>{items.map(p=><label key={p.key} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent ${draft.permissions.includes(p.key)?'border-primary/50 bg-primary/5':'border-transparent'}`}><input className="mt-0.5 h-4 w-4 accent-primary" type="checkbox" checked={draft.permissions.includes(p.key)} onChange={()=>toggle('permissions',p.key)}/>{p.label}</label>)}</fieldset>)}
 {ready&&!catalog.some(p=>(p.label+' '+p.key).toLocaleLowerCase().includes(search.toLocaleLowerCase()))&&<p role="status" className="text-sm text-muted-foreground">Nenhuma permissão corresponde à pesquisa.</p>}
 </section>
 <div className="sticky bottom-0 flex flex-wrap gap-3 rounded-xl border bg-background p-4 shadow-lg"><button className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring" disabled={busy||!ready||!draft.name.trim()} onClick={save}>{busy ? 'A guardar…' : 'Guardar role'}</button>{editing&&<button className="rounded-lg border px-5 py-2.5 text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={busy} onClick={remove}>Remover role</button>}</div></section>;
}
