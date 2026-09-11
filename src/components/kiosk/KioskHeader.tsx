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
        <header className="fixed left-0 right-0 top-0 z-40 flex flex-col items-center justify-between border-b border-white/5 bg-[#121212]/95 p-3 backdrop-blur-lg md:relative md:flex-row md:border-none md:bg-transparent md:p-8">
            <div className="w-full md:flex-1 mb-4 md:mb-0 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black tracking-tight text-white md:text-4xl">
                        {activeCategory === 'Destaques' ? '🔥 OS MAIS PEDIDOS' : activeCategory.toUpperCase()}
                    </h2>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 md:text-sm">
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
                        className="min-h-12 w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-white outline-none ring-orange-500 transition-all placeholder:text-gray-500 focus:ring-2 md:w-72"
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
