
'use client';

import { useState, useMemo, ChangeEvent } from 'react';
import { useAudit } from '@/context/AuditContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, User, Calendar, Shield, Boxes, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdmin } from '@/context/AdminContext';
import type { Product } from '@/lib/types';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function AuditLogTab() {
    const { auditLogs, isLoading } = useAudit();
    const [page, setPage] = useState(1);
    const logsPerPage = 20;

    const paginatedLogs = auditLogs.slice((page - 1) * logsPerPage, page * logsPerPage);
    const totalPages = Math.ceil(auditLogs.length / logsPerPage);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-6 w-6" />
                    Log de Ações do Sistema
                </CardTitle>
                <CardDescription>
                    Acompanhe as ações importantes realizadas no sistema.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p>Carregando logs...</p>
                ) : auditLogs.length > 0 ? (
                    <>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[180px]">Data e Hora</TableHead>
                                        <TableHead>Usuário</TableHead>
                                        <TableHead>Ação</TableHead>
                                        <TableHead>Detalhes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-xs">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(log.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium flex items-center gap-1"><User className="h-3 w-3" /> {log.userName}</span>
                                                    <Badge variant="secondary" className="capitalize w-fit mt-1">
                                                        <Shield className="h-3 w-3 mr-1" />
                                                        {log.userRole}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{log.action}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{log.details}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex justify-end items-center gap-2 mt-4">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">
                                    Anterior
                                </button>
                                <span className="text-sm">
                                    Página {page} de {totalPages}
                                </span>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded text-sm disabled:opacity-50">
                                    Próxima
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                        <History className="mx-auto h-12 w-12" />
                        <h3 className="mt-4 text-lg font-semibold">Nenhum registro de auditoria</h3>
                        <p className="mt-1 text-sm">As ações realizadas no sistema aparecerão aqui.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

type StockCount = {
    [productId: string]: number | null;
};

function StockAuditTab() {
    const { products } = useAdmin();
    const [stockCounts, setStockCounts] = useState<StockCount>({});

    const handleCountChange = (productId: string, value: string) => {
        const count = value === '' ? null : parseInt(value, 10);
        setStockCounts(prev => ({
            ...prev,
            [productId]: isNaN(count as number) ? null : count,
        }));
    };

    const auditedProducts = useMemo(() => {
        return products.map(product => {
            const physicalCount = stockCounts[product.id];
            const difference = physicalCount === null || physicalCount === undefined ? null : physicalCount - product.stock;
            return {
                ...product,
                physicalCount: physicalCount ?? '',
                difference: difference,
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [products, stockCounts]);
    
     if (!products) {
        return <p>Carregando produtos...</p>
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center print-hidden">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Boxes className="h-6 w-6" />
                            Auditoria de Estoque
                        </CardTitle>
                        <CardDescription>
                            Realize a contagem física dos produtos e compare com o estoque do sistema.
                        </CardDescription>
                    </div>
                    <Button onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir Relatório
                    </Button>
                </div>
                 <div className="hidden print:block">
                    <CardTitle>Relatório de Auditoria de Estoque</CardTitle>
                    <CardDescription>Data: {format(new Date(), 'dd/MM/yyyy')}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Imagem</TableHead>
                                <TableHead>Produto</TableHead>
                                <TableHead className="text-center">Estoque Sistema</TableHead>
                                <TableHead className="w-[150px] text-center">Estoque Físico</TableHead>
                                <TableHead className="w-[150px] text-center">Diferença</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {auditedProducts.map(product => (
                                <TableRow key={product.id}>
                                     <TableCell>
                                        <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted">
                                            <Image 
                                                src={(product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : 'https://placehold.co/100x100.png'} 
                                                alt={product.name} 
                                                fill 
                                                className="object-contain" 
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell className="text-center font-semibold text-lg">{product.stock}</TableCell>
                                    <TableCell className="text-center">
                                        <Input
                                            type="number"
                                            className="w-24 mx-auto text-center print-hidden"
                                            value={product.physicalCount}
                                            onChange={(e) => handleCountChange(product.id, e.target.value)}
                                        />
                                        <span className="hidden print:inline-block font-semibold text-lg">{product.physicalCount}</span>
                                    </TableCell>
                                    <TableCell 
                                        className={cn(
                                            "text-center font-bold text-lg",
                                            product.difference === 0 && "text-green-600",
                                            product.difference !== 0 && "text-destructive",
                                        )}
                                    >
                                        {product.difference !== null ? (product.difference > 0 ? `+${product.difference}`: product.difference) : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}


export default function AuditoriaPage() {
    return (
        <Tabs defaultValue="log">
            <TabsList className="mb-4">
                <TabsTrigger value="log">Log de Ações</TabsTrigger>
                <TabsTrigger value="stock">Auditoria de Estoque</TabsTrigger>
            </TabsList>
            <TabsContent value="log">
                <AuditLogTab />
            </TabsContent>
            <TabsContent value="stock">
                <StockAuditTab />
            </TabsContent>
        </Tabs>
    );
}
