'use client'
import { useEffect, useState } from 'react'
import { setupAPIClient } from '@/services/api'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'react-toastify'

export function MenuStockVisibilitySection() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  useEffect(() => { setupAPIClient().get('/organization/menu-stock-visibility').then(({ data }) => setEnabled(Boolean(data.showUnavailableProductsInMenu))).catch(() => toast.error('Não foi possível carregar esta preferência.')).finally(() => setLoading(false)) }, [])
  async function update(value: boolean) {
    setSaving(true)
    try { await setupAPIClient().put('/organization/menu-stock-visibility', { showUnavailableProductsInMenu: value }); setEnabled(value); toast.success('Visibilidade do menu atualizada.') }
    catch { toast.error('Não foi possível guardar a preferência.') }
    finally { setSaving(false) }
  }
  return <div className="rounded-xl border bg-card p-5 space-y-3"><h3 className="text-lg font-semibold">Disponibilidade no menu</h3><p className="text-sm text-muted-foreground">Controle se produtos sem stock devem continuar visíveis para os clientes.</p><div className="flex items-center justify-between rounded-lg border p-4"><div><Label htmlFor="show-unavailable">Mostrar produtos sem stock</Label><p className="text-xs text-muted-foreground">Mesmo visíveis, não poderão ser adicionados quando não houver stock.</p></div><Switch id="show-unavailable" checked={enabled} disabled={loading || saving} onCheckedChange={update} /></div></div>
}
