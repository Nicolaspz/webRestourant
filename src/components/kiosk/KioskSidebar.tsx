import { ChevronRight, Flame } from "lucide-react";
import { theme } from "../hooks/useKioskMenu";

interface KioskSidebarProps {
    categories: string[];
    activeCategory: string;
    onSelectCategory: (category: string) => void;
}

export function KioskSidebar({ categories, activeCategory, onSelectCategory }: KioskSidebarProps) {
    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-row md:relative md:w-64 md:h-full md:flex-col border-t md:border-r md:border-t-0 bg-white/10 backdrop-blur-xl md:bg-[#1E1E1E]"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
        >
            <div className="hidden md:flex p-6 items-center justify-start gap-3 border-b border-white/10">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500 shadow-lg shadow-orange-500/20">
                    <Flame size={20} className="text-black scale-110" fill="black" />
                </div>
                <h1 className="text-2xl font-black tracking-tighter text-white">
                    MENU<span className="text-orange-500">.DIGITAL</span>
                </h1>
            </div>

            <div className="flex-1 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto px-4 py-3 md:py-6 gap-3 md:gap-2 no-scrollbar">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => onSelectCategory(cat)}
                        className={`flex-shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2 md:py-4 rounded-2xl transition-all duration-300 group ${activeCategory === cat
                                ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20 scale-105 md:scale-100'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <span className="font-bold text-sm md:text-lg whitespace-nowrap">
                            {cat}
                        </span>
                        {activeCategory === cat && (
                            <ChevronRight className="ml-auto hidden md:block" size={18} />
                        )}
                    </button>
                ))}
            </div>

            {/* Safe area spacer for mobile */}
            <div className="h-safe-bottom md:hidden" />
        </nav>
    );
}
