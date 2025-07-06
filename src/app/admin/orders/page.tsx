'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import type { Order, Installment, PaymentMethod } from '@/lib/types';
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
import { PackageSearch, FileText, CheckCircle, Pencil, User, ShoppingBag, CreditCard, Printer, Undo2, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';


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
  const { orders, updateOrderStatus, updateInstallmentStatus, updateOrderDetails } = useCart();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [installmentsInput, setInstallmentsInput] = useState(1);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      const updatedOrderInList = orders.find(o => o.id === selectedOrder.id);
      if (updatedOrderInList && JSON.stringify(updatedOrderInList) !== JSON.stringify(selectedOrder)) {
        setSelectedOrder(updatedOrderInList);
      }
      setInstallmentsInput(updatedOrderInList?.installments || 1);
    }
  }, [orders, selectedOrder]);

  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
    setInstallmentsInput(order.installments);
    setIsDetailModalOpen(true);
  }

  const handleUpdateOrderStatus = (status: Order['status']) => {
    if (selectedOrder) {
      updateOrderStatus(selectedOrder.id, status);
    }
  };

  const handleUpdatePaymentMethod = (paymentMethod: PaymentMethod) => {
    if (!selectedOrder) return;
    
    let newDetails: Partial<Order> = { paymentMethod };
    
    if (paymentMethod === 'Crediário') {
        const currentInstallments = selectedOrder.installments > 0 ? selectedOrder.installments : 1;
        const newInstallmentValue = selectedOrder.total / currentInstallments;
        const newInstallmentDetails = Array.from({ length: currentInstallments }, (_, i) => ({
            installmentNumber: i + 1,
            amount: newInstallmentValue,
            dueDate: addMonths(new Date(selectedOrder.date), i + 1).toISOString(),
            status: 'Pendente' as const,
            paymentDate: null,
        }));
        newDetails = { 
            ...newDetails,
            installments: currentInstallments,
            installmentValue: newInstallmentValue,
            installmentDetails: newInstallmentDetails
        };
        setInstallmentsInput(currentInstallments);
    } else {
        newDetails = { ...newDetails, installments: 1, installmentValue: selectedOrder.total, installmentDetails: [] };
    }
    
    updateOrderDetails(selectedOrder.id, newDetails);
  };

  const handleUpdateInstallments = () => {
    if (!selectedOrder || selectedOrder.paymentMethod !== 'Crediário' || !installmentsInput) return;
    
    const newInstallmentsCount = Number(installmentsInput);
    if (isNaN(newInstallmentsCount) || newInstallmentsCount < 1 || newInstallmentsCount > 24) {
        toast({ title: "Erro", description: "Por favor, insira um número de parcelas válido (1-24).", variant: "destructive" });
        return;
    }

    const newInstallmentValue = selectedOrder.total / newInstallmentsCount;
    const newInstallmentDetails = Array.from({ length: newInstallmentsCount }, (_, i) => ({
        installmentNumber: i + 1,
        amount: newInstallmentValue,
        dueDate: addMonths(new Date(selectedOrder.date), i + 1).toISOString(),
        status: 'Pendente' as const,
        paymentDate: null,
    }));
    
    const newDetails: Partial<Order> = {
        installments: newInstallmentsCount,
        installmentValue: newInstallmentValue,
        installmentDetails: newInstallmentDetails
    };
    
    updateOrderDetails(selectedOrder.id, newDetails);
  };

  const handleToggleInstallmentStatus = (installmentNumber: number) => {
    if (selectedOrder) {
      const currentInstallment = selectedOrder.installmentDetails?.find(i => i.installmentNumber === installmentNumber);
      if (!currentInstallment) return;

      const newStatus = currentInstallment.status === 'Pendente' ? 'Pago' : 'Pendente';
      updateInstallmentStatus(selectedOrder.id, installmentNumber, newStatus);

      if (newStatus === 'Pago') {
        window.open(`/carnet/${selectedOrder.id}/${installmentNumber}`, '_blank');
        toast({
            title: "Pagamento Confirmado!",
            description: "Abrindo comprovante para gerar o PDF e enviar ao cliente.",
        });
      } else {
          toast({
              title: "Status Atualizado!",
              description: `O pagamento do pedido #${selectedOrder.id} foi marcado como estornado.`,
          });
      }
    }
  };


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
          <DialogContent className="max-w-6xl h-[90vh]">
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
                              <CardContent className="space-y-6">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                        <div className="flex-grow">
                                            <label className="text-sm font-medium">Forma de Pagamento</label>
                                            <Select value={selectedOrder.paymentMethod} onValueChange={(value) => handleUpdatePaymentMethod(value as PaymentMethod)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Alterar forma de pagamento" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Crediário">Crediário</SelectItem>
                                                    <SelectItem value="Pix">Pix</SelectItem>
                                                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                      {selectedOrder.paymentMethod === 'Crediário' && (
                                          <div>
                                              <label className="text-sm font-medium">Parcelas</label>
                                              <div className="flex gap-2">
                                                  <Input 
                                                      type="number" 
                                                      value={installmentsInput} 
                                                      onChange={(e) => setInstallmentsInput(Number(e.target.value))}
                                                      min="1" max="24"
                                                      className="w-24"
                                                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateInstallments()}
                                                  />
                                                  <Button size="sm" onClick={handleUpdateInstallments}>
                                                    <Save className="mr-2 h-4 w-4" /> Salvar
                                                  </Button>
                                              </div>
                                          </div>
                                      )}
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
                          
                          {selectedOrder.paymentMethod === 'Crediário' && (
                              <Card>
                                <CardHeader className="flex-row items-center gap-4 space-y-0">
                                    <FileText className="w-8 h-8 text-primary" />
                                    <CardTitle className="text-lg">Carnê de Pagamento</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {(selectedOrder.installmentDetails || []).length > 0 ? (
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
                                                            <Button size="sm" variant="outline" onClick={() => handleToggleInstallmentStatus(inst.installmentNumber)}>
                                                                {inst.status === 'Pendente' ? (
                                                                    <CheckCircle className="mr-2 h-4 w-4 text-green-600"/>
                                                                ) : (
                                                                    <Undo2 className="mr-2 h-4 w-4 text-amber-600"/>
                                                                )}
                                                                {inst.status === 'Pendente' ? 'Pagar' : 'Estornar'}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <p className="text-sm text-center text-muted-foreground py-4">
                                            Nenhuma parcela encontrada. Salve o número de parcelas para gerá-las.
                                        </p>
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
