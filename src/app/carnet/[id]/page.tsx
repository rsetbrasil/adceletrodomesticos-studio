
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';
import { useMemo, useEffect } from 'react';
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

const CarnetContent = ({ order, settings }: { order: Order; settings: any }) => (
    <div className="bg-background rounded-lg border shadow-sm p-6 break-inside-avoid print:shadow-none print:border-none print:rounded-none print:p-0">
        <div className="flex justify-between items-start pb-4 border-b">
             <div className="flex items-center gap-6">
                <Logo />
                <div>
                    <p className="font-bold text-lg">{settings.storeName}</p>
                    <p className="text-sm text-muted-foreground">CNPJ/Endereço da loja aqui se necessário</p>
                </div>
             </div>
             <div className="text-right">
                <p className="font-semibold">Pedido Nº</p>
                <p className="font-mono text-lg">{order.id}</p>
             </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 py-6 text-sm">
            <div>
                <p className="text-xs text-muted-foreground">CLIENTE</p>
                <p className="font-semibold">{order.customer.name}</p>
            </div>
             <div>
                <p className="text-xs text-muted-foreground">CPF</p>
                <p className="font-semibold">{order.customer.cpf}</p>
            </div>
             <div>
                <p className="text-xs text-muted-foreground">DATA DA COMPRA</p>
                <p className="font-semibold">{format(new Date(order.date), 'dd/MM/yyyy', { locale: ptBR })}</p>
            </div>
            <div>
                <p className="text-xs text-muted-foreground">VENDEDOR(A)</p>
                <p className="font-semibold">{order.sellerName}</p>
            </div>
             <div className="col-span-2">
                <p className="text-xs text-muted-foreground">PRODUTOS</p>
                <p className="font-semibold">{order.items.map(item => item.name).join(', ')}</p>
            </div>
        </div>

        <div className="border rounded-md">
            <table className="w-full text-sm">
                <thead className="bg-muted/50 print:bg-gray-100">
                    <tr className="border-b">
                        <th className="p-2 text-center font-medium w-1/6">Parcela</th>
                        <th className="p-2 text-center font-medium w-1/4">Vencimento</th>
                        <th className="p-2 text-right font-medium w-1/4">Valor (R$)</th>
                        <th className="p-2 text-center font-medium w-1/3">Data do Pagamento</th>
                    </tr>
                </thead>
                <tbody>
                    {(order.installmentDetails || []).map((installment) => (
                        <tr key={installment.installmentNumber} className="border-b last:border-none">
                            <td className="p-3 text-center font-medium">{installment.installmentNumber} / {order.installments}</td>
                            <td className="p-3 text-center">{format(new Date(installment.dueDate), 'dd/MM/yyyy')}</td>
                            <td className="p-3 text-right font-mono">{formatCurrency(installment.amount)}</td>
                            <td className="p-3 text-center border-l">
                                {installment.status === 'Pago' 
                                    ? (installment.paymentDate ? format(new Date(installment.paymentDate), 'dd/MM/yyyy') : 'Pago')
                                    : '___ / ___ / ______'
                                }
                            </td>
                        </tr>
                    ))}
                </tbody>
                 <tfoot className="bg-muted/50 print:bg-gray-100">
                    <tr className="border-t">
                        <td colSpan={2} className="p-3 text-right font-bold">VALOR TOTAL:</td>
                        <td className="p-3 text-right font-bold font-mono">{formatCurrency(order.total)}</td>
                        <td className="p-3"></td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <div className="mt-8 text-xs text-muted-foreground">
            <p>Observações:</p>
            <p>1. O pagamento pode ser realizado na loja ou via PIX (solicite o código ao vendedor).</p>
            <p>2. Em caso de atraso, juros e multas podem ser aplicados.</p>
        </div>
    </div>
);


export default function CarnetPage() {
  const params = useParams();
  const router = useRouter();
  const { orders, isLoading } = useCart();
  const { settings } = useSettings();

  const order = useMemo(() => {
    if (isLoading || !orders || !params.id) {
        return null;
    }
    const orderId = params.id as string;
    return orders.find(o => o.id === orderId) || null;
  }, [isLoading, orders, params.id]);


  if (isLoading) {
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
      <div className="container mx-auto py-8 px-4 print:max-w-none print:px-8">
        <header className="flex justify-between items-center mb-8 print-hidden">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div className="text-center">
             <h1 className="text-2xl font-bold">Carnê de Pagamento</h1>
             <p className="text-muted-foreground">Pedido: {order.id}</p>
          </div>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Carnê
          </Button>
        </header>
        
        <main className="grid grid-cols-1 print:grid-cols-2 print:gap-8 print-scale-down">
            <CarnetContent order={order} settings={settings} />
            {/* This second instance is hidden on screen and only appears for printing */}
            <div className="hidden print:block">
                <CarnetContent order={order} settings={settings} />
            </div>
        </main>
      </div>
    </div>
  );
}
