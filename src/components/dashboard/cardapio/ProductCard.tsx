import { ProductImage } from '@/components/ProductImage';
// components/menu/ProductCard.tsx
import { motion } from 'framer-motion';
import { Utensils, Plus } from 'lucide-react';
import { getMediaUrl } from '../../../../config';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description?: string;
    banner?: string;
    PrecoVenda: { preco_venda: number }[];
    isFeatured?: boolean;
    isNew?: boolean;
  };
  onAddToCart: () => void;
  variant?: 'grid' | 'featured';
}

export function ProductCard({ product, onAddToCart, variant = 'grid' }: ProductCardProps) {
  if (variant === 'featured') {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div
          className="h-full cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-xl"
          onClick={onAddToCart}
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
              <ProductImage banner={product.banner} name={product.name} className="h-full w-full object-cover" />
              {/* Badges para Featured/New */}
              <div className="absolute top-1 left-1 flex flex-col gap-1">
                {product.isFeatured && (
                  <span className="bg-yellow-400 text-gray-900 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wider">
                    Destaque
                  </span>
                )}
                {product.isNew && (
                  <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wider">
                    Novo
                  </span>
                )}
              </div>
          </div>
          <div className="p-4">
            <h3 className="mb-2 line-clamp-2 min-h-10 text-sm font-bold leading-snug text-slate-900">
              {product.name}
            </h3>
            <p className="text-base font-extrabold text-slate-950">
              {(product.PrecoVenda[0]?.preco_venda || 0).toLocaleString('pt-AO')} Kz
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300 }}>
      <div
        className={`group h-full cursor-pointer overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
          product.isFeatured 
            ? 'border-amber-300 ring-1 ring-amber-300/30'
            : 'border-slate-200'
        }`}
        onClick={onAddToCart}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          <ProductImage banner={product.banner} name={product.name} className="h-full w-full object-cover" />

          {/* Badges para Featured/New */}
          <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
            {product.isFeatured && (
              <span className="bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider border border-yellow-500/20">
                Destaque
              </span>
            )}
            {product.isNew && (
              <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider border border-green-600/20">
                Lançamento
              </span>
            )}
          </div>
          
          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
            <p className="text-white text-sm text-center line-clamp-4">
              {product.description || "Delicioso prato preparado com ingredientes frescos."}
            </p>
          </div>
        </div>

        <div className="p-4">
          <h3 className="mb-1 line-clamp-1 text-lg font-bold text-slate-950">
            {product.name}
          </h3>
          {product.description && (
            <p className="mb-4 line-clamp-2 min-h-10 text-sm leading-relaxed text-slate-500">
              {product.description}
            </p>
          )}
          <div className="flex justify-between items-center">
            <span className="text-lg font-extrabold text-slate-950">
              {(product.PrecoVenda[0]?.preco_venda || 0).toLocaleString('pt-AO')} Kz
            </span>
            <button aria-label={`Adicionar ${product.name}`} className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-sm transition-colors hover:bg-amber-400">
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
