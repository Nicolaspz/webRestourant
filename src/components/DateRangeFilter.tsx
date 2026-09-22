"use client";
import { useEffect, useId, useState } from 'react';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
export type DateRange = { startDate: string; endDate: string };
export function dateRangePreset(preset: 'today' | 'week' | 'month'): DateRange {
 const today = dayjs();
 const start = preset === 'week' ? today.subtract((today.day() + 6) % 7, 'day') : preset === 'month' ? today.startOf('month') : today;
 return {startDate: start.format('YYYY-MM-DD'), endDate: today.format('YYYY-MM-DD')};
}
export function DateRangeFilter({value,onChange,disabled=false}: {value:DateRange;onChange:(range:DateRange)=>void;disabled?:boolean}) {
 const id=useId();const [draft,setDraft]=useState(value);
 useEffect(()=>setDraft(value),[value.startDate,value.endDate]);
 const valid=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&dayjs(s).isValid()&&dayjs(s).format('YYYY-MM-DD')===s;
 const invalid=!valid(draft.startDate)||!valid(draft.endDate)||draft.startDate>draft.endDate;
 const changed=draft.startDate!==value.startDate||draft.endDate!==value.endDate;
 return <form aria-label="Filtrar por período" className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4" onSubmit={e=>{e.preventDefault();if(!invalid&&!disabled)onChange({...draft});}}>
  <div className="flex flex-wrap gap-2 w-full">{(['today','week','month'] as const).map((preset,i)=>{const range=dateRangePreset(preset);const active=value.startDate===range.startDate&&value.endDate===range.endDate;return <Button key={preset} type="button" size="sm" variant={active?'default':'outline'} aria-pressed={active} disabled={disabled} onClick={()=>{setDraft(range);onChange(range);}}>{['Hoje','Esta semana','Este mês'][i]}</Button>;})}</div>
  <div className="space-y-1.5 flex-1 min-w-36"><Label htmlFor={id+'-start'}>Data inicial</Label><Input id={id+'-start'} type="date" required value={draft.startDate} disabled={disabled} max={draft.endDate||undefined} onChange={e=>setDraft({...draft,startDate:e.target.value})} /></div>
  <div className="space-y-1.5 flex-1 min-w-36"><Label htmlFor={id+'-end'}>Data final</Label><Input id={id+'-end'} type="date" required value={draft.endDate} disabled={disabled} min={draft.startDate||undefined} onChange={e=>setDraft({...draft,endDate:e.target.value})} /></div>
  <Button type="submit" disabled={disabled||invalid||!changed}>Aplicar período</Button>
  {invalid&&<p role="alert" className="w-full text-sm text-destructive">Indique datas válidas; a data final não pode ser anterior à inicial.</p>}
 </form>;
}
