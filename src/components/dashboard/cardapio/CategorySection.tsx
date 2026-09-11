// components/menu/CategorySection.tsx
import { ProductCard } from './ProductCard';

interface CategorySectionProps {
  category: string;
  products: any[];
  onAddToCart: (product: any) => void;
}

export function CategorySection({ category, products, onAddToCart }: CategorySectionProps) {
  const categoryId = category.replace(/\s+/g, '-');

  return (
    <section
      id={categoryId}
      className="mb-12 scroll-mt-40"
    >
      <div className="mb-5 flex items-end justify-between border-b border-slate-200 pb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Categoria</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">{category}</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
          {products.length} {products.length === 1 ? 'opção' : 'opções'}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={() => onAddToCart(product)}
          />
        ))}
      </div>
    </section>
  );
}
