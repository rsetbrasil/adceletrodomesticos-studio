'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Order, CustomerInfo } from '@/lib/types';
import { addMonths } from 'date-fns';

const checkoutSchema = z.object({
  name: z.string().min(3, 'Nome completo é obrigatório.'),
  cpf: z.string().refine((value) => {
    const justDigits = value.replace(/\D/g, '');
    return justDigits.length === 11;
  }, 'CPF inválido. Deve conter 11 dígitos.'),
  phone: z.string().min(10, 'Telefone é obrigatório.'),
  email: z.string().email('E-mail inválido.'),
  zip: z.string().refine((value) => {
    const justDigits = value.replace(/\D/g, '');
    return justDigits.length === 8;
  }, 'CEP inválido. Deve conter 8 dígitos.'),
  address: z.string().min(3, 'Endereço é obrigatório.'),
  number: z.string().min(1, 'Número é obrigatório.'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Bairro é obrigatório.'),
  city: z.string().min(2, 'Cidade é obrigatória.'),
  state: z.string().min(2, 'Estado é obrigatório.'),
  installments: z.coerce.number().min(1, 'Selecione o número de parcelas.'),
});

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function CheckoutForm() {
  const { cartItems, getCartTotal, clearCart, setLastOrder, addOrder, products, orders } = useCart();
  const router = useRouter();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: '',
      cpf: '',
      phone: '',
      email: '',
      zip: '',
      address: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: 'Fortaleza',
      state: 'CE',
      installments: 1,
    },
  });

  useEffect(() => {
    if (cartItems.length === 0 && typeof window !== 'undefined') {
      router.push('/');
    }
  }, [cartItems, router]);

  const customers = useMemo(() => {
    if (!orders) return [];
    const customerMap = new Map<string, CustomerInfo>();
    orders.forEach(order => {
      if (!customerMap.has(order.customer.cpf)) {
        customerMap.set(order.customer.cpf, order.customer);
      }
    });
    return Array.from(customerMap.values());
  }, [orders]);

  const handleCpfBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const cpf = e.target.value.replace(/\D/g, '');
    if (cpf.length === 11) {
      const foundCustomer = customers.find(c => c.cpf.replace(/\D/g, '') === cpf);
      if (foundCustomer) {
        form.reset({
          ...form.getValues(), // keep payment method and installments
          name: foundCustomer.name,
          cpf: foundCustomer.cpf,
          phone: foundCustomer.phone,
          email: foundCustomer.email,
          zip: foundCustomer.zip,
          address: foundCustomer.address,
          number: foundCustomer.number,
          complement: foundCustomer.complement || '',
          neighborhood: foundCustomer.neighborhood,
          city: foundCustomer.city,
          state: foundCustomer.state,
        });
        toast({
          title: "Cliente Encontrado!",
          description: "Seus dados foram preenchidos automaticamente.",
        });
      }
    }
  };

  const handleZipBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const zip = e.target.value.replace(/\D/g, '');

    if (zip.length !== 8) {
      return;
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
      if (!response.ok) {
        throw new Error('Falha ao buscar CEP.');
      }
      const data = await response.json();

      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Por favor, verifique o CEP e tente novamente.",
          variant: "destructive",
        });
        return;
      }

      form.setValue('address', data.logradouro || '');
      form.setValue('neighborhood', data.bairro || '');
      form.setValue('city', data.localidade || '');
      form.setValue('state', data.uf || '');
      
      toast({
        title: "Endereço Encontrado!",
        description: "Seu endereço foi preenchido automaticamente.",
      });

    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast({
        title: "Erro de Rede",
        description: "Não foi possível buscar o CEP. Verifique sua conexão.",
        variant: "destructive",
      });
    }
  };


  const total = getCartTotal();
  const installmentsCount = form.watch('installments');

  const maxAllowedInstallments = cartItems.length > 0 
    ? Math.min(...cartItems.map(item => {
        const product = products.find(p => p.id === item.id);
        return product?.maxInstallments || 12;
      }))
    : 12;
  
  const installmentValue = total > 0 && installmentsCount > 0 ? total / installmentsCount : 0;
  
  if (cartItems.length === 0) {
      return null;
  }

  function onSubmit(values: z.infer<typeof checkoutSchema>) {
    const lastOrderNumber = orders
      .map(o => {
          if (!o.id.startsWith('PED-')) return 0;
          const numberPart = o.id.split('-')[1];
          const number = parseInt(numberPart, 10);
          return isNaN(number) ? 0 : number;
      })
      .reduce((max, current) => Math.max(max, current), 0);
      
    const orderId = `PED-${lastOrderNumber + 1}`;
    
    const finalInstallments = values.installments;
    const finalInstallmentValue = total / finalInstallments;
    const orderDate = new Date();

    const installmentDetails = Array.from({ length: finalInstallments }, (_, i) => ({
        installmentNumber: i + 1,
        amount: finalInstallmentValue,
        dueDate: addMonths(orderDate, i + 1).toISOString(),
        status: 'Pendente' as const,
    }));

    const order: Order = {
      id: orderId,
      customer: {
        name: values.name,
        cpf: values.cpf,
        phone: values.phone,
        email: values.email,
        zip: values.zip,
        address: values.address,
        number: values.number,
        complement: values.complement,
        neighborhood: values.neighborhood,
        city: values.city,
        state: values.state,
      },
      items: cartItems,
      total,
      installments: finalInstallments,
      installmentValue: finalInstallmentValue,
      date: orderDate.toISOString(),
      status: 'Processando',
      paymentMethod: 'Crediário',
      installmentDetails,
    };
    
    addOrder(order);
    setLastOrder(order);
    clearCart();

    toast({
        title: "Pedido Realizado com Sucesso!",
        description: `Seu pedido #${orderId} foi confirmado.`,
    });

    router.push(`/order-confirmation/${orderId}`);
  }

  return (
    <div className="grid md:grid-cols-2 gap-12">
      <div>
        <h3 className="text-xl font-semibold mb-4 font-headline">Resumo do Pedido</h3>
        <div className="space-y-4">
          {cartItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 rounded-md overflow-hidden">
                  <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                </div>
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Qtd: {item.quantity}</p>
                </div>
              </div>
              <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-4 font-headline">1. Informações do Cliente</h3>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="cpf" render={({ field }) => ( <FormItem><FormLabel>CPF</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} onBlur={handleCpfBlur} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(99) 99999-9999" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="seu@email.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <h4 className="text-lg font-semibold pt-4">Endereço de Entrega</h4>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <FormField control={form.control} name="zip" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} onBlur={handleZipBlur} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="address" render={({ field }) => ( <FormItem className="md:col-span-4"><FormLabel>Endereço</FormLabel><FormControl><Input placeholder="Rua, Av." {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="number" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Número</FormLabel><FormControl><Input placeholder="123" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="complement" render={({ field }) => ( <FormItem className="md:col-span-4"><FormLabel>Complemento (opcional)</FormLabel><FormControl><Input placeholder="Apto, bloco, casa, etc." {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="neighborhood" render={({ field }) => ( <FormItem className="md:col-span-3"><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="city" render={({ field }) => ( <FormItem className="md:col-span-3"><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="state" render={({ field }) => ( <FormItem className="md:col-span-6"><FormLabel>Estado</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-4 font-headline">2. Opções de Parcelamento (Crediário)</h3>
            <FormField
              control={form.control}
              name="installments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Parcelas</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={field.value}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    >
                      {[...Array(maxAllowedInstallments).keys()].map((i) => (
                        <option key={i + 1} value={String(i + 1)}>
                          {i + 1}x de {formatCurrency(total / (i + 1))}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {installmentValue > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg text-center">
                    <p className="font-bold text-lg text-accent">{installmentsCount}x de {formatCurrency(installmentValue)}</p>
                </div>
            )}
          </div>

          <Button type="submit" size="lg" className="w-full text-lg">Finalizar Compra</Button>
        </form>
      </Form>
    </div>
  );
}
