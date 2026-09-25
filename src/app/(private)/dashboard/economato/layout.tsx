'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useAccess} from '@/contexts/AccessContext';
export default function EconomatoLayout({children}:{children:React.ReactNode}){
 const {canScreen}=useAccess();const pathname=usePathname();
 const links=[['/dashboard/economato','Levantamentos'],['/dashboard/economato/stock','Stock'],['/dashboard/economato/pedidos','Transferências'],['/dashboard/economato/consumo','Quebras e consumos'],['/dashboard/economato/areas','Áreas']];
 return <section className="space-y-5"><h1 className="text-2xl font-bold">Economato</h1><nav className="flex flex-wrap gap-3">{links.filter(([url])=>canScreen(url)).map(([url,label])=><Link className="rounded border p-3" aria-current={pathname===url?'page':undefined} key={url} href={url}>{label}</Link>)}</nav>{children}</section>;
}
