'use client';
import { useState, useEffect } from 'react';
import { setupAPIClient } from '@/services/api';
import {
    Users, Phone, Calendar, ShoppingBag,
    Search, Download, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell,
    TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Cliente {
    id: string;
    name?: string;
    phone: string;
    criadoEm: string;
    _count: { orders: number };
}

export default function TakeawayClientesList({ organizationId }: { organizationId: string }) {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchClientes = async () => {
        try {
            setLoading(true);
            const apiClient = setupAPIClient();
            const res = await apiClient.get('/takeaway/clientes', {
                params: { organizationId }
            });
            setClientes(res.data || []);
        } catch (err) {
            console.error('Erro ao buscar clientes takeaway:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (organizationId) fetchClientes();
    }, [organizationId]);

    const filtered = clientes.filter(c =>
        c.phone.includes(search) ||
        (c.name?.toLowerCase().includes(search.toLowerCase()))
    );

    const handleExportCSV = () => {
        const headers = ['Nome', 'Telefone', 'Pedidos', 'Data Registro'];
        const rows = filtered.map(c => [
            c.name || 'Sem nome',
            c.phone,
            c._count.orders.toString(),
            format(new Date(c.criadoEm), 'dd/MM/yyyy')
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `clientes_takeaway_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Base de Clientes Takeaway
                    </h2>
                    <p className="text-sm text-muted-foreground">Clientes que acessaram via QR Menu ou Balcão.</p>
                </div>

                <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filtered.length === 0} className="gap-2">
                    <Download className="w-4 h-4" />
                    Exportar Lista (CSV)
                </Button>
            </div>

            <Card>
                <CardContent className="p-4">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Pesquisar por nome ou telefone..."
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Telefone</TableHead>
                                        <TableHead className="text-center">Total Pedidos</TableHead>
                                        <TableHead className="text-right">Registado em</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                Nenhum cliente encontrado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filtered.map((cliente) => (
                                            <TableRow key={cliente.id}>
                                                <TableCell className="font-medium">{cliente.name || '—'}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                                        {cliente.phone}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="secondary" className="gap-1">
                                                        <ShoppingBag className="w-3 h-3" />
                                                        {cliente._count.orders}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {format(new Date(cliente.criadoEm), "dd 'de' MMM, yyyy", { locale: pt })}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function Badge({ children, variant, className }: any) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variant === 'secondary' ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'
            } ${className}`}>
            {children}
        </span>
    );
}
