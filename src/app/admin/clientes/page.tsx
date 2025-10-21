
'use client';

import { useState, useMemo, useEffect, useCallback, ChangeEvent, DragEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAdmin } from '@/context/AdminContext';
import type { Order, CustomerInfo, Installment, Attachment, Payment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, MapPin, Users, CreditCard, Printer, Upload, FileText, X, Pencil, CheckCircle, Undo2, CalendarIcon, ClipboardPaste, KeyRound, Search, MessageSquarePlus, ClockIcon, UserSquare, History } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import PaymentDialog from '@/components/PaymentDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const resizeImage = (file: File, MAX_WIDTH = 1920, MAX_HEIGHT = 1080): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (typeof event.target?.result !== 'string') {
                return reject(new Error('Falha ao ler o arquivo.'));
            }
            const img = document.createElement('img');
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Não foi possível obter o contexto do canvas.'));
                }
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL(file.type, 0.9);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
            img.src = event.target.result as string;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
};

export default function CustomersAdminPage() {
  const { orders, updateCustomer, recordInstallmentPayment, updateInstallmentDueDate, updateOrderDetails, reversePayment } = useAdmin();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerInfo | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [imageToView, setImageToView] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedInfo, setEditedInfo] = useState<Partial<CustomerInfo>>({});
  const [openDueDatePopover, setOpenDueDatePopover] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [installmentToPay, setInstallmentToPay] = useState<Installment | null>(null);
  const [orderForPayment, setOrderForPayment] = useState<Order | null>(null);

  const [commentDialog, setCommentDialog] = useState<{
    open: boolean;
    orderId?: string;
    attachmentIndex?: number;
    currentComment?: string;
    onSave?: (comment: string) => Promise<void>;
  }>({ open: false });

  useEffect(() => {
    setIsClient(true);
  }, []);
  
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

  const customers = useMemo(() => {
    if (!isClient || !orders) return [];
    const customerMap = new Map<string, CustomerInfo>();
    orders.forEach(order => {
      if (!customerMap.has(order.customer.cpf)) {
        customerMap.set(order.customer.cpf, order.customer);
      } else {
        // Garante que estamos pegando a info mais recente (com senha, se houver)
        const existing = customerMap.get(order.customer.cpf)!;
        if (!existing.password && order.customer.password) {
             customerMap.set(order.customer.cpf, order.customer);
        }
      }
    });

    const allCustomers = Array.from(customerMap.values());
    if (!searchQuery) {
        return allCustomers;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return allCustomers.filter(customer => 
        customer.name.toLowerCase().includes(lowercasedQuery) || 
        customer.cpf.replace(/\D/g, '').includes(lowercasedQuery)
    );
  }, [orders, isClient, searchQuery]);
  
  const customerOrders = useMemo(() => {
      if (!selectedCustomer) return [];
      return orders
        .filter(o => o.customer.cpf === selectedCustomer.cpf && o.status !== 'Cancelado' && o.status !== 'Excluído')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCustomer, orders]);

  const customerFinancials = useMemo(() => {
      if (!selectedCustomer) {
          return { totalComprado: 0, totalPago: 0, saldoDevedor: 0 };
      }
      
      const allInstallments = customerOrders.flatMap(order => 
        (order.installmentDetails || [])
      );
      
      const totalComprado = customerOrders.reduce((acc, order) => acc + order.total, 0);
      const totalPago = allInstallments.reduce((sum, inst) => sum + (inst.paidAmount || 0), 0);
      const saldoDevedor = totalComprado - totalPago;

      return { totalComprado, totalPago, saldoDevedor };

  }, [selectedCustomer, customerOrders]);
  
  const handleOpenPaymentDialog = (order: Order, installment: Installment) => {
    setOrderForPayment(order);
    setInstallmentToPay(installment);
    setPaymentDialogOpen(true);
  };
  
  const handlePaymentSubmit = (payment: Payment, isFullPayment: boolean) => {
    if (orderForPayment && installmentToPay) {
      recordInstallmentPayment(orderForPayment.id, installmentToPay.installmentNumber, payment);
      if (isFullPayment) {
        window.open(`/carnet/${orderForPayment.id}/${installmentToPay.installmentNumber}`, '_blank');
      }
    }
    setPaymentDialogOpen(false);
    setInstallmentToPay(null);
    setOrderForPayment(null);
  };

  const handleDueDateChange = (orderId: string, installmentNumber: number, date: Date | undefined) => {
    if (date) {
        updateInstallmentDueDate(orderId, installmentNumber, date);
    }
    setOpenDueDatePopover(null);
  };
    
  const addAttachments = useCallback(async (order: Order, newAttachments: Omit<Attachment, 'addedAt' | 'addedBy'>[]) => {
    const currentAttachments = order.attachments || [];
    
    const processedAttachments: Attachment[] = newAttachments.map(att => ({
        ...att,
        addedAt: new Date().toISOString(),
        addedBy: user?.name || 'Desconhecido'
    }));

    await updateOrderDetails(order.id, { attachments: [...currentAttachments, ...processedAttachments] });
    toast({ title: 'Anexos Adicionados!', description: 'Os novos documentos foram salvos com sucesso.' });
  }, [updateOrderDetails, toast, user]);

  const handleFileProcessing = useCallback(async (order: Order, files: File[]) => {
    const filesToProcess = Array.from(files);
    if (filesToProcess.length === 0) return;

    const attachmentsToAdd: Omit<Attachment, 'addedAt' | 'addedBy'>[] = [];

    for (const file of filesToProcess) {
        try {
            const isImage = file.type.startsWith('image/');
            const fileUrl = isImage ? await resizeImage(file) : await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => e.target?.result ? resolve(e.target.result as string) : reject(new Error('Falha ao ler o arquivo.'));
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            attachmentsToAdd.push({
                name: file.name,
                type: isImage ? 'image' : 'pdf',
                url: fileUrl,
            });
        } catch (error) {
            console.error("Error processing file:", error);
            toast({ title: 'Erro ao Processar Arquivo', description: `Não foi possível processar o arquivo ${file.name}.`, variant: 'destructive' });
        }
    }
    
    if (attachmentsToAdd.length === 0) return;
    
    if (attachmentsToAdd.length > 1) {
        // For multiple files, add them without individual comments for now
        await addAttachments(order, attachmentsToAdd);
    } else {
        // For a single file, open comment dialog
        setCommentDialog({
            open: true,
            onSave: async (comment) => {
                const finalAttachment = { ...attachmentsToAdd[0], comment: comment || undefined };
                await addAttachments(order, [finalAttachment]);
            }
        });
    }
  }, [addAttachments, toast]);
  
  
  const handleFileChange = async (order: Order, event: ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files) return;
      await handleFileProcessing(order, Array.from(event.target.files));
      event.target.value = ''; // Clear the input
  };

    const handleDrag = (e: DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: DragEvent<HTMLElement>, order: Order) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await handleFileProcessing(order, Array.from(e.dataTransfer.files));
        }
    };
  
  const handlePaste = async (order: Order) => {
    if (!navigator.clipboard?.read) {
        toast({ title: "Navegador não suporta esta ação", description: "Seu navegador não permite colar imagens dessa forma.", variant: "destructive" });
        return;
    }
    try {
        const clipboardItems = await navigator.clipboard.read();
        const imageFiles: File[] = [];

        for (const item of clipboardItems) {
            const imageType = item.types.find(type => type.startsWith('image/'));
            if (imageType) {
                const blob = await item.getType(imageType);
                const fileName = `colado-${new Date().toISOString()}.png`;
                const file = new File([blob], fileName, { type: imageType });
                imageFiles.push(file);
            }
        }

        if (imageFiles.length > 0) {
            await handleFileProcessing(order, imageFiles);
        } else {
            toast({ title: "Nenhuma imagem encontrada", description: "Não há imagens na sua área de transferência para colar." });
        }
    } catch (err) {
        console.error('Falha ao colar:', err);
        toast({ title: "Falha ao colar", description: "Verifique as permissões do seu navegador para acessar a área de transferência.", variant: "destructive" });
    }
  };

  const handleDeleteAttachment = (order: Order, indexToDelete: number) => {
    const newAttachments = (order.attachments || []).filter((_, index) => index !== indexToDelete);
    updateOrderDetails(order.id, { attachments: newAttachments });
  };
  
  const handleEditComment = (order: Order, attachmentIndex: number) => {
    const attachment = order.attachments?.[attachmentIndex];
    if (!attachment) return;

    setCommentDialog({
      open: true,
      currentComment: attachment.comment,
      onSave: async (comment) => {
        const newAttachments = [...(order.attachments || [])];
        newAttachments[attachmentIndex] = {
          ...newAttachments[attachmentIndex],
          comment: comment || undefined,
          addedAt: new Date().toISOString(),
          addedBy: user?.name || 'Desconhecido',
        };
        await updateOrderDetails(order.id, { attachments: newAttachments });
        toast({ title: 'Comentário salvo!' });
      }
    });
  };

  const handleOpenEditDialog = () => {
    if (selectedCustomer) {
      setEditedInfo(selectedCustomer);
      setIsEditDialogOpen(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = () => {
    if (selectedCustomer && editedInfo) {
      const updatedCustomerData = { ...selectedCustomer, ...editedInfo };
      // Se a senha estiver vazia, não a envie na atualização, mantendo a antiga
      if (editedInfo.password === '') {
          delete updatedCustomerData.password;
      }

      updateCustomer(updatedCustomerData as CustomerInfo);
      setSelectedCustomer(updatedCustomerData as CustomerInfo);
      setIsEditDialogOpen(false);
    }
  };

  const handleCommentDialogSubmit = () => {
    const { onSave, currentComment } = commentDialog;
    
    // Optimistically close dialog
    setCommentDialog({ open: false });

    // Perform save operation
    onSave?.(currentComment || '');
  };


  if (!isClient) {
    return (
        <div className="flex justify-center items-center py-24">
            <p>Carregando painel de clientes...</p>
        </div>
    );
  }

  return (
    <>
        <div className="grid lg:grid-cols-3 gap-8 items-start">
        <Card className="lg:col-span-1">
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Clientes Cadastrados
            </CardTitle>
            <CardDescription>Selecione um cliente para ver os detalhes.</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar por nome ou CPF..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
            {customers.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-2">
                {customers.map((customer) => (
                    <Button
                    key={customer.cpf}
                    variant={selectedCustomer?.cpf === customer.cpf ? 'secondary' : 'ghost'}
                    className="justify-start w-full text-left h-auto py-2"
                    onClick={() => setSelectedCustomer(customer)}
                    >
                    <div className="flex items-center gap-3">
                        <div className="bg-muted rounded-full p-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-semibold">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">{customer.cpf}</p>
                        </div>
                    </div>
                    </Button>
                ))}
                </div>
            ) : (
                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Users className="mx-auto h-10 w-10" />
                    <h3 className="mt-4 text-md font-semibold">Nenhum cliente encontrado</h3>
                    <p className="mt-1 text-xs">{searchQuery ? 'Tente uma busca diferente.' : 'Os clientes aparecerão aqui após a primeira compra.'}</p>
                </div>
            )}
            </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
            <CardTitle>Detalhes do Cliente</CardTitle>
            <CardDescription>Informações cadastrais, situação do crediário e pedidos.</CardDescription>
            </CardHeader>
            <CardContent>
            {selectedCustomer ? (
                <div className="space-y-8">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Informações Pessoais
                        </h3>
                        <Button variant="outline" size="sm" onClick={handleOpenEditDialog}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedCustomer.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedCustomer.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedCustomer.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <strong className="text-muted-foreground font-mono text-xs">CPF</strong>
                            <span>{selectedCustomer.cpf}</span>
                        </div>
                        <div className="flex items-start col-span-full gap-2 mt-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div>
                                <p>{`${selectedCustomer.address}, ${selectedCustomer.number}${selectedCustomer.complement ? ` - ${selectedCustomer.complement}` : ''}`}</p>
                                <p className="text-muted-foreground">{`${selectedCustomer.neighborhood}, ${selectedCustomer.city}/${selectedCustomer.state} - CEP: ${selectedCustomer.zip}`}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Situação do Crediário
                    </h3>
                    <div className="grid gap-4 md:grid-cols-3 mb-6">
                        <Card className="bg-muted/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Comprado</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xl font-bold">{formatCurrency(customerFinancials.totalComprado)}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-green-500/10 border-green-500/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xl font-bold text-green-600">{formatCurrency(customerFinancials.totalPago)}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-amber-500/10 border-amber-500/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Saldo Devedor</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xl font-bold text-amber-600">{formatCurrency(customerFinancials.saldoDevedor)}</p>
                            </CardContent>
                        </Card>
                    </div>
                    {customerOrders.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full space-y-2">
                        {customerOrders.map((order) => {
                            const isCrediario = !order.paymentMethod || order.paymentMethod === 'Crediário';
                            const allInstallmentsPaid = isCrediario &&
                                order.installmentDetails &&
                                order.installmentDetails.length > 0 &&
                                order.installmentDetails.every(inst => inst.status === 'Pago');
                            
                            const isPaidOff = allInstallmentsPaid || (order.paymentMethod && ['Pix', 'Dinheiro'].includes(order.paymentMethod));

                            return (
                                <AccordionItem value={order.id} key={order.id} className="border-b-0 rounded-lg border bg-background">
                                    <AccordionTrigger className="p-4 hover:no-underline rounded-t-lg data-[state=open]:bg-muted/50 data-[state=open]:rounded-b-none">
                                        <div className="flex justify-between items-center w-full">
                                            <div className="text-left">
                                                <p className="font-bold">Pedido: <span className="font-mono">{order.id}</span></p>
                                                <p className="text-sm text-muted-foreground">{format(new Date(order.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">{formatCurrency(order.total)}</p>
                                                {isPaidOff ? (
                                                    <Badge className="bg-green-600 hover:bg-green-700 text-primary-foreground">Quitado</Badge>
                                                ) : (
                                                    <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="p-4 pt-0 space-y-6">
                                            {(order.installmentDetails && order.installmentDetails.length > 0) ? (
                                                <Accordion type="multiple" className="w-full space-y-2">
                                                    {(order.installmentDetails || []).map((inst) => {
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
                                                            <AccordionItem value={inst.id} key={inst.id} className="border rounded-md">
                                                                <div className='flex items-center justify-between p-3'>
                                                                    <div className='grid grid-cols-4 gap-4 text-sm items-center flex-grow'>
                                                                        <div><span className="font-medium">Parcela:</span> {inst.installmentNumber}/{order.installments}</div>
                                                                        <div>
                                                                            <Popover open={openDueDatePopover === `${order.id}-${inst.installmentNumber}`} onOpenChange={(isOpen) => setOpenDueDatePopover(isOpen ? `${order.id}-${inst.installmentNumber}` : null)}>
                                                                                <PopoverTrigger asChild>
                                                                                    <Button variant={"outline"} className="w-[150px] justify-start text-left font-normal text-xs" disabled={inst.status === 'Pago'}>
                                                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                                                        Venc: {format(new Date(inst.dueDate), 'dd/MM/yyyy')}
                                                                                    </Button>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent className="w-auto p-0">
                                                                                    <Calendar mode="single" selected={new Date(inst.dueDate)} onSelect={(date) => handleDueDateChange(order.id, inst.installmentNumber, date)} initialFocus/>
                                                                                </PopoverContent>
                                                                            </Popover>
                                                                        </div>
                                                                        <div><span className="font-medium">Valor:</span> {formatCurrency(inst.amount)}</div>
                                                                        <div><Badge variant={statusVariant}>{statusText}</Badge></div>
                                                                    </div>
                                                                    <div className="flex gap-2 justify-end ml-4">
                                                                        {(inst.payments && inst.payments.length > 0) && (
                                                                            <AccordionTrigger asChild>
                                                                                <Button variant="ghost" size="sm"><History className="mr-2 h-4 w-4"/> Histórico</Button>
                                                                            </AccordionTrigger>
                                                                        )}
                                                                        <Button variant="outline" size="sm" onClick={() => handleOpenPaymentDialog(order, inst)} disabled={inst.status === 'Pago'}>
                                                                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                                                            Pagar
                                                                        </Button>
                                                                        <Button variant="outline" size="sm" asChild>
                                                                            <Link href={`/carnet/${order.id}/${inst.installmentNumber}`} target="_blank" rel="noopener noreferrer">
                                                                                <Printer className="mr-2 h-4 w-4" />
                                                                                Ver
                                                                            </Link>
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                                <AccordionContent>
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
                                                                                    {inst.payments.map(p => (
                                                                                        <TableRow key={p.id}>
                                                                                            <TableCell>{format(parseISO(p.date), "dd/MM/yyyy 'às' HH:mm")}</TableCell>
                                                                                            <TableCell>{p.method}</TableCell>
                                                                                            <TableCell>{formatCurrency(p.amount)}</TableCell>
                                                                                            <TableCell className="text-right">
                                                                                                <AlertDialog>
                                                                                                    <AlertDialogTrigger asChild>
                                                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                                                                                            <Undo2 className="h-4 w-4" />
                                                                                                        </Button>
                                                                                                    </AlertDialogTrigger>
                                                                                                    <AlertDialogContent>
                                                                                                        <AlertDialogHeader>
                                                                                                            <AlertDialogTitle>Confirmar Estorno?</AlertDialogTitle>
                                                                                                            <AlertDialogDescription>
                                                                                                                Esta ação irá reverter o pagamento de {formatCurrency(p.amount)} feito em {format(parseISO(p.date), 'dd/MM/yy')}. Isso não pode ser desfeito.
                                                                                                            </AlertDialogDescription>
                                                                                                        </AlertDialogHeader>
                                                                                                        <AlertDialogFooter>
                                                                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                                                            <AlertDialogAction onClick={() => reversePayment(order.id, inst.installmentNumber, p.id)}>
                                                                                                                Sim, Estornar
                                                                                                            </AlertDialogAction>
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
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        );
                                                    })}
                                                </Accordion>
                                            ) : (
                                                <p className="text-muted-foreground text-sm text-center py-4">Este pedido foi pago por {order.paymentMethod} e não possui parcelas.</p>
                                            )}
                                             {order.paymentMethod === 'Crediário' && (
                                                <div className="text-right mt-3">
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={`/carnet/${order.id}`} target="_blank" rel="noopener noreferrer">
                                                            <FileText className="mr-2 h-4 w-4" />
                                                            Ver Carnê Completo do Pedido
                                                        </Link>
                                                    </Button>
                                                </div>
                                             )}
                                                
                                            <div className="space-y-4 pt-4 border-t">
                                                <h4 className="font-semibold flex items-center gap-2 text-sm">
                                                    <Upload className="h-4 w-4 text-primary" />
                                                    Documentos e Anexos do Pedido
                                                </h4>
                                                <div className="grid gap-4">
                                                    <label 
                                                        htmlFor={`file-upload-${order.id}`}
                                                        className={cn(
                                                            "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                                                            dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/30"
                                                        )}
                                                        onDragEnter={handleDrag}
                                                        onDragLeave={handleDrag}
                                                        onDragOver={handleDrag}
                                                        onDrop={(e) => handleDrop(e, order)}
                                                    >
                                                        <div className="text-center space-y-2 pointer-events-none">
                                                          <p className="text-sm text-muted-foreground">Arraste arquivos ou clique para adicionar</p>
                                                            <Button variant="outline" size="sm" type="button">
                                                                <Upload className="mr-2 h-4 w-4" />
                                                                Selecionar
                                                            </Button>
                                                        </div>
                                                        <Input id={`file-upload-${order.id}`} type="file" className="sr-only" multiple accept="image/*,application/pdf" onChange={(e) => handleFileChange(order, e)} />
                                                    </label>
                                                     <Button variant="outline" size="sm" onClick={() => handlePaste(order)} className="w-fit self-center">
                                                        <ClipboardPaste className="mr-2 h-4 w-4" />
                                                        Colar da área de transferência
                                                    </Button>
                                                    {(order.attachments && order.attachments.length > 0) ? (
                                                        <div className="space-y-2">
                                                            {order.attachments.map((file, index) => (
                                                                <div key={index} className="flex items-start justify-between p-2 rounded-md border bg-muted/50">
                                                                    <div className="flex-grow overflow-hidden">
                                                                        {file.type === 'image' ? (
                                                                            <button onClick={() => setImageToView(file.url)} className="flex items-start gap-3 group text-left w-full">
                                                                                <Image src={file.url} alt={file.name} width={40} height={40} className="h-10 w-10 rounded-md object-cover flex-shrink-0" />
                                                                                 <div className="flex-grow">
                                                                                    <span className="text-sm font-medium group-hover:underline break-words" title={file.name}>
                                                                                        {file.name}
                                                                                    </span>
                                                                                    {file.comment && <p className="text-xs text-muted-foreground mt-1 italic">"{file.comment}"</p>}
                                                                                     {file.addedAt && (
                                                                                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                                            <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3" />{format(parseISO(file.addedAt), 'dd/MM/yy HH:mm')}</span>
                                                                                            <span className="flex items-center gap-1"><UserSquare className="h-3 w-3" />{file.addedBy}</span>
                                                                                        </div>
                                                                                     )}
                                                                                 </div>
                                                                            </button>
                                                                        ) : (
                                                                            <a href={file.url} download={file.name} className="flex items-start gap-3 group w-full">
                                                                                <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                                                                                <div className="flex-grow">
                                                                                    <span className="text-sm font-medium group-hover:underline break-words" title={file.name}>
                                                                                        {file.name}
                                                                                    </span>
                                                                                    {file.comment && <p className="text-xs text-muted-foreground mt-1 italic">"{file.comment}"</p>}
                                                                                    {file.addedAt && (
                                                                                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                                            <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3" />{format(parseISO(file.addedAt), 'dd/MM/yy HH:mm')}</span>
                                                                                            <span className="flex items-center gap-1"><UserSquare className="h-3 w-3" />{file.addedBy}</span>
                                                                                        </div>
                                                                                     )}
                                                                                </div>
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-shrink-0 flex items-center">
                                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditComment(order, index)}>
                                                                            <MessageSquarePlus className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteAttachment(order, index)}>
                                                                            <X className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-center text-sm text-muted-foreground">Nenhum documento anexado a este pedido.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                    ) : (
                    <p className="text-muted-foreground text-sm text-center py-8">Nenhum pedido encontrado para este cliente.</p>
                    )}
                </div>
                </div>
            ) : (
                <div className="text-center py-24 text-muted-foreground border-2 border-dashed rounded-lg">
                    <User className="mx-auto h-12 w-12" />
                    <p className="mt-4">Selecione um cliente na lista ao lado para visualizar seus detalhes.</p>
                </div>
            )}
            </CardContent>
        </Card>
        </div>

        <Dialog open={!!imageToView} onOpenChange={() => setImageToView(null)}>
            <DialogContent className="max-w-4xl h-[80vh] p-2 sm:p-4">
                <DialogHeader>
                    <DialogTitle>Visualizador de Imagem</DialogTitle>
                </DialogHeader>
                <div className="relative w-full h-full my-4">
                    {imageToView && (
                        <Image src={imageToView} alt="Visualização do anexo" fill className="object-contain" />
                    )}
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle>Editar Informações do Cliente</DialogTitle>
                    <DialogDescription>
                        Faça alterações nos dados cadastrais do cliente aqui. Clique em salvar quando terminar.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="name">Nome Completo</Label>
                            <Input id="name" name="name" value={editedInfo.name || ''} onChange={handleInputChange} />
                        </div>
                        <div>
                            <Label htmlFor="cpf">CPF</Label>
                            <Input id="cpf" name="cpf" value={editedInfo.cpf || ''} disabled />
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="phone">Telefone</Label>
                            <Input id="phone" name="phone" value={editedInfo.phone || ''} onChange={handleInputChange} />
                        </div>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" value={editedInfo.email || ''} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="grid md:grid-cols-6 gap-4">
                         <div className="md:col-span-2">
                            <Label htmlFor="zip">CEP</Label>
                            <Input id="zip" name="zip" value={editedInfo.zip || ''} onChange={handleInputChange} />
                        </div>
                        <div className="md:col-span-4">
                             <Label htmlFor="address">Endereço</Label>
                             <Input id="address" name="address" value={editedInfo.address || ''} onChange={handleInputChange} />
                        </div>
                        <div className="md:col-span-2">
                             <Label htmlFor="number">Número</Label>
                             <Input id="number" name="number" value={editedInfo.number || ''} onChange={handleInputChange} />
                        </div>
                        <div className="md:col-span-4">
                            <Label htmlFor="complement">Complemento</Label>
                            <Input id="complement" name="complement" value={editedInfo.complement || ''} onChange={handleInputChange} />
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="neighborhood">Bairro</Label>
                            <Input id="neighborhood" name="neighborhood" value={editedInfo.neighborhood || ''} onChange={handleInputChange} />
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="city">Cidade</Label>
                            <Input id="city" name="city" value={editedInfo.city || ''} onChange={handleInputChange} />
                        </div>
                         <div className="md:col-span-2">
                            <Label htmlFor="state">Estado</Label>
                            <Input id="state" name="state" value={editedInfo.state || ''} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="pt-4 border-t">
                        <Label htmlFor="password" className="flex items-center gap-2 mb-2"><KeyRound className="h-4 w-4" /> Senha de Acesso</Label>
                        <Input id="password" name="password" type="text" onChange={handleInputChange} placeholder="Deixe em branco para não alterar" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" onClick={handleSaveChanges}>Salvar Alterações</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={commentDialog.open} onOpenChange={(open) => !open && setCommentDialog({ open: false })}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{commentDialog.onSave ? 'Adicionar Comentário ao Anexo' : 'Editar Comentário'}</DialogTitle>
                    <DialogDescription>
                         Adicione ou edite um comentário para o anexo.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="comment-text">Comentário</Label>
                    <Textarea 
                        id="comment-text"
                        value={commentDialog.currentComment || ''}
                        onChange={(e) => setCommentDialog(prev => ({...prev, currentComment: e.target.value}))}
                        placeholder="Ex: Comprovante de endereço, RG frente, etc."
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setCommentDialog({ open: false })}>Cancelar</Button>
                    <Button onClick={handleCommentDialogSubmit}>Salvar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {installmentToPay && orderForPayment && (
            <PaymentDialog
                isOpen={paymentDialogOpen}
                onOpenChange={setPaymentDialogOpen}
                installment={installmentToPay}
                orderId={orderForPayment.id}
                customerName={orderForPayment.customer.name}
                onSubmit={handlePaymentSubmit}
            />
        )}
    </>
  );
}

    
    

    