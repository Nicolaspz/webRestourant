'use client';

import { useState, useEffect, useContext } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, Loader2, Trash2, FileText, Download } from "lucide-react";
import { setupAPIClient } from "@/services/api";
import { toast } from "react-toastify";
import { AuthContext } from "@/contexts/AuthContext";
import { API_BASE_URL } from "../../../../config";

interface PurchaseProduct {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    unit: string;
  };
  quantity: number;
  purchasePrice: number | null;
}

interface Purchase {
  id: string;
  name: string;
  images?: { id: string; path: string }[];
}

interface PurchaseProductsListProps {
  purchaseId: string;
  onUpdate: () => void;
  status: boolean;
}

export function PurchaseProductsList({ purchaseId, onUpdate, status }: PurchaseProductsListProps) {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState<PurchaseProduct[]>([]);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const apiClient = setupAPIClient();

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get(`/produts_list_compra`, {
        headers: {
          Authorization: `Bearer ${user?.token}`
        },
        params: {
          purchaseId
        }
      });

      // ✅ Garantir que purchasePrice não seja null
      const productsWithDefaultPrice = (response.data || []).map((product: PurchaseProduct) => ({
        ...product,
        purchasePrice: product.purchasePrice || 0 // Define 0 se for null
      }));

      setProducts(productsWithDefaultPrice);

      // Buscar detalhes da compra para pegar as imagens
      const purchaseRes = await apiClient.get(`/compra/${purchaseId}`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      setPurchase(purchaseRes.data);
    } catch (error) {
      console.error('Erro ao buscar produtos da compra:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    if (status) {
      toast.info('Não é possível remover produtos de uma compra concluída');
      return;
    }

    const confirmDelete = window.confirm('Tem certeza que deseja remover este item?');
    if (!confirmDelete) return;

    try {
      await apiClient.delete('/remuvProdcompra', {
        params: {
          productId: productId.trim(),
          purchaseId: purchaseId.trim()
        },
        headers: {
          Authorization: `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        }
      });

      toast.success('Produto removido da compra');
      fetchProducts();
      onUpdate();
    } catch (error) {
      console.error('Erro ao remover produto:', error);
      toast.error('Erro ao remover produto');
    }
  };

  const formatPrice = (price: number | null) => {
    const safePrice = price || 0;
    return safePrice.toLocaleString('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    });
  };

  const calculateTotal = (quantity: number, price: number | null) => {
    const safePrice = price || 0;
    return quantity * safePrice;
  };

  useEffect(() => {
    if (user?.token) {
      fetchProducts();
    }
  }, [purchaseId, user?.token]);

  const filteredProducts = products.filter(p =>
    p.product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nenhum produto adicionado a esta compra</p>
        <p className="text-sm">Vá para a aba "Adicionar Produtos" para incluir itens</p>
      </div>
    );
  }

  const totalValue = products.reduce((total, product) => {
    return total + calculateTotal(product.quantity, product.purchasePrice);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Seção de Faturas */}
      {purchase?.images && purchase.images.length > 0 && (
        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="text-blue-600" size={18} />
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300">Faturas Anexadas</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {purchase.images.map((img) => (
              <a
                key={img.id}
                href={`${API_BASE_URL}/files/${img.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-md text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Download size={12} />
                <span className="max-w-[150px] truncate">{img.path}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Barra de Pesquisa */}
        <div className="relative">
          <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar produtos na compra..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white dark:bg-gray-800"
          />
        </div>

        <div className="border rounded-lg overflow-hidden flex flex-col max-h-[400px]">
          <div className="overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10 shadow-sm">
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Preço Unitário</TableHead>
                  <TableHead>Total</TableHead>
                  {!status && <TableHead className="w-[100px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((purchaseProduct) => (
                  <TableRow key={purchaseProduct.id}>
                    <TableCell>
                      <div className="font-medium">{purchaseProduct.product.name}</div>
                      <Badge variant="outline" className="text-xs">
                        {purchaseProduct.product.unit}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {purchaseProduct.quantity}
                    </TableCell>

                    <TableCell>
                      {formatPrice(purchaseProduct.purchasePrice)}
                    </TableCell>

                    <TableCell className="font-medium">
                      {formatPrice(calculateTotal(purchaseProduct.quantity, purchaseProduct.purchasePrice))}
                    </TableCell>

                    {!status && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProduct(purchaseProduct.productId)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Resumo do valor total */}
        <div className="flex justify-end">
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Valor Total da Compra:</div>
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(totalValue)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}