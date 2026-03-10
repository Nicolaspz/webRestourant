import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { setupAPIClient } from '@/services/api';
import { toast } from 'react-toastify';
import { useClientToken } from '@/types/useClientToken';
import { setCookie } from '@/utils/cookies';

export type Product = {
    id: string;
    name: string;
    description: string;
    banner?: string;
    unit: string;
    isIgredient: boolean;
    PrecoVenda: { preco_venda: number }[];
    Category: { name: string; id: string };
    orderCount?: number;
    createdAt?: string;
    isNew?: boolean;
    isFeatured?: boolean;
    isDerived?: boolean;
};

export type CartItem = {
    product: Product;
    quantity: number;
};

export const theme = {
    bg: '#121212',
    surface: '#1E1E1E',
    surfaceHighlight: '#2A2A2A',
    primary: '#FF9F1C',
    primaryDark: '#E08605',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    success: '#2EC4B6',
    danger: '#EF476F'
};

export function useKioskMenu() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showTableModal, setShowTableModal] = useState(false);
    const [tableInput, setTableInput] = useState('');
    const [cartOpen, setCartOpen] = useState(false);

    // Guest Info States
    const [guestName, setGuestName] = useState("");
    const [guestPhone, setGuestPhone] = useState("");
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);

    const params = useParams();
    const organizationId = params.organizationId as string;
    const tableNumberFromUrl = params.tableNumber || params.number; // number para dashboard, tableNumber para root pública
    const apiClient = setupAPIClient();

    const { clientToken, isLoading: tokenLoading } = useClientToken(tableNumberFromUrl as string);
    const [sessionConflict, setSessionConflict] = useState<any>(null);

    // Carregar informações do visitante
    useEffect(() => {
        const saved = localStorage.getItem('guestInfo');
        if (saved) {
            const parsed = JSON.parse(saved);
            setGuestName(parsed.name || "");
            setGuestPhone(parsed.phone || "");
        } else if (!tokenLoading && clientToken) {
            // Se tiver token mas não tiver info no localStorage (novo acesso via QR)
            setShowWelcomeModal(true);
        }
    }, [tokenLoading, clientToken]);

    const handleGuestConfirm = async (name: string, phone: string) => {
        setGuestName(name);
        setGuestPhone(phone);
        localStorage.setItem('guestInfo', JSON.stringify({ name, phone }));
        setShowWelcomeModal(false);
        toast.success(`Bem-vindo, ${name || 'Cliente'}!`, { theme: 'dark' });

        // Guardar no backend para campanhas (sem bloquear o fluxo)
        if (phone && organizationId) {
            try {
                await apiClient.post('/takeaway/cliente', { name, phone, organizationId });
            } catch (err) {
                // Silencioso — não bloquear o utilizador se falhar
                console.warn('Não foi possível registar cliente no backend:', err);
            }
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await apiClient.get('/produts', {
                    params: { organizationId }
                });

                const processed = response.data
                    .filter((p: any) => {
                        const isIngredienteCategory = p.Category?.name?.toLowerCase() === 'ingredientes' || 
                                                    p.Category?.name?.toLowerCase() === 'ingrediente';
                        return !p.isIgredient && !isIngredienteCategory;
                    })
                    .map((p: Product) => ({
                        ...p,
                        PrecoVenda: p.PrecoVenda || [{ preco_venda: 0 }],
                    }));

                setProducts(processed);
                if (processed.length > 0) {
                    if (!activeCategory || activeCategory === 'all') {
                        setActiveCategory('Destaques');
                    }
                }
            } catch (error) {
                console.error("Error fetching menu:", error);
                toast.error('Erro ao carregar cardápio');
            }
        };
        if (organizationId) fetchData();
    }, [organizationId]);

    // Verificar token/sessão ao carregar
    useEffect(() => {
        const verifySession = async () => {
            if (tokenLoading || !clientToken || !organizationId || !tableNumberFromUrl) return;

            try {
                await apiClient.post('/token/verify', {
                    tableNumber: Number(tableNumberFromUrl),
                    organizationId,
                    clientToken
                });
                setSessionConflict(null);
            } catch (error: any) {
                if (error.response?.data?.code === 'SESSION_CONFLICT') {
                    setSessionConflict(error.response.data);
                    toast.warning('Esta mesa já tem um pedido em andamento');
                }
            }
        };

        verifySession();
    }, [clientToken, tokenLoading, organizationId, tableNumberFromUrl]);

    const categories = useMemo(() => {
        const cats = Array.from(new Set(products.map(p => {
            if (p.isDerived) return 'Pratos';
            return p.Category?.name || 'Outros';
        }))).filter(c => c !== 'Ingredientes' && c !== 'Ingrediente').sort();
        
        // Colocar Pratos logo após Destaques se existir
        const finalCats = ['Destaques'];
        if (cats.includes('Pratos')) finalCats.push('Pratos');
        cats.forEach(c => {
            if (c !== 'Pratos') finalCats.push(c);
        });
        
        return finalCats;
    }, [products]);

    const filteredProducts = useMemo(() => {
        let filtered = products;

        if (activeCategory === 'Destaques') {
            return products.filter(p => p.isFeatured || p.isNew || (p.orderCount && p.orderCount > 50));
        } else {
            filtered = products.filter(p => {
                const catName = p.isDerived ? 'Pratos' : (p.Category?.name || 'Outros');
                return catName === activeCategory;
            });
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q)
            );
        }

        return filtered;
    }, [products, activeCategory, searchQuery]);

    const cartTotal = useMemo(() => {
        return cart.reduce((acc, item) => {
            return acc + (item.product.PrecoVenda[0]?.preco_venda || 0) * item.quantity;
        }, 0);
    }, [cart]);

    const addToCart = (product: any, quantity = 1) => {
        // Cálculo de Stock Disponível no Frontend (Dica para o Cliente)
        const checkStock = (p: any, required: number) => {
            const availableInGeneral = p.Stock?.[0]?.totalQuantity || 0;
            const availableInArea = p.defaultAreaId
                ? p.economatoes?.find((e: any) => e.areaId === p.defaultAreaId)?.quantity || 0
                : 0;
            return (availableInGeneral + availableInArea) >= (required + (prevQuantity(p.id)));
        };

        const prevQuantity = (id: string) => {
            return cart.find(i => i.product.id === id)?.quantity || 0;
        };

        if (product.isDerived && product.recipeItems) {
            for (const r of product.recipeItems) {
                if (r.impactaPreco) {
                    const ing = r.ingredient;
                    const requiredIng = r.quantity * quantity;
                    if (!checkStock(ing, requiredIng)) {
                        toast.error(`Produto indisponível: Ingrediente ${ing.name} insuficiente no stock.`, { theme: 'dark' });
                        return;
                    }
                }
            }
        } else {
            if (!checkStock(product, quantity)) {
                toast.error(`Produto ${product.name} insuficiente no stock.`, { theme: 'dark' });
                return;
            }
        }

        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { product, quantity }];
        });
        setCartOpen(true);
        setSelectedProduct(null);
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQ = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQ };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const handleCheckout = async () => {
        const finalTableNumber = tableNumberFromUrl || tableInput;

        if (!finalTableNumber) {
            setShowTableModal(true);
            return;
        }

        if (!clientToken) {
            toast.error('Token de cliente não disponível. Tente recarregar.');
            return;
        }

        setIsSubmitting(true);
        try {
            const items = cart.map(item => ({
                productId: item.product.id,
                amount: item.quantity
            }));

            await apiClient.post('/orders/with-stock', {
                tableNumber: finalTableNumber === 'TAKEAWAY' ? 0 : Number(finalTableNumber),
                organizationId,
                items,
                customerName: guestName || (finalTableNumber === 'TAKEAWAY' ? 'Kiosk Takeaway' : `Mesa ${finalTableNumber}`),
                customerPhone: guestPhone,
                clientToken
            });

            toast.success('Pedido enviado com sucesso! Aguarde...', {
                position: 'top-center',
                autoClose: 5000,
                theme: 'dark'
            });
            setCart([]);
            setCartOpen(false);
            setShowTableModal(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Erro ao enviar pedido.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        products,
        cart,
        categories,
        activeCategory,
        searchQuery,
        selectedProduct,
        isSubmitting,
        showTableModal,
        tableInput,
        cartOpen,
        filteredProducts,
        cartTotal,
        organizationId,
        clientToken,
        tokenLoading,
        sessionConflict,
        guestName,
        guestPhone,
        showWelcomeModal,
        setSearchQuery,
        setActiveCategory,
        setCartOpen,
        setSelectedProduct,
        setTableInput,
        setShowTableModal,
        addToCart,
        updateQuantity,
        handleCheckout,
        setSessionConflict,
        handleGuestConfirm
    };
}
