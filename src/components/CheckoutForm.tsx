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
import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/lib/types';
import { addMonths } from 'date-fns';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

const checkoutSchema = z.object({
  name: z.string().min(3, 'Nome completo é obrigatório.'),
  cpf: z.string().refine((value) => {
    const justDigits = value.replace(/\D/g, '');
    return justDigits.length === 11;
  }, {
    message: 'CPF inválido. Deve conter 11 dígitos.',
  }),
  phone: z.string().min(10, 'Telefone é obrigatório.'),
  email: z.string().email('E-mail inválido.'),
  address: z.string().min(5, 'Endereço é obrigatório.'),
  city: z.string().min(2, 'Cidade é obrigatória.'),
  state: z.string().min(2, 'Estado é obrigatório.'),
  zip: z.string().refine((value) => {
    const justDigits = value.replace(/\D/g, '');
    return justDigits.length === 8;
  }, {
    message: 'CEP inválido. Deve conter 8 dígitos.',
  }),
  paymentMethod: z.enum(['Crediário', 'Pix', 'Dinheiro'], {
    required_error: "Você precisa selecionar uma forma de pagamento.",
  }),
  installments: z.coerce.number().min(1, 'Selecione o número de parcelas.'),
});

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function CheckoutForm() {
  const { cartItems, getCartTotal, clearCart, setLastOrder, addOrder, products } = useCart();
  const router = useRouter();
  const { toast } = useToast();
  const total = getCartTotal();

  const maxAllowedInstallments = useMemo(() => {
    if (!cartItems || cartItems.length === 0) return 12;
    const cartProductIds = new Set(cartItems.map(item => item.id));
    const productsInCart = products.filter(p => cartProductIds.has(p.id));
    if (productsInCart.length === 0) return 12;
    const minInstallments = Math.min(...productsInCart.map(p => p.maxInstallments || 12));
    return minInstallments > 0 ? minInstallments : 12;
  }, [cartItems, products]);

  const form = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: '',
      cpf: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      installments: 1,
    },
  });

  const paymentMethod = form.watch('paymentMethod');
  const installmentsCount = form.watch('installments');

  useEffect(() => {
    if (paymentMethod !== 'Crediário') {
      form.setValue('installments', 1);
    }
  }, [paymentMethod, form]);

  const installmentValue = useMemo(() => {
    return total > 0 && installmentsCount > 0 ? total / installmentsCount : 0;
  }, [total, installmentsCount]);
  
  useEffect(() => {
    if (cartItems.length === 0) {
      router.push('/');
    }
  }, [cartItems, router]);

  if (cartItems.length === 0) {
      return null;
  }

  function onSubmit(values: z.infer<typeof checkoutSchema>) {
    const orderId = `CF-${Date.now()}`;
    const finalInstallments = values.paymentMethod === 'Crediário' ? values.installments : 1;
    const finalInstallmentValue = total / finalInstallments;
    const orderDate = new Date();

    const installmentDetails = Array.from({ length: finalInstallments }, (_, i) => {
      return {
        installmentNumber: i + 1,
        amount: finalInstallmentValue,
        dueDate: addMonths(orderDate, i + 1).toISOString(),
        status: 'Pendente' as const,
      };
    });

    const order: Order = {
      id: orderId,
      customer: {
        name: values.name,
        cpf: values.cpf,
        phone: values.phone,
        email: values.email,
        address: values.address,
        city: values.city,
        state: values.state,
        zip: values.zip,
      },
      items: cartItems,
      total,
      installments: finalInstallments,
      installmentValue: finalInstallmentValue,
      date: orderDate.toISOString(),
      status: 'Processando',
      paymentMethod: values.paymentMethod,
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="cpf" render={({ field }) => ( <FormItem><FormLabel>CPF</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormMessage> )} />
              <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(99) 99999-9999" {...field} /></FormControl><FormMessage /></FormMessage> )} />
              <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="seu@email.com" {...field} /></FormControl><FormMessage /></FormMessage> )} />
              <FormField control={form.control} name="address" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormMessage> )} />
              <FormField control={form.control} name="city" render={({ field }) => ( <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormMessage> )} />
              <FormField control={form.control} name="state" render={({ field }) => ( <FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormMessage> )} />
              <FormField control={form.control} name="zip" render={({ field }) => ( <FormItem><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} /></FormControl><FormMessage /></FormMessage> )} />
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-4 font-headline">2. Forma de Pagamento</h3>
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-2">
                      <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-4 has-[:checked]:border-primary">
                        <FormControl><RadioGroupItem value="Crediário" /></FormControl>
                        <FormLabel className="font-normal w-full">Crediário da Loja</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-4 has-[:checked]:border-primary">
                        <FormControl><RadioGroupItem value="Pix" /></FormControl>
                        <FormLabel className="font-normal w-full">Pix</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-4 has-[:checked]:border-primary">
                        <FormControl><RadioGroupItem value="Dinheiro" /></FormControl>
                        <FormLabel className="font-normal w-full">Dinheiro (na entrega/retirada)</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {paymentMethod === 'Crediário' && (
            <div>
              <h3 className="text-xl font-semibold mb-4 font-headline">3. Opções de Parcelamento</h3>
              <FormField
                control={form.control}
                name="installments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Parcelas</FormLabel>
                    <FormControl>
                      <select
                        {...field}
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
          )}

          <Button type="submit" size="lg" className="w-full text-lg">Finalizar Compra</Button>
        </form>
      </Form>
    </div>
  );
}
