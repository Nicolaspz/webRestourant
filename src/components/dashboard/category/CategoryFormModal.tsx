"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Loader2, X } from "lucide-react";
import { toast } from "react-toastify";
import { setupAPIClient } from "@/services/api";

interface Category {
    id: string;
    name: string;
    parentId?: string | null;
    kind?: "MENU" | "STOCK";
}

interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Category | null;
    mode: "create" | "edit";
    organizationId: string;
    categories: Category[];
}

export function CategoryFormModal({
    isOpen,
    onClose,
    onSuccess,
    initialData,
    mode,
    organizationId,
    categories
}: CategoryFormModalProps) {
    const [name, setName] = useState("");
    const [kind, setKind] = useState<"MENU" | "STOCK">("MENU");
    const [parentId, setParentId] = useState("none");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const parentOptions = useMemo(() => {
        return categories.filter((category) => {
            const sameKind = (category.kind || "MENU") === kind;
            const isNotSelf = category.id !== initialData?.id;
            const isRoot = !category.parentId;
            return sameKind && isNotSelf && isRoot;
        });
    }, [categories, initialData?.id, kind]);

    useEffect(() => {
        if (mode === "edit" && initialData) {
            setName(initialData.name);
            setKind(initialData.kind || "MENU");
            setParentId(initialData.parentId || "none");
        } else {
            setName("");
            setKind("MENU");
            setParentId("none");
        }
    }, [mode, initialData, isOpen]);

    if (!isOpen) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!name.trim()) {
            toast.error("O nome da categoria e obrigatorio.");
            return;
        }

        setIsSubmitting(true);
        const apiClient = setupAPIClient();
        const payload = {
            name,
            organizationId,
            kind,
            parentId: parentId === "none" ? null : parentId,
        };

        try {
            if (mode === "create") {
                await apiClient.post("/category", payload);
                toast.success("Categoria registada com sucesso!");
            } else {
                await apiClient.put(`/category?id=${initialData?.id}&id_organization=${organizationId}`, payload);
                toast.success("Categoria atualizada com sucesso!");
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || "Erro ao processar categoria.";
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto p-4">
            <div className="bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-gray-700 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {mode === "create" ? "Registar Categoria" : "Editar Categoria"}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Organize o cardapio e o stock com categorias e subcategorias.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors p-1"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="category-name" className="text-gray-700 dark:text-gray-300">
                            Nome
                        </Label>
                        <Input
                            id="category-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Bebidas, Refrigerantes, Carnes"
                            className="bg-white dark:bg-[#25262b] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-gray-700 dark:text-gray-300">Tipo</Label>
                        <Select value={kind} onValueChange={(value: "MENU" | "STOCK") => {
                            setKind(value);
                            setParentId("none");
                        }}>
                            <SelectTrigger className="bg-white dark:bg-[#25262b] border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MENU">Cardapio</SelectItem>
                                <SelectItem value="STOCK">Stock / Ingredientes</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-gray-700 dark:text-gray-300">Categoria principal</Label>
                        <Select value={parentId} onValueChange={setParentId}>
                            <SelectTrigger className="bg-white dark:bg-[#25262b] border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                                <SelectValue placeholder="Categoria principal" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Nenhuma, criar como categoria principal</SelectItem>
                                {parentOptions.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                mode === "create" ? "Guardar Categoria" : "Atualizar Categoria"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
