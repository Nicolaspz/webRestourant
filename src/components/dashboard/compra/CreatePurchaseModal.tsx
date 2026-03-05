'use client';

import { useState, useContext, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setupAPIClient } from "@/services/api";
import { toast } from "react-toastify";
import { AuthContext } from "@/contexts/AuthContext";
import { X, FileText, Download, Trash2 } from "lucide-react";

interface CreatePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchase?: {
    id: string;
    name: string;
    description: string;
    qtdCompra: number;
    supplierId?: string;
    images?: { id: string; path: string }[];
  };
}

interface Supplier {
  id: string;
  name: string;
}

export function CreatePurchaseModal({ isOpen, onClose, onSuccess, purchase }: CreatePurchaseModalProps) {
  const { user } = useContext(AuthContext);
  const apiClient = setupAPIClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    qtdCompra: 0,
    supplierId: ''
  });

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await apiClient.get('/supplier', {
          params: { organizationId: user?.organizationId },
          headers: { Authorization: `Bearer ${user?.token}` }
        });
        setSuppliers(response.data);
      } catch (error) {
        console.error('Erro ao buscar fornecedores:', error);
      }
    };

    if (isOpen && user?.organizationId) {
      fetchSuppliers();
    }
  }, [isOpen, user?.organizationId]);

  useEffect(() => {
    if (purchase) {
      setFormData({
        name: purchase.name,
        description: purchase.description || '',
        qtdCompra: purchase.qtdCompra,
        supplierId: purchase.supplierId || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        qtdCompra: 0,
        supplierId: ''
      });
      setFiles([]);
    }
  }, [purchase, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nome da compra é obrigatório');
      return;
    }

    if (!user?.organizationId) {
      toast.error('Organização não identificada');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('qtdCompra', String(formData.qtdCompra));
      data.append('organizationId', user.organizationId);
      if (formData.supplierId) data.append('SupplierId', formData.supplierId);

      files.forEach((file) => {
        data.append('file', file);
      });

      if (purchase) {
        await apiClient.put(`/compra/${purchase.id}`, data, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${user.token}`
          }
        });
        toast.success('Compra atualizada com sucesso!');
      } else {
        await apiClient.post('/compra', data, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${user.token}`
          }
        });
        toast.success('Compra criada com sucesso!');
      }

      onSuccess();
      setFormData({
        name: '',
        description: '',
        qtdCompra: 0,
        supplierId: ''
      });
      setFiles([]);
    } catch (error) {
      console.error('Erro ao salvar compra:', error);
      toast.error('Erro ao salvar compra');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm dark:bg-black/90" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {purchase ? "Editar Compra" : "Nova Compra"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {purchase ? "Atualize os dados da compra e anexe faturas" : "Adicione uma nova compra e anexe as faturas"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-900 dark:text-white">Nome da Compra *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Compra de ingredientes para Março"
              required
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-900 dark:text-white">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Ingredientes para o mês de março"
              rows={3}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplierId" className="text-gray-900 dark:text-white">Fornecedor</Label>
            <Select
              value={formData.supplierId}
              onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
            >
              <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue placeholder="Selecione um fornecedor" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                {suppliers.map((supplier) => (
                  <SelectItem
                    key={supplier.id}
                    value={supplier.id}
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                  >
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qtdCompra" className="text-gray-900 dark:text-white">Quantidade Esperada</Label>
            <Input
              id="qtdCompra"
              type="number"
              value={formData.qtdCompra}
              onChange={(e) => setFormData({ ...formData, qtdCompra: parseInt(e.target.value) || 0 })}
              placeholder="0"
              min="0"
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="files" className="text-gray-900 dark:text-white">Anexar Faturas (Múltiplos)</Label>

            {/* Arquivos Existentes */}
            {purchase?.images && purchase.images.length > 0 && (
              <div className="mb-4 space-y-2">
                <Label className="text-xs text-muted-foreground">Faturas já enviadas:</Label>
                <div className="grid grid-cols-1 gap-2">
                  {purchase.images.map((img) => (
                    <div key={img.id} className="flex items-center justify-between p-2 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-md">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText size={14} className="text-blue-500 shrink-0" />
                        <span className="text-xs truncate text-blue-700 dark:text-blue-300">{img.path}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                        >
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/files/${img.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download size={14} />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Input
              id="files"
              type="file"
              multiple
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white cursor-pointer"
            />
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
            >
              {isSubmitting ? "Salvando..." : purchase ? "Salvar Alterações" : "Criar Compra"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}