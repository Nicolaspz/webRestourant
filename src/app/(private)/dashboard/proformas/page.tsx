'use client';
import {useCallback,useContext,useEffect,useState} from 'react';
import {AuthContext} from '@/contexts/AuthContext';
import {useAccess} from '@/contexts/AccessContext';
import {api} from '@/services/api';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {toast} from 'react-toastify';
import {CustomerPicker} from '@/components/CustomerPicker';

type Line={nome:string;quantidade:number;precoUnitario:number;subtotal?:number};
type Proforma={id:string;numero:string;clienteNome:string;clienteNif?:string;valorTotal:number;status:string;criadaEm:string;validade?:string;observacoes?:string;itens:Line[];organization:{name:string};session?:{id:string;mesa:{number:number}}};
const money=(n:number)=>Number(n).toLocaleString('pt-AO',{minimumFractionDigits:2,maximumFractionDigits:2})+' Kz';
export default function Proformas(){
 const {user}=useContext(AuthContext);const {can}=useAccess();
 const [rows,setRows]=useState<Proforma[]>([]),[selected,setSelected]=useState<Proforma|null>(null);
 const [search,setSearch]=useState(''),[status,setStatus]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[creating,setCreating]=useState(false);
 const [name,setName]=useState(''),[nif,setNif]=useState(''),[validity,setValidity]=useState(''),[notes,setNotes]=useState(''),[table,setTable]=useState('');
 const [lines,setLines]=useState<Line[]>([{nome:'',quantidade:1,precoUnitario:0}]);
 const [conversion,setConversion]=useState<Proforma|null>(null),[paymentTable,setPaymentTable]=useState(''),[method,setMethod]=useState('dinheiro');
 const convert=async(e:React.FormEvent)=>{
  e.preventDefault();if(!conversion||busy)return;setBusy(true);
  try{await api.post(`/proformas/${conversion.id}/converter`,{mesaNumber:paymentTable?Number(paymentTable):undefined,metodoPagamento:method,valorPago:Number(conversion.valorTotal)});setConversion(null);setSelected(null);await load();toast.success('Pagamento registado. Consulte a fatura-recibo no Caixa.');}
  catch(error:any){toast.error(error.response?.data?.error||'Não foi possível converter.');}finally{setBusy(false);}
 };
 const load=useCallback(async()=>{if(!user?.organizationId)return;setLoading(true);try{const r=await api.get('/proformas',{params:{organizationId:user.organizationId}});setRows(r.data);}catch{toast.error('Não foi possível carregar as proformas.');}finally{setLoading(false);}},[user?.organizationId]);
 useEffect(()=>{void load();},[load]);
 const create=async(e:React.FormEvent)=>{
  e.preventDefault();if(busy)return;setBusy(true);
  try{const r=await api.post('/proformas',{organizationId:user?.organizationId,clienteNome:name,clienteNif:nif,validade:validity||undefined,observacoes:notes,mesaNumber:table?Number(table):undefined,itens:table?undefined:lines});setSelected(r.data);setCreating(false);setName('');setNif('');setNotes('');setTable('');setValidity('');setLines([{nome:'',quantidade:1,precoUnitario:0}]);await load();toast.success('Proforma guardada.');}
  catch(error:any){toast.error(error.response?.data?.error||'Não foi possível criar a proforma.');}finally{setBusy(false);}
 };
 const print=async(p:Proforma)=>{
  const {jsPDF}=await import('jspdf');const {default:autoTable}=await import('jspdf-autotable');
  const pdf=new jsPDF();pdf.setFontSize(16);pdf.text('PROFORMA',14,18);pdf.setFontSize(10);
  pdf.text([p.organization.name,p.numero,`Cliente: ${p.clienteNome}`,`NIF: ${p.clienteNif||'N/A'}`,`Data: ${new Date(p.criadaEm).toLocaleDateString('pt-PT')}`,`Validade: ${p.validade?new Date(p.validade).toLocaleDateString('pt-PT'):'Não definida'}`],14,28);
  autoTable(pdf,{startY:63,head:[['Descrição','Qtd.','Preço unitário','Total']],body:p.itens.map(l=>[l.nome,l.quantidade,money(l.precoUnitario),money(l.subtotal??l.quantidade*l.precoUnitario)]),foot:[['Total','','',money(p.valorTotal)]],margin:{bottom:24},didDrawPage:()=>{pdf.setFontSize(9);pdf.text('Proforma — não é documento fiscal nem comprovativo de pagamento.',14,285);}});
  pdf.save(`${p.numero.replace(/[^a-zA-Z0-9-]/g,'_')}.pdf`);
 };
 const cancel=async(p:Proforma)=>{if(!window.confirm('Cancelar esta proforma?'))return;setBusy(true);try{await api.post(`/proformas/${p.id}/cancelar`,{organizationId:user?.organizationId});setSelected(null);await load();}catch{toast.error('Não foi possível cancelar.');}finally{setBusy(false);}};
 const visible=rows.filter(p=>(!status||p.status===status)&&`${p.clienteNome} ${p.clienteNif||''} ${p.numero}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 return <section className="space-y-6">
  <div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-bold">Proformas</h1><p className="text-muted-foreground">Propostas por cliente ou empresa. Sem envio à AGT.</p></div>{can('proformas.create')&&<Button onClick={()=>setCreating(!creating)}>{creating?'Fechar formulário':'Nova proforma'}</Button>}</div>
  {creating&&<form onSubmit={create} className="rounded-xl border bg-background p-5 space-y-4"><h2 className="font-semibold">Cliente e proposta</h2><CustomerPicker name={name} nif={nif} disabled={busy} onChange={(n,t)=>{setName(n);setNif(t);}}/><div className="grid gap-4 md:grid-cols-2"><label>Validade<Input type="date" value={validity} onChange={e=>setValidity(e.target.value)}/></label><label>Mesa com consumo (opcional)<Input type="number" min="1" value={table} onChange={e=>setTable(e.target.value)}/></label></div>
  {table?<p>Os produtos e valores serão copiados do consumo atual desta mesa.</p>:<><div className="space-y-3">{lines.map((line,i)=><div key={i} className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto]"><label>Produto / serviço<Input required value={line.nome} onChange={e=>setLines(lines.map((v,j)=>j===i?{...v,nome:e.target.value}:v))}/></label><label>Quantidade<Input required type="number" min="1" step="1" value={line.quantidade} onChange={e=>setLines(lines.map((v,j)=>j===i?{...v,quantidade:Number(e.target.value)}:v))}/></label><label>Preço final unitário (Kz)<Input required type="number" min="0" step="0.01" value={line.precoUnitario} onChange={e=>setLines(lines.map((v,j)=>j===i?{...v,precoUnitario:Number(e.target.value)}:v))}/></label><Button type="button" variant="outline" disabled={lines.length===1} onClick={()=>setLines(lines.filter((_,j)=>j!==i))}>Remover</Button></div>)}</div><Button type="button" variant="outline" onClick={()=>setLines([...lines,{nome:'',quantidade:1,precoUnitario:0}])}>Adicionar produto</Button><p className="font-semibold">Total: {money(lines.reduce((s,l)=>s+Math.round(l.quantidade*l.precoUnitario*100)/100,0))}</p></>}
  <label className="block">Observações<Input value={notes} onChange={e=>setNotes(e.target.value)}/></label><Button disabled={busy}>{busy?'A guardar…':'Guardar proforma'}</Button></form>}
  <div className="flex gap-3"><Input placeholder="Pesquisar cliente, NIF ou número" aria-label="Pesquisar proformas" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Estado" className="rounded border p-2" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos os estados</option>{['emitida','convertida','cancelada'].map(s=><option key={s}>{s}</option>)}</select></div>
  {loading?<p>A carregar…</p>:<div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{['Cliente / empresa','Número','Data','Total','Estado',''].map((h,i)=><th key={i} className="p-3">{h}</th>)}</tr></thead><tbody>{visible.map(p=><tr key={p.id} className="border-t"><td className="p-3 font-semibold">{p.clienteNome}</td><td>{p.numero}</td><td>{new Date(p.criadaEm).toLocaleDateString('pt-PT')}</td><td>{money(p.valorTotal)}</td><td>{p.status}</td><td><Button variant="outline" onClick={()=>setSelected(p)}>Ver proforma</Button></td></tr>)}</tbody></table>{!visible.length&&<p className="p-4">Nenhuma proforma encontrada.</p>}</div>}
  {selected&&<div className="rounded-xl border bg-background p-5 space-y-4"><div className="flex justify-between"><h2 className="font-bold">{selected.numero} — {selected.clienteNome}</h2><Button variant="ghost" onClick={()=>setSelected(null)}>Fechar</Button></div><p>NIF: {selected.clienteNif||'N/A'} · {selected.status}</p>{selected.itens.map((l,i)=><p key={i}>{l.quantidade} × {l.nome} — {money(l.subtotal??l.quantidade*l.precoUnitario)}</p>)}<p className="font-bold">Total: {money(selected.valorTotal)}</p>{selected.observacoes&&<p>{selected.observacoes}</p>}<p className="text-sm text-muted-foreground">Proforma — não é documento fiscal nem comprovativo de pagamento.</p><div className="flex gap-3"><Button onClick={()=>void print(selected)}>Descarregar PDF / imprimir</Button>{selected.status==='emitida'&&can('proformas.delete')&&<Button variant="outline" disabled={busy} onClick={()=>void cancel(selected)}>Cancelar proforma</Button>}</div></div>}
 {selected?.status==='emitida'&&can('invoices.pay')&&<Button disabled={busy} onClick={()=>{setConversion(selected);setPaymentTable(String(selected.session?.mesa.number||''));}}>Registar pagamento e gerar fatura-recibo</Button>}
 {conversion&&<form onSubmit={convert} className="rounded-xl border p-5 space-y-4"><h2 className="font-bold">Confirmar pagamento — {conversion.clienteNome}</h2><p>Registe primeiro o consumo real na mesa. Produtos, quantidades e preços devem corresponder à proforma. A conversão fecha a conta e regista o pagamento de {money(conversion.valorTotal)}.</p><label className="block">Mesa do consumo<Input required type="number" min="1" disabled={Boolean(conversion.session)} value={paymentTable} onChange={e=>setPaymentTable(e.target.value)}/></label><label className="block">Método de pagamento<select className="ml-3 rounded border p-2" value={method} onChange={e=>setMethod(e.target.value)}>{['dinheiro','cartao','multicaixa','transferencia','outro'].map(m=><option key={m}>{m}</option>)}</select></label><label className="flex gap-2"><input required type="checkbox"/>Confirmo que recebi o pagamento integral.</label><div className="flex gap-3"><Button disabled={busy}>{busy?'A processar…':'Confirmar pagamento e converter'}</Button><Button type="button" variant="outline" disabled={busy} onClick={()=>setConversion(null)}>Cancelar</Button></div></form>}
 </section>;
}
