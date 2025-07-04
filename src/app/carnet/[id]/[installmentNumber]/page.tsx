'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useEffect, useState, useMemo } from 'react';
import type { Order, Installment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import Logo from '@/components/Logo';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  if (typeof value !== 'number') return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function SingleInstallmentPage() {
  const params = useParams();
  const router = useRouter();
  const { orders } = useCart();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { order, installment } = useMemo(() => {
    if (!isClient || !orders || !params.id || !params.installmentNumber) {
        return { order: null, installment: null };
    }
    const orderId = params.id as string;
    const installmentNum = parseInt(params.installmentNumber as string, 10);
    
    if (isNaN(installmentNum)) {
        return { order: null, installment: null };
    }

    const foundOrder = orders.find(o => o.id === orderId);
    if (!foundOrder) {
        return { order: null, installment: null };
    }

    const foundInstallment = foundOrder.installmentDetails?.find(i => i.installmentNumber === installmentNum);
    
    return { order: foundOrder, installment: foundInstallment || null };
  }, [isClient, orders, params.id, params.installmentNumber]);

  if (!isClient) {
    return <div className="p-8 text-center">Carregando parcela...</div>;
  }

  if (!order || !installment) {
    return (
      <div className="container mx-auto py-24 text-center">
        <h1 className="text-2xl font-bold">Parcela não encontrada</h1>
        <Button onClick={() => router.back()} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 print:bg-white py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <header className="flex justify-between items-center mb-8 print-hidden">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div className="text-center">
             <h1 className="text-2xl font-bold">Comprovante de Parcela</h1>
             <p className="text-muted-foreground">Pedido: {order.id}</p>
          </div>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </header>

        <main className="break-inside-avoid">
            <div className="bg-background rounded-lg border shadow-sm p-6">
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
        </main>
      </div>
    </div>
  );
}
