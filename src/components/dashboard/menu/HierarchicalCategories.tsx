'use client';
import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import {setupAPIClient} from '@/services/api';
type Category={id:string;name:string;parentId?:string|null;kind?:string};
export function HierarchicalCategories({categories,activeCategory,onSelect,dark=false,compact=false,organizationId:providedOrganizationId}:{categories:string[];activeCategory:string|null;onSelect:(name:string)=>void;dark?:boolean;compact?:boolean;organizationId?:string}){
 const params=useParams();const organizationId=providedOrganizationId || params.organizationId as string;
 const [catalog,setCatalog]=useState<Category[]>([]),[parentId,setParentId]=useState<string|null>(null),[ready,setReady]=useState(false),[error,setError]=useState(false);
 async function load(){setReady(false);setError(false);try{const {data}=await setupAPIClient().get('/category',{params:{organizationId,kind:'MENU'}});setCatalog(data.filter((c:Category)=>!c.kind||c.kind==='MENU'));setReady(true);}catch{setError(true);}}
 useEffect(()=>{setParentId(null);if(organizationId)void load();},[organizationId]);
 const roots=catalog.filter(c=>!c.parentId && (categories.includes(c.name)||catalog.some(child=>child.parentId===c.id&&categories.includes(child.name))));
 const extras=categories.filter(name=>!catalog.some(c=>c.name===name));
 const children=catalog.filter(c=>c.parentId===parentId && categories.includes(c.name));
 const parent=catalog.find(c=>c.id===parentId);
 const style=(selected:boolean)=>`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${selected?'bg-amber-500 text-slate-950':dark?'bg-white/5 text-gray-300 hover:bg-white/10':'border bg-white text-slate-700 hover:bg-slate-100'}`;
 if(compact){
  const selected = catalog.find(c=>c.name===activeCategory);
  const root = selected?.parentId ? catalog.find(c=>c.id===selected.parentId) : selected;
  const subcategories = root ? catalog.filter(c=>c.parentId===root.id && categories.includes(c.name)) : [];
  const options = ready ? [...roots.map(c=>c.name), ...extras] : categories;
  const selectStyle = 'h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500';
  return <nav aria-label="Categorias do cardápio" className="flex min-w-0 flex-wrap items-center gap-2 py-2">
   <select aria-label="Categoria" className={`${selectStyle} !w-auto max-w-full flex-1 sm:max-w-72`} value={root?.name || activeCategory || ''} onChange={e=>{
    const name=e.target.value; const next=catalog.find(c=>c.name===name);
    onSelect(!name ? '' : categories.includes(name) ? name : catalog.find(c=>c.parentId===next?.id && categories.includes(c.name))?.name || name);
   }}><option value="">Todas as categorias</option>{options.map(name=><option key={name} value={name}>{name}</option>)}</select>
   {subcategories.length>0 && <select aria-label="Subcategoria" className={`${selectStyle} !w-auto max-w-full flex-1 sm:max-w-64`} value={activeCategory || ''} onChange={e=>onSelect(e.target.value)}>
    {root && categories.includes(root.name) && <option value={root.name}>Produtos de {root.name}</option>}
    {subcategories.map(c=><option key={c.id} value={c.name}>{c.name.replace(`${root?.name} / `,'')}</option>)}
   </select>}
   {error && <button type="button" onClick={load} className="text-xs text-slate-600 underline">Recarregar categorias</button>}
  </nav>;
 }
 if(error)return <button onClick={load} className={style(false)}>Tentar carregar categorias novamente</button>;
 if(!ready)return <nav aria-label="Categorias do cardápio" className="w-full overflow-x-auto py-3"><div className="flex gap-2"><button className={style(!activeCategory)} onClick={()=>onSelect('')}>Todas as categorias</button>{categories.map(name=><button key={name} className={style(activeCategory===name)} onClick={()=>onSelect(name)}>{name}</button>)}</div></nav>;
 return <nav aria-label="Categorias do cardápio" className="w-full space-y-2 py-3"><div className={`flex gap-2 overflow-x-auto ${dark?'md:flex-col':''}`}>{extras.map(name=><button key={name} className={style(!parentId&&activeCategory===name)} onClick={()=>{setParentId(null);onSelect(name);}}>{name}</button>)}{roots.map(root=><button key={root.id} className={style(parentId===root.id||(!parentId&&activeCategory===root.name))} aria-expanded={parentId===root.id} onClick={()=>{const availableChildren=catalog.filter(c=>c.parentId===root.id&&categories.includes(c.name));setParentId(availableChildren.length?root.id:null);onSelect(categories.includes(root.name)?root.name:availableChildren[0]?.name||root.name);}}>{root.name}</button>)}</div>
 {parent&&children.length>0&&<div className={`border-l-2 border-amber-500 pl-3 ${dark?'text-gray-300':'text-slate-600'}`}><p className="mb-2 text-xs font-semibold">Subcategorias de {parent.name}</p><div className={`flex gap-2 overflow-x-auto ${dark?'md:flex-col':''}`}>{categories.includes(parent.name)&&<button className={style(activeCategory===parent.name)} onClick={()=>onSelect(parent.name)}>Produtos de {parent.name}</button>}{children.map(child=><button key={child.id} className={style(activeCategory===child.name)} onClick={()=>onSelect(child.name)}>{child.name.startsWith(parent.name + ' / ') ? child.name.slice(parent.name.length + 3) : child.name}</button>)}</div></div>}
 </nav>;
}
