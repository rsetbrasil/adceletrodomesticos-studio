
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAdmin } from '@/context/AdminContext';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { useAudit } from '@/context/AuditContext';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, ChevronsUpDown, PlusCircle, ShoppingCart, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CustomerInfo, User, Product, CartItem } from '@/lib/types';
import { addMonths } from 'date-fns';

const createOrderSchema = z.object({
  customerId: z.string().min(1, 'É obrigatório selecionar um cliente.'),
  sellerId: z.string().min(1, 'É obrigatório selecionar um vendedor.'),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number().min(1, 'A quantidade deve ser pelo menos 1.'),
    imageUrl: z.string(),
  })).min(1, 'O pedido deve ter pelo menos um item.'),
  installments: z.coerce.number().min(1, 'O número de parcelas deve ser pelo menos 1.'),
});

type CreateOrderFormValues = z.infer<typeof createOrderSchema>;

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function CreateOrderPage() {
  const { addOrder } = useAdmin();
  const { orders, products } = useData();
  const { user, users } = useAuth();
  const { logAction } = useAudit();
  const router = useRouter();

  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [openProductPopover, setOpenProductPopover] = useState(false);

  const customers = useMemo(() => {
    if (!orders) return [];
    const customerMap = new Map<string, CustomerInfo>();
    orders.forEach(order => {
      if (order.customer.cpf && !customerMap.has(order.customer.cpf.replace(/\D/g, ''))) {
        customerMap.set(order.customer.cpf.replace(/\D/g, ''), order.customer);
      }
    });
    return Array.from(customerMap.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [orders]);
  
  const sellers = useMemo(() => {
    return users.filter(u => u.role === 'vendedor' || u.role === 'admin' || u.role === 'gerente');
  }, [users]);

  const form = useForm<CreateOrderFormValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      customerId: '',
      sellerId: user?.id || '',
      items: [],
      installments: 1,
    },
  });
  
  const handleAddItem = (product: Product) => {
    setOpenProductPopover(false);
    setProductSearch('');

    const existingItem = selectedItems.find(item => item.id === product.id);
    let newItems;

    if (existingItem) {
      newItems = selectedItems.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      newItems = [...selectedItems, {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        imageUrl: product.imageUrls?.[0] || '',
      }];
    }
    setSelectedItems(newItems);
    form.setValue('items', newItems, { shouldValidate: true });
  };
  
  const handleQuantityChange = (productId: string, quantity: number) => {
    let newItems;
    if (quantity < 1) {
      newItems = selectedItems.filter(item => item.id !== productId);
    } else {
      newItems = selectedItems.map(item =>
        item.id === productId ? { ...item, quantity } : item
      );
    }
    setSelectedItems(newItems);
    form.setValue('items', newItems, { shouldValidate: true });
  };
  
  const handleRemoveItem = (productId: string) => {
    const newItems = selectedItems.filter(item => item.id !== productId);
    setSelectedItems(newItems);
     form.setValue('items', newItems, { shouldValidate: true });
  };
  
  const total = useMemo(() => {
    return selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [selectedItems]);
  
  async function onSubmit(values: CreateOrderFormValues) {
    const customer = customers.find(c => c.cpf === values.customerId);
    const seller = users.find(u => u.id === values.sellerId);
    
    if (!customer || !seller) {
        // This should not happen due to form validation
        return;
    }
    
    const lastOrderNumber = orders
      .map(o => parseInt(o.id.split('-')[1], 10))
      .filter(n => !isNaN(n))
      .reduce((max, current) => Math.max(max, current), 0);
      
    const orderId = `PED-${String(lastOrderNumber + 1).padStart(4, '0')}`;
    const orderDate = new Date();
    
    const installmentValue = total / values.installments;

    const installmentDetails = Array.from({ length: values.installments }, (_, i) => ({
      id: `inst-${orderId}-${i + 1}`,
      installmentNumber: i + 1,
      amount: installmentValue,
      dueDate: addMonths(orderDate, i + 1).toISOString(),
      status: 'Pendente' as const,
      paidAmount: 0,
      payments: [],
    }));
    
    const orderData = {
        id: orderId,
        customer: customer,
        items: selectedItems,
        total,
        installments: values.installments,
        installmentValue,
        date: orderDate.toISOString(),
        status: 'Processando' as const,
        paymentMethod: 'Crediário' as const,
        installmentDetails,
        sellerId: seller.id,
        sellerName: seller.name,
    };
    
    const savedOrder = await addOrder(orderData, logAction, user);
    if (savedOrder) {
        router.push(`/admin/pedidos`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlusCircle className="h-6 w-6" />
          Criar Novo Pedido Manualmente
        </CardTitle>
        <CardDescription>
          Preencha os dados abaixo para registrar um novo pedido no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Customer and Seller Selection */}
            <div className="grid md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Cliente</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant="outline"
                                role="combobox"
                                className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                            >
                                {field.value
                                ? customers.find(c => c.cpf === field.value)?.name
                                : "Selecione um cliente"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                            <Command>
                            <CommandInput placeholder="Buscar cliente por nome..." />
                            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                            <CommandList>
                                <CommandGroup>
                                    {customers.map(c => (
                                    <CommandItem
                                        value={c.name}
                                        key={c.cpf}
                                        onSelect={() => {
                                          form.setValue("customerId", c.cpf);
                                        }}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", c.cpf === field.value ? "opacity-100" : "opacity-0")} />
                                        {c.name} ({c.cpf})
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sellerId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Vendedor</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o vendedor responsável" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {sellers.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
               />
            </div>
            
            {/* Product Selection */}
             <div>
                <h3 className="text-lg font-medium mb-2">Itens do Pedido</h3>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produto</TableHead>
                                <TableHead className="w-[100px]">Preço</TableHead>
                                <TableHead className="w-[120px]">Qtd.</TableHead>
                                <TableHead className="w-[100px]">Subtotal</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedItems.length > 0 ? (
                                selectedItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{formatCurrency(item.price)}</TableCell>
                                        <TableCell>
                                            <Input 
                                                type="number" 
                                                className="w-20" 
                                                value={item.quantity}
                                                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value))}
                                                min={1}
                                            />
                                        </TableCell>
                                        <TableCell>{formatCurrency(item.price * item.quantity)}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveItem(item.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">Nenhum produto adicionado.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="mt-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <Popover open={openProductPopover} onOpenChange={setOpenProductPopover}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={openProductPopover} className="w-full md:w-[300px] justify-between">
                                Adicionar produto...
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar produto..." value={productSearch} onValueChange={setProductSearch}/>
                                <CommandList>
                                    <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                                    <CommandGroup>
                                    {products
                                        .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                        .map(p => (
                                        <CommandItem key={p.id} onSelect={() => handleAddItem(p)}>
                                            <Check className={cn("mr-2 h-4 w-4", selectedItems.some(i => i.id === p.id) ? "opacity-100" : "opacity-0")} />
                                            {p.name}
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <FormMessage>{form.formState.errors.items?.message}</FormMessage>
                </div>
            </div>
            
            {/* Totals and Installments */}
            <div className="grid md:grid-cols-2 gap-8 items-start">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Resumo Financeiro</h3>
                    <div className="p-4 bg-muted rounded-lg">
                        <div className="flex justify-between items-center text-xl font-bold">
                            <span>TOTAL DO PEDIDO</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                    </div>
                </div>

                <FormField
                    control={form.control}
                    name="installments"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Número de Parcelas</FormLabel>
                            <FormControl>
                                <Input type="number" min={1} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <Button type="submit" size="lg" className="w-full md:w-auto" disabled={form.formState.isSubmitting}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                Criar Pedido
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
