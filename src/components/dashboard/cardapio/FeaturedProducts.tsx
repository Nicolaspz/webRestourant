import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Clock, TrendingUp } from "lucide-react";
import { ProductCard } from './ProductCard';

interface FeaturedProductsProps {
  products: any[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddToCart: (product: any) => void;
}

export function FeaturedProducts({ 
  products, 
  activeTab, 
  onTabChange, 
  onAddToCart 
}: FeaturedProductsProps) {
  const getFeaturedProductsByTab = () => {
    switch (activeTab) {
      case 'popular':
        // Filtra os que estão em destaque (isFeatured) ou os mais vendidos (orderCount)
        return products
          .filter(p => p.isFeatured || p.orderCount > 0)
          .sort((a, b) => {
            if (a.isFeatured && !b.isFeatured) return -1;
            if (!a.isFeatured && b.isFeatured) return 1;
            return (b.orderCount || 0) - (a.orderCount || 0);
          })
          .slice(0, 8);
      case 'recent':
        // Filtra os que são marcados como novos (isNew) ou por data
        return products
          .filter(p => p.isNew || (p.createdAt && new Date(p.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000))
          .sort((a, b) => {
            if (a.isNew && !b.isNew) return -1;
            if (!a.isNew && b.isNew) return 1;
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          })
          .slice(0, 8);
      case 'price':
        return [...products].sort((a, b) => (a.PrecoVenda[0]?.preco_venda || 0) - (b.PrecoVenda[0]?.preco_venda || 0)).slice(0, 8);
      default:
        // Por padrão, mostra os destaques manuais primeiro
        return products
          .sort((a, b) => (a.isFeatured === b.isFeatured ? 0 : a.isFeatured ? -1 : 1))
          .slice(0, 8);
    }
  };

  return (
    <section className="border-b border-gray-300 bg-white/90">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2 text-gray-900">
            Destaques do Cardápio
          </h2>
          <p className="text-lg text-blue-600">
            Os favoritos dos nossos clientes
          </p>
        </div>

        <div className="w-full">
          <div className="flex gap-1 p-1 rounded-lg mb-6 bg-blue-50">
            {[
              { value: 'popular', label: 'Populares', icon: Star },
              { value: 'recent', label: 'Novidades', icon: Clock },
              { value: 'price', label: 'Melhor Preço', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.value}
                  onClick={() => onTabChange(tab.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md flex-1 transition-all ${
                    activeTab === tab.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-blue-600 hover:bg-white/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {getFeaturedProductsByTab().map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => onAddToCart(product)}
                variant="featured"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}