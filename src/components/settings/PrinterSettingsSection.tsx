'use client';

import { useEffect, useState } from 'react';
import { Printer, Save, TestTube2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { organizationService } from '@/services/organization';
import { usePosSettings } from '@/hooks/usePosSettings';
import { normalizePosSettings, type PosSettings } from '@/types/pos-settings';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function PrinterSettingsSection({ organization, onUpdateSuccess }: any) {
  const { updateCachedSettings } = usePosSettings(organization?.id);
  const [settings, setSettings] = useState<PosSettings>(() => normalizePosSettings(organization?.posSettings));
  const [saving, setSaving] = useState(false);

  useEffect(() => setSettings(normalizePosSettings(organization?.posSettings)), [organization]);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await organizationService.savePosSettings(organization, settings);
      updateCachedSettings(settings);
      onUpdateSuccess?.(updated);
      toast.success('Configurações de impressão guardadas.');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Não foi possível guardar a configuração.');
    } finally {
      setSaving(false);
    }
  };

  const printTest = () => {
    const popup = window.open('', '_blank', 'width=420,height=640');
    if (!popup) return toast.error('Permita pop-ups para imprimir o teste.');
    popup.document.write(`<!doctype html><html><head><title>Teste POS</title><style>
      @page{size:${settings.paperWidth === 'a4' ? 'A4' : `${settings.paperWidth}mm auto`};margin:4mm}
      body{font:14px monospace;text-align:center;margin:0}.line{border-top:1px dashed #000;margin:12px 0}
    </style></head><body><h2>${organization.name || 'Restaurante'}</h2><p>TESTE DE IMPRESSÃO</p><div class="line"></div><p>Papel: ${settings.paperWidth === 'a4' ? 'A4' : `${settings.paperWidth} mm`}</p><p>Impressora: ${settings.printerName || 'Padrão do sistema'}</p><div class="line"></div><p>Configuração concluída</p><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };

  const toggle = (key: keyof PosSettings) => (checked: boolean) => setSettings(s => ({ ...s, [key]: checked }));

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-3"><Printer className="h-6 w-6 text-primary" /></div>
        <div><h2 className="text-xl font-semibold">Impressão POS</h2><p className="text-sm text-muted-foreground">Preferências usadas no caixa e no fecho das mesas.</p></div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2"><Label>Largura do papel</Label><Select value={settings.paperWidth} onValueChange={(paperWidth: any) => setSettings(s => ({ ...s, paperWidth }))}><SelectTrigger className="h-12"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="80">Térmico 80 mm</SelectItem><SelectItem value="58">Térmico 58 mm</SelectItem><SelectItem value="a4">Folha A4</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label>Nome da impressora (informativo)</Label><Input disabled className="h-12" value={settings.printerName} onChange={e => setSettings(s => ({ ...s, printerName: e.target.value }))} placeholder="Impressora padrão do Windows" /><p className="text-xs text-muted-foreground">O navegador imprime na impressora padrão do Windows; a seleção direta exige uma ligação ESC/POS.</p></div>
        <div className="space-y-2"><Label>Número de cópias</Label><Input className="h-12" type="number" min={1} max={3} value={settings.copies} onChange={e => setSettings(s => ({ ...s, copies: Math.max(1, Math.min(3, Number(e.target.value))) }))} /></div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {[
          ['autoPrint', 'Imprimir após fechar', 'Gera e envia o talão automaticamente.', true],
          ['showPrintDialog', 'Janela de impressão', 'Controlada pelo navegador; use --kiosk-printing para a ocultar.', false],
          ['cutPaper', 'Corte automático', 'Controlado pelo driver da impressora até existir ligação ESC/POS.', false],
          ['printLogo', 'Imprimir logótipo', 'Inclui ou remove o logótipo no cabeçalho do talão.', true],
        ].map(([key, title, description, supported]) => <div key={String(key)} className={`flex min-h-20 items-center justify-between rounded-xl border p-4 ${supported ? '' : 'bg-muted/30'}`}><div><p className="font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div><Switch disabled={!supported} checked={Boolean(settings[key as keyof PosSettings])} onCheckedChange={toggle(key as keyof PosSettings)} /></div>)}
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t pt-5"><Button variant="outline" onClick={printTest}><TestTube2 className="mr-2 h-4 w-4" />Imprimir teste</Button><Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'A guardar...' : 'Guardar configuração'}</Button></div>
    </Card>
  );
}
