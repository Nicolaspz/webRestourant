import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-label="A carregar painel">
      <div className="flex items-center justify-between rounded-2xl border bg-background p-5">
        <div className="space-y-2"><Skeleton className="h-7 w-52" /><Skeleton className="h-4 w-72" /></div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-3"><Skeleton className="h-80 rounded-2xl lg:col-span-2" /><Skeleton className="h-80 rounded-2xl" /></div>
    </div>
  );
}
