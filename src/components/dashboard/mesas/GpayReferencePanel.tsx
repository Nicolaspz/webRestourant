'use client';
import { useEffect, useRef, useState } from 'react';
import { setupAPIClient } from '@/services/api';
import { enqueueGpayPrint } from '@/utils/gpayPrintQueue';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
type Reference = {id:string; status:string; reference:string|null; entity:string|null; amount:string|number; expiresAt:string|null; failureReason:string|null};
export function GpayReferencePanel({number, organizationId, onPending, onSuccess}: {number:number; organizationId:string; onPending:(pending:boolean)=>void; onSuccess:(data:any)=>Promise<void>}) {
 const successRef = useRef(onSuccess); successRef.current = onSuccess;
 const [payment,setPayment]=useState<Reference|null>(null), [busy,setBusy]=useState(false), [enabled,setEnabled]=useState(false), [customer,setCustomer]=useState({name:'',phone:'',email:''}), [evidence,setEvidence]=useState(''), [verified,setVerified]=useState(false), [loadError,setLoadError]=useState(false);
 useEffect(() => { let active=true; Promise.all([setupAPIClient().get('/gpay/availability'),setupAPIClient().get('/tables/'+number+'/reference-payment')]).then(([config,result]) => {if(active){setEnabled(config.data.enabled);setPayment(result.data);onPending(Boolean(result.data && ['CREATED','PENDING','PROCESSING'].includes(result.data.status)));}}).catch(()=>{if(active)setLoadError(true);}); return ()=>{active=false;}; },[number,onPending]);
 useEffect(() => {
   if (!payment || !['CREATED','PENDING','PROCESSING'].includes(payment.status)) return;
   let active = true, checking = false;
   const check = async () => {
     if (!active || checking || document.hidden) return;
     checking = true;
     try { const {data} = await setupAPIClient().get('/reference-payments/'+payment.id);
       if (active && ['FAILED','EXPIRED','CANCELLED'].includes(data.status)) { setPayment(previous => previous ? {...previous,status:data.status} : previous); onPending(false); }
       if (active && data.status === 'PAID' && data.receipt) { active = false; onPending(false); await successRef.current(undefined); }
     } catch { /* Mantém pendente até a API confirmar. */ } finally { checking = false; }
   };
   const timer = window.setInterval(check, 10000); window.addEventListener('focus',check);
   return () => { active=false; window.clearInterval(timer); window.removeEventListener('focus',check); };
 }, [payment?.id, payment?.status, onPending]);
 async function create() {setBusy(true);try {const {data}=await setupAPIClient().post('/tables/'+number+'/reference-payment',{customer});setPayment(data);onPending(true); try { enqueueGpayPrint(organizationId, data.id); } catch { toast.warning("Não foi possível guardar a impressão automática neste posto. Reimprima pelo Caixa após o pagamento."); }toast.info('Referência criada. A mesa continua aberta até confirmação.');}catch(e:any){toast.error(e.response?.data?.error || 'Erro ao gerar referência'); const {data}=await setupAPIClient().get('/tables/'+number+'/reference-payment').catch(()=>({data:null})); if(data){setPayment(data);onPending(true); try { enqueueGpayPrint(organizationId, data.id); } catch { toast.warning("Não foi possível guardar a impressão automática neste posto. Reimprima pelo Caixa após o pagamento."); }}}finally{setBusy(false);}}
 async function confirm() {if(!payment)return;setBusy(true);try{const {data}=await setupAPIClient().post('/reference-payments/'+payment.id+'/confirm',{verified,evidence}); try { enqueueGpayPrint(organizationId, payment.id); } catch { toast.warning("Reimprima a fatura pelo Caixa."); } await onSuccess(undefined);}catch(e:any){toast.error(e.response?.data?.error || 'Erro ao confirmar referência');}finally{setBusy(false);}}
 if(loadError)return <p className="text-sm text-destructive">Não foi possível consultar referências GPay. Reabra o pagamento para tentar novamente.</p>;
 if(!enabled&&!payment)return null;
 return <section className="border rounded-xl p-4 space-y-3"><h3 className="font-semibold">Pagamento por referência — GPay</h3>{payment ? <><p className="text-sm font-medium">{payment.status === 'PAID' ? 'Pago' : 'A aguardar conferência do pagamento'}</p><dl className="text-sm space-y-1"><div>Entidade: <strong>{payment.entity || 'A confirmar no GPay'}</strong></div><div>Referência: <strong>{payment.reference || 'A confirmar no GPay'}</strong></div><div>Valor: {Number(payment.amount).toLocaleString('pt-AO')} Kz</div><div>Validade: {payment.expiresAt ? new Date(payment.expiresAt).toLocaleString('pt-AO') : 'A confirmar'}</div></dl>{payment.expiresAt && new Date(payment.expiresAt)<new Date() && <p className="text-sm text-amber-700">Prazo terminado. Confira no GPay se houve pagamento antes de emitir outra cobrança.</p>}{payment.failureReason&&<p className="text-sm text-destructive">{payment.failureReason}</p>}{['FAILED','EXPIRED','CANCELLED'].includes(payment.status) && <><p className="text-sm">Estado recebido do GPay: {payment.status}</p><Button onClick={()=>setPayment(null)}>Preparar nova referência</Button></>}{payment.status==='PENDING'&&<><p className="text-sm text-muted-foreground">Confira a liquidação no painel GPay. O retorno do cliente à aplicação não confirma o pagamento.</p><label className="block text-sm">Identificador do comprovativo<Input value={evidence} maxLength={500} disabled={busy} onChange={e=>setEvidence(e.target.value)} /></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={verified} disabled={busy} onChange={e=>setVerified(e.target.checked)} />Conferi no GPay que esta referência foi paga pelo valor acima.</label><Button disabled={busy||!verified||evidence.trim().length<5} onClick={confirm}>{busy?'A confirmar...':'Registar confirmação e fechar mesa'}</Button></>}</> : <><p className="text-sm text-muted-foreground">Gere uma referência e mantenha a mesa aberta até ao pagamento.</p>{(['name','phone','email'] as const).map((field,index)=><label className="block text-sm" key={field}>{['Nome do cliente','Telefone','Email'][index]}<Input type={field==='email'?'email':'text'} value={customer[field]} disabled={busy} onChange={e=>setCustomer({...customer,[field]:e.target.value})} /></label>)}<Button onClick={create} disabled={busy}>{busy?'A gerar...':'Gerar referência GPay'}</Button></>}</section>;
}
