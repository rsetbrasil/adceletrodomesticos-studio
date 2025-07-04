'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import type { Order, Installment } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PackageSearch, FileText, CheckCircle, Pencil, User, ShoppingBag, CreditCard, Printer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


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

const getInstallmentStatusVariant = (status: Installment['status']): 'secondary' | 'default' => {
    switch (status) {
        case 'Pendente':
            return 'secondary';
        case 'Pago':
            return 'default';
        default:
            return 'secondary';
    }
}

export default function OrdersAdminPage() {
  const { orders, updateOrderStatus, updateInstallmentStatus } = useCart();
  const [isClient, setIsClient] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  }

  const handleUpdateOrderStatus = (status: Order['status']) => {
    if (selectedOrder) {
      updateOrderStatus(selectedOrder.id, status);
      // Also update the selected order in the state to reflect the change immediately
      setSelectedOrder(prev => prev ? { ...prev, status } : null);
    }
  };

  const handleMarkInstallmentAsPaid = (installmentNumber: number) => {
    if (selectedOrder) {
      updateInstallmentStatus(selectedOrder.id, installmentNumber, 'Pago');
      setSelectedOrder(prev => {
        if (!prev) return null;
        const updatedInstallments = (prev.installmentDetails || []).map(inst => 
            inst.installmentNumber === installmentNumber ? { ...inst, status: 'Pago' as const } : inst
        );
        return { ...prev, installmentDetails: updatedInstallments };
      });
    }
  }

  if (!isClient) {
    return (
        <div className="flex justify-center items-center py-24">
            <p>Carregando painel...</p>
        </div>
    );
  }

  return (
    <>
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
                                     <Button variant="outline" size="sm" onClick={() => handleOpenDetails(order)}>
                                        <Pencil className="mr-2 h-3 w-3" />
                                        Gerenciar
                                    </Button>
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

        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
            <DialogContent className="max-w-4xl h-[90vh]">
                {selectedOrder && (
                    <>
                    <DialogHeader>
                        <DialogTitle>Detalhes do Pedido: {selectedOrder.id}</DialogTitle>
                        <DialogDescription>
                            Gerencie o status do pedido e o faturamento das parcelas.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto p-1 pr-4">
                        {/* Left Column: Details */}
                        <div className="space-y-6">
                            {/* Customer Info */}
                             <Card>
                                <CardHeader className="flex-row items-center gap-4 space-y-0">
                                    <User className="w-8 h-8 text-primary" />
                                    <CardTitle className="text-lg">Informações do Cliente</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm space-y-1">
                                    <p><strong>Nome:</strong> {selectedOrder.customer.name}</p>
                                    <p><strong>CPF:</strong> {selectedOrder.customer.cpf}</p>
                                    <p><strong>Email:</strong> {selectedOrder.customer.email}</p>
                                    <p><strong>Telefone:</strong> {selectedOrder.customer.phone}</p>
                                    <p><strong>Endereço:</strong> {`${selectedOrder.customer.address}, ${selectedOrder.customer.city}, ${selectedOrder.customer.state}`}</p>
                                </CardContent>
                            </Card>

                             {/* Order Summary */}
                             <Card>
                                <CardHeader className="flex-row items-center gap-4 space-y-0">
                                    <ShoppingBag className="w-8 h-8 text-primary" />
                                    <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {selectedOrder.items.map(item => (
                                            <div key={item.id} className="flex justify-between items-center text-sm">
                                                <span>{item.name} x {item.quantity}</span>
                                                <span>{formatCurrency(item.price * item.quantity)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <Separator className="my-3" />
                                    <div className="flex justify-between font-bold text-base">
                                        <span>TOTAL</span>
                                        <span>{formatCurrency(selectedOrder.total)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Invoicing */}
                        <div className="space-y-6">
                             {/* Payment Info */}
                            <Card>
                                <CardHeader className="flex-row items-center gap-4 space-y-0">
                                    <CreditCard className="w-8 h-8 text-primary" />
                                    <CardTitle className="text-lg">Faturamento e Status</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <p className="text-sm"><strong>Forma de Pagamento:</strong> <Badge variant="outline">{selectedOrder.paymentMethod}</Badge></p>
                                    </div>
                                    <div className="flex items-end gap-4">
                                        <div className="flex-grow">
                                            <label className="text-sm font-medium">Status do Pedido</label>
                                            <Select value={selectedOrder.status} onValueChange={handleUpdateOrderStatus}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Alterar status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Processando">Processando</SelectItem>
                                                    <SelectItem value="Enviado">Enviado</SelectItem>
                                                    <SelectItem value="Entregue">Entregue</SelectItem>
                                                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Badge variant={getStatusVariant(selectedOrder.status)} className="h-10 text-sm">{selectedOrder.status}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            {/* Installment Plan / Payment Confirmation */}
                            {selectedOrder.paymentMethod === 'Crediário' ? (
                                <Card>
                                    <CardHeader className="flex-row items-center gap-4 space-y-0">
                                        <FileText className="w-8 h-8 text-primary" />
                                        <CardTitle className="text-lg">Carnê de Pagamento</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Parcela</TableHead>
                                                    <TableHead>Vencimento</TableHead>
                                                    <TableHead>Valor</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Ação</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(selectedOrder.installmentDetails || []).map(inst => (
                                                    <TableRow key={inst.installmentNumber}>
                                                        <TableCell>{inst.installmentNumber}/{selectedOrder.installments}</TableCell>
                                                        <TableCell>{format(new Date(inst.dueDate), 'dd/MM/yyyy')}</TableCell>
                                                        <TableCell>{formatCurrency(inst.amount)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={getInstallmentStatusVariant(inst.status)}>{inst.status}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {inst.status === 'Pendente' && (
                                                                <Button size="sm" variant="outline" onClick={() => handleMarkInstallmentAsPaid(inst.installmentNumber)}>
                                                                    <CheckCircle className="mr-2 h-4 w-4 text-green-600"/>
                                                                    Pagar
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card>
                                    <CardHeader className="flex-row items-center gap-4 space-y-0">
                                        <CheckCircle className="w-8 h-8 text-primary" />
                                        <CardTitle className="text-lg">Confirmação de Pagamento</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedOrder.installmentDetails && selectedOrder.installmentDetails.length > 0 && selectedOrder.installmentDetails[0].status === 'Pendente' ? (
                                            <div className="flex flex-col items-center gap-4 text-center p-4">
                                                <p>Aguardando confirmação de pagamento de <strong>{formatCurrency(selectedOrder.total)}</strong> via <strong>{selectedOrder.paymentMethod}</strong>.</p>
                                                <Button size="lg" onClick={() => handleMarkInstallmentAsPaid(1)}>
                                                    <CheckCircle className="mr-2 h-5 w-5"/>
                                                    Confirmar Recebimento
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2 text-green-600 font-semibold p-4">
                                                <CheckCircle className="h-6 w-6" />
                                                <p className="text-base">Pagamento Confirmado</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                     <DialogFooter className="pt-4 border-t">
                        {selectedOrder.paymentMethod === 'Crediário' && (
                            <Button variant="secondary" asChild>
                                <Link href={`/carnet/${selectedOrder.id}`} target="_blank" rel="noopener noreferrer">
                                    <Printer className="mr-2 h-4 w-4" />
                                    Ver Carnê
                                </Link>
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Fechar</Button>
                    </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    </>
  );
}
