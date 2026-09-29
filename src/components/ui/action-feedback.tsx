'use client';

import * as React from 'react';
import {Loader2} from 'lucide-react';
import {toast} from 'react-toastify';

const FormPending = React.createContext(false);
function useAction() {
 const lock=React.useRef(false);
 const [pending,setPending]=React.useState(false);
 const run=(action:()=>unknown,event:React.SyntheticEvent)=>{
  if(lock.current){event.preventDefault();event.stopPropagation();return;}
  try {
   const result=action();
   if(result&&typeof (result as PromiseLike<unknown>).then==='function'){
    lock.current=true;setPending(true);
    Promise.resolve(result).catch(()=>toast.error('Não foi possível concluir a operação. Tente novamente.')).finally(()=>{lock.current=false;setPending(false);});
   }
  } catch {toast.error('Não foi possível concluir a operação. Tente novamente.');}
 };
 return {pending,run};
}

export function useButtonFeedback({onClick,disabled,type,loading=false,'aria-busy':ariaBusy}:React.ComponentProps<'button'>&{loading?:boolean}) {
 const action=useAction();const formPending=React.useContext(FormPending);
 const pending=loading||action.pending||ariaBusy===true||ariaBusy==='true'||(formPending&&type!=='button'&&type!=='reset');
 return {pending,disabled:disabled||pending,onClick:(event:React.MouseEvent<HTMLButtonElement>)=>{
  if(pending||disabled){event.preventDefault();event.stopPropagation();return;}
  action.run(()=>onClick?.(event),event);
 }};
}

export function ActionSpinner(){return <Loader2 aria-hidden="true" className="inline-block size-4 shrink-0 animate-spin"/>;}

export function ActionButton({children,loading=false,loadingText='A processar…',...props}:React.ComponentProps<'button'>&{loading?:boolean;loadingText?:string}){
 const feedback=useButtonFeedback({...props,loading});
 return <button {...props} disabled={feedback.disabled} aria-busy={feedback.pending||undefined} onClick={feedback.onClick}>{feedback.pending?<><ActionSpinner/><span className={props['aria-label']?'sr-only':'ml-2'}>{loadingText}</span></>:children}</button>;
}

export function ActionForm({onSubmit,children,...props}:React.ComponentProps<'form'>){
 const action=useAction();
 return <FormPending.Provider value={action.pending}><form {...props} aria-busy={action.pending||undefined} onSubmit={event=>action.run(()=>onSubmit?.(event),event)}>{children}</form></FormPending.Provider>;
}
