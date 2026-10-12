'use client';
export default function EconomatoLayout({children}:{children:React.ReactNode}){
 return <section className="space-y-5"><div><h1 className="text-2xl font-bold">Economato</h1><p className="mt-1 text-sm text-muted-foreground">As compras dão entrada no stock geral. A entrada de stock nas áreas regista transferências; o levantamento confirma a entrega de artigos dos pedidos.</p></div>{children}</section>;
}
