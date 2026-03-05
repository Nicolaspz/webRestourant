"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";
import { toast } from "react-toastify";
import { setupAPIClient } from "@/services/api";

interface Category {
    id: string;
    name: string;
}

interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Category | null;
    mode: 'create' | 'edit';
    organizationId: string;
}

export function CategoryFormModal({
    isOpen,
    onClose,
    onSuccess,
    initialData,
    mode,
    organizationId
}: CategoryFormModalProps) {
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            setName(initialData.name);
        } else {
            setName('');
        }
    }, [mode, initialData, isOpen]);

    if (!isOpen) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("O nome da categoria é obrigatório.");
            return;
        }

        setIsSubmitting(true);
        const apiClient = setupAPIClient();

        try {
            if (mode === 'create') {
                await apiClient.post('/category', {
                    name,
                    organizationId
                });
                toast.success("Categoria registada com sucesso!");
            } else {
                await apiClient.put(`/category?id=${initialData?.id}&id_organization=${organizationId}`, {
                    name
                });
                toast.success("Categoria atualizada com sucesso!");
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            const errorMsg = err.response?.data?.error || "Erro ao processar categoria.";
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto p-4">
            <div className="bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-gray-700 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {mode === 'create' ? 'Registar Nova Categoria' : 'Editar Categoria'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {mode === 'create'
                                ? 'Defina o nome da nova categoria para os seus produtos.'
                                : 'Atualize as informações da categoria selecionada.'
                            }
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors p-1"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="category-name" className="text-gray-700 dark:text-gray-300">
                            Nome da Categoria
                        </Label>
                        <Input
                            id="category-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Bebidas, Sobremesas, Pratos Principais"
                            className="bg-white dark:bg-[#25262b] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                mode === 'create' ? 'Guardar Categoria' : 'Atualizar Categoria'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
