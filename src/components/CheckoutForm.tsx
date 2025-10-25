
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
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Order, CustomerInfo } from '@/lib/types';
import { addMonths } from 'date-fns';
import { AlertTriangle, CreditCard, KeyRound, Trash2 } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useAdminActions } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useAudit } from '@/context/AuditContext';
import { useData } from '@/context/DataContext';

function isValidCPF(cpf: string) {
    if (typeof cpf !== 'string') return false;
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    const cpfDigits = cpf.split('').map(el => +el);
    const rest = (count: number) => (cpfDigits.slice(0, count).reduce((soma, el, index) => soma + el * (count + 1 - index), 0) * 10) % 11 % 10;
    return rest(9) === cpfDigits[9] && rest(10) === cpfDigits[10];
}

const checkoutSchema = z.object({
  name: z.string().min(3, 'Nome completo é obrigatório.'),
  cpf: z.string().refine(isValidCPF, 'CPF inválido.'),
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
});


const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function CheckoutForm() {
  const { cartItems, getCartTotal, clearCart, setLastOrder, removeFromCart } = useCart();
  const { settings } = useSettings();
  const { orders, addOrder } = useAdminActions();
  const { products } = useData();
  const { user } = useAuth();
  const { logAction } = useAudit();
  const router = useRouter();
  const { toast } = useToast();
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  
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
      if (order.customer.cpf && !customerMap.has(order.customer.cpf.replace(/\D/g, ''))) {
        customerMap.set(order.customer.cpf.replace(/\D/g, ''), order.customer);
      }
    });
    return Array.from(customerMap.values());
  }, [orders]);
  
  const cartItemsWithDetails = useMemo(() => {
    return cartItems.map(item => {
      const productInfo = products.find(p => p.id === item.id);
      return {
        ...item,
        stock: productInfo?.stock ?? 0,
        hasEnoughStock: (productInfo?.stock ?? 0) >= item.quantity,
        maxInstallments: productInfo?.maxInstallments ?? 1,
      };
    });
  }, [cartItems, products]);
  
  const maxAllowedInstallments = useMemo(() => {
    if (cartItemsWithDetails.length === 0) return 1;
    const maxInstallmentsArray = cartItemsWithDetails.map(item => item.maxInstallments);
    return Math.min(...maxInstallmentsArray);
  }, [cartItemsWithDetails]);

  const isCartValid = cartItemsWithDetails.every(item => item.hasEnoughStock);

  const handleCpfBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const cpf = e.target.value.replace(/\D/g, '');
    if (cpf.length === 11) {
      const foundCustomer = customers.find(c => c.cpf.replace(/\D/g, '') === cpf);
      if (foundCustomer) {
        setIsNewCustomer(false);
        form.reset({
          ...form.getValues(),
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
      } else {
        setIsNewCustomer(true);
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
  
  if (cartItems.length === 0) {
      return null;
  }

  async function onSubmit(values: z.infer<typeof checkoutSchema>) {
    
    let customerData: CustomerInfo = {
      name: values.name,
      cpf: values.cpf.replace(/\D/g, ''),
      phone: values.phone,
      email: values.email,
      zip: values.zip,
      address: values.address,
      number: values.number,
      complement: values.complement,
      neighborhood: values.neighborhood,
      city: values.city,
      state: values.state,
    };
    
    if (isNewCustomer) {
        customerData.password = customerData.cpf.substring(0, 6);
    }
    
    const lastOrderNumber = orders
      .map(o => {
          const orderId = o.id;
          if (!orderId.startsWith('PED-')) return 0;
          const numberPart = orderId.split('-')[1];
          const number = parseInt(numberPart, 10);
          return isNaN(number) ? 0 : number;
      })
      .reduce((max, current) => Math.max(max, current), 0);
      
    const orderId = `PED-${String(lastOrderNumber + 1).padStart(4, '0')}`;
    
    const finalInstallments = 1;
    const finalInstallmentValue = total / finalInstallments;
    const orderDate = new Date();

    const installmentDetails = Array.from({ length: finalInstallments }, (_, i) => ({
        id: `inst-${orderId}-${i + 1}`,
        installmentNumber: i + 1,
        amount: finalInstallmentValue,
        dueDate: addMonths(orderDate, i + 1).toISOString(),
        status: 'Pendente' as const,
        paidAmount: 0,
        payments: [],
    }));

    const order: Partial<Order> = {
      id: orderId,
      customer: customerData,
      items: cartItems.map(({ ...item }) => item),
      total,
      installments: finalInstallments,
      installmentValue: finalInstallmentValue,
      date: orderDate.toISOString(),
      status: 'Processando',
      paymentMethod: 'Crediário',
      installmentDetails,
    };
    
    try {
        const savedOrder = await addOrder(order, logAction, user);
        if (savedOrder) {
          setLastOrder(savedOrder);
          clearCart();
      
          toast({
              title: "Pedido Realizado com Sucesso!",
              description: `Seu pedido #${orderId} foi confirmado.`,
          });

          if (settings.storePhone) {
              const storePhone = settings.storePhone.replace(/\D/g, '');
              const productNames = cartItemsWithDetails.map(item => item.name).join(', ');
              
              const messageParts = [
                  `*Novo Pedido Recebido!*`,
                  `*Pedido:* ${orderId}`,
                  `*Cliente:* ${values.name}`,
                  `*Produtos:* ${productNames}`,
                  `*Total:* ${formatCurrency(total)}`,
                  `*Parcelamento Máximo:* Até ${maxAllowedInstallments}x`
              ];

              const message = messageParts.join('\n');
              const encodedMessage = encodeURIComponent(message);
              
              const webUrl = `https://wa.me/55${storePhone}?text=${encodedMessage}`;
              window.open(webUrl, '_blank');
          }
      
          router.push(`/order-confirmation/${orderId}`);
        }
    } catch (error) {
        console.error("Failed to process order:", error);
        toast({
            title: "Erro ao Finalizar Pedido",
            description: error instanceof Error ? error.message : "Não foi possível completar o pedido.",
            variant: "destructive"
        });
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-12">
      <div>
        <h3 className="text-xl font-semibold mb-4 font-headline">Resumo do Pedido</h3>
        <div className="space-y-4">
          {cartItemsWithDetails.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-4 flex-grow">
                <div className="relative h-16 w-16 rounded-md overflow-hidden">
                  <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                </div>
                <div className="flex-grow">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Qtd: {item.quantity}</p>
                   <p className="text-xs text-accent font-semibold">(em até {item.maxInstallments}x)</p>
                   {!item.hasEnoughStock && (
                      <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Estoque: {item.stock}. Ajuste a quantidade.</span>
                      </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.id)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
           <div className="mt-4 p-4 bg-muted rounded-lg text-center">
              <p className="font-bold text-md text-accent flex items-center justify-center gap-2"><CreditCard /> Pagamento via Crediário</p>
              <p className="text-sm text-muted-foreground mt-1">
                O vendedor definirá as condições de parcelamento com você após a finalização do pedido.
              </p>
            </div>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-4 font-headline">Informações do Cliente</h3>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="cpf" render={({ field }) => ( <FormItem><FormLabel>CPF</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} onBlur={handleCpfBlur} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(99) 99999-9999" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="seu@email.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                 {isNewCustomer && (
                     <div className="p-3 bg-blue-500/10 text-blue-800 rounded-lg text-sm">
                        <p><strong>Novo cliente!</strong> A senha de acesso para a Área do Cliente será os <strong>6 primeiros dígitos do seu CPF</strong>.</p>
                    </div>
                )}
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
          
          <Button type="submit" size="lg" className="w-full text-lg" disabled={!isCartValid || form.formState.isSubmitting}>
            Finalizar Compra
          </Button>
        </form>
      </Form>
    </div>
  );
}
