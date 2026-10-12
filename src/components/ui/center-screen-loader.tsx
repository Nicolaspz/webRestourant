import { Loader2 } from 'lucide-react';

export function CenterScreenLoader({ title = 'A carregar…', description }: { title?: string; description?: string }) {
  return <div role="status" aria-live="polite" className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-6">
    <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border bg-card px-8 py-7 text-center shadow-xl">
      <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden="true" />
      <p className="font-semibold">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  </div>;
}
