'use client';

import { useEffect, useState, useMemo } from 'react';
import { useCart } from '@/context/CartContext';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import type { Order } from '@/lib/types';
import { CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { generatePixPayload } from '@/lib/pix';
import PixQRCode from '@/components/PixQRCode';
import { format } from 'date-fns';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function OrderConfirmationPage() {
  const { lastOrder } = useCart();
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (lastOrder && lastOrder.id === params.id) {
      setOrder(lastOrder);
    } else {
      // If there's no order in context, or the ID doesn't match,
      // it means the user refreshed the page or came here directly.
      // We can try to find the order in the full list from localStorage
      const storedOrdersRaw = localStorage.getItem('orders');
      if (storedOrdersRaw) {
        const storedOrders = JSON.parse(storedOrdersRaw) as Order[];
        const foundOrder = storedOrders.find(o => o.id === params.id);
        if (foundOrder) {
          setOrder(foundOrder);
          return;
        }
      }
      
      const timer = setTimeout(() => router.push('/'), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastOrder, params.id, router]);

  const pixPayload = useMemo(() => {
    if (!order || (order.paymentMethod !== 'Pix' && order.paymentMethod !== 'Crediário')) return null;

    // ATENÇÃO: Estes dados são exemplos. Em uma aplicação real,
    // a chave PIX e os dados do lojista devem vir de uma configuração segura.
    const pixKey = 'fb43228c-4740-4c16-a217-21706a782496'; // Chave aleatória (EVP) de exemplo
    const merchantName = 'ADC MOVEIS E ELETRO';
    const merchantCity = 'SAO PAULO';
    
    let amount = order.total;
    let txid = order.id;

    // If it's a "Crediário", generate PIX for the first installment
    if (order.paymentMethod === 'Crediário' && order.installmentDetails && order.installmentDetails.length > 0) {
      amount = order.installmentDetails[0].amount;
      txid = `${order.id}-${order.installmentDetails[0].installmentNumber}`;
    }
    
    return generatePixPayload(pixKey, merchantName, merchantCity, txid, amount);
  }, [order]);

  if (!order) {
    return (
      <div className="container mx-auto py-24 text-center">
        <p className="text-lg">Carregando detalhes do pedido ou redirecionando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardHeader className="text-center bg-primary/5 rounded-t-lg p-8">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="text-3xl font-headline text-primary">Pedido Realizado com Sucesso!</CardTitle>
          <CardDescription className="text-lg">
            Obrigado pela sua compra, {order.customer.name.split(' ')[0]}!
          </CardDescription>
          <p className="font-semibold text-muted-foreground">Número do Pedido: <Badge variant="secondary">{order.id}</Badge></p>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-4">Resumo do Pedido</h3>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted">
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                      </div>
                      <p>{item.name} <span className="text-muted-foreground">x{item.quantity}</span></p>
                    </div>
                    <p>{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Detalhes do Pagamento</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total do Pedido:</span>
                  <span className="font-semibold">{formatCurrency(order.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Forma de Pagamento:</span>
                  <span className="font-semibold">{order.paymentMethod}</span>
                </div>
                {order.paymentMethod === 'Crediário' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parcelas:</span>
                      <span className="font-semibold text-accent">{order.installments}x de {formatCurrency(order.installmentValue)}</span>
                    </div>
                     <div className="flex justify-between">
                      <span className="text-muted-foreground">Próximo Vencimento:</span>
                      <span className="font-semibold">{order.installmentDetails && order.installmentDetails.length > 0 ? format(new Date(order.installmentDetails[0].dueDate), 'dd/MM/yyyy') : '-'}</span>
                    </div>
                  </>
                )}
              </div>
               { (order.paymentMethod === 'Pix' || order.paymentMethod === 'Crediário') && pixPayload && (
                 <div className="mt-6">
                    <p className="font-semibold mb-2 text-primary">{order.paymentMethod === 'Pix' ? 'Pague com PIX para confirmar' : 'Pague a 1ª parcela com PIX'}</p>
                    <PixQRCode payload={pixPayload} />
                 </div>
              )}
            </div>
          </div>
          <Separator className="my-8" />
          <div>
            <h3 className="font-semibold text-lg mb-4">Informações de Entrega</h3>
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">{order.customer.name}</p>
              <p>{`${order.customer.address}, ${order.customer.number}`}{order.customer.complement ? `, ${order.customer.complement}` : ''}</p>
              <p>{`${order.customer.neighborhood}, ${order.customer.city}, ${order.customer.state} - ${order.customer.zip}`}</p>
              <p>Email: {order.customer.email}</p>
              <p>Telefone: {order.customer.phone}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-center p-6 bg-muted/50 rounded-b-lg">
          <Link href="/" className="w-full">
            <Button className="w-full md:w-auto">Voltar para a Página Inicial</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
