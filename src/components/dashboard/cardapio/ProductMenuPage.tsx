'use client';

import { useMemo } from 'react';
import { useMenu } from '@/components/hooks/useMenu';
import { useCategoryNavigation } from '@/hooks/useCategoryNavigation';
import { Header } from './Header';
import { SessionConflictModal } from './SessionConflictModal';
import { FeaturedProducts } from './FeaturedProducts';
import { CategorySection } from './CategorySection';
import { CartDrawer } from './CartDrawer';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export function ProductMenuPage() {
  const menu = useMenu();
  const categories = useMemo(() => Object.keys(menu.groupedProducts), [menu.groupedProducts]);
  const cartItemCount = useMemo(() => menu.cart.reduce((total, item) => total + item.quantity, 0), [menu.cart]);
  const scrollToCategory = useCategoryNavigation(categories, menu.setActiveCategory);

  if (!menu.isReady) {
    return <div className="min-h-screen bg-[#f6f7f9] p-4 sm:p-8" aria-label="A preparar cardápio">
      <div className="mx-auto max-w-[1480px] space-y-8">
        <div className="flex items-center justify-between rounded-3xl bg-white p-6 shadow-sm"><div className="space-y-3"><Skeleton className="h-8 w-52" /><Skeleton className="h-4 w-32" /></div><Skeleton className="h-11 w-32 rounded-xl" /></div>
        <div className="rounded-3xl bg-white p-6 shadow-sm"><div className="mb-6 flex gap-3"><Skeleton className="h-10 w-28 rounded-full" /><Skeleton className="h-10 w-36 rounded-full" /><Skeleton className="h-10 w-24 rounded-full" /></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-64 rounded-2xl" />)}</div></div>
      </div>
    </div>;
  }

  if (menu.loadError) {
    return <div className="flex min-h-[70vh] items-center justify-center p-6"><div className="max-w-md rounded-3xl border bg-card p-8 text-center shadow-sm"><h2 className="text-xl font-bold">Não foi possível abrir o cardápio</h2><p className="mt-2 text-sm text-muted-foreground">{menu.loadError}</p><Button className="mt-6" onClick={() => window.location.reload()}>Tentar novamente</Button></div></div>;
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      <Header tableNumber={menu.tableNumber} cartItemCount={cartItemCount} activeCategory={menu.activeCategory}
        groupedProducts={menu.groupedProducts} onCartClick={() => menu.setShowCart(true)}
        onCategoryClick={scrollToCategory} isCheckingSession={menu.isCheckingSession}
        hasSessionConflict={Boolean(menu.sessionConflict?.isConflict)} />
      <SessionConflictModal isOpen={Boolean(menu.sessionConflict?.isConflict)} conflict={menu.sessionConflict}
        tableNumber={menu.tableNumber} onClose={() => menu.setSessionConflict(null)}
        onSync={menu.syncWithExistingSession} onCreateNew={menu.createNewSession} />
      <FeaturedProducts products={menu.getFeaturedProductsByTab()} activeTab={menu.activeTab}
        onTabChange={menu.setActiveTab} onAddToCart={menu.addToCart} />
      <main className="mx-auto max-w-[1480px] px-4 py-10 sm:px-6">
        {Object.entries(menu.groupedProducts).map(([category, products]) => (
          <CategorySection key={category} category={category} products={products} onAddToCart={menu.addToCart} />
        ))}
      </main>
      <CartDrawer isOpen={menu.showCart} tableNumber={menu.tableNumber} cart={menu.cart}
        total={menu.calculateTotal()} isSubmitting={menu.isSubmitting} onClose={() => menu.setShowCart(false)}
        onUpdateNotes={menu.updateCartNotes} onUpdateQuantity={menu.updateCartItem} onSubmitOrder={menu.submitOrder} />
    </div>
  );
}
