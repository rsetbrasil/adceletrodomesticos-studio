'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useEffect, useState } from 'react';
import type { Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import Logo from '@/components/Logo';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  if (typeof value !== 'number') return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function CarnetPage() {
  const params = useParams();
  const router = useRouter();
  const { orders } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const orderId = params.id as string;
    if (orders && orderId) {
      const foundOrder = orders.find(o => o.id === orderId);
      setOrder(foundOrder || null);
    }
  }, [params.id, orders]);

  if (!isClient) {
    return <div className="p-8 text-center">Carregando carnê...</div>;
  }

  if (!order) {
    return (
      <div className="container mx-auto py-24 text-center">
        <h1 className="text-2xl font-bold">Pedido não encontrado</h1>
        <Button onClick={() => router.back()} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 print:bg-white">
      <div className="container mx-auto py-8 px-4">
        <header className="flex justify-between items-center mb-8 print-hidden">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Painel
          </Button>
          <div className="text-center">
             <h1 className="text-2xl font-bold">Carnê de Pagamento</h1>
             <p className="text-muted-foreground">Pedido: {order.id}</p>
          </div>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-1">
          {(order.installmentDetails || []).map((installment) => (
            <div key={installment.installmentNumber} className="bg-background rounded-lg border shadow-sm p-4 break-inside-avoid">
               <div className="flex justify-between items-start pb-2 border-b">
                 <Logo />
                 <div className="text-right">
                    <p className="font-bold">Vencimento</p>
                    <p className="text-lg">{format(new Date(installment.dueDate), 'dd/MM/yyyy', { locale: ptBR })}</p>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4 py-4">
                   <div>
                       <p className="text-xs text-muted-foreground">CLIENTE</p>
                       <p className="font-semibold">{order.customer.name}</p>
                   </div>
                   <div>
                       <p className="text-xs text-muted-foreground">CPF</p>
                       <p className="font-semibold">{order.customer.cpf}</p>
                   </div>
                    <div>
                       <p className="text-xs text-muted-foreground">Nº DO PEDIDO</p>
                       <p className="font-mono text-sm">{order.id}</p>
                   </div>
                   <div>
                       <p className="text-xs text-muted-foreground">PARCELA</p>
                       <p className="font-semibold">{installment.installmentNumber} de {order.installments}</p>
                   </div>
               </div>
               <div className="flex justify-between items-end bg-muted/50 rounded p-4 mt-2">
                    <div>
                         <p className="text-xs text-muted-foreground">VALOR DO DOCUMENTO</p>
                         <p className="text-2xl font-bold text-primary">{formatCurrency(installment.amount)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Pagamento em loja</p>
               </div>
               <div className="mt-4 border-t pt-2 text-xs text-muted-foreground">
                    <p>(=) Valor Cobrado: {formatCurrency(installment.amount)}</p>
               </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
