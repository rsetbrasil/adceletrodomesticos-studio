
'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { PackageSearch, FileText, CheckCircle, Pencil, User as UserIcon, ShoppingBag, CreditCard, Printer, Undo2, Save, CalendarIcon, MoreHorizontal, Trash2, Users, Filter, X, Trash, History, Percent, UserPlus, Clock, MessageSquare, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO, addMonths, getDay, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import PaymentDialog from '@/components/PaymentDialog';
import { useData } from '@/context/DataContext';
import { useAudit } from '@/context/AuditContext';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { useSettings } from '@/context/SettingsContext';
import Logo from '@/components/Logo';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';


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

const dueDateRanges = [
    { value: 'all', label: 'Todos os Vencimentos' },
    { value: '1-5', label: '1 a 5' },
    { value: '6-10', label: '6 a 10' },
    { value: '11-15', label: '11 a 15' },
    { value: '16-20', label: '16 a 20' },
    { value: '21-25', label: '21 a 25' },
    { value: '26-31', label: '26 a 31' },
];

export default function OrdersAdminPage() {
  const { updateOrderStatus, recordInstallmentPayment, updateOrderDetails, updateInstallmentDueDate, deleteOrder, permanentlyDeleteOrder, reversePayment, emptyTrash } = useAdmin();
  const { products, orders } = useData();
  const { user, users } = useAuth();
  const { settings } = useSettings();
  const { logAction } = useAudit();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [installmentsInput, setInstallmentsInput] = useState(1);
  const [commissionInput, setCommissionInput] = useState('0');
  const [observationsInput, setObservationsInput] = useState('');
  const [openDueDatePopover, setOpenDueDatePopover] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [installmentToPay, setInstallmentToPay] = useState<Installment | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    seller: 'all',
    showOverdue: false,
    dueDateRange: 'all',
  });
  const [activeTab, setActiveTab] = useState('active');
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [deletedPage, setDeletedPage] = useState(1);

  const ORDERS_PER_PAGE = 20;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const sellers = useMemo(() => {
    return users.filter(u => u.role === 'vendedor' || u.role === 'admin' || u.role === 'gerente');
  }, [users]);
  
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    return orders.filter(o => {
        const searchTerm = filters.search.toLowerCase();
        const searchMatch = !searchTerm ||
            o.id.toLowerCase().includes(searchTerm) ||
            o.customer.name.toLowerCase().includes(searchTerm);

        const statusMatch = filters.status === 'all' || o.status === filters.status;
        
        const sellerMatch = filters.seller === 'all' || o.sellerId === filters.seller;

        const overdueMatch = !filters.showOverdue || (o.installmentDetails || []).some(inst => inst.status === 'Pendente' && new Date(inst.dueDate) < new Date());
        
        const dueDateMatch = filters.dueDateRange === 'all' || (o.installmentDetails || []).some(inst => {
            const dueDate = parseISO(inst.dueDate);
            const today = new Date();
            if (getMonth(dueDate) !== getMonth(today) || getYear(dueDate) !== getYear(today)) {
                return false;
            }
            const day = getDay(dueDate) + 1;
            const [start, end] = filters.dueDateRange.split('-').map(Number);
            return day >= start && day <= end;
        });

        return searchMatch && statusMatch && sellerMatch && overdueMatch && dueDateMatch;
    });
  }, [orders, filters]);

  const { activeOrders, deletedOrders } = useMemo(() => {
    const active: Order[] = [];
    const deleted: Order[] = [];

    filteredOrders.forEach(order => {
      if (order.status === 'Excluído' && order.items.length === 0) {
        // Registration-only record, don't show
      } else if (order.status === 'Excluído') {
        deleted.push(order);
      } else {
        active.push(order);
      }
    });

    return {
        activeOrders: active.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        deletedOrders: deleted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };
  }, [filteredOrders]);


  const { paginatedActiveOrders, totalActivePages } = useMemo(() => {
    const total = Math.ceil(activeOrders.length / ORDERS_PER_PAGE);
    const paginated = activeOrders.slice((activePage - 1) * ORDERS_PER_PAGE, activePage * ORDERS_PER_PAGE);
    return { paginatedActiveOrders: paginated, totalActivePages: total };
  }, [activeOrders, activePage]);

  const { paginatedDeletedOrders, totalDeletedPages } = useMemo(() => {
    const total = Math.ceil(deletedOrders.length / ORDERS_PER_PAGE);
    const paginated = deletedOrders.slice((deletedPage - 1) * ORDERS_PER_PAGE, deletedPage * ORDERS_PER_PAGE);
    return { paginatedDeletedOrders: paginated, totalDeletedPages: total };
  }, [deletedOrders, deletedPage]);

  const maxAllowedInstallmentsForSelectedOrder = useMemo(() => {
    if (!selectedOrder || !products) return 10;
    const orderProductIds = selectedOrder.items.map(item => item.id);
    const orderProducts = products.filter(p => orderProductIds.includes(p.id));
    if (orderProducts.length === 0) return 10;

    const maxInstallmentsArray = orderProducts.map(p => p.maxInstallments ?? 10);
    return Math.min(...maxInstallmentsArray);
  }, [selectedOrder, products]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string | boolean) => {
    setFilters(prev => ({...prev, [filterName]: value}));
    setActivePage(1);
    setDeletedPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: '', status: 'all', seller: 'all', showOverdue: false, dueDateRange: 'all' });
  };

  useEffect(() => {
    if (selectedOrder) {
      const updatedOrderInList = orders.find(o => o.id === selectedOrder.id);
      if (updatedOrderInList && JSON.stringify(updatedOrderInList) !== JSON.stringify(selectedOrder)) {
        setSelectedOrder(updatedOrderInList);
      }
      setInstallmentsInput(updatedOrderInList?.installments || 1);
      setCommissionInput((updatedOrderInList?.commission || 0).toString().replace('.', ','));
      setObservationsInput(updatedOrderInList?.observations || '');
    }
  }, [orders, selectedOrder]);

  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
    setInstallmentsInput(order.installments);
    setCommissionInput((order.commission || 0).toString().replace('.', ','));
    setObservationsInput(order.observations || '');
    setIsDetailModalOpen(true);
  }

  const handleUpdateOrderStatus = (status: Order['status']) => {
    if (selectedOrder) {
      updateOrderStatus(selectedOrder.id, status, logAction, user);
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
    
    updateOrderDetails(selectedOrder.id, newDetails, logAction, user);
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
    
    updateOrderDetails(selectedOrder.id, newDetails, logAction, user);
  };
  
  const handleOpenPaymentDialog = (installment: Installment) => {
    setInstallmentToPay(installment);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = (payment: Omit<Payment, 'receivedBy'>) => {
    if (selectedOrder && installmentToPay) {
      recordInstallmentPayment(selectedOrder.id, installmentToPay.installmentNumber, payment, logAction, user);
      window.open(`/carnet/${selectedOrder.id}/${installmentToPay.installmentNumber}`, '_blank');
    }
    setPaymentDialogOpen(false);
    setInstallmentToPay(null);
  };


  const handleDueDateChange = (orderId: string, installmentNumber: number, date: Date | undefined) => {
    if (date) {
        updateInstallmentDueDate(orderId, installmentNumber, date, logAction, user);
    }
    setOpenDueDatePopover(null);
  }

  const handleDeleteOrder = (orderId: string) => {
    deleteOrder(orderId, logAction, user);
    toast({
      title: 'Pedido Movido para Lixeira!',
      description: 'O pedido foi movido para a lixeira e pode ser restaurado.',
    });
  };

  const handlePermanentlyDeleteOrder = (orderId: string) => {
    permanentlyDeleteOrder(orderId, logAction, user);
    toast({
      title: 'Pedido Excluído!',
      description: 'O pedido foi removido permanentemente.',
      variant: 'destructive',
    });
  };

  const handleRestoreOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, 'Processando', logAction, user);
  };

  const handleAssignSeller = (order: Order, seller: User) => {
    if (!seller) return;
    const detailsToUpdate: Partial<Order> = {
        sellerId: seller.id,
        sellerName: seller.name,
    };
    updateOrderDetails(order.id, detailsToUpdate, logAction, user);
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
    updateOrderDetails(selectedOrder.id, { commission: value, isCommissionManual: true }, logAction, user);
  }
  
  const handleUpdateObservations = () => {
    if (!selectedOrder) return;
    updateOrderDetails(selectedOrder.id, { observations: observationsInput }, logAction, user);
  };

  const handleEmptyTrash = () => {
    emptyTrash(logAction, user);
  }
  
  const handleSendWhatsAppReminder = (order: Order, installment: Installment) => {
    const customerName = order.customer.name.split(' ')[0];
    const customerPhone = order.customer.phone.replace(/\D/g, '');
    const dueDate = format(parseISO(installment.dueDate), 'dd/MM/yyyy', { locale: ptBR });
    const amount = formatCurrency(installment.amount - (installment.paidAmount || 0));
    
    const message = `Olá, ${customerName}! Passando para lembrar sobre o vencimento da sua parcela nº ${installment.installmentNumber} do seu carnê (pedido ${order.id}).\n\n🗓️ Vencimento: *${dueDate}*\n💰 Valor: *${amount}*\n\nChave PIX: *${settings.pixKey}*\nAdriano Cavalcante de Oliveira\n🏦 Nubank\n\nNão esqueça de enviar o comprovante! 😉🤝`;
    
    const whatsappUrl = `https://wa.me/55${customerPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePrintOverdueReport = () => {
    document.body.classList.add('print-overdue-report');
    window.print();
    document.body.classList.remove('print-overdue-report');
  };

  const overdueOrdersForReport = useMemo(() => {
    return activeOrders.map(order => {
        const overdueInstallment = (order.installmentDetails || []).find(inst => inst.status === 'Pendente' && new Date(inst.dueDate) < new Date());
        return overdueInstallment ? { order, overdueInstallment } : null;
    }).filter(item => item !== null) as { order: Order; overdueInstallment: Installment }[];
  }, [activeOrders]);

  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'gerente';
  const isAdmin = user?.role === 'admin';


  if (!isClient) {
    return (
        <div className="flex justify-center items-center py-24">
            <p>Carregando painel...</p>
        </div>
    );
  }

  return (
    <>
      <div className="print-hidden">
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
                                  placeholder="Buscar por ID ou cliente..."
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
                           <div className="flex-grow min-w-[150px]">
                              <Select value={filters.dueDateRange} onValueChange={(value) => handleFilterChange('dueDateRange', value)}>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Vencimento no Mês" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {dueDateRanges.map(range => (
                                          <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                          </div>
                          <Button 
                              variant={filters.showOverdue ? 'destructive' : 'outline'} 
                              onClick={() => handleFilterChange('showOverdue', !filters.showOverdue)}
                          >
                              <Clock className="mr-2 h-4 w-4"/>
                              Atrasados
                          </Button>
                          <Button variant="outline" onClick={handlePrintOverdueReport}>
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimir Relatório
                          </Button>
                          <Button variant="ghost" onClick={clearFilters}>
                              <X className="mr-2 h-4 w-4"/>
                              Limpar
                          </Button>
                      </div>

                      {paginatedActiveOrders.length > 0 ? (
                          <>
                          <div className="rounded-md border overflow-x-auto">
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                          <TableHead className="w-[150px]">Pedido ID</TableHead>
                                          <TableHead>Data</TableHead>
                                          <TableHead>Cliente</TableHead>
                                          <TableHead>Produtos</TableHead>
                                          <TableHead>Vendedor</TableHead>
                                          <TableHead>Próx. Venc.</TableHead>
                                          <TableHead className="text-right">Total</TableHead>
                                          <TableHead className="text-right">Comissão</TableHead>
                                          <TableHead className="text-center">Status</TableHead>
                                          <TableHead className="text-right">Ações</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {paginatedActiveOrders.map((order) => {
                                          const nextPendingInstallment = order.installmentDetails
                                                ?.filter(inst => inst.status === 'Pendente')
                                                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
                                          const isOverdue = !!nextPendingInstallment && new Date(nextPendingInstallment.dueDate) < new Date();
                                          return (
                                              <TableRow key={order.id}>
                                                  <TableCell className="font-medium">{order.id}</TableCell>
                                                  <TableCell className="whitespace-nowrap">{format(new Date(order.date), "dd/MM/yy HH:mm")}</TableCell>
                                                  <TableCell>
                                                    <div className="flex items-center gap-2">
                                                      <Link href={`/admin/clientes?cpf=${order.customer.cpf}`} passHref>
                                                          <Button variant="ghost" size="icon" className="h-8 w-8">
                                                              <UserIcon className="h-4 w-4" />
                                                              <span className="sr-only">Ver Cliente</span>
                                                          </Button>
                                                      </Link>
                                                      <span>{order.customer.name}</span>
                                                    </div>
                                                  </TableCell>
                                                  <TableCell className="text-xs max-w-[200px] truncate">{order.items.map(item => item.name).join(', ')}</TableCell>
                                                  <TableCell>{order.sellerName}</TableCell>
                                                  <TableCell className={cn("whitespace-nowrap", isOverdue && "text-destructive font-semibold")}>
                                                      {nextPendingInstallment ? format(new Date(nextPendingInstallment.dueDate), 'dd/MM/yy') : '-'}
                                                  </TableCell>
                                                  <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                                                  <TableCell className="text-right font-semibold text-green-600">{formatCurrency(order.commission || 0)}</TableCell>
                                                  <TableCell className="text-center">
                                                      <div className="flex flex-col items-center justify-center gap-1">
                                                          <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                                                          {isOverdue && (
                                                              <Badge variant="destructive" className="flex items-center gap-1">
                                                                  <Clock className="h-3 w-3" /> Atrasado
                                                              </Badge>
                                                          )}
                                                      </div>
                                                  </TableCell>
                                                  <TableCell className="text-right">
                                                      <div className="flex items-center justify-end gap-2">
                                                          {isOverdue && nextPendingInstallment && (
                                                              <Button variant="ghost" size="icon" className="h-8 w-8 bg-green-500/10 text-green-700 hover:bg-green-500/20 hover:text-green-800" onClick={() => handleSendWhatsAppReminder(order, nextPendingInstallment)}>
                                                                  <WhatsAppIcon />
                                                              </Button>
                                                          )}
                                                          <Button variant="outline" size="sm" onClick={() => handleOpenDetails(order)}>
                                                              <Eye className="mr-2 h-4 w-4" />
                                                              Ver Pedido
                                                          </Button>
                                                          <DropdownMenu>
                                                              <DropdownMenuTrigger asChild>
                                                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                      <Users className="h-4 w-4" />
                                                                      <span className="sr-only">Atribuir Vendedor</span>
                                                                  </Button>
                                                              </DropdownMenuTrigger>
                                                              <DropdownMenuContent align="end">
                                                                  <DropdownMenuItem onClick={() => handleAssignToMe(order)}>
                                                                    <UserPlus className="mr-2 h-4 w-4" />
                                                                    Atribuir a mim
                                                                  </DropdownMenuItem>
                                                                  <Separator />
                                                                  {sellers.map(s => (
                                                                      <DropdownMenuItem key={s.id} onClick={() => handleAssignSeller(order, s)}>
                                                                          {s.name}
                                                                      </DropdownMenuItem>
                                                                  ))}
                                                              </DropdownMenuContent>
                                                          </DropdownMenu>
                                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteOrder(order.id)}>
                                                              <Trash className="h-4 w-4" />
                                                              <span className="sr-only">Excluir Pedido</span>
                                                          </Button>
                                                      </div>
                                                  </TableCell>
                                              </TableRow>
                                          )
                                      })}
                                  </TableBody>
                              </Table>
                          </div>
                          {totalActivePages > 1 && (
                              <div className="flex justify-end items-center gap-2 mt-4">
                                  <Button variant="outline" size="sm" onClick={() => setActivePage(p => Math.max(1, p - 1))} disabled={activePage === 1}>
                                      Anterior
                                  </Button>
                                  <span className="text-sm">
                                      Página {activePage} de {totalActivePages}
                                  </span>
                                  <Button variant="outline" size="sm" onClick={() => setActivePage(p => Math.min(totalActivePages, p + 1))} disabled={activePage === totalActivePages}>
                                      Próxima
                                  </Button>
                              </div>
                          )}
                          </>
                      ) : (
                          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                              <PackageSearch className="mx-auto h-12 w-12" />
                              <h3 className="mt-4 text-lg font-semibold">Nenhum pedido encontrado</h3>
                              <p className="mt-1 text-sm">Ajuste os filtros ou crie um novo pedido.</p>
                          </div>
                      )}
                  </TabsContent>
                  <TabsContent value="deleted">
                      <div className="mb-4">
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button variant="destructive" disabled={deletedOrders.length === 0}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Esvaziar Lixeira ({deletedOrders.length})
                                  </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>Esvaziar a lixeira?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          Esta ação não pode ser desfeita. Isso irá apagar permanentemente todos os {deletedOrders.length} pedidos na lixeira.
                                      </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={handleEmptyTrash}>
                                          Sim, Esvaziar Lixeira
                                      </AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                      </div>
                      {paginatedDeletedOrders.length > 0 ? (
                          <>
                          <div className="rounded-md border overflow-x-auto">
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
                                      {paginatedDeletedOrders.map(order => (
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
                                      ))}
                                  </TableBody>
                              </Table>
                          </div>
                          {totalDeletedPages > 1 && (
                              <div className="flex justify-end items-center gap-2 mt-4">
                                  <Button variant="outline" size="sm" onClick={() => setDeletedPage(p => Math.max(1, p - 1))} disabled={deletedPage === 1}>
                                      Anterior
                                  </Button>
                                  <span className="text-sm">
                                      Página {deletedPage} de {totalDeletedPages}
                                  </span>
                                  <Button variant="outline" size="sm" onClick={() => setDeletedPage(p => Math.min(totalDeletedPages, p + 1))} disabled={deletedPage === totalDeletedPages}>
                                      Próxima
                                  </Button>
                              </div>
                          )}
                          </>
                      ) : (
                          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                              <Trash2 className="mx-auto h-12 w-12" />
                              <h3 className="mt-4 text-lg font-semibold">A lixeira está vazia</h3>
                              <p className="mt-1 text-sm">Os pedidos excluídos aparecerão aqui.</p>
                          </div>
                      )}
                  </TabsContent>
              </Tabs>
            </CardContent>
        </Card>
      </div>

      <div className="print-only">
         <div className="mb-8">
            <div className="flex justify-between items-start pb-4 border-b">
                <div style={{ display: 'table' }}>
                    <div style={{ display: 'table-row' }}>
                        <div style={{ display: 'table-cell', verticalAlign: 'middle', paddingRight: '1rem' }}>
                            <Logo />
                        </div>
                        <div style={{ display: 'table-cell', verticalAlign: 'middle' }}>
                            <div className="text-xs">
                                <p className="font-bold">{settings.storeName}</p>
                                <p className="whitespace-pre-line">{settings.storeAddress}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold">Relatório de Pedidos em Atraso</p>
                    <p className="text-sm text-gray-500">Gerado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
                </div>
            </div>
        </div>
        <table className="w-full text-sm border-collapse">
            <thead>
                <tr className="border-b-2">
                    <th className="text-left p-2 font-bold">Cliente</th>
                    <th className="text-left p-2 font-bold">Telefone</th>
                    <th className="text-left p-2 font-bold">Pedido</th>
                    <th className="text-left p-2 font-bold">Parcela</th>
                    <th className="text-right p-2 font-bold">Valor</th>
                </tr>
            </thead>
            <tbody>
                {overdueOrdersForReport.length > 0 ? (
                    overdueOrdersForReport.map(({ order, overdueInstallment }) => (
                        <tr key={order.id} className="border-b last:border-none">
                            <td className="p-2">{order.customer.name}</td>
                            <td className="p-2">{order.customer.phone}</td>
                            <td className="p-2 font-mono">{order.id}</td>
                            <td className="p-2">
                                {overdueInstallment.installmentNumber} (Venc. {format(parseISO(overdueInstallment.dueDate), 'dd/MM/yy')})
                            </td>
                            <td className="text-right p-2 font-semibold">
                                {formatCurrency(overdueInstallment.amount - (overdueInstallment.paidAmount || 0))}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={5} className="text-center p-8">Nenhum pedido em atraso encontrado.</td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
              {selectedOrder && (
                  <>
                  <DialogHeader>
                      <DialogTitle>Pedido: {selectedOrder.id}</DialogTitle>
                      <DialogDescription>
                          Gerencie o status, faturamento e detalhes do pedido.
                      </DialogDescription>
                  </DialogHeader>
                  <div className="flex-grow overflow-y-auto p-1 pr-4 -mr-4 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card>
                            <CardHeader className="flex-row items-center gap-4 space-y-0 pb-4">
                                <UserIcon className="w-8 h-8 text-primary" />
                                <CardTitle className="text-lg">Cliente</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-1">
                                <p><strong>Nome:</strong> {selectedOrder.customer.name}</p>
                                <p><strong>CPF:</strong> {selectedOrder.customer.cpf}</p>
                                <p><strong>Telefone:</strong> {selectedOrder.customer.phone}</p>
                                <p><strong>Endereço:</strong> {`${selectedOrder.customer.address}, ${selectedOrder.customer.city}`}</p>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="flex-row items-center gap-4 space-y-0 pb-4">
                                <ShoppingBag className="w-8 h-8 text-primary" />
                                <CardTitle className="text-lg">Resumo</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    {selectedOrder.items.map(item => (
                                        <div key={item.id} className="flex justify-between items-center">
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
                                    {isAdmin ? (
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

                      {selectedOrder.observations && (
                        <Card>
                            <CardHeader className="flex-row items-center gap-4 space-y-0 pb-4">
                                <MessageSquare className="w-8 h-8 text-primary" />
                                <CardTitle className="text-lg">Observações do Pedido</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedOrder.observations}</p>
                            </CardContent>
                        </Card>
                      )}
                      
                      <Card>
                        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 pb-4">
                            <div className="flex items-center gap-4">
                                <MessageSquare className="w-8 h-8 text-primary" />
                                <CardTitle className="text-lg">Observações do Pedido</CardTitle>
                            </div>
                            <Button size="sm" variant="outline" onClick={handleUpdateObservations}>
                                <Save className="mr-2 h-4 w-4" /> Salvar
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                placeholder="Nenhuma observação registrada. Adicione uma aqui..."
                                value={observationsInput}
                                onChange={(e) => setObservationsInput(e.target.value)}
                                rows={3}
                            />
                        </CardContent>
                      </Card>

                      <Card>
                          <CardHeader className="flex-row items-center gap-4 space-y-0 pb-4">
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
                                      <Select value={selectedOrder.status} onValueChange={(status) => handleUpdateOrderStatus(status as Order['status'])}>
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
                            <CardHeader className="flex-row items-center gap-4 space-y-0 pb-4">
                                <FileText className="w-8 h-8 text-primary" />
                                <CardTitle className="text-lg">Carnê de Pagamento</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <Table>
                                    <TableBody>
                                        {(selectedOrder.installmentDetails || []).map((inst) => {
                                            const uniqueKey = `${selectedOrder.id}-${inst.installmentNumber}`;
                                            const isExpanded = expandedHistory === uniqueKey;
                                            const remainingAmount = inst.amount - (inst.paidAmount || 0);
                                            const isOverdue = inst.status === 'Pendente' && new Date(inst.dueDate) < new Date();
                                            
                                            let statusText: string = inst.status;
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
                                                                    <Button variant={"outline"} className="w-[150px] justify-start text-left font-normal text-xs" disabled={inst.status === 'Pago'}>
                                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                                        Venc: {format(new Date(inst.dueDate), 'dd/MM/yyyy')}
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0">
                                                                    <Calendar locale={ptBR} mode="single" selected={new Date(inst.dueDate)} onSelect={(date) => handleDueDateChange(selectedOrder.id, inst.installmentNumber, date)} initialFocus/>
                                                                </PopoverContent>
                                                            </Popover>
                                                        </TableCell>
                                                        <TableCell>{formatCurrency(inst.amount)}</TableCell>
                                                        <TableCell><Badge variant={statusVariant}>{statusText}</Badge></TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {user && (
                                                                    <>
                                                                        {(inst.payments && inst.payments.length > 0) && (
                                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedHistory(isExpanded ? null : uniqueKey)}>
                                                                                <History className="h-4 w-4" />
                                                                            </Button>
                                                                        )}
                                                                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenPaymentDialog(inst)} disabled={inst.status === 'Pago'}>
                                                                            <CheckCircle className="h-4 w-4 text-green-600"/>
                                                                        </Button>
                                                                    </>
                                                                )}
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
                                                            <TableCell colSpan={5} className="p-0 border-none">
                                                                <div className="p-3 bg-muted/30 border-t">
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
                                                                                                        <AlertDialogAction onClick={() => reversePayment(selectedOrder.id, inst.installmentNumber, p.id, logAction, user)}>Sim, Estornar</AlertDialogAction>
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
