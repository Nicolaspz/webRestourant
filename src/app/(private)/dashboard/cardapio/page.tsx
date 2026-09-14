'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Armchair, ArrowRight, RefreshCw, Search, Utensils } from 'lucide-react';
import { toast } from 'react-toastify';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

type Table = { tableAreaId?: string | null; areaName?: string | null; id: string; number: number; capacidade?: number; status: 'livre' | 'ocupada' | 'reservada' };
const statusLabel = { livre: 'Livre', ocupada: 'Em atendimento', reservada: 'Reservada' } as const;
const statusStyle = {
  livre: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ocupada: 'border-amber-200 bg-amber-50 text-amber-700',
  reservada: 'border-blue-200 bg-blue-50 text-blue-700',
} as const;

export default function TableSelectionPage() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeArea, setActiveArea] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [areaDrafts, setAreaDrafts] = useState<Record<string,string>>({});
  const [tableAreas, setTableAreas] = useState<Array<{id:string;name:string}>>([]);
  const [savingArea, setSavingArea] = useState<string|null>(null);

  const loadTables = async () => {
    if (!user?.organizationId) return;
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/mesas', { params: { organizationId: user.organizationId } });
      const sorted = (data as Table[]).filter(table => table.number > 0).sort((a, b) => a.number - b.number);
      setTables(sorted);
      const areas = await api.get('/table-areas'); setTableAreas(areas.data);
      sorted.forEach(table => router.prefetch(`/dashboard/cardapio/${user.organizationId}/${table.number}`));
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'Não foi possível carregar as mesas.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadTables(); }, [user?.organizationId]);
  const areaTabs = useMemo(() => {
    const tabs = tableAreas.map(area => ({id:area.id,name:area.name}));
    if (tables.some(table => !table.tableAreaId)) tabs.push({id:'__unassigned',name:'Sem área'});
    return tabs;
  },[tableAreas,tables]);
  useEffect(() => {
    if (!loading && activeArea !== '__all' && !areaTabs.some(area=>area.id===activeArea)) {
      setActiveArea(areaTabs[0]?.id || '__all');
    }
  },[areaTabs,activeArea,loading]);
  const filteredTables = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    return tables.filter(table =>
      (activeArea === '__all' || (table.tableAreaId || '__unassigned') === activeArea) &&
      (!value || (String(table.number)+' '+(table.areaName || '')).toLocaleLowerCase().includes(value))
    );
  }, [query, tables, activeArea]);

  const groups = useMemo(() => {
    const result = new Map<string,{name:string;tables:Table[]}>();
    for (const table of filteredTables) {
      const name = table.areaName?.trim() || 'Sem área';
      const key = table.areaName?.trim().toLocaleLowerCase() || '__unassigned';
      if (!result.has(key)) result.set(key,{name,tables:[]});
      result.get(key)!.tables.push(table);
    }
    return [...result.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt'));
  },[filteredTables]);
  const saveArea = async (table:Table) => {
    setSavingArea(table.id);
    try {const {data}=await api.patch(`/mesa/${table.id}/area`,{tableAreaId:areaDrafts[table.id] ?? table.tableAreaId ?? ''});setTables(current=>current.map(t=>t.id===table.id?{...t,areaName:data.areaName,tableAreaId:data.tableAreaId}:t));toast.success('Área guardada');}
    catch(e:any){toast.error(e.response?.data?.error || 'Não foi possível guardar a área.');}
    finally{setSavingArea(null);}
  };
  const openMenu = (table: Table) => {
    if (!user?.organizationId) return;
    setOpening(table.number);
    router.push(`/dashboard/cardapio/${user.organizationId}/${table.number}`);
  };

  return <section className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><Utensils className="h-4 w-4" />Cardápio interno</div>
        <h1 className="text-3xl font-bold tracking-tight">Escolha uma mesa</h1>
        <p className="mt-2 text-muted-foreground">Abra o cardápio já associado à mesa que será atendida.</p>
      </div>
      <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Procurar mesa ou área…" className="pl-9" /></div>
    </header>

    {user?.role === 'ADMIN' && <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Organizar mesas por área</summary><p className="my-3 text-sm text-muted-foreground">Selecione uma área das mesas cadastrada. Para cadastrar áreas e criar mesas, aceda às configurações; crie as mesas na gestão de mesas.</p><a className="text-primary underline" href="/dashboard/settings">Gerir áreas das mesas</a><div className="mt-3 grid gap-3 sm:grid-cols-2">{tables.map(table=><div key={table.id} className="flex items-center gap-2"><label htmlFor={`area-${table.id}`} className="shrink-0">Mesa {table.number}</label><select id={`area-${table.id}`} className="min-w-0 flex-1 rounded-md border bg-background p-2" value={areaDrafts[table.id] ?? table.tableAreaId ?? ''} onChange={e=>setAreaDrafts({...areaDrafts,[table.id]:e.target.value})}><option value="">Selecione a área</option>{tableAreas.map(area=><option key={area.id} value={area.id}>{area.name}</option>)}</select><Button disabled={savingArea!==null || !(areaDrafts[table.id] ?? table.tableAreaId)} onClick={()=>saveArea(table)}>Guardar</Button></div>)}</div></details>}
    {!loading && !error && <Tabs value={activeArea} onValueChange={setActiveArea}><div className="overflow-x-auto pb-2"><TabsList aria-label="Áreas das mesas" className="h-auto w-max justify-start gap-1">{areaTabs.map(area=><TabsTrigger key={area.id} value={area.id}>{area.name} ({tables.filter(table=>(table.tableAreaId || '__unassigned')===area.id).length})</TabsTrigger>)}<TabsTrigger value="__all">Todas as mesas ({tables.length})</TabsTrigger></TabsList></div></Tabs>}
    {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
      : error ? <Card className="border-destructive/30"><CardContent className="flex flex-col items-center gap-4 p-10 text-center"><p className="font-medium text-destructive">{error}</p><Button variant="outline" onClick={loadTables}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></CardContent></Card>
      : filteredTables.length === 0 ? <Card><CardContent className="p-12 text-center text-muted-foreground">Nenhuma mesa encontrada.</CardContent></Card>
      : <div className="space-y-6">{groups.map(group=><section key={group.name}><h2 className="mb-3 text-xl font-semibold">{group.name} <span className="text-sm font-normal text-muted-foreground">({group.tables.length} mesas)</span></h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{group.tables.map(table => <button key={table.id} type="button" onClick={() => openMenu(table)} disabled={opening !== null} className="group rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><Card className="h-full border-2 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-lg"><CardContent className="flex h-44 flex-col justify-between p-5"><div className="flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Armchair className="h-6 w-6" /></div><Badge variant="outline" className={statusStyle[table.status] || statusStyle.livre}>{statusLabel[table.status] || table.status}</Badge></div><div className="flex items-end justify-between"><div><p className="text-2xl font-black">Mesa {table.number}</p><p className="text-sm text-muted-foreground">{table.capacidade || '—'} lugares</p></div><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-1">{opening === table.number ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}</span></div></CardContent></Card></button>)}</div></section>)}</div>}
  </section>;
}
