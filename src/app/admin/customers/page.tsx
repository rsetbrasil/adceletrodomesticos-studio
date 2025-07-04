'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import type { Order, CustomerInfo, Installment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, MapPin, Users, CreditCard, Printer, Upload, FileImage, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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

export default function CustomersAdminPage() {
  const { orders, updateCustomer } = useCart();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerInfo | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
  
  const customerFinancials = useMemo(() => {
      if (!selectedCustomer) {
          return { allInstallments: [], totalComprado: 0, totalPago: 0, saldoDevedor: 0 };
      }
      const customerOrders = orders.filter(order => order.customer.cpf === selectedCustomer.cpf && order.status !== 'Cancelado');
      
      const allInstallments = customerOrders.flatMap(order => 
        (order.installmentDetails || []).map(inst => ({...inst, orderId: order.id, installmentsCount: order.installments}))
      );
      
      const totalComprado = customerOrders.reduce((acc, order) => acc + order.total, 0);
      const totalPago = allInstallments.filter(inst => inst.status === 'Pago').reduce((acc, inst) => acc + inst.amount, 0);
      const saldoDevedor = totalComprado - totalPago;

      return { allInstallments, totalComprado, totalPago, saldoDevedor };

  }, [selectedCustomer, orders]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !selectedCustomer) return;

    const files = Array.from(event.target.files);
    const newAttachments = [...(selectedCustomer.attachments || [])];

    for (const file of files) {
      try {
          const reader = new FileReader();
          const promise = new Promise<{ name: string; type: 'image' | 'pdf'; url:string }>((resolve, reject) => {
            reader.onload = (e) => {
              if (typeof e.target?.result !== 'string') {
                  return reject(new Error('Falha ao ler o arquivo.'));
              }
              const type = file.type.startsWith('image/') ? 'image' : 'pdf';
              resolve({ name: file.name, type, url: e.target.result });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          newAttachments.push(await promise);
      } catch (error) {
          console.error("Erro ao processar arquivo:", error);
      }
    }
    
    const updatedCustomer = { ...selectedCustomer, attachments: newAttachments };
    setSelectedCustomer(updatedCustomer);
    updateCustomer(updatedCustomer);
  };

  const handleDeleteAttachment = (indexToDelete: number) => {
    if (!selectedCustomer) return;
    const newAttachments = (selectedCustomer.attachments || []).filter((_, index) => index !== indexToDelete);
    const updatedCustomer = { ...selectedCustomer, attachments: newAttachments };
    setSelectedCustomer(updatedCustomer);
    updateCustomer(updatedCustomer);
  };

  if (!isClient) {
    return (
        <div className="flex justify-center items-center py-24">
            <p>Carregando painel de clientes...</p>
        </div>
    );
  }

  return (
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
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Informações Pessoais
                </h3>
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
                        <span>{selectedCustomer.address}, {selectedCustomer.city}, {selectedCustomer.state} - {selectedCustomer.zip}</span>
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
                {customerFinancials.allInstallments.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido ID</TableHead>
                          <TableHead>Parcela</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerFinancials.allInstallments.map((inst, index, arr) => {
                          const isFirstOfOrder = index === 0 || arr[index - 1].orderId !== inst.orderId;
                          const order = orders.find(o => o.id === inst.orderId);
                          const isCrediario = !order?.paymentMethod || order.paymentMethod === 'Crediário';

                          return (
                          <TableRow key={`${inst.orderId}-${inst.installmentNumber}`}>
                            <TableCell className="font-mono text-xs">{inst.orderId}</TableCell>
                            <TableCell>{inst.installmentNumber} / {inst.installmentsCount}</TableCell>
                            <TableCell>{format(new Date(inst.dueDate), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                            <TableCell className="text-right">{formatCurrency(inst.amount)}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={getInstallmentStatusVariant(inst.status)}>{inst.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {isFirstOfOrder && isCrediario && (
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/carnet/${inst.orderId}`} target="_blank" rel="noopener noreferrer">
                                            <Printer className="mr-2 h-4 w-4" />
                                            Ver Carnê
                                        </Link>
                                    </Button>
                                )}
                            </TableCell>
                          </TableRow>
                        )})}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhum crediário encontrado para este cliente.</p>
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
                                              <div className="flex items-center gap-3 overflow-hidden">
                                                  {file.type === 'image' ? <FileImage className="h-5 w-5 text-muted-foreground flex-shrink-0" /> : <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                                                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline truncate" title={file.name}>
                                                      {file.name}
                                                  </a>
                                              </div>
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
  );
}
