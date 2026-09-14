import { HierarchicalCategories } from '../menu/HierarchicalCategories';
import { ShoppingCart, ChefHat, MapPin } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface HeaderProps {
  tableNumber: string;
  cartItemCount: number;
  activeCategory: string | null;
  groupedProducts: Record<string, any[]>;
  onCartClick: () => void;
  onCategoryClick: (category: string) => void;
  isCheckingSession?: boolean;
  hasSessionConflict?: boolean;
}

export function Header({
  tableNumber,
  cartItemCount,
  activeCategory,
  groupedProducts,
  onCartClick,
  onCategoryClick,
  isCheckingSession,
  hasSessionConflict
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="mx-auto max-w-[1480px] px-4 sm:px-6">
        <div className="flex min-h-20 items-center justify-between gap-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 shadow-lg shadow-slate-950/15">
              <ChefHat className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600">Serviço à mesa</p>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">Cardápio digital</h1>
              <div className="flex items-center gap-2">
                <p className="flex items-center gap-1 text-xs font-semibold text-slate-500 sm:text-sm">
                  <MapPin className="h-3.5 w-3.5 text-amber-600" />
                  {tableNumber === 'TAKEAWAY' ? 'Takeaway' : `Mesa ${tableNumber}`}
                </p>
                {isCheckingSession && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    Verificando...
                  </span>
                )}
                {hasSessionConflict && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                    Sessão em conflito
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button
  onClick={onCartClick}
  variant="outline"
  className="relative h-11 rounded-xl border-slate-200 bg-slate-950 px-4 text-white shadow-sm hover:bg-slate-800"
>
  <ShoppingCart className="w-5 h-5 mr-2" />
  Carrinho
  {cartItemCount > 0 && (
    <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-amber-500 px-1 text-xs font-extrabold text-slate-950 shadow-sm">
      {cartItemCount}
    </span>
  )}
</Button>
        </div>

        <div className="border-t border-slate-100">
          <HierarchicalCategories categories={Object.keys(groupedProducts)} activeCategory={activeCategory} onSelect={onCategoryClick} />
        </div>
      </div>
    </header>
  );
}
