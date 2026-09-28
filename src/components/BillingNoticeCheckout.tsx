'use client';
import {useState,useRef} from 'react';
import {CustomerPicker} from './CustomerPicker';
import {Button} from '@/components/ui/button';
import {api} from '@/services/api';
import {toast} from 'react-toastify';
export function BillingNoticeCheckout({tableNumber,sessionId,onClose,onComplete}:{tableNumber:number;sessionId:string;onClose:()=>void;onComplete:()=>void}) {
 const [name,setName]=useState(''),[nif,setNif]=useState(''),[busy,setBusy]=useState(false);const lock=useRef(false);
 async function issue(){if(lock.current)return;lock.current=true;setBusy(true);try{
  if(!sessionId)throw new Error('Não foi possível identificar a sessão da mesa.');
  await api.post('/billing-notices',{sessionId,customerName:name,customerTaxId:nif});
  toast.success('Mesa concluída com aviso de cobrança. O valor continua por pagar.');onComplete();
 }catch(e:any){toast.error(e.response?.data?.error||e.message||'Não foi possível emitir.');}finally{lock.current=false;setBusy(false);}}
 return <div role="dialog" aria-modal="true" aria-label="Concluir com aviso de cobrança" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"><div className="max-h-[90dvh] w-full max-w-xl overflow-auto rounded-xl bg-background p-6 space-y-4"><h2 className="text-xl font-bold">Aviso de cobrança — Mesa {tableNumber}</h2><p>Concluir o consumo e libertar a mesa sem receber agora. O pagamento será registado na lista de avisos, com emissão do recibo AR.</p><CustomerPicker name={name} nif={nif} disabled={busy} onChange={(n,t)=>{setName(n);setNif(t);}}/><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={onClose}>Voltar</Button><Button disabled={busy||!name.trim()} aria-busy={busy} onClick={issue}>{busy?'A emitir…':'Confirmar cobrança por pagar'}</Button></div></div></div>;
}
