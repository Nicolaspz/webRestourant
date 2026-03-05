'use client';

import { useState, useEffect, useContext } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { setupAPIClient } from '@/services/api';
import { AuthContext } from '@/contexts/AuthContext';

interface SubstituteItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (newProductId: string) => void;
    isLoading: boolean;
    originalItemName: string;
}

export function SubstituteItemModal({ isOpen, onClose, onConfirm, isLoading, originalItemName }: SubstituteItemModalProps) {
    const { user } = useContext(AuthContext);
    const [products, setProducts] = useState<any[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [loadingProducts, setLoadingProducts] = useState(false);

    useEffect(() => {
        if (isOpen && user?.organizationId) {
            loadProducts();
        }
    }, [isOpen, user?.organizationId]);

    async function loadProducts() {
        setLoadingProducts(true);
        try {
            const apiClient = setupAPIClient();
            const response = await apiClient.get('/menus', {
                params: { organizationId: user?.organizationId }
            });
            // The /menus endpoint returns categories with their products
            const categoryProducts = response.data || [];
            const allProducts = categoryProducts.flatMap((cat: any) => cat.products || []);
            setProducts(allProducts);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingProducts(false);
        }
    }

    const handleConfirm = () => {
        if (!selectedProductId) return;
        onConfirm(selectedProductId);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && !isLoading) onClose();
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-blue-600">Substituir Produto</DialogTitle>
                    <DialogDescription>
                        Escolha um novo produto para substituir <strong>{originalItemName}</strong>.
                        O produto original será cancelado automaticamente ("Substituição pelo Staff").
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Novo Produto</Label>
                        {loadingProducts ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> Carregando produtos...
                            </div>
                        ) : (
                            <Select
                                value={selectedProductId}
                                onValueChange={setSelectedProductId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o produto substituto..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[250px]">
                                    {products.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name} - {Number(p.PrecoVenda?.[0]?.preco_venda || 0).toLocaleString('pt-AO')} Kz
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleConfirm}
                        disabled={isLoading || !selectedProductId}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Troca
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
