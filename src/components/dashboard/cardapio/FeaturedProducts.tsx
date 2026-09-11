import { Star, Clock, TrendingUp } from "lucide-react";
import { ProductCard } from './ProductCard';

interface FeaturedProductsProps {
  products: any[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddToCart: (product: any) => void;
}

export function FeaturedProducts({ products, activeTab, onTabChange, onAddToCart }: FeaturedProductsProps) {
  const tabs = [
    { value: 'popular', label: 'Populares', icon: Star },
    { value: 'recent', label: 'Novidades', icon: Clock },
    { value: 'price', label: 'Melhor preço', icon: TrendingUp }
  ];

  return (
    <section className="border-b border-slate-200 bg-slate-50/80">
      <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:py-10">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-600">Seleção da casa</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Destaques do cardápio</h2>
            <p className="mt-1 text-sm text-slate-500">Uma seleção rápida para facilitar a escolha.</p>
          </div>
          <div className="flex w-full gap-1 rounded-xl border border-slate-200 bg-white p-1 md:w-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.value} onClick={() => onTabChange(tab.value)}
                  className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all md:flex-none ${activeTab === tab.value ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                  <Icon className="h-4 w-4" /><span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 xl:gap-5">
            {products.map(product => (
              <ProductCard key={product.id} product={product} onAddToCart={() => onAddToCart(product)} variant="featured" />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">Ainda não existem produtos nesta seleção.</div>
        )}
      </div>
    </section>
  );
}
