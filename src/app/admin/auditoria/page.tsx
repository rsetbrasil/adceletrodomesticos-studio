
'use client';

import { useState, useMemo } from 'react';
import { useAdmin } from '@/context/AdminContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Boxes, Printer } from 'lucide-react';
import { format } from 'date-fns';
import type { Product } from '@/lib/types';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';


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
        <StockAuditTab />
    );
}
