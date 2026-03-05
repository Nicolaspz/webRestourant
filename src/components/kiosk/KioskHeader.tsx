import { Search, ShoppingCart, Flame } from "lucide-react";
import { theme } from "../hooks/useKioskMenu";

interface KioskHeaderProps {
    activeCategory: string;
    searchQuery: string;
    cartItemCount: number;
    onSearchChange: (value: string) => void;
    onOpenCart: () => void;
}

export function KioskHeader({ activeCategory, searchQuery, cartItemCount, onSearchChange, onOpenCart }: KioskHeaderProps) {
    return (
        <header className="fixed top-0 left-0 right-0 z-40 md:relative p-4 md:p-8 flex flex-col md:flex-row items-center justify-between bg-[#121212]/80 backdrop-blur-lg border-b border-white/5 md:border-none md:bg-transparent">
            <div className="w-full md:flex-1 mb-4 md:mb-0 flex items-center justify-between">
                <div>
                    <h2 className="text-xl md:text-4xl font-black tracking-tight text-white">
                        {activeCategory === 'Destaques' ? '🔥 OS MAIS PEDIDOS' : activeCategory.toUpperCase()}
                    </h2>
                    <p className="text-[10px] md:text-sm text-gray-500 uppercase tracking-widest font-bold">
                        Sabores incríveis à sua espera
                    </p>
                </div>

                {/* Mobile Cart Toggle */}
                <button
                    className="md:hidden relative p-3 rounded-2xl bg-orange-500 text-black shadow-lg shadow-orange-500/20"
                    onClick={onOpenCart}
                >
                    <ShoppingCart size={20} strokeWidth={3} />
                    {cartItemCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-black text-[10px] font-black flex items-center justify-center border-2 border-orange-500">
                            {cartItemCount}
                        </span>
                    )}
                </button>
            </div>

            <div className="w-full md:w-auto flex items-center gap-4">
                <div className="relative flex-1 md:flex-none">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Pesquisar..."
                        value={searchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white w-full md:w-64 focus:ring-2 ring-orange-500 outline-none transition-all placeholder:text-gray-600"
                    />
                </div>
                <button
                    className="hidden md:flex relative p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-white border border-white/10 group"
                    onClick={onOpenCart}
                >
                    <ShoppingCart size={24} className="group-hover:scale-110 transition-transform" />
                    {cartItemCount > 0 && (
                        <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-orange-500 text-black text-xs font-black flex items-center justify-center border-4 border-[#121212]">
                            {cartItemCount}
                        </span>
                    )}
                </button>
            </div>
        </header>
    );
}
