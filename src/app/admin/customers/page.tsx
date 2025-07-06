'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import type { Order, CustomerInfo, Installment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, MapPin, Users, CreditCard, Printer, Upload, FileText, X, Pencil, CheckCircle, Undo2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';


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
  const { orders, updateCustomer, updateInstallmentStatus, updateInstallmentDueDate } = useCart();
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerInfo | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [imageToView, setImageToView] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedInfo, setEditedInfo] = useState<Partial<CustomerInfo>>({});
  const [openDueDatePopover, setOpenDueDatePopover] = useState<string | null>(null);

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
      }
    });
    return Array.from(customerMap.values());
  }, [orders, isClient]);
  
  const customerOrders = useMemo(() => {
      if (!selectedCustomer) return [];
      return orders
        .filter(o => o.customer.cpf === selectedCustomer.cpf && o.status !== 'Cancelado')
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
      const totalPago = allInstallments.filter(inst => inst.status === 'Pago').reduce((acc, inst) => acc + inst.amount, 0);
      const saldoDevedor = totalComprado - totalPago;

      return { totalComprado, totalPago, saldoDevedor };

  }, [selectedCustomer, customerOrders]);

  const handleToggleInstallmentStatus = (orderId: string, installmentNumber: number, currentStatus: Installment['status']) => {
    const newStatus = currentStatus === 'Pendente' ? 'Pago' : 'Pendente';
    updateInstallmentStatus(orderId, installmentNumber, newStatus);

    if (newStatus === 'Pago') {
        window.open(`/carnet/${orderId}/${installmentNumber}`, '_blank');
        toast({
            title: "Parcela Paga!",
            description: "Abrindo comprovante para gerar o PDF e enviar ao cliente.",
        });
    } else {
        toast({
          title: "Status da Parcela Atualizado!",
          description: `A parcela ${installmentNumber} do pedido ${orderId} foi marcada como ${newStatus}.`,
      });
    }
  };

  const handleDueDateChange = (orderId: string, installmentNumber: number, date: Date | undefined) => {
    if (date) {
        updateInstallmentDueDate(orderId, installmentNumber, date);
    }
    setOpenDueDatePopover(null);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !selectedCustomer) return;

    const files = Array.from(event.target.files);
    const newAttachments = [...(selectedCustomer.attachments || [])];

    for (const file of files) {
      try {
        const isImage = file.type.startsWith('image/');
        let fileUrl: string;

        if (isImage) {
            fileUrl = await resizeImage(file);
        } else {
            const promise = new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (typeof e.target?.result === 'string') {
                        resolve(e.target.result);
                    } else {
                        reject(new Error('Falha ao ler o arquivo.'));
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            fileUrl = await promise;
        }
        
        const type = isImage ? 'image' : 'pdf';
        newAttachments.push({ name: file.name, type, url: fileUrl });
      } catch (error) {
          console.error("Erro ao processar arquivo:", error);
      }
    }
    
    const updatedCustomer = { ...selectedCustomer, attachments: newAttachments };
    setSelectedCustomer(updatedCustomer);
    updateCustomer(updatedCustomer);
    event.target.value = ''; // Clear the input
  };

  const handleDeleteAttachment = (indexToDelete: number) => {
    if (!selectedCustomer) return;
    const newAttachments = (selectedCustomer.attachments || []).filter((_, index) => index !== indexToDelete);
    const updatedCustomer = { ...selectedCustomer, attachments: newAttachments };
    setSelectedCustomer(updatedCustomer);
    updateCustomer(updatedCustomer);
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
      updateCustomer(updatedCustomerData);
      setSelectedCustomer(updatedCustomerData);
      setIsEditDialogOpen(false);
    }
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
            {customers.length > 0 ? (
                <div className="flex flex-col gap-2">
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
                            <p className="text-xs text-muted-foreground">{customer.email}</p>
                        </div>
                    </div>
                    </Button>
                ))}
                </div>
            ) : (
                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Users className="mx-auto h-10 w-10" />
                    <h3 className="mt-4 text-md font-semibold">Nenhum cliente encontrado</h3>
                    <p className="mt-1 text-xs">Os clientes aparecerão aqui após a primeira compra.</p>
                </div>
            )}
            </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
            <CardTitle>Detalhes do Cliente</CardTitle>
            <CardDescription>Informações cadastrais, situação do crediário e anexos.</CardDescription>
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
                                        <div className="p-4 pt-0">
                                            {(order.installmentDetails && order.installmentDetails.length > 0) ? (
                                                <div className="border rounded-md">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Parcela</TableHead>
                                                                <TableHead>Vencimento</TableHead>
                                                                <TableHead className="text-right">Valor</TableHead>
                                                                <TableHead className="text-center">Status</TableHead>
                                                                <TableHead className="text-right">Ações</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {order.installmentDetails.map((inst) => {
                                                                const isCrediario = !order.paymentMethod || order.paymentMethod === 'Crediário';
<<<<<<< HEAD
                                                                const now = new Date();
                                                                now.setHours(0, 0, 0, 0); // Set to start of today to compare dates only
                                                                const dueDate = new Date(inst.dueDate);
                                                                const isOverdue = inst.status === 'Pendente' && dueDate < now;
                                                                
                                                                const statusText = isOverdue ? 'Atrasado' : inst.status;
                                                                const statusVariant = inst.status === 'Pago' ? 'default' : isOverdue ? 'destructive' : 'secondary';
                                                                
                                                                return (
                                                                    <TableRow key={`${order.id}-${inst.installmentNumber}`}>
                                                                        <TableCell>{inst.installmentNumber} / {order.installments}</TableCell>
                                                                        <TableCell>
                                                                            <Popover open={openDueDatePopover === `${order.id}-${inst.installmentNumber}`} onOpenChange={(isOpen) => setOpenDueDatePopover(isOpen ? `${order.id}-${inst.installmentNumber}` : null)}>
                                                                                <PopoverTrigger asChild>
                                                                                    <Button
                                                                                        variant={"outline"}
                                                                                        className="w-[150px] justify-start text-left font-normal text-xs"
                                                                                        disabled={inst.status === 'Pago'}
                                                                                    >
                                                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                                                        {format(new Date(inst.dueDate), 'dd/MM/yyyy')}
                                                                                    </Button>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent className="w-auto p-0">
                                                                                    <Calendar
                                                                                        mode="single"
                                                                                        selected={new Date(inst.dueDate)}
                                                                                        onSelect={(date) => handleDueDateChange(order.id, inst.installmentNumber, date)}
                                                                                        initialFocus
                                                                                    />
                                                                                </PopoverContent>
                                                                            </Popover>
                                                                        </TableCell>
                                                                        <TableCell className="text-right">{formatCurrency(inst.amount)}</TableCell>
                                                                        <TableCell className="text-center">
                                                                            <Badge variant={statusVariant}>{statusText}</Badge>
=======
                                                                return (
                                                                    <TableRow key={`${order.id}-${inst.installmentNumber}`}>
                                                                        <TableCell>{inst.installmentNumber} / {order.installments}</TableCell>
                                                                        <TableCell>{format(new Date(inst.dueDate), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                                                                        <TableCell className="text-right">{formatCurrency(inst.amount)}</TableCell>
                                                                        <TableCell className="text-center">
                                                                            <Badge variant={getInstallmentStatusVariant(inst.status)}>{inst.status}</Badge>
>>>>>>> 15d7b6c (em cliente, pedido quando o cliente pagar todas ficar como pago quitado.)
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            {isCrediario && (
                                                                                <div className="flex gap-2 justify-end">
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        onClick={() => handleToggleInstallmentStatus(order.id, inst.installmentNumber, inst.status)}
                                                                                    >
                                                                                        {inst.status === 'Pendente' ? (
                                                                                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                                                                        ) : (
                                                                                            <Undo2 className="mr-2 h-4 w-4 text-amber-600" />
                                                                                        )}
                                                                                        {inst.status === 'Pendente' ? 'Pagar' : 'Estornar'}
                                                                                    </Button>
                                                                                    <Button variant="outline" size="sm" asChild>
                                                                                        <Link href={`/carnet/${order.id}/${inst.installmentNumber}`} target="_blank" rel="noopener noreferrer">
                                                                                            <Printer className="mr-2 h-4 w-4" />
                                                                                            Ver Parcela
                                                                                        </Link>
                                                                                    </Button>
                                                                                </div>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
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

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Upload className="h-5 w-5 text-primary" />
                        Documentos e Anexos
                    </h3>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid gap-4">
                                <div className="relative border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center">
                                    <p className="text-sm text-muted-foreground mb-2">Clique para selecionar imagens ou PDFs</p>
                                    <Button asChild variant="outline">
                                        <label htmlFor="file-upload" className="cursor-pointer">
                                            <Upload className="mr-2 h-4 w-4" />
                                            Adicionar Arquivos
                                        </label>
                                    </Button>
                                    <Input id="file-upload" type="file" className="sr-only" multiple accept="image/*,application/pdf" onChange={handleFileChange} />
                                </div>
                                {(selectedCustomer.attachments && selectedCustomer.attachments.length > 0) ? (
                                    <div className="space-y-2">
                                        {selectedCustomer.attachments.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 rounded-md border bg-muted/50">
                                                {file.type === 'image' ? (
                                                    <button onClick={() => setImageToView(file.url)} className="flex items-center gap-3 overflow-hidden group text-left w-full">
                                                        <Image src={file.url} alt={file.name} width={40} height={40} className="h-10 w-10 rounded-md object-cover flex-shrink-0" />
                                                        <span className="text-sm font-medium group-hover:underline truncate" title={file.name}>
                                                            {file.name}
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <a href={file.url} download={file.name} className="flex items-center gap-3 overflow-hidden group">
                                                        <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                                                        <span className="text-sm font-medium group-hover:underline truncate" title={file.name}>
                                                            {file.name}
                                                        </span>
                                                    </a>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => handleDeleteAttachment(index)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-sm text-muted-foreground">Nenhum documento anexado.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
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
                <div className="grid gap-4 py-4">
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
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" onClick={handleSaveChanges}>Salvar Alterações</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}
