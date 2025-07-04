'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import type { Order } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PackageSearch } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const getStatusVariant = (status: Order['status']): 'secondary' | 'default' | 'outline' | 'destructive' => {
  switch (status) {
    case 'Processando':
      return 'secondary';
    case 'Enviado':
      return 'default';
    case 'Entregue':
      return 'outline';
    case 'Cancelado':
      return 'destructive';
    default:
      return 'secondary';
  }
};


export default function OrdersAdminPage() {
  const { orders, updateOrderStatus } = useCart();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
        <div className="flex justify-center items-center py-24">
            <p>Carregando painel...</p>
        </div>
    );
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Gerenciamento de Pedidos</CardTitle>
            <CardDescription>Visualize e atualize o status dos pedidos recentes.</CardDescription>
        </CardHeader>
        <CardContent>
            {orders.length > 0 ? (
                <div className="rounded-md border">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="w-[150px]">Pedido ID</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                        <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.id}</TableCell>
                            <TableCell>{format(new Date(order.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell>
                            <TableCell>{order.customer.name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                            <TableCell className="text-center">
                                <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Abrir menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'Processando')}>
                                        Marcar como Processando
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'Enviado')}>
                                        Marcar como Enviado
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'Entregue')}>
                                        Marcar como Entregue
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => updateOrderStatus(order.id, 'Cancelado')}>
                                        Cancelar Pedido
                                    </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                    <PackageSearch className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">Nenhum pedido encontrado</h3>
                    <p className="mt-1 text-sm">Quando os clientes fizerem pedidos, eles aparecerão aqui.</p>
                </div>
            )}
        </CardContent>
    </Card>
  );
}
