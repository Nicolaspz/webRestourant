import { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { AuthContext } from "@/contexts/AuthContext";
import { setupAPIClient } from '@/services/api';
import { toast } from 'react-toastify';
import { useClientToken } from '@/types/useClientToken';

export type Product = {
  id: string;
  name: string;
  description: string;
  banner?: string;
  unit: string;
  isIgredient: boolean;
  isDerived?: boolean;
  PrecoVenda: { preco_venda: number }[];
  Category: { name: string; id: string };
  orderCount?: number;
  createdAt?: string;
  created_at?: string;
  isFeatured?: boolean;
  isNew?: boolean;
};

export type CartItem = {
  product: Product;
  quantity: number;
  notes?: string;
};

export type SessionConflict = {
  isConflict: boolean;
  message: string;
  existingClientToken?: string;
  sessionId?: string;
  mesaId?: string;
};

const PRIORITY_CATEGORIES = ['Pratos', 'Pratos Principais', 'Entradas', 'Pizzas', 'Destaques'];

const groupProducts = (products: Product[]) => {
  const grouped = products.reduce<Record<string, Product[]>>((result, product) => {
    const category = product.Category?.name || (product.isDerived ? 'Pratos' : 'Sem Categoria');
    if (['ingrediente', 'ingredientes'].includes(category.toLowerCase())) return result;
    (result[category] ||= []).push(product);
    return result;
  }, {});

  return Object.fromEntries(Object.entries(grouped).sort(([a], [b]) => {
    const priorityA = PRIORITY_CATEGORIES.indexOf(a);
    const priorityB = PRIORITY_CATEGORIES.indexOf(b);
    if (priorityA === -1 && priorityB === -1) return a.localeCompare(b, 'pt');
    if (priorityA === -1) return 1;
    if (priorityB === -1) return -1;
    return priorityA - priorityB;
  }));
};

// Funções de localStorage
const getCartFromStorage = (): CartItem[] => {
  if (typeof window === 'undefined') return [];

  try {
    const saved = localStorage.getItem('restaurant_cart');
    if (!saved) return [];

    // Validação básica do JSON
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch (error) {
    console.error('Erro ao ler carrinho do localStorage:', error);
    return [];
  }
};

const saveCartToStorage = (cart: CartItem[]) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('restaurant_cart', JSON.stringify(cart));
  } catch (error) {
    console.error('Erro ao salvar carrinho no localStorage:', error);
    // Tenta limpar se estiver cheio
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      toast.warning('Carrinho muito grande, limpando dados antigos...');
      localStorage.removeItem('restaurant_cart');
    }
  }
};

const clearCartFromStorage = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('restaurant_cart');
};

export const useMenu = () => {
  const idempotencyKeyRef = useRef<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  // Carrinho inicializado do localStorage
  const [cart, setCart] = useState<CartItem[]>(() => getCartFromStorage());

  const [showCart, setShowCart] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('popular');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionConflict, setSessionConflict] = useState<SessionConflict | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [sessionCheckComplete, setSessionCheckComplete] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shouldVerifySession, setShouldVerifySession] = useState(false);

  const { user } = useContext(AuthContext);
  const apiClient = setupAPIClient();
  const params = useParams();

  const organizationId = user?.organizationId;
  const tableNumber = params.number as string;
  const { clientToken, isLoading: tokenLoading } = useClientToken(tableNumber);
  const groupedProducts = useMemo(() => groupProducts(products), [products]);

  // Funções de cookie (mantidas para compatibilidade)
  const setCookie = (name: string, value: string, hours: number = 24) => {
    if (typeof window === 'undefined') return;

    const expires = new Date();
    expires.setHours(expires.getHours() + hours);
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
  };

  const getCookie = (name: string): string | null => {
    if (typeof window === 'undefined') return null;

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  };

  // Efeito para sincronizar carrinho com localStorage
  useEffect(() => {
    saveCartToStorage(cart);
  }, [cart]);

  // Funções principais
  const fetchProducts = async () => {
    setProductsLoaded(false);
    try {
      if (!organizationId) {
        toast.error('Organização não encontrada');
        return;
      }

      const productsResponse = await apiClient.get('/produts', {
        params: { organizationId },
        headers: { Authorization: `Bearer ${user?.token}` }
      });

      const processedProducts = productsResponse.data
        .filter((product: any) => {
          const isIngredienteCategory = product.Category?.name?.toLowerCase() === 'ingredientes' || 
                                      product.Category?.name?.toLowerCase() === 'ingrediente';
          return product.isIgredient === false && !isIngredienteCategory;
        })
        .map((product: Product) => ({
          ...product,
          PrecoVenda: product.PrecoVenda || [{ preco_venda: 0 }],
          orderCount: product.orderCount || 0,
          createdAt: product.createdAt || product.created_at
        }));

      setProducts(processedProducts);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoadError('Não foi possível carregar os produtos do cardápio.');
    } finally {
      setProductsLoaded(true);
    }
  };

  const checkToken = async () => {
    if (tokenLoading) return;
    if (!clientToken) {
      setLoadError('Não foi possível preparar a identificação desta mesa.');
      setSessionCheckComplete(true);
      return;
    }
    if (!user || !tableNumber || !organizationId) {
      toast.error('Dados incompletos para acessar o cardápio');
      return;
    }

    setIsCheckingSession(true);
    setSessionCheckComplete(false);
    try {
      const response = await apiClient.post('/token/verify', {
        tableNumber: Number(tableNumber),
        organizationId: organizationId,
        clientToken: clientToken
      });

      if (response.data.success) {
        setSessionConflict(null);
        setShouldVerifySession(false);
      }
    } catch (error: any) {
      console.error("Erro ao verificar token:", error);
      if (error.response?.data?.code === 'SESSION_CONFLICT') {
        const { existingClientToken, sessionId, message } = error.response.data;
        setSessionConflict({
          isConflict: true,
          message: message || `A Mesa ${tableNumber} já está ocupada por outro cliente.`,
          existingClientToken,
          sessionId
        });
        toast.warning('Esta mesa já tem um pedido em andamento');
      } else {
        setLoadError(error.response?.data?.error || 'Não foi possível validar a mesa.');
      }
    } finally {
      setIsCheckingSession(false);
      setSessionCheckComplete(true);
    }
  };

  const generateNewToken = () => {
    if (typeof window === 'undefined' || !tableNumber) return;

    const generateNewClientToken = (): string => {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 9);
      return `client_${timestamp}_${random}_new`.replace(/[^a-zA-Z0-9_]/g, '');
    };

    if (!tableNumber || tableNumber === 'TAKEAWAY') {
      const newToken = generateNewClientToken();
      setCookie('@servFixe.clientToken_generic', newToken, 24);
      window.location.reload();
    } else {
      const cookieName = `@servFixe.clientToken_mesa_${tableNumber}`;
      const newToken = generateNewClientToken();
      setCookie(cookieName, newToken, 24);
      setShouldVerifySession(true);
    }
  };

  const syncWithExistingSession = () => {
    if (!sessionConflict?.existingClientToken || !tableNumber) {
      toast.error('Não foi possível sincronizar com a sessão');
      return;
    }

    if (tableNumber === 'TAKEAWAY') {
      setCookie('@servFixe.clientToken_generic', sessionConflict.existingClientToken, 24);
    } else {
      const cookieName = `@servFixe.clientToken_mesa_${tableNumber}`;
      setCookie(cookieName, sessionConflict.existingClientToken, 24);
    }

    toast.success('Sincronizado com a sessão existente!', {
      autoClose: 2000,
      onClose: () => window.location.reload()
    });
  };

  const createNewSession = () => {
    if (!tableNumber) return;

    if (tableNumber === 'TAKEAWAY') {
      generateNewToken();
    } else {
      toast.info('Iniciando nova sessão nesta mesa...');
      const cookieName = `@servFixe.clientToken_mesa_${tableNumber}`;
      const newToken = `client_new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCookie(cookieName, newToken, 24);
      setSessionConflict(null);
      setShouldVerifySession(true);
    }
  };

  const addToCart = useCallback((product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      return existingItem
        ? prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
        : [...prevCart, { product, quantity: 1 }];
    });
  }, []);

  const updateCartItem = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const updateCartNotes = (productId: string, notes: string) => { setCart(prev => prev.map(item => item.product.id === productId ? { ...item, notes } : item)); };
  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  // Função para limpar carrinho manualmente
  const clearCart = () => {
    setCart([]);
    clearCartFromStorage();
  };

  const submitOrder = async () => {
    if (!clientToken) {
      toast.error('Erro de identificação do cliente. Recarregue a página.');
      return;
    }

    if (!user || !tableNumber || !organizationId || cart.length === 0) {
      toast.error('Dados incompletos para fazer o pedido');
      return;
    }

    setIsSubmitting(true);
    try {
      const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID();
      idempotencyKeyRef.current = idempotencyKey;
      const items = cart.map(item => ({
        productId: item.product.id,
        amount: item.quantity, notes: item.notes
      }));

      const response = await apiClient.post('/orders/with-stock', {
        tableNumber: tableNumber === 'TAKEAWAY' ? 0 : Number(tableNumber),
        organizationId: organizationId,
        items,
        customerName: tableNumber === 'TAKEAWAY' ? 'Pedido Takeaway' : `Pedido Mesa ${tableNumber}`,
        clientToken: clientToken,
        idempotencyKey
      });

      if (response.data.success) {
        toast.success('Pedido criado com sucesso!');

        // Limpa carrinho e localStorage
        clearCartFromStorage();
        setCart([]);
        setShowCart(false);
        idempotencyKeyRef.current = null;
      }
    } catch (error: any) {
      console.error("Error submitting order:", error);
      if (error.response?.data?.code === 'SESSION_CONFLICT') {
        const { existingClientToken, sessionId, message } = error.response.data;
        setSessionConflict({
          isConflict: true,
          message: message || `A Mesa ${tableNumber} já está ocupada por outro cliente.`,
          existingClientToken,
          sessionId
        });
        toast.warning('Esta mesa já tem um pedido em andamento');
      } else {
        toast.error(error.response?.data?.error || 'Erro ao enviar pedido');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const cartTotal = useMemo(() => cart.reduce((total, item) => {
      const price = item.product.PrecoVenda[0]?.preco_venda || 0;
      return total + (price * item.quantity);
    }, 0), [cart]);

  const featuredProducts = useMemo(() => {
    switch (activeTab) {
      case 'popular':
        return products.filter(product => product.isFeatured || (product.orderCount || 0) > 0)
          .sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) || (b.orderCount || 0) - (a.orderCount || 0)).slice(0, 6);
      case 'recent':
        return products.filter(product => product.isNew || (product.createdAt && new Date(product.createdAt).getTime() > Date.now() - 7 * 86400000))
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 6);
      case 'price':
        return [...products].sort((a, b) => (a.PrecoVenda[0]?.preco_venda || 0) - (b.PrecoVenda[0]?.preco_venda || 0)).slice(0, 6);
      default:
        return products.slice(0, 6);
    }
  }, [activeTab, products]);

  const calculateTotal = useCallback(() => cartTotal, [cartTotal]);
  const getFeaturedProductsByTab = useCallback(() => featuredProducts, [featuredProducts]);
  const isReady = productsLoaded && !tokenLoading && sessionCheckComplete;

  // Efeitos
  useEffect(() => {
    if (user && organizationId) {
      fetchProducts();
    }
  }, [user, organizationId]);

  useEffect(() => {
    const categories = Object.keys(groupedProducts);
    setActiveCategory(current => current && groupedProducts[current] ? current : categories[0] || null);
  }, [groupedProducts]);

  useEffect(() => {
    if (!tokenLoading && user && organizationId && tableNumber && !shouldVerifySession) {
      checkToken();
    }
  }, [tokenLoading, clientToken, user, organizationId, tableNumber, shouldVerifySession]);

  return {
    // State
    products,
    groupedProducts,
    cart,
    showCart,
    activeCategory,
    activeTab,
    isSubmitting,
    sessionConflict,
    isCheckingSession,
    tableNumber,
    clientToken,
    tokenLoading,
    isReady,
    loadError,

    // Setters
    setShowCart,
    setActiveCategory,
    setActiveTab,

    // Functions
    checkToken,
    syncWithExistingSession,
    createNewSession,
    addToCart,
    updateCartItem,
    updateCartNotes,
    removeFromCart,
    clearCart,
    submitOrder,
    calculateTotal,
    getFeaturedProductsByTab,
    setSessionConflict
  };
};
