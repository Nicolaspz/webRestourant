import { Badge } from "@/components/ui/badge";
import { Utensils, Star, TrendingUp } from "lucide-react";
import { Product } from "../hooks/useKioskMenu";
import { API_BASE_URL } from "../../../config";

interface KioskHighlightsProps {
    products: Product[];
    onSelect: (product: Product) => void;
}

export function KioskHighlights({ products, onSelect }: KioskHighlightsProps) {
    const featuredProducts = products.filter(p => p.isFeatured).slice(0, 3);

    if (featuredProducts.length === 0) {
        return (
            <div className="px-8 pb-8">
                <div className="w-full h-64 rounded-3xl overflow-hidden relative bg-gradient-to-r from-orange-600 to-red-600 flex items-center p-8 md:p-12 shadow-2xl">
                    <div className="z-10 max-w-xl text-center md:text-left">
                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-none mb-4 px-3 py-1 uppercase tracking-widest">Oferta Especial</Badge>
                        <h3 className="text-4xl md:text-5xl font-black text-white mb-4 leading-none">
                            EXPERIMENTE NOSSAS <br />ESPECIALIDADES
                        </h3>
                        <p className="text-white/90 text-lg mb-6">Pratos preparados com ingredientes frescos e paixão!</p>
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-center opacity-30 md:opacity-100">
                        <Utensils size={200} className="text-white/20 rotate-12" />
                    </div>
                </div>
            </div>
        );
    }

    // Se houver produtos em destaque, mostra o primeiro (ou faz um slider se necessário, mas vamos simplificar com o principal por enquanto)
    const topFeatured = featuredProducts[0];

    return (
        <div className="px-8 pb-8">
            <div 
                className="w-full h-72 rounded-[2.5rem] overflow-hidden relative bg-[#1E1E1E] flex items-center p-8 md:p-12 shadow-2xl border border-white/5 cursor-pointer group"
                onClick={() => onSelect(topFeatured)}
            >
                {topFeatured.banner && (
                    <div className="absolute inset-0 z-0">
                        <img 
                            src={`${API_BASE_URL}/tmp/${topFeatured.banner}`} 
                            alt={topFeatured.name}
                            className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
                    </div>
                )}
                
                <div className="z-10 max-w-xl">
                    <div className="flex gap-2 mb-4">
                        <Badge className="bg-orange-500 text-black border-none px-3 py-1 font-black flex gap-1 items-center">
                            <Star size={12} fill="currentColor" /> RECOMENDADO
                        </Badge>
                        <Badge className="bg-white/10 text-white border-none px-3 py-1 font-bold backdrop-blur-md">
                            PREÇO ESPECIAL
                        </Badge>
                    </div>
                    
                    <h3 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight uppercase group-hover:text-orange-500 transition-colors">
                        {topFeatured.name}
                    </h3>
                    
                    <p className="text-gray-300 text-lg mb-6 line-clamp-2 md:line-clamp-none max-w-md">
                        {topFeatured.description || "Nosso prato destaque de hoje."}
                    </p>
                    
                    <div className="flex items-center gap-4">
                        <span className="text-3xl font-black text-orange-500">
                             {(topFeatured.PrecoVenda[0]?.preco_venda || 0).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                        </span>
                        <button className="bg-orange-500 text-black px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white transition-colors shadow-lg shadow-orange-500/20">
                            Ver Detalhes
                        </button>
                    </div>
                </div>

                <div className="absolute right-12 top-0 bottom-0 hidden lg:flex items-center justify-center opacity-20">
                     <TrendingUp size={200} className="text-orange-500 -rotate-12" />
                </div>
            </div>
        </div>
    );
}
