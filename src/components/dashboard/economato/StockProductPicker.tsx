'use client';
import { Fragment, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type StockOption = { id: string; quantity: number; product: {
  id: string; name: string; unit?: string; isIgredient?: boolean; is_fractional?: boolean;
  Category?: { name: string; parent?: { name: string } | null } | null;
} };

export function StockProductPicker({ items, quantities, onChange, single = false }: {
  items: StockOption[]; quantities: Record<string, number>; onChange: (next: Record<string, number>) => void; single?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const groups = new Map<string, StockOption[]>();
  for (const item of items) {
    const p = item.product;
    const category = p.Category ? [p.Category.parent?.name, p.Category.name].filter(Boolean).join(' / ') : 'Sem categoria';
    if (type === 'ingredient' && !p.isIgredient || type === 'product' && p.isIgredient) continue;
    if (!`${p.name} ${category}`.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim())) continue;
    groups.set(category, [...(groups.get(category) || []), item]);
  }
  return <div className="space-y-3">
    <Input placeholder="Pesquisar produto ou categoria…" aria-label="Pesquisar produto ou categoria" value={search} onChange={e => setSearch(e.target.value)} />
    <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de produto">
      {[["all", "Todos"], ["ingredient", "Ingredientes"], ["product", "Produtos normais"]].map(([value, label]) =>
        <Button key={value} type="button" size="sm" variant={type === value ? 'default' : 'outline'} aria-pressed={type === value} onClick={() => setType(value)}>{label}</Button>)}
    </div>
    <div className="max-h-[340px] overflow-auto rounded-md border">
      <Table><TableHeader><TableRow><TableHead>Escolher</TableHead><TableHead>Produto</TableHead><TableHead>Disponível</TableHead>{!single && <TableHead>Quantidade</TableHead>}</TableRow></TableHeader>
        <TableBody>{[...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([category, products]) => <Fragment key={category}>
          <TableRow className="bg-muted"><TableCell colSpan={single ? 3 : 4} className="font-semibold">{category}</TableCell></TableRow>
          {products.sort((a, b) => a.product.name.localeCompare(b.product.name)).map(item => {
            const p = item.product; const selected = Object.hasOwn(quantities, p.id);
            return <TableRow key={p.id} className={selected ? 'bg-muted/50' : undefined}>
              <TableCell><Checkbox aria-label={`Selecionar ${p.name}`} checked={selected} disabled={item.quantity <= 0} onCheckedChange={checked => {
                const next = single ? {} : { ...quantities };
                if (checked) (next as Record<string, number>)[p.id] = Math.min(1, item.quantity); else delete (next as Record<string, number>)[p.id];
                onChange(next);
              }} /></TableCell>
              <TableCell>{p.name}<span className="block text-xs text-muted-foreground">{p.isIgredient ? 'Ingrediente' : 'Produto normal'}</span></TableCell>
              <TableCell className="whitespace-nowrap">{item.quantity} {p.unit || 'un'}</TableCell>
              {!single && <TableCell><Input aria-label={`Quantidade de ${p.name} (${p.unit || 'un'})`} className="w-28" type="number" min={p.is_fractional ? '0.001' : '1'} max={item.quantity} step={p.is_fractional ? 'any' : '1'} disabled={!selected} value={selected ? quantities[p.id] || '' : ''} onChange={e => onChange({ ...quantities, [p.id]: Number(e.target.value) })} /></TableCell>}
            </TableRow>;
          })}
        </Fragment>)}</TableBody>
      </Table>
      {!groups.size && <p className="p-6 text-center text-muted-foreground">Nenhum produto encontrado nesta origem ou pesquisa.</p>}
    </div>
    {!single && <p className="text-sm text-muted-foreground">{Object.keys(quantities).length} produto(s) selecionado(s). As quantidades usam a unidade indicada.</p>}
  </div>;
}
