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
import { Input } from '@/components/ui/input';

type Table = { id: string; number: number; capacidade?: number; status: 'livre' | 'ocupada' | 'reservada' };
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
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<number | null>(null);
  const [error, setError] = useState('');

  const loadTables = async () => {
    if (!user?.organizationId) return;
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/mesas', { params: { organizationId: user.organizationId } });
      const sorted = (data as Table[]).filter(table => table.number > 0).sort((a, b) => a.number - b.number);
      setTables(sorted);
      sorted.forEach(table => router.prefetch(`/dashboard/cardapio/${user.organizationId}/${table.number}`));
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'Não foi possível carregar as mesas.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadTables(); }, [user?.organizationId]);
  const filteredTables = useMemo(() => {
    const value = query.trim();
    return value ? tables.filter(table => String(table.number).includes(value)) : tables;
  }, [query, tables]);

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
      <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Procurar mesa…" className="pl-9" /></div>
    </header>

    {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
      : error ? <Card className="border-destructive/30"><CardContent className="flex flex-col items-center gap-4 p-10 text-center"><p className="font-medium text-destructive">{error}</p><Button variant="outline" onClick={loadTables}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></CardContent></Card>
      : filteredTables.length === 0 ? <Card><CardContent className="p-12 text-center text-muted-foreground">Nenhuma mesa encontrada.</CardContent></Card>
      : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filteredTables.map(table => <button key={table.id} type="button" onClick={() => openMenu(table)} disabled={opening !== null} className="group rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><Card className="h-full border-2 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-lg"><CardContent className="flex h-44 flex-col justify-between p-5"><div className="flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Armchair className="h-6 w-6" /></div><Badge variant="outline" className={statusStyle[table.status] || statusStyle.livre}>{statusLabel[table.status] || table.status}</Badge></div><div className="flex items-end justify-between"><div><p className="text-2xl font-black">Mesa {table.number}</p><p className="text-sm text-muted-foreground">{table.capacidade || '—'} lugares</p></div><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-1">{opening === table.number ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}</span></div></CardContent></Card></button>)}</div>}
  </section>;
}
