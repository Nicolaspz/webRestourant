'use client';
import { useEffect, useState } from 'react';
import { setupAPIClient } from '@/services/api';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
export function GpaySettingsSection() {
 const [config, setConfig] = useState({enabled:false, apiKeyConfigured:false, webhookKeyConfigured:false, webhookUrl:null as string|null});
 const [enabled,setEnabled] = useState(false), [apiKey,setApiKey] = useState(''), [webhookKey,setWebhookKey] = useState('');
 const [ready,setReady] = useState(false), [saving,setSaving] = useState(false), [error,setError] = useState('');
 async function load() {
  setError(''); setReady(false);
  try {const {data}=await setupAPIClient().get('/gpay/config');setConfig(data);setEnabled(data.enabled);setReady(true);}
  catch(e:any){setError(e.response?.data?.error || 'Não foi possível carregar a configuração GPay.');}
 }
 useEffect(()=>{void load();},[]);
 async function save() {
  setSaving(true);setError('');
  try {const {data}=await setupAPIClient().put('/gpay/config',{enabled,apiKey,webhookKey});setConfig(data);setEnabled(data.enabled);setApiKey('');setWebhookKey('');toast.success(data.enabled?'Referências GPay ativadas.':'Configuração GPay guardada; referências desativadas.');}
  catch(e:any){setError(e.response?.data?.error || 'Não foi possível guardar o GPay.');}
  finally{setSaving(false);}
 }
 return <section className="rounded-xl border p-6 space-y-4">
  <h2 className="text-xl font-semibold">GPay — pagamento por referência</h2>
  <p className="text-sm text-muted-foreground">Copie o endereço do servidor para a GPay. Depois guarde aqui a chave de webhook gerada por ela.</p>
  {error && <div role="alert" className="text-sm text-destructive">{error}{!ready && <Button type="button" variant="outline" onClick={load}>Tentar novamente</Button>}</div>}
  {!ready && !error && <p>A carregar configuração...</p>}
  <label className="block text-sm">1. URL para cadastrar no painel GPay
   <Input readOnly value={config.webhookUrl || ''} placeholder="Endereço do servidor ainda não configurado" onFocus={e=>e.target.select()} />
  </label>
  {config.webhookUrl ? <Button type="button" variant="outline" onClick={async()=>{try{await navigator.clipboard.writeText(config.webhookUrl!);toast.success('URL copiada');}catch{toast.info('Selecione o endereço acima e copie.');}}}>Copiar URL</Button> : ready && <p className="text-sm text-muted-foreground">Configure PUBLIC_API_URL no backend com o seu endereço HTTPS público e reinicie o servidor. A URL aparecerá aqui antes de guardar qualquer chave.</p>}
  <label className="block text-sm">2. Chave do webhook gerada pela GPay
   <Input type="password" disabled={!ready || saving} autoComplete="new-password" value={webhookKey} onChange={e=>setWebhookKey(e.target.value)} placeholder={config.webhookKeyConfigured?'Já guardada — deixe vazio para manter':'Cole a secret_key gerada ao cadastrar o webhook'} />
  </label>
  <p className="text-sm text-muted-foreground">Valida as confirmações de pagamento enviadas pela GPay.</p>
  <label className="block text-sm">3. Chave API GPay
   <Input type="password" disabled={!ready || saving} autoComplete="new-password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={config.apiKeyConfigured?'Já guardada — deixe vazio para manter':'Chave API para criar referências'} />
  </label>
  <p className="text-sm text-muted-foreground">É uma chave diferente: permite ao sistema gerar referências de pagamento. Use o valor completo fornecido pela GPay para gpay-x-api.</p>
  <label className="flex gap-3 items-center"><Switch checked={enabled} disabled={!ready || saving} onCheckedChange={setEnabled} />Ativar referências GPay</label>
  <p className="text-sm text-muted-foreground">Estado guardado: {config.enabled?'Ativado':'Desativado'}. As alterações só são aplicadas ao guardar.</p>
  <Button type="button" disabled={!ready || saving} onClick={save}>{saving?'A guardar...':'Guardar configuração GPay'}</Button>
 </section>;
}
