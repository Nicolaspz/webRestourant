'use client';
import {useEffect,useRef,useState,useContext} from 'react';
import {api} from '@/services/api';
import {useAccess} from '@/contexts/AccessContext';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {toast} from 'react-toastify';
import {useSocket} from '@/contexts/SocketContext';
import {AuthContext} from '@/contexts/AuthContext';
import {usePosSettings} from '@/hooks/usePosSettings';
import {buildBillingNoticePdf,printBillingNotice} from '@/utils/printBillingNotice';
type Fiscal={documentNo?:string;status:string;requestId?:string;message?:string};
type Notice={id:string;customerName:string;customerTaxId?:string;total:string;status:string;documentNo?:string;requestId?:string;message?:string;createdAt:string;paidAt?:string;receiptFatura?:{id:string;metodoPagamento:string;fiscalSubmission?:Fiscal};session:{mesa:{number:number}};payload:{taxRegistrationNumber:string;lines:{productDescription:string;quantity:number;creditAmount:number;taxes:{taxContribution:number}[]}[]}};
const money=(v:number|string)=>Number(v).toLocaleString('pt-AO',{minimumFractionDigits:2,maximumFractionDigits:2})+' Kz';
const accepted=(s:string)=>['VALID','VALID_PENALTY','PROCESSED_SUCCESS'].includes(s.toUpperCase());
const day=(v:string)=>{const d=new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export default function BillingNotices(){
 const {socket}=useSocket();
 const {user}=useContext(AuthContext);const {settings}=usePosSettings(user?.organizationId);
 const {can}=useAccess();const lock=useRef(false);
 const [rows,setRows]=useState<Notice[]>([]),[search,setSearch]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [openingId,setOpeningId]=useState<string|null>(null);
 async function visualize(notice:Notice,receipt=false){
  if(lock.current)return;
  const tab=window.open('about:blank','_blank');
  if(!tab){toast.warning('Permita abrir uma nova aba para visualizar o PDF.');return;}
  tab.opener=null;tab.document.title='A abrir documento';tab.document.body.textContent='A preparar PDF…';
  lock.current=true;setOpeningId(notice.id);
  try{
   const blob=await buildBillingNoticePdf(notice.id,receipt,{...settings,paperWidth:'a4'},false,true);
   if(tab.closed)return;
   const url=URL.createObjectURL(blob);
   tab.location.replace(url);
   window.setTimeout(()=>URL.revokeObjectURL(url),300000);
  }catch(e:any){tab.close();toast.error(e.message||'Não foi possível abrir o documento.');}
  finally{lock.current=false;setOpeningId(null);}
 }
 const [status,setStatus]=useState('all'),[start,setStart]=useState(''),[end,setEnd]=useState('');
 const [selected,setSelected]=useState<Notice|null>(null),[method,setMethod]=useState('dinheiro'),[confirmed,setConfirmed]=useState(false);
 async function load(){setLoading(true);try{setRows((await api.get('/billing-notices')).data);}catch{toast.error('Não foi possível carregar os avisos.');}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 useEffect(()=>{
  let active=true,running=false;let debounce:ReturnType<typeof setTimeout>;
  const recover=async()=>{if(running||document.hidden)return;running=true;try{const {data}=await api.get('/billing-notices');if(active)setRows(data);}catch{/* Retry on the next timer or reconnect. */}finally{running=false;}};
  const schedule=()=>{clearTimeout(debounce);debounce=setTimeout(()=>void recover(),250);};
  socket?.on('fiscal_updated',schedule);socket?.on('connect',schedule);
  document.addEventListener('visibilitychange',schedule);
  const timer=setInterval(()=>void recover(),30000);
  return()=>{active=false;clearInterval(timer);clearTimeout(debounce);socket?.off('fiscal_updated',schedule);socket?.off('connect',schedule);document.removeEventListener('visibilitychange',schedule);};
 },[socket]);
 async function refresh(n:Notice){if(lock.current)return;lock.current=true;setBusy(true);try{await api.post(`/billing-notices/${n.id}/status`);await load();}catch{toast.error('Não foi possível consultar o estado.');}finally{lock.current=false;setBusy(false);}}
 async function pay(){if(!selected||!confirmed||lock.current)return;lock.current=true;setBusy(true);try{await api.post(`/billing-notices/${selected.id}/pay`,{method,amount:Number(selected.total),confirmed:true});setSelected(null);setConfirmed(false);await load();toast.success('Pagamento registado. Recibo AR enfileirado para emissão.');}catch(e:any){toast.error(e.response?.data?.error||'Não foi possível confirmar. Atualize antes de tentar novamente.');}finally{lock.current=false;setBusy(false);}}
 async function pdf(n:Notice,receipt=false){if(lock.current)return;lock.current=true;setBusy(true);try{await printBillingNotice(n.id,receipt,settings);}catch(e:any){toast.warning(e.message||'Não foi possível imprimir.');}finally{lock.current=false;setBusy(false);}}
 const visible=rows.filter(n=>(status==='all'||(status==='paid'?!!n.paidAt:!n.paidAt))&&(!start||day(n.createdAt)>=start)&&(!end||day(n.createdAt)<=end)&&`${n.customerName} ${n.customerTaxId||''} ${n.documentNo||''} ${n.receiptFatura?.fiscalSubmission?.documentNo||''} ${n.session.mesa.number}`.toLowerCase().includes(search.toLowerCase()));
 return <section className="space-y-5"><h1 className="text-2xl font-bold">Avisos de cobrança</h1>
 <div className="flex flex-wrap gap-3"><Input className="sm:max-w-sm" aria-label="Pesquisar cobranças" placeholder="Cliente, NIF, número ou mesa" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Estado do pagamento" className="rounded border bg-background px-3" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Todos</option><option value="pending">Por pagar</option><option value="paid">Pagos</option></select><label>De<Input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Até<Input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label><Button disabled={busy||loading} variant="outline" onClick={load}>Atualizar lista</Button></div>
 {loading?<p>A carregar…</p>:!visible.length?<p>Nenhum aviso encontrado.</p>:<div className="space-y-3">{visible.map(n=><article key={n.id} className="rounded-xl border p-4 space-y-3">
 <div className="flex flex-wrap items-center gap-4"><div className="min-w-0 flex-1"><p className="font-medium">{n.customerName}</p><p className="text-sm text-muted-foreground">{n.documentNo||'Aviso de cobrança'}</p></div><p className="font-semibold">{money(n.total)}</p><time className="text-sm text-muted-foreground" dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleDateString('pt-PT')}</time></div>
 <div className="flex flex-wrap gap-2">
 <Button variant="outline" disabled={busy||openingId!==null} aria-busy={openingId===n.id} onClick={()=>visualize(n)}>{openingId===n.id?'A abrir…':'Abrir documento'}</Button>
 {n.paidAt&&<Button variant="outline" disabled={busy||openingId!==null} onClick={()=>visualize(n,true)}>Abrir recibo AR</Button>}
 {can('invoices.print')&&<><Button variant="outline" disabled={busy||openingId!==null} onClick={()=>pdf(n)}>Imprimir AC</Button>{n.paidAt&&<Button variant="outline" disabled={busy||openingId!==null} onClick={()=>pdf(n,true)}>Imprimir AR</Button>}</>}
 <Button variant="outline" disabled={busy||openingId!==null||!n.requestId} onClick={()=>refresh(n)}>Atualizar documento</Button>
 {!n.paidAt&&can('invoices.pay')&&<Button title={!accepted(n.status)?'Aguarde a aceitação fiscal e atualize o documento.':undefined} disabled={busy||openingId!==null||!n.documentNo||!accepted(n.status)} onClick={()=>{setSelected(n);setConfirmed(false);}}>Registar pagamento e emitir recibo</Button>}
 </div>
 </article>)}</div>}
 {selected&&<div role="dialog" aria-modal="true" aria-label="Registar pagamento" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-lg space-y-4 rounded-xl bg-background p-6"><h2 className="text-xl font-bold">Receber {money(selected.total)}</h2><p>{selected.customerName} · {selected.documentNo}</p><label className="block">Método<select className="block w-full rounded border bg-background p-3" value={method} disabled={busy} onChange={e=>setMethod(e.target.value)}>{['dinheiro','cartao','multicaixa','transferencia','outro'].map(m=><option key={m} value={m}>{m}</option>)}</select></label><label className="flex gap-2"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>Confirmo que recebi o valor integral.</label><p className="text-sm">Será emitido um AR associado a este aviso, sem repetir a venda.</p><div className="flex gap-2"><Button disabled={busy} variant="outline" onClick={()=>setSelected(null)}>Cancelar</Button><Button aria-busy={busy} disabled={busy||!confirmed} onClick={pay}>{busy?'A registar…':'Confirmar pagamento'}</Button></div></div></div>}
 </section>;
}
