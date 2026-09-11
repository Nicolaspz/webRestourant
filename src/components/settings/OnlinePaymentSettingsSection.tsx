'use client';

import { GpaySettingsSection } from './GpaySettingsSection';
import { useEffect, useState } from 'react';
import { CreditCard, KeyRound, Loader2, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { setupAPIClient } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

type PaymentConfig = {
  enabled: boolean;
  providerUserId: string;
  apiKeyConfigured: boolean;
  apiKeyLast4: string;
  webhookSecretConfigured: boolean;
};

export function OnlinePaymentSettingsSection() {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setupAPIClient().get('/payment-provider/config')
      .then(({ data }) => setConfig(data))
      .catch(error => toast.error(error.response?.data?.error || 'Não foi possível carregar a integração'))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    try {
      const { data } = await setupAPIClient().put('/payment-provider/config', {
        enabled: config.enabled,
        providerUserId: config.providerUserId,
        ...(apiKey ? { apiKey } : {}),
        ...(webhookSecret ? { webhookSecret } : {}),
      });
      setConfig(data);
      setApiKey('');
      setWebhookSecret('');
      toast.success('Pagamento online configurado com segurança');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Não foi possível guardar a integração');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !config) return <Card className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></Card>;

  return (
    <div className="space-y-6"><GpaySettingsSection /><Card className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary"><CreditCard className="h-6 w-6" /></div>
          <div><h2 className="text-xl font-semibold">Pagamento online</h2><p className="text-sm text-muted-foreground">Checkout hospedado e envio do link por SMS.</p></div>
        </div>
        <div className={`flex items-center gap-3 rounded-full border px-4 py-2 ${config.enabled ? 'border-green-300 bg-green-50 text-green-700' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
          <span className="text-sm font-semibold">{config.enabled ? 'Integração ativa' : 'Integração desativada'}</span>
          <Switch aria-label="Ativar pagamento online" checked={config.enabled} onCheckedChange={enabled => setConfig(current => current ? { ...current, enabled } : current)} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="provider-user-id">User ID do provedor</Label>
          <Input id="provider-user-id" value={config.providerUserId} onChange={event => setConfig({ ...config, providerUserId: event.target.value })} placeholder="ID atribuído pelo provedor" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="provider-api-key">Bearer API key</Label>
          <div className="relative"><KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="provider-api-key" type="password" className="pl-10" value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder={config.apiKeyConfigured ? `Configurada ••••${config.apiKeyLast4}` : 'Insira a chave'} autoComplete="new-password" /></div>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="webhook-secret">Segredo do webhook</Label>
          <Input id="webhook-secret" type="password" value={webhookSecret} onChange={event => setWebhookSecret(event.target.value)} placeholder={config.webhookSecretConfigured ? 'Configurado — deixe vazio para manter' : 'Disponibilizado pelo provedor'} autoComplete="new-password" />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-4 w-4 text-green-600" />As chaves são cifradas e nunca voltam ao navegador.</span>
        <Button onClick={save} disabled={saving || !config.providerUserId.trim()}><Save className="mr-2 h-4 w-4" />{saving ? 'A guardar...' : 'Guardar'}</Button>
      </div>
    </Card></div>
  );
}
