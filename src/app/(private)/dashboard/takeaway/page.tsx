'use client';
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { setupAPIClient } from '@/services/api';
import { Package, Minus, Plus, ShoppingCart, Trash2, Loader2, SendHorizontal, ClipboardList, Users, AlertCircle } from 'lucide-react';
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
import { API_BASE_URL } from '../../../../../config';

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
    const [caixaInfo, setCaixaInfo] = useState<{ isClosed: boolean, hasOtherUserOpen?: boolean, otherUserName?: string }>({ isClosed: false });

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
            
            // Agora consideramos aberto se houver QUALQUER caixa aberto na organização
            const isOpenedByAnyone = res.data && (!res.data.isClosed || res.data.hasOtherUserOpen);
            setHasCaixaAberto(!!isOpenedByAnyone);
            setCaixaInfo({
                isClosed: !isOpenedByAnyone,
                hasOtherUserOpen: res.data?.hasOtherUserOpen,
                otherUserName: res.data?.otherUserName
            });
        } catch {
            setHasCaixaAberto(false);
            setCaixaInfo({ isClosed: true });
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
            const response = await apiClient.get('/produts', {
                params: { organizationId: user?.organizationId }
            });

            const allProductsList = (response.data || []).filter((p: any) => !p.isIgredient);
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
            console.error('Erro ao carregar cardápio:', err);
        } finally {
            setLoading(false);
        }
    }

    const addToCart = (product: Product) => {
        const checkStock = (p: any, required: number) => {
            const availableInGeneral = p.Stock?.[0]?.totalQuantity || 0;
            const availableInArea = p.defaultAreaId
                ? p.economatoes?.find((e: any) => e.areaId === p.defaultAreaId)?.quantity || 0
                : 0;
            return (availableInGeneral + availableInArea) >= required;
        };

        if (product.isDerived && product.recipeItems) {
            for (const r of product.recipeItems) {
                if (r.impactaPreco && r.ingredient) {
                    if (!checkStock(r.ingredient, r.quantity)) {
                        toast.error(`Produto indisponível: Ingrediente ${r.ingredient.name} insuficiente.`);
                        return;
                    }
                }
            }
        } else if (!checkStock(product, 1)) {
            toast.error(`Produto ${product.name} insuficiente no stock.`);
            return;
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
                    return nQtd > 0 ? { ...item, quantity: nQtd } : null;
                }
                return item;
            }).filter((i): i is CartItem => i !== null)
        );
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return toast.warning('Adicione produtos ao pedido');
        if (!hasCaixaAberto) return toast.error('Turno de caixa não está aberto.');

        setProcessing(true);
        try {
            const apiClient = setupAPIClient();
            const orderResp = await apiClient.post('/orders/takeaway', {
                organizationId: user?.organizationId,
                name: customerName || 'Cliente Balcão',
                customerPhone,
            });

            const orderId = orderResp.data.id;
            for (const item of cart) {
                await apiClient.post('/order/add', {
                    id_order: orderId,
                    produt_id: item.product.id,
                    amount: item.quantity,
                    organizationId: user?.organizationId
                });
            }

            toast.success('Pedido enviado com sucesso!');
            setCart([]);
            setCustomerName('');
            setCustomerPhone('');
            setMainTab('gestao');
            fetchPendentesCount();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao completar o pedido.');
        } finally {
            setProcessing(false);
        }
    };

    const allProducts = categories.flatMap(c => c.products);
    const displayProducts = activeCategory === 'all'
        ? allProducts
        : categories.find(c => c.id === activeCategory)?.products || [];

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col overflow-hidden">
            {/* Nav Abas */}
            <div className="flex items-center justify-between px-4 pt-4 pb-0 border-b dark:border-gray-800">
                <div className="flex gap-1">
                    <button onClick={() => setMainTab('pos')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 ${mainTab === 'pos' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                        <ShoppingCart className="w-4 h-4" /> Novo Pedido
                    </button>
                    <button onClick={() => setMainTab('gestao')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 ${mainTab === 'gestao' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                        <ClipboardList className="w-4 h-4" /> Gestão {pendentesCount > 0 && <span className="ml-1 bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">{pendentesCount}</span>}
                    </button>
                    <button onClick={() => setMainTab('clientes')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 ${mainTab === 'clientes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                        <Users className="w-4 h-4" /> Clientes
                    </button>
                </div>
            </div>

            {mainTab === 'pos' ? (
                !hasCaixaAberto ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                        <AlertCircle className="w-16 h-16 text-amber-500" />
                        <h2 className="text-2xl font-bold">Caixa Indisponível</h2>
                        <p className="text-muted-foreground max-w-sm">
                            {caixaInfo.hasOtherUserOpen 
                                ? `O turno de caixa está aberto por ${caixaInfo.otherUserName}. Peça para fechar ou alterne para o utilizador responsável.`
                                : "Não existe nenhum turno de caixa aberto. Abra o caixa no menu lateral para começar a vender."}
                        </p>
                        <Button onClick={checkCaixa} variant="outline">Tentar Novamente</Button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        <div className="flex-1 flex flex-col px-4 pt-4 border-r dark:border-gray-800 overflow-hidden">
                            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col overflow-hidden">
                                <ScrollArea className="w-full whitespace-nowrap mb-4 pb-2 border-b">
                                    <TabsList className="bg-transparent h-auto p-0 flex gap-2 w-max">
                                        <TabsTrigger value="all" className="rounded-full px-6 py-2">Todos</TabsTrigger>
                                        {categories.map(cat => <TabsTrigger key={cat.id} value={cat.id} className="rounded-full px-6 py-2">{cat.name}</TabsTrigger>)}
                                    </TabsList>
                                </ScrollArea>
                                <ScrollArea className="flex-1 pr-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-20">
                                        {displayProducts.map((p: any) => (
                                            <Card key={p.id} className="cursor-pointer hover:border-primary active:scale-95 transition-all" onClick={() => addToCart(p)}>
                                                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                                                    {p.banner ? <img src={`${API_BASE_URL}/files/${p.banner}`} className="w-full h-full object-cover" /> : <Package className="w-8 h-8 opacity-20" />}
                                                </div>
                                                <CardContent className="p-3">
                                                    <h3 className="font-medium text-xs truncate">{p.name}</h3>
                                                    <p className="font-bold text-primary text-sm">{p.price.toLocaleString('pt-AO')} Kz</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </Tabs>
                        </div>
                        <div className="w-full md:w-[360px] flex flex-col bg-slate-50 dark:bg-slate-900/20">
                            <div className="p-4 border-b flex justify-between items-center bg-white dark:bg-gray-900">
                                <h2 className="font-bold flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Carrinho</h2>
                                <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-red-500">Limpar</Button>
                            </div>
                            <ScrollArea className="flex-1 p-4">
                                {cart.length === 0 ? <p className="text-center text-muted-foreground mt-10">Vazio</p> : (
                                    <div className="space-y-3">
                                        {cart.map(item => (
                                            <div key={item.product.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border flex justify-between items-center shadow-sm">
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <p className="text-xs font-semibold truncate">{item.product.name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{(item.product.price * item.quantity).toLocaleString()} Kz</p>
                                                </div>
                                                <div className="flex items-center gap-2 scale-90">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.product.id, -1)}>{item.quantity === 1 ? <Trash2 className="w-3 h-3 text-red-500" /> : <Minus className="w-3 h-3" />}</Button>
                                                    <span className="text-xs font-bold">{item.quantity}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.product.id, 1)}><Plus className="w-3 h-3" /></Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                            <div className="p-4 bg-white dark:bg-gray-900 border-t space-y-3">
                                <Input placeholder="Nome Cliente" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Total</span>
                                    <span className="text-xl font-black text-primary">{cartTotal.toLocaleString()} Kz</span>
                                </div>
                                <Button className="w-full h-12 gap-2" disabled={cart.length === 0 || processing} onClick={handleCheckout}>
                                    {processing ? <Loader2 className="animate-spin" /> : <SendHorizontal className="w-4 h-4" />} FINALIZAR PEDIDO
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            ) : mainTab === 'gestao' ? (
                <div className="flex-1 overflow-auto p-4"><TakeawayGestao organizationId={user?.organizationId || ''} /></div>
            ) : (
                <div className="flex-1 overflow-auto p-4"><TakeawayClientesList organizationId={user?.organizationId || ''} /></div>
            )}
        </div>
    );
}
