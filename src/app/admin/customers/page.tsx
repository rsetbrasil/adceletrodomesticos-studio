'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import type { Order, CustomerInfo } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, MapPin, Package, Users } from 'lucide-react';
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

export default function CustomersAdminPage() {
  const { orders } = useCart();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerInfo | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
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

  const handleSelectCustomer = (customer: CustomerInfo) => {
    setSelectedCustomer(customer);
    const relatedOrders = orders.filter(order => order.customer.cpf === customer.cpf);
    setCustomerOrders(relatedOrders);
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
                  onClick={() => handleSelectCustomer(customer)}
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
          <CardDescription>Informações cadastrais e histórico de pedidos.</CardDescription>
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
                    <Package className="h-5 w-5 text-primary" />
                    Histórico de Pedidos
                </h3>
                {customerOrders.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido ID</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.id}</TableCell>
                            <TableCell>{format(new Date(order.date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                            <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhum pedido encontrado para este cliente.</p>
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
  );
}
