'use client';
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { setupAPIClient } from '@/services/api';
import { Package, Minus, Plus, ShoppingCart, Trash2, Loader2, SendHorizontal, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import TakeawayGestao from '@/components/dashboard/takeaway/TakeawayGestao';
import TakeawayClientesList from '@/components/dashboard/takeaway/TakeawayClientesList';
import { useSocket } from '@/contexts/SocketContext';
import { Users } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    price: number;
    categoryId: string;
    image?: string;
    isDerived?: boolean;
    isIgredient?: boolean;
    recipeItems?: any[];
    Stock?: any[];
    economatoes?: any[];
    defaultAreaId?: string;
}

interface Category {
    id: string;
    name: string;
    products: Product[];
}

interface CartItem {
    product: Product;
    quantity: number;
}

export default function TakeawayPage() {
    const { user } = useContext(AuthContext);
    const { socket } = useSocket();
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [mainTab, setMainTab] = useState('pos');
    const [pendentesCount, setPendentesCount] = useState(0);

    const [hasCaixaAberto, setHasCaixaAberto] = useState(true);

    useEffect(() => {
        if (user?.organizationId) {
            loadCardapio();
            checkCaixa();
            fetchPendentesCount();
        }
    }, [user]);

    // Actualizar contagem de pendentes via socket
    useEffect(() => {
        if (socket && user?.organizationId) {
            const handler = (data: any) => {
                if (data.organizationId === user.organizationId) {
                    fetchPendentesCount();
                }
            };
            socket.on('orders_refresh', handler);
            return () => { socket.off('orders_refresh', handler); };
        }
    }, [socket, user]);

    async function checkCaixa() {
        try {
            const apiClient = setupAPIClient();
            const res = await apiClient.get('/caixa/current', { params: { organizationId: user?.organizationId } });
            setHasCaixaAberto(!(!res.data || res.data.isClosed));
        } catch {
            setHasCaixaAberto(false);
        }
    }

    async function fetchPendentesCount() {
        if (!user?.organizationId) return;
        try {
            const apiClient = setupAPIClient();
            const res = await apiClient.get('/takeaway/pedidos', {
                params: { organizationId: user.organizationId, status: 'pendente' }
            });
            setPendentesCount(res.data?.length || 0);
        } catch {
            // silencioso
        }
    }

    async function loadCardapio() {
        setLoading(true);
        try {
            const apiClient = setupAPIClient();
            // Usamos o endpoint de produtos que já inclui categoria e preços
            const response = await apiClient.get('/produts', {
                params: { organizationId: user?.organizationId }
            });

            const allProductsList = (response.data || []).filter((p: any) => !p.isIgredient);

            // Agrupar produtos por categoria para manter a interface de abas
            const categoriesMap = new Map();

            allProductsList.forEach((p: any) => {
                const catId = p.Category?.id || 'outros';
                const catName = p.Category?.name || 'Outros';

                if (!categoriesMap.has(catId)) {
                    categoriesMap.set(catId, {
                        id: catId,
                        name: catName,
                        products: []
                    });
                }

                categoriesMap.get(catId).products.push({
                    ...p,
                    price: Number(p.PrecoVenda?.[0]?.preco_venda || 0),
                    image: p.banner
                });
            });

            const categoriesArray = Array.from(categoriesMap.values()) as Category[];
            setCategories(categoriesArray);

            if (categoriesArray.length > 0) setActiveCategory('all');
        } catch (err) {
            console.error('Erro ao carregar produtos:', err);
            toast.error('Erro ao carregar cardápio');
        } finally {
            setLoading(false);
        }
    }

    const addToCart = (product: Product) => {
        // console.log('Tentativa de adicionar ao carrinho:', product.name, product);

        // Cálculo de Stock Disponível no Frontend (Dica para o Usuário)
        const checkStock = (p: any, required: number) => {
            const availableInGeneral = p.Stock?.[0]?.totalQuantity || 0;
            const availableInArea = p.defaultAreaId
                ? p.economatoes?.find((e: any) => e.areaId === p.defaultAreaId)?.quantity || 0
                : 0;

            // console.log(`Stock para ${p.name}: Geral=${availableInGeneral} Área=${availableInArea} Requerido=${required}`);
            return (availableInGeneral + availableInArea) >= required;
        };

        if (product.isDerived && product.recipeItems) {
            for (const r of product.recipeItems) {
                if (r.impactaPreco) {
                    const ing = r.ingredient;
                    if (!ing) continue;

                    const requiredIng = r.quantity * 1;
                    if (!checkStock(ing, requiredIng)) {
                        toast.error(`Produto indisponível: Ingrediente ${ing.name} insuficiente no stock.`);
                        return;
                    }
                }
            }
        } else {
            if (!checkStock(product, 1)) {
                toast.error(`Produto ${product.name} insuficiente no stock.`);
                return;
            }
        }

        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev =>
            prev.map(item => {
                if (item.product.id === productId) {
                    const nQtd = item.quantity + delta;
                    return nQtd > 0 ? { ...item, quantity: nQtd } : null as any;
                }
                return item;
            }).filter(Boolean)
        );
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return toast.warning('Adicione produtos ao pedido');
        if (!hasCaixaAberto) return toast.error('Precisa abrir o caixa primeiro!');

        setProcessing(true);
        try {
            const apiClient = setupAPIClient();

            // 1. Criar pedido takeaway
            const orderResp = await apiClient.post('/orders/takeaway', {
                organizationId: user?.organizationId,
                name: customerName || 'Cliente Balcão',
                customerPhone,
            });

            const orderId = orderResp.data.id;

            // 2. Inserir itens um a um (para validar stock de cada um)
            for (const item of cart) {
                try {
                    await apiClient.post('/order/add', {
                        id_order: orderId,
                        produt_id: item.product.id,
                        amount: item.quantity,
                        organizationId: user?.organizationId
                    });
                } catch (err: any) {
                    const errorMsg = err.response?.data?.error || `Erro ao adicionar ${item.product.name}`;
                    toast.error(errorMsg);
                    // Opcional: poderíamos deletar o pedido parcial aqui, mas manteremos o erro visível
                    throw new Error(errorMsg);
                }
            }

            toast.success('Pedido criado com sucesso! Aprove na aba Gestão.', { duration: 5000 });

            setCart([]);
            setCustomerName('');
            setCustomerPhone('');
            setMainTab('gestao');
            fetchPendentesCount();

        } catch (err: any) {
            console.error(err);
            // O erro detalhado já foi disparado no loop ou aqui
            if (!err.message.includes('Estoque insuficiente')) {
                toast.error(err.response?.data?.error || 'Não foi possível completar o pedido. Verifique o stock.');
            }
        } finally {
            setProcessing(false);
        }
    };

    if (!hasCaixaAberto) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
                <Package className="w-16 h-16 text-muted-foreground" />
                <h2 className="text-2xl font-bold text-foreground">Caixa Fechado</h2>
                <p className="text-muted-foreground max-w-md text-center">
                    Para realizar pedidos ao balcão, precisa primeiro abrir o turno de caixa.
                </p>
            </div>
        );
    }

    const allProducts = categories.flatMap(c => c.products);
    const displayProducts = activeCategory === 'all'
        ? allProducts
        : categories.find(c => c.id === activeCategory)?.products || [];

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col overflow-hidden">
            {/* Abas principais: POS vs Gestão */}
            <div className="flex items-center justify-between px-4 pt-4 pb-0 border-b dark:border-gray-800">
                <div className="flex gap-1">
                    <button
                        onClick={() => setMainTab('pos')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${mainTab === 'pos'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <ShoppingCart className="w-4 h-4" />
                        Novo Pedido
                    </button>
                    <button
                        onClick={() => setMainTab('gestao')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${mainTab === 'gestao'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <ClipboardList className="w-4 h-4" />
                        Gestão de Pedidos
                        {pendentesCount > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-amber-500 text-white rounded-full animate-pulse">
                                {pendentesCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setMainTab('clientes')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${mainTab === 'clientes'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        Base de Clientes
                    </button>
                </div>
                <h1 className="text-sm text-muted-foreground font-medium hidden md:block">Ponto de Venda — Takeaway</h1>
            </div>

            {/* Conteúdo */}
            {mainTab === 'pos' ? (
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

                    {/* Esquerda — Produtos */}
                    <div className="flex-1 flex flex-col px-4 pt-4 border-r dark:border-gray-800 overflow-hidden">
                        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col overflow-hidden">
                            <ScrollArea className="w-full whitespace-nowrap mb-4 pb-2 border-b dark:border-gray-800">
                                <TabsList className="bg-transparent h-auto p-0 flex gap-2 w-max">
                                    <TabsTrigger
                                        value="all"
                                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2"
                                    >
                                        Todos
                                    </TabsTrigger>
                                    {categories.map(cat => (
                                        <TabsTrigger
                                            key={cat.id}
                                            value={cat.id}
                                            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2"
                                        >
                                            {cat.name}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </ScrollArea>

                            <ScrollArea className="flex-1 pr-4">
                                {loading ? (
                                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
                                        {displayProducts.map((p: any) => (
                                            <Card
                                                key={p.id}
                                                className="cursor-pointer hover:border-primary transition-all hover:shadow-md active:scale-95 group overflow-hidden"
                                                onClick={() => addToCart({
                                                    ...p,
                                                    price: Number(p.PrecoVenda?.[0]?.preco_venda || 0),
                                                    image: p.banner
                                                })}
                                            >
                                                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                                                    {p.banner ? (
                                                        <img src={`http://localhost:3333/files/${p.banner}`} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                                    ) : (
                                                        <Package className="w-10 h-10 text-muted-foreground/30" />
                                                    )}
                                                </div>
                                                <CardContent className="p-3">
                                                    <h3 className="font-medium text-sm line-clamp-2 leading-tight h-10">{p.name}</h3>
                                                    <p className="font-bold text-primary mt-1">{Number(p.PrecoVenda?.[0]?.preco_venda || 0).toLocaleString('pt-AO')} Kz</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </Tabs>
                    </div>

                    {/* Direita — Carrinho */}
                    <div className="w-full md:w-[380px] flex flex-col bg-slate-50 dark:bg-slate-900/50">
                        <div className="p-4 bg-white dark:bg-gray-900 border-b dark:border-gray-800 flex justify-between items-center shadow-sm">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5" />
                                Carrinho
                                {totalItems > 0 && <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground">{totalItems}</Badge>}
                            </h2>
                            <Button variant="ghost" size="sm" onClick={() => setCart([])} disabled={cart.length === 0} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                Limpar
                            </Button>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground pt-20">
                                    <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
                                    <p>O carrinho está vazio</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cart.map((item) => (
                                        <div key={item.product.id} className="bg-white dark:bg-gray-900 p-3 rounded-xl border shadow-sm flex items-center justify-between">
                                            <div className="flex-1 min-w-0 pr-2">
                                                <h4 className="font-semibold text-sm truncate">{item.product.name}</h4>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {(item.product.price * item.quantity).toLocaleString('pt-AO')} Kz
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => updateQuantity(item.product.id, -1)}>
                                                    {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-500" /> : <Minus className="w-3.5 h-3.5" />}
                                                </Button>
                                                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => updateQuantity(item.product.id, 1)}>
                                                    <Plus className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>

                        <div className="bg-white dark:bg-gray-900 p-4 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <div className="space-y-2 mb-4">
                                <Input
                                    placeholder="Nome do Cliente (Opcional)"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="bg-slate-50"
                                />
                                <Input
                                    placeholder="Telefone do Cliente (Opcional)"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    className="bg-slate-50"
                                />
                            </div>

                            <div className="flex justify-between items-end mb-4">
                                <span className="text-muted-foreground font-medium">Total</span>
                                <span className="text-3xl font-bold text-primary">{cartTotal.toLocaleString('pt-AO')} <span className="text-xl">Kz</span></span>
                            </div>

                            <Button
                                className="w-full py-6 text-lg font-bold shadow-md gap-2"
                                size="lg"
                                disabled={cart.length === 0 || processing}
                                onClick={handleCheckout}
                            >
                                {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : <SendHorizontal className="w-5 h-5" />}
                                ENVIAR PEDIDO
                            </Button>
                            <p className="text-xs text-center text-muted-foreground mt-2">
                                O stock será descontado apenas após aprovação
                            </p>
                        </div>
                    </div>
                </div>
            ) : mainTab === 'gestao' ? (
                <div className="flex-1 overflow-auto p-4">
                    <TakeawayGestao organizationId={user?.organizationId || ''} />
                </div>
            ) : (
                <div className="flex-1 overflow-auto p-4">
                    <TakeawayClientesList organizationId={user?.organizationId || ''} />
                </div>
            )}
        </div>
    );
}
