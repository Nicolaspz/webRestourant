"use client";

import React, { useState, useEffect, useContext } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    MoreHorizontal,
    Plus,
    Search,
    Edit2,
    Trash2,
    Loader2
} from "lucide-react";
import { setupAPIClient } from "@/services/api";
import { AuthContext } from "@/contexts/AuthContext";
import { CategoryFormModal } from "./CategoryFormModal";
import { toast } from "react-toastify";

interface Category {
    id: string;
    name: string;
}

export function CategoryTable() {
    const { user } = useContext(AuthContext);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

    useEffect(() => {
        if (user?.organizationId) {
            loadCategories();
        }
    }, [user?.organizationId]);

    async function loadCategories() {
        setIsLoading(true);
        const apiClient = setupAPIClient();
        try {
            const response = await apiClient.get(`/category?organizationId=${user?.organizationId}`);
            setCategories(response.data);
        } catch (err) {
            console.error(err);
            toast.error("Erro ao carregar categorias.");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!window.confirm("Tem certeza que deseja eliminar esta categoria?")) return;

        const apiClient = setupAPIClient();
        try {
            await apiClient.delete(`/category?id=${id}&id_organization=${user?.organizationId}`);
            toast.success("Categoria eliminada com sucesso!");
            loadCategories();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || "Erro ao eliminar categoria.");
        }
    }

    function handleEdit(category: Category) {
        setSelectedCategory(category);
        setModalMode('edit');
        setIsModalOpen(true);
    }

    function handleCreate() {
        setSelectedCategory(null);
        setModalMode('create');
        setIsModalOpen(true);
    }

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <Input
                        placeholder="Procurar categorias..."
                        className="pl-10 bg-white dark:bg-[#1a1b1e] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button
                    onClick={handleCreate}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto transition-colors"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Categoria
                </Button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-xl">
                <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-800/50">
                        <TableRow className="border-gray-200 dark:border-gray-700 hover:bg-transparent">
                            <TableHead className="text-gray-700 dark:text-gray-300 font-medium h-12">Nome da Categoria</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300 font-medium h-12 text-right">Operações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={2} className="h-40 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                        <span className="text-gray-600 dark:text-gray-400">A carregar categorias...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredCategories.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={2} className="h-40 text-center">
                                    <p className="text-gray-600 dark:text-gray-400">Nenhuma categoria encontrada.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCategories.map((category) => (
                                <TableRow key={category.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/30 transition-colors">
                                    <TableCell className="text-gray-900 dark:text-white py-4 font-medium">{category.name}</TableCell>
                                    <TableCell className="text-right py-4">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-white dark:bg-[#1a1b1e] border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                                                <DropdownMenuLabel className="text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">Operações</DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    onClick={() => handleEdit(category)}
                                                    className="focus:bg-gray-100 dark:focus:bg-gray-700 cursor-pointer"
                                                >
                                                    <Edit2 className="mr-2 h-4 w-4 text-blue-500 dark:text-blue-400" />
                                                    Editar Categoria
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(category.id)}
                                                    className="focus:bg-red-100 dark:focus:bg-red-900/50 text-red-600 dark:text-red-400 cursor-pointer"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Eliminar Permanentemente
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <CategoryFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadCategories}
                initialData={selectedCategory}
                mode={modalMode}
                organizationId={user?.organizationId || ''}
            />
        </div>
    );
}
