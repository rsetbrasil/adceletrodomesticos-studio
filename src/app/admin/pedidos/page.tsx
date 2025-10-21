
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAdmin } from '@/context/AdminContext';
import type { Order, Installment, PaymentMethod, User, Payment } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PackageSearch, FileText, CheckCircle, Pencil, User as UserIcon, ShoppingBag, CreditCard, Printer, Undo2, Save, CalendarIcon, MoreHorizontal, Trash2, Users, Filter, X, Trash, History, Percent, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import PaymentDialog from '@/components/PaymentDialog';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


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
    case 'Excluído':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export default function OrdersAdminPage() {
  const { products, orders, updateOrderStatus, recordInstallmentPayment, updateOrderDetails, updateInstallmentDueDate, deleteOrder, permanentlyDeleteOrder, reversePayment } = useAdmin();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [installmentsInput, setInstallmentsInput] = useState(1);
  const [commissionInput, setCommissionInput] = useState('0');
  const [openDueDatePopover, setOpenDueDatePopover] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [installmentToPay, setInstallmentToPay] = useState<Installment | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    seller: 'all',
  });
  const [activeTab, setActiveTab] = useState('active');
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    const usersUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        setUsers(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as User)));
    },
    (error) => {
      console.error("Error fetching users:", error);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'users',
        operation: 'list',
      }));
    });

    return () => usersUnsubscribe();
  }, []);

  const sellers = useMemo(() => {
    return users.filter(u => u.role === 'vendedor' || u.role === 'admin' || u.role === 'gerente');
  }, [users]);
  
  const { activeOrders, deletedOrders } = useMemo(() => {
    const active: Order[] = [];
    const deleted: Order[] = [];

    let filtered = [...orders];

    if (filters.seller !== 'all') {
      filtered = filtered.filter(o => o.sellerId === filters.seller);
    }
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(o => 
        o.id.toLowerCase().includes(searchTerm) || 
        o.customer.name.toLowerCase().includes(searchTerm)
      );
    }
    
    if (filters.status !== 'all') {
      filtered = filtered.filter(o => o.status === filters.status);
    }
    
    filtered.forEach(order => {
      if (order.status === 'Excluído') {
        deleted.push(order);
      } else {
        active.push(order);
      }
    });

    return {
        activeOrders: active.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        deletedOrders: deleted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };
  }, [orders, user, filters]);

  const maxAllowedInstallmentsForSelectedOrder = useMemo(() => {
    if (!selectedOrder || !products) return 10;
    const orderProductIds = selectedOrder.items.map(item => item.id);
    const orderProducts = products.filter(p => orderProductIds.includes(p.id));
    if (orderProducts.length === 0) return 10;

    const maxInstallmentsArray = orderProducts.map(p => p.maxInstallments ?? 10);
    return Math.min(...maxInstallmentsArray);
  }, [selectedOrder, products]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({...prev, [filterName]: value}));
  };

  const clearFilters = () => {
    setFilters({ search: '', status: 'all', seller: 'all' });
  };

  useEffect(() => {
    if (selectedOrder) {
      const updatedOrderInList = orders.find(o => o.id === selectedOrder.id);
      if (updatedOrderInList && JSON.stringify(updatedOrderInList) !== JSON.stringify(selectedOrder)) {
        setSelectedOrder(updatedOrderInList);
      }
      setInstallmentsInput(updatedOrderInList?.installments || 1);
      setCommissionInput((updatedOrderInList?.commission || 0).toString().replace('.', ','));
    }
  }, [orders, selectedOrder]);

  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
    setInstallmentsInput(order.installments);
    setCommissionInput((order.commission || 0).toString().replace('.', ','));
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
        const newInstallmentDetails: Installment[] = Array.from({ length: currentInstallments }, (_, i) => ({
            installmentNumber: i + 1,
            amount: newInstallmentValue,
            dueDate: addMonths(new Date(selectedOrder.date), i + 1).toISOString(),
            status: 'Pendente',
            paidAmount: 0,
            payments: [],
            id: `inst-${selectedOrder.id}-${i + 1}`
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
    if (isNaN(newInstallmentsCount) || newInstallmentsCount < 1) {
        toast({ title: "Erro", description: "Por favor, insira um número de parcelas válido.", variant: "destructive" });
        return;
    }

    if (newInstallmentsCount > maxAllowedInstallmentsForSelectedOrder) {
        toast({ title: "Limite de Parcelas Excedido", description: `O número máximo de parcelas para este pedido é ${maxAllowedInstallmentsForSelectedOrder}.`, variant: "destructive" });
        return;
    }

    const newInstallmentValue = selectedOrder.total / newInstallmentsCount;
    const newInstallmentDetails: Installment[] = Array.from({ length: newInstallmentsCount }, (_, i) => ({
        installmentNumber: i + 1,
        amount: newInstallmentValue,
        dueDate: addMonths(new Date(selectedOrder.date), i + 1).toISOString(),
        status: 'Pendente',
        paidAmount: 0,
        payments: [],
        id: `inst-${selectedOrder.id}-${i + 1}`
    }));
    
    const newDetails: Partial<Order> = {
        installments: newInstallmentsCount,
        installmentValue: newInstallmentValue,
        installmentDetails: newInstallmentDetails
    };
    
    updateOrderDetails(selectedOrder.id, newDetails);
  };
  
  const handleOpenPaymentDialog = (installment: Installment) => {
    setInstallmentToPay(installment);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = (payment: Payment) => {
    if (selectedOrder && installmentToPay) {
      recordInstallmentPayment(selectedOrder.id, installmentToPay.installmentNumber, payment);
      window.open(`/carnet/${selectedOrder.id}/${installmentToPay.installmentNumber}`, '_blank');
    }
    setPaymentDialogOpen(false);
    setInstallmentToPay(null);
  };


  const handleDueDateChange = (orderId: string, installmentNumber: number, date: Date | undefined) => {
    if (date) {
        updateInstallmentDueDate(orderId, installmentNumber, date);
    }
    setOpenDueDatePopover(null);
  }

  const handleDeleteOrder = (orderId: string) => {
    deleteOrder(orderId);
    toast({
      title: 'Pedido Movido para Lixeira!',
      description: 'O pedido foi movido para a lixeira e pode ser restaurado.',
    });
  };

  const handlePermanentlyDeleteOrder = (orderId: string) => {
    permanentlyDeleteOrder(orderId);
    toast({
      title: 'Pedido Excluído!',
      description: 'O pedido foi removido permanentemente.',
      variant: 'destructive',
    });
  };

  const handleRestoreOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, 'Processando');
  };

  const handleAssignSeller = (order: Order, seller: User) => {
    if (!seller) return;
    const detailsToUpdate: Partial<Order> = {
        sellerId: seller.id,
        sellerName: seller.name,
    };
    updateOrderDetails(order.id, detailsToUpdate);
    toast({
        title: "Vendedor Atribuído!",
        description: `O pedido #${order.id} foi atribuído a ${seller.name}.`
    });
  };

  const handleAssignToMe = (order: Order) => {
    if (!user) return;
    handleAssignSeller(order, user);
  }

  const handleUpdateCommission = () => {
    if (!selectedOrder) return;
    const value = parseFloat(commissionInput.replace(',', '.'));
    if (isNaN(value) || value < 0) {
      toast({ title: 'Valor inválido', description: 'Por favor, insira um valor de comissão válido.', variant: 'destructive' });
      return;
    }
    updateOrderDetails(selectedOrder.id, { commission: value, isCommissionManual: true });
  }

  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'gerente';


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
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                    <TabsTrigger value="active">Pedidos Ativos</TabsTrigger>
                    <TabsTrigger value="deleted">Lixeira</TabsTrigger>
                </TabsList>
                <TabsContent value="active">
                    <div className="flex flex-wrap gap-4 mb-6 p-4 border rounded-lg bg-muted/50">
                        <div className="flex-grow min-w-[200px]">
                            <Input 
                                placeholder="Buscar por ID do pedido ou cliente..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                            />
                        </div>
                        <div className="flex-grow min-w-[150px]">
                            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filtrar por status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Status</SelectItem>
                                    <SelectItem value="Processando">Processando</SelectItem>
                                    <SelectItem value="Enviado">Enviado</SelectItem>
                                    <SelectItem value="Entregue">Entregue</SelectItem>
                                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-grow min-w-[150px]">
                            <Select value={filters.seller} onValueChange={(value) => handleFilterChange('seller', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filtrar por vendedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Vendedores</SelectItem>
                                    {sellers.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="ghost" onClick={clearFilters}>
                            <X className="mr-2 h-4 w-4"/>
                            Limpar Filtros
                        </Button>
                    </div>

                    {activeOrders.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[150px]">Pedido ID</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Produtos</TableHead>
                                        <TableHead>Vendedor</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Comissão</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activeOrders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.id}</TableCell>
                                        <TableCell>{format(new Date(order.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell>
                                        <TableCell>{order.customer.name}</TableCell>
                                        <TableCell className="text-xs max-w-[200px] truncate">{order.items.map(item => item.name).join(', ')}</TableCell>
                                        <TableCell>{order.sellerName}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                                        <TableCell className="text-right font-semibold text-green-600">{formatCurrency(order.commission || 0)}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDetails(order)}>
                                                    <Pencil className="h-4 w-4" />
                                                    <span className="sr-only">Gerenciar Pedido</span>
                                                </Button>
                                                {isManagerOrAdmin ? (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <Users className="h-4 w-4" />
                                                                <span className="sr-only">Atribuir Vendedor</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {sellers.map(s => (
                                                                <DropdownMenuItem key={s.id} onClick={() => handleAssignSeller(order, s)}>
                                                                    {s.name}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                ) : (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAssignToMe(order)}>
                                                        <UserPlus className="h-4 w-4" />
                                                        <span className="sr-only">Atribuir a mim</span>
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteOrder(order.id)}>
                                                    <Trash className="h-4 w-4" />
                                                    <span className="sr-only">Excluir Pedido</span>
                                                </Button>
                                            </div>
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
                            <p className="mt-1 text-sm">Ajuste os filtros ou crie um novo pedido.</p>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="deleted">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Pedido ID</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Data da Exclusão</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {deletedOrders.length > 0 ? (
                                    deletedOrders.map(order => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">{order.id}</TableCell>
                                            <TableCell>{order.customer.name}</TableCell>
                                            <TableCell>{format(new Date(order.date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleRestoreOrder(order.id)}>
                                                        <History className="mr-2 h-4 w-4" />
                                                        Restaurar
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="destructive" outline size="sm">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Excluir
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Excluir Permanentemente?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Esta ação é irreversível e irá apagar permanentemente o pedido <span className="font-bold">{order.id}</span>. Você tem certeza?
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handlePermanentlyDeleteOrder(order.id)}>
                                                                    Sim, Excluir
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">A lixeira está vazia.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
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
                                  <UserIcon className="w-8 h-8 text-primary" />
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
                                  <p className="text-sm text-muted-foreground mb-4">
                                      Produtos: {selectedOrder.items.map(item => item.name).join(', ')}
                                    </p>
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
                                  <div className="flex justify-between text-sm mt-2">
                                      <span>Vendedor:</span>
                                      <span>{selectedOrder.sellerName}</span>
                                  </div>
                                  <Separator className="my-3" />

                                   <div className="flex justify-between text-base items-center">
                                      <span className="font-semibold text-green-600 flex items-center gap-2"><Percent />Comissão:</span>
                                      {isManagerOrAdmin ? (
                                        <div className="flex gap-2 items-center">
                                          <span className="text-sm">R$</span>
                                           <Input
                                                type="text"
                                                value={commissionInput}
                                                onChange={(e) => setCommissionInput(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateCommission() }}
                                                className="w-24 h-8 text-right"
                                            />
                                            <Button size="sm" variant="outline" onClick={handleUpdateCommission}>
                                                <Save className="h-4 w-4" />
                                            </Button>
                                        </div>
                                      ) : (
                                         <span className="font-bold text-green-600">{formatCurrency(selectedOrder.commission || 0)}</span>
                                      )}
                                  </div>
                                  {selectedOrder.isCommissionManual && <p className="text-xs text-muted-foreground text-right">Valor de comissão manual</p>}
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
                                              <label className="text-sm font-medium">Parcelas (Max: {maxAllowedInstallmentsForSelectedOrder})</label>
                                              <div className="flex gap-2">
                                                  <Input 
                                                      type="number" 
                                                      value={installmentsInput} 
                                                      onChange={(e) => setInstallmentsInput(Number(e.target.value))}
                                                      min="1" max={maxAllowedInstallmentsForSelectedOrder}
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
                                          <Select value={selectedOrder.status} onValueChange={(status) => updateOrderStatus(selectedOrder!.id, status as Order['status'])}>
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
                                    <Table>
                                        <TableBody>
                                            {(selectedOrder.installmentDetails || []).map((inst) => {
                                                const uniqueKey = `${selectedOrder.id}-${inst.installmentNumber}`;
                                                const isExpanded = expandedHistory === uniqueKey;
                                                const remainingAmount = inst.amount - (inst.paidAmount || 0);
                                                const isOverdue = inst.status === 'Pendente' && new Date(inst.dueDate) < new Date();
                                                
                                                let statusText = inst.status;
                                                if (inst.status === 'Pendente' && (inst.paidAmount || 0) > 0) {
                                                    statusText = `Parcial (${formatCurrency(remainingAmount)} pendente)`;
                                                } else if (isOverdue) {
                                                    statusText = 'Atrasado';
                                                }
                                                const statusVariant = inst.status === 'Pago' ? 'default' : isOverdue ? 'destructive' : 'secondary';
                                                
                                                return (
                                                    <React.Fragment key={uniqueKey}>
                                                        <TableRow>
                                                            <TableCell className="font-medium">{inst.installmentNumber}/{selectedOrder.installments}</TableCell>
                                                            <TableCell>
                                                                <Popover open={openDueDatePopover === uniqueKey} onOpenChange={(isOpen) => setOpenDueDatePopover(isOpen ? uniqueKey : null)}>
                                                                    <PopoverTrigger asChild>
                                                                        <Button variant={"outline"} className="justify-start text-left font-normal text-xs" disabled={inst.status === 'Pago'}>
                                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                                            Venc: {format(new Date(inst.dueDate), 'dd/MM/yyyy')}
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-auto p-0">
                                                                        <Calendar mode="single" selected={new Date(inst.dueDate)} onSelect={(date) => handleDueDateChange(selectedOrder.id, inst.installmentNumber, date)} initialFocus/>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </TableCell>
                                                            <TableCell>{formatCurrency(inst.amount)}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={statusVariant} className="w-full text-center justify-center">{statusText}</Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex gap-1 justify-end">
                                                                    {(inst.payments && inst.payments.length > 0) && (
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedHistory(isExpanded ? null : uniqueKey)}>
                                                                            <History className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
                                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenPaymentDialog(inst)} disabled={inst.status === 'Pago'}>
                                                                        <CheckCircle className="h-4 w-4 text-green-600"/>
                                                                    </Button>
                                                                    <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                                                                        <Link href={`/carnet/${selectedOrder.id}/${inst.installmentNumber}`} target="_blank" rel="noopener noreferrer">
                                                                            <Printer className="h-4 w-4" />
                                                                        </Link>
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                        {isExpanded && (
                                                            <TableRow>
                                                                <TableCell colSpan={5} className="p-0">
                                                                    <div className="p-4 bg-muted/50">
                                                                        <h4 className="font-semibold text-sm mb-2">Histórico de Pagamentos da Parcela</h4>
                                                                        {(inst.payments && inst.payments.length > 0) ? (
                                                                            <Table>
                                                                                <TableHeader>
                                                                                    <TableRow>
                                                                                        <TableHead>Data</TableHead>
                                                                                        <TableHead>Método</TableHead>
                                                                                        <TableHead>Valor</TableHead>
                                                                                        <TableHead className='text-right'>Ação</TableHead>
                                                                                    </TableRow>
                                                                                </TableHeader>
                                                                                <TableBody>
                                                                                    {inst.payments.map((p, index) => (
                                                                                        <TableRow key={`${p.id}-${index}`}>
                                                                                            <TableCell>{format(new Date(p.date), "dd/MM/yyyy 'às' HH:mm")}</TableCell>
                                                                                            <TableCell>{p.method}</TableCell>
                                                                                            <TableCell>{formatCurrency(p.amount)}</TableCell>
                                                                                            <TableCell className="text-right">
                                                                                                <AlertDialog>
                                                                                                    <AlertDialogTrigger asChild>
                                                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Undo2 className="h-4 w-4" /></Button>
                                                                                                    </AlertDialogTrigger>
                                                                                                    <AlertDialogContent>
                                                                                                        <AlertDialogHeader>
                                                                                                            <AlertDialogTitle>Confirmar Estorno?</AlertDialogTitle>
                                                                                                            <AlertDialogDescription>Esta ação irá reverter o pagamento de {formatCurrency(p.amount)} feito em {format(new Date(p.date), 'dd/MM/yy')}. Isso não pode ser desfeito.</AlertDialogDescription>
                                                                                                        </AlertDialogHeader>
                                                                                                        <AlertDialogFooter>
                                                                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                                                            <AlertDialogAction onClick={() => reversePayment(selectedOrder.id, inst.installmentNumber, p.id)}>Sim, Estornar</AlertDialogAction>
                                                                                                        </AlertDialogFooter>
                                                                                                    </AlertDialogContent>
                                                                                                </AlertDialog>
                                                                                            </TableCell>
                                                                                        </TableRow>
                                                                                    ))}
                                                                                </TableBody>
                                                                            </Table>
                                                                        ) : <p className='text-xs text-muted-foreground'>Nenhum pagamento registrado para esta parcela.</p>}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </React.Fragment>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
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
                                Ver Carnê Completo
                            </Link>
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Fechar</Button>
                  </DialogFooter>
                  </>
              )}
          </DialogContent>
      </Dialog>
      
      {installmentToPay && selectedOrder && (
        <PaymentDialog
          isOpen={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          installment={installmentToPay}
          orderId={selectedOrder.id}
          customerName={selectedOrder.customer.name}
          onSubmit={handlePaymentSubmit}
        />
      )}
    </>
  );
}
