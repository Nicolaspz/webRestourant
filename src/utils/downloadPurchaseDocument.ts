import { setupAPIClient } from '@/services/api';
import { toast } from 'react-toastify';
export async function downloadPurchaseDocument(purchaseId:string, image:{id:string;path:string}) {
 try {
  const {data}=await setupAPIClient().get(`/compra/${purchaseId}/documents/${image.id}`,{responseType:'blob'});
  const url=URL.createObjectURL(data);const link=document.createElement('a');
  link.href=url;link.download=decodeURIComponent(image.path.split('/').pop()?.split('?')[0] || 'documento');
  document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60000);
 } catch(error:any) {
  let message='Não foi possível descarregar o documento.';
  if(error.response?.data instanceof Blob){try{message=JSON.parse(await error.response.data.text()).error || message;}catch{}}
  else message=error.response?.data?.error || message;
  toast.error(message);
 }
}
