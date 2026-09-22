import { ProductImage } from '@/components/ProductImage';
import { motion } from "framer-motion";
import { Plus, Star, Utensils, TrendingUp } from "lucide-react";
import { API_BASE_URL, getMediaUrl } from "../../../config";
import { Product, theme } from "../hooks/useKioskMenu";

interface KioskProductCardProps {
    product: Product;
    onSelect: (product: Product) => void;
    onAdd: (product: Product) => void;
}

export function KioskProductCard({ product, onSelect, onAdd }: KioskProductCardProps) {
    return (
        <motion.div
            layoutId={product.id}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#1E1E1E] shadow-sm transition-colors hover:border-orange-500/60"
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            onClick={() => onSelect(product)}
        >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#2A2A2A]">
                <ProductImage banner={product.banner} name={product.name} className="h-full w-full object-cover" />

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                {product.isNew && (
                    <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-orange-500 text-black text-[10px] font-black rounded-full shadow-xl flex items-center gap-1">
                        <Star size={10} fill="currentColor" /> NOVO
                    </div>
                )}

                {product.isFeatured && (
                    <div className="absolute top-14 left-4 z-20 px-3 py-1 bg-yellow-400 text-black text-[10px] font-black rounded-full shadow-xl flex items-center gap-1">
                        <TrendingUp size={10} /> DESTAQUE
                    </div>
                )}

                <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-lg font-black text-white drop-shadow-lg md:text-xl">
                        {(product.PrecoVenda[0]?.preco_venda || 0).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                    </span>
                </div>
            </div>

            <div className="p-4">
                <div className="mb-3">
                    <h3 className="mb-1 line-clamp-2 min-h-12 text-base font-black leading-tight text-white transition-colors group-hover:text-orange-500 md:text-lg">
                        {product.name}
                    </h3>
                    <p className="line-clamp-2 h-9 text-xs leading-relaxed text-gray-400 md:text-sm">
                        {product.description || 'Nenhuma descrição disponível para este prato.'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-3 text-xs font-black uppercase tracking-wide text-black transition-all hover:bg-orange-400 hover:shadow-lg hover:shadow-orange-500/20"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAdd(product);
                        }}
                    >
                        <Plus size={16} strokeWidth={3} />
                        Adicionar
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
