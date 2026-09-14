import { HierarchicalCategories } from '../dashboard/menu/HierarchicalCategories';
import { ChevronRight, Flame, LayoutGrid } from "lucide-react";
import { theme } from "../hooks/useKioskMenu";

interface KioskSidebarProps {
    categories: string[];
    activeCategory: string;
    onSelectCategory: (category: string) => void;
    organizationData?: any;
}

export function KioskSidebar({ categories, activeCategory, onSelectCategory, organizationData }: KioskSidebarProps) {
    const { getMediaUrl } = require('../../../config');

    return (
        <nav
            className="fixed left-0 right-0 top-[120px] z-30 flex flex-row border-y bg-[#171717]/95 backdrop-blur-xl md:relative md:top-auto md:h-full md:w-64 md:flex-col md:border-y-0 md:border-r md:bg-[#1E1E1E]"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
        >
            <div className="hidden md:flex p-6 items-center justify-start gap-3 border-b border-white/10">
                {organizationData?.imageLogo ? (
                    <img 
                        src={getMediaUrl(organizationData.imageLogo)} 
                        alt={organizationData?.name || 'Logo'} 
                        className="w-12 h-12 rounded-xl object-cover shadow-lg"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500 shadow-lg shadow-orange-500/20">
                        <Flame size={20} className="text-black scale-110" fill="black" />
                    </div>
                )}
                
                <h1 className="text-xl font-black tracking-tighter text-white line-clamp-2">
                    {organizationData?.name ? (
                        organizationData.name.toUpperCase()
                    ) : (
                        <>MENU<span className="text-orange-500">.DIGITAL</span></>
                    )}
                </h1>
            </div>

            <div className="flex flex-1 flex-row gap-2 overflow-x-auto px-3 py-2 no-scrollbar md:flex-col md:gap-2 md:overflow-y-auto md:px-4 md:py-6">
                <HierarchicalCategories categories={categories} activeCategory={activeCategory} onSelect={onSelectCategory} dark />
            </div>

        </nav>
    );
}
