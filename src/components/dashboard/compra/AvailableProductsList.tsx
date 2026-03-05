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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, Loader2, X } from "lucide-react";
import { setupAPIClient } from "@/services/api";
import { toast } from "react-toastify";
import { AuthContext } from "@/contexts/AuthContext";

interface Product {
  id: string;
  name: string;
  description: string;
  unit: string;
  isIgredient: boolean;
  isDerived: boolean;
  currentPrice?: number;
}

interface AvailableProductsListProps {
  purchaseId: string;
  onAddSuccess: () => void;
}

export function AvailableProductsList({ purchaseId, onAddSuccess }: AvailableProductsListProps) {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    quantity: 1,
    purchasePrice: 0,
    productTypeId: "1",
    marginPercentage: 20,
  });

  const apiClient = setupAPIClient();

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get('/produts', {
        params: { organizationId: user?.organizationId },
        headers: { Authorization: `Bearer ${user?.token}` }
      });

      // Filtrar produtos que podem ser comprados (ingredientes e produtos simples)
      const availableProducts = response.data.filter(
        (product: Product) => product.isIgredient || !product.isDerived
      );

      setProducts(availableProducts);
      setFilteredProducts(availableProducts);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      quantity: 1,
      purchasePrice: product.currentPrice || 0,
      productTypeId: "1",
      marginPercentage: 20,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
    setFormData({
      quantity: 1,
      purchasePrice: 0,
      productTypeId: "1",
      marginPercentage: 20,
    });
  };

  const handleAddProduct = async () => {
    if (!selectedProduct || !user?.organizationId) {
      toast.error('Selecione um produto e certifique-se de estar autenticado');
      return;
    }

    try {
      // Se você sabe que o tipo "Alimentar" tem ID "1" no seu banco
      const productTypeId = formData.productTypeId || "f7dddb0a-9176-4993-9421-3c0b6b4dd9d4";

      await apiClient.post('/compra_produt', {
        quantity: formData.quantity,
        purchasePrice: formData.purchasePrice,
        purchaseId,
        productId: selectedProduct.id,
        organizationId: user.organizationId // OBRIGATÓRIO
      }, {
        headers: {
          Authorization: `Bearer ${user?.token}`
        }
      });

      toast.success('Produto adicionado à compra!');
      onAddSuccess();
      handleCloseModal();
    } catch (error: any) {
      const { response } = error;

      // Tratamento específico para erros comuns
      if (response?.data?.error?.includes('organization')) {
        toast.error('Erro de organização. Faça login novamente.');
        // Redirecionar para login
        // navigate('/login');
      } else if (response?.data?.error?.includes('Tipo de produto')) {
        toast.error('Tipo de produto inválido. Contate o administrador.');
      } else {
        const errorMessage = response?.data?.error || 'Erro ao adicionar produto';
        toast.error(errorMessage);
      }

      console.log('Detalhes do erro:', response?.data);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchProducts();
    }
  }, [user?.token]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Modal para adicionar produto */}
      {showModal && selectedProduct && (
  <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Adicionar <span className="text-blue-600 dark:text-blue-400">{selectedProduct.name}</span> à compra
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCloseModal}
          className="h-8 w-8 p-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Quantidade
          </label>
          <Input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({
              ...formData,
              quantity: parseInt(e.target.value) || 1
            })}
            className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Preço unitário de Compra
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formData.purchasePrice}
            onChange={(e) => setFormData({
              ...formData,
              purchasePrice: parseFloat(e.target.value) || 0
            })}
            className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
          />
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Preço de Venda (automático)
          </label>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formData.purchasePrice} + {formData.marginPercentage}% = {' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {(formData.purchasePrice * (1 + formData.marginPercentage / 100)).toFixed(2)}
            </span>
          </p>
        </div>
      </div>

      <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          onClick={handleCloseModal}
          className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleAddProduct}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
        >
          Adicionar
        </Button>
      </div>
    </div>
  </div>
)}

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>{searchTerm ? "Nenhum produto encontrado" : "Nenhum produto disponível"}</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden flex flex-col max-h-[400px]">
          <div className="overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10 shadow-sm">
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="w-[120px]">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground max-w-xs truncate">
                        {product.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.isIgredient ? "default" : "secondary"}>
                        {product.isIgredient ? "Ingrediente" : "Produto"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {product.unit}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleOpenModal(product)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}