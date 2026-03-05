import { motion } from "framer-motion";
import { Plus, Star, Utensils, Heart } from "lucide-react";
import { API_BASE_URL } from "../../../config";
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
            className="group relative overflow-hidden rounded-[2rem] cursor-pointer bg-[#1E1E1E] border border-white/5 hover:border-orange-500/50 transition-colors"
            whileHover={{ y: -8, transition: { duration: 0.3 } }}
            onClick={() => onSelect(product)}
        >
            <div className="aspect-[1/1] w-full overflow-hidden bg-[#2A2A2A] relative">
                {product.banner ? (
                    <img
                        src={`${API_BASE_URL}/tmp/${product.banner}`}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-700 bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E]">
                        <Utensils size={40} strokeWidth={1} />
                    </div>
                )}

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                <div className="absolute top-4 right-4 z-10">
                    <button className="p-2 rounded-full bg-black/20 backdrop-blur-md text-white/70 hover:text-red-500 transition-colors">
                        <Heart size={18} />
                    </button>
                </div>

                {product.isNew && (
                    <div className="absolute top-4 left-4 px-3 py-1 bg-orange-500 text-black text-[10px] font-black rounded-full shadow-xl flex items-center gap-1">
                        <Star size={10} fill="currentColor" /> NOVO
                    </div>
                )}

                <div className="absolute bottom-4 left-4 right-4">
                    <span className="text-orange-500 font-black text-xl md:text-2xl drop-shadow-lg">
                        {(product.PrecoVenda[0]?.preco_venda || 0).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                    </span>
                </div>
            </div>

            <div className="p-6">
                <div className="mb-4">
                    <h3 className="font-black text-xl leading-tight text-white mb-2 group-hover:text-orange-500 transition-colors line-clamp-1">
                        {product.name}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed h-10">
                        {product.description || 'Nenhuma descrição disponível para este prato.'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-white/5 hover:bg-orange-500 hover:text-black hover:shadow-lg hover:shadow-orange-500/20 text-white"
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
