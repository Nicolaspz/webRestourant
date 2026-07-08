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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    MoreHorizontal,
    Plus,
    Search,
    Edit2,
    Trash2,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from "lucide-react";
import { setupAPIClient } from "@/services/api";
import { AuthContext } from "@/contexts/AuthContext";
import { CategoryFormModal } from "./CategoryFormModal";
import { toast } from "react-toastify";

interface Category {
    id: string;
    name: string;
    parentId?: string | null;
    kind?: 'MENU' | 'STOCK';
    parent?: {
        id: string;
        name: string;
    } | null;
    children?: Category[];
}

export function CategoryTable() {
    const { user } = useContext(AuthContext);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        if (user?.organizationId) {
            loadCategories();
        }
    }, [user?.organizationId]);

    // Reset para página 1 ao pesquisar
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

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

    // Filtro por nome
    const filteredCategories = categories.filter(cat =>
        `${cat.name} ${cat.parent?.name || ''} ${cat.kind || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Lógica de paginação
    const totalItems = filteredCategories.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredCategories.slice(startIndex, endIndex);

    const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    const goToFirstPage = () => goToPage(1);
    const goToLastPage = () => goToPage(totalPages);
    const goToPreviousPage = () => goToPage(currentPage - 1);
    const goToNextPage = () => goToPage(currentPage + 1);

    return (
        <div className="space-y-4">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Pesquisa */}
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <Input
                            placeholder="Procurar categorias..."
                            className="pl-10 bg-white dark:bg-[#1a1b1e] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Itens por página */}
                    <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => {
                            setItemsPerPage(Number(value));
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[110px] bg-white dark:bg-[#1a1b1e] border-gray-300 dark:border-gray-700">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">5 / pág.</SelectItem>
                            <SelectItem value="10">10 / pág.</SelectItem>
                            <SelectItem value="20">20 / pág.</SelectItem>
                            <SelectItem value="50">50 / pág.</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    onClick={handleCreate}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto transition-colors"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Categoria
                </Button>
            </div>

            {/* Resumo */}
            {!isLoading && (
                <p className="text-xs text-muted-foreground">
                    {totalItems === 0
                        ? 'Nenhuma categoria encontrada'
                        : `A mostrar ${startIndex + 1}–${Math.min(endIndex, totalItems)} de ${totalItems} categoria(s)`}
                    {searchTerm && ` · Busca: "${searchTerm}"`}
                </p>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-xl">
                <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-800/50">
                        <TableRow className="border-gray-200 dark:border-gray-700 hover:bg-transparent">
                            <TableHead className="text-gray-700 dark:text-gray-300 font-medium h-12 w-12">#</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300 font-medium h-12">Nome da Categoria</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300 font-medium h-12 text-right">Operações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-40 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                        <span className="text-gray-600 dark:text-gray-400">A carregar categorias...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : currentItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-40 text-center">
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {categories.length === 0 ? 'Nenhuma categoria cadastrada.' : 'Nenhuma categoria encontrada.'}
                                    </p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            currentItems.map((category, index) => (
                                <TableRow key={category.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/30 transition-colors">
                                    <TableCell className="text-gray-400 dark:text-gray-500 text-sm">
                                        {startIndex + index + 1}
                                    </TableCell>
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

            {/* Paginação */}
            {!isLoading && totalPages > 1 && (
                <div className="flex items-center justify-between px-1 py-2">
                    <div className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                    </div>
                    <div className="flex items-center space-x-1">
                        <Button variant="outline" size="sm" onClick={goToFirstPage} disabled={currentPage === 1}>
                            <ChevronsLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage === 1}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>

                        {/* Números de página */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let page: number;
                            if (totalPages <= 5) {
                                page = i + 1;
                            } else if (currentPage <= 3) {
                                page = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                page = totalPages - 4 + i;
                            } else {
                                page = currentPage - 2 + i;
                            }
                            return (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => goToPage(page)}
                                    className="w-8 h-8 p-0"
                                >
                                    {page}
                                </Button>
                            );
                        })}

                        <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={goToLastPage} disabled={currentPage === totalPages}>
                            <ChevronsRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            <CategoryFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadCategories}
                initialData={selectedCategory}
                mode={modalMode}
                organizationId={user?.organizationId || ''}
                categories={categories}
            />
        </div>
    );
}
