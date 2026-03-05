'use client';

import { useState, useEffect, useContext } from "react";
import { setupAPIClient } from "@/services/api";
import { AuthContext } from "@/contexts/AuthContext";
import { toast } from "react-toastify";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";

interface Supplier {
    id: string;
    name: string;
    contact?: string;
    email?: string;
    endereco?: string;
    nif?: string;
}

export function SupplierSection() {
    const { user } = useContext(AuthContext);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const apiClient = setupAPIClient();

    const [formData, setFormData] = useState({
        name: "",
        contact: "",
        email: "",
        endereco: "",
        nif: "",
    });

    const fetchSuppliers = async () => {
        if (!user?.organizationId) return;
        setIsLoading(true);
        try {
            const response = await apiClient.get('/supplier', {
                params: { organizationId: user.organizationId },
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setSuppliers(response.data);
        } catch (error) {
            console.error("Erro ao buscar fornecedores:", error);
            toast.error("Erro ao carregar fornecedores");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, [user]);

    const handleOpenModal = (supplier?: Supplier) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData({
                name: supplier.name,
                contact: supplier.contact || "",
                email: supplier.email || "",
                endereco: supplier.endereco || "",
                nif: supplier.nif || "",
            });
        } else {
            setEditingSupplier(null);
            setFormData({
                name: "",
                contact: "",
                email: "",
                endereco: "",
                nif: "",
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setIsSubmitting(true);
        try {
            if (editingSupplier) {
                await apiClient.put(`/supplier/${editingSupplier.id}`, formData, {
                    headers: { Authorization: `Bearer ${user?.token}` }
                });
                toast.success("Fornecedor atualizado com sucesso");
            } else {
                await apiClient.post('/supplier', {
                    ...formData,
                    organizationId: user?.organizationId
                }, {
                    headers: { Authorization: `Bearer ${user?.token}` }
                });
                toast.success("Fornecedor criado com sucesso");
            }
            setIsModalOpen(false);
            fetchSuppliers();
        } catch (error) {
            console.error("Erro ao salvar fornecedor:", error);
            toast.error("Erro ao salvar fornecedor");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja remover este fornecedor?")) return;

        try {
            await apiClient.delete(`/supplier/${id}`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            toast.success("Fornecedor removido com sucesso");
            fetchSuppliers();
        } catch (error) {
            console.error("Erro ao remover fornecedor:", error);
            toast.error("Erro ao remover fornecedor");
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nif?.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gestão Estratégica de Fornecedores</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Administre os seus parceiros comerciais e canais de suprimento.</p>
                </div>
                <Button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Registar Novo Fornecedor
                </Button>
            </div>

            <div className="flex items-center relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                    placeholder="Buscar por nome, email ou NIF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white dark:bg-gray-800"
                />
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : filteredSuppliers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        Nenhum fornecedor encontrado.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                <TableHead>Nome</TableHead>
                                <TableHead>NIF</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSuppliers.map((supplier) => (
                                <TableRow key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                    <TableCell className="font-medium text-gray-900 dark:text-white">{supplier.name}</TableCell>
                                    <TableCell>{supplier.nif || "-"}</TableCell>
                                    <TableCell>{supplier.contact || "-"}</TableCell>
                                    <TableCell>{supplier.email || "-"}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleOpenModal(supplier)}
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(supplier.id)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Modal CRUD Fornecedor */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingSupplier ? "Editar Detalhes do Fornecedor" : "Registar Novo Fornecedor"}</DialogTitle>
                        <DialogDescription>
                            Insira as informações de contacto e fiscais do seu parceiro comercial.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome / Razão Social</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: Alimentos Gourmet Ltda"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nif">NIF</Label>
                                <Input
                                    id="nif"
                                    value={formData.nif}
                                    onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                                    placeholder="000.000.000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact">Telefone</Label>
                                <Input
                                    id="contact"
                                    value={formData.contact}
                                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                    placeholder="+244..."
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="fornecedor@email.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endereco">Endereço</Label>
                            <Input
                                id="endereco"
                                value={formData.endereco}
                                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                                placeholder="Rua, Bairro, Cidade"
                            />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                Descartar
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {isSubmitting ? "A Guardar Dados..." : editingSupplier ? "Confirmar Atualização" : "Finalizar Registo"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
