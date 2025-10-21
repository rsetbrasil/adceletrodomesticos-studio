
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSettings } from '@/context/SettingsContext';
import { useMemo, useState, useEffect } from 'react';
import type { Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import Logo from '@/components/Logo';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const formatCurrency = (value: number) => {
  if (typeof value !== 'number') return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const CarnetContent = ({ order, settings }: { order: Order; settings: any }) => (
    <div className="bg-background p-6 break-inside-avoid print:p-0 text-sm">
        <div className="flex justify-between items-start pb-4 border-b">
             <div className="flex items-center gap-4">
                <Logo />
                <div>
                    <p className="font-bold">{settings.storeName}</p>
                    <p className="text-xs text-muted-foreground">CNPJ/Endereço da loja aqui se necessário</p>
                </div>
             </div>
             <div className="text-right">
                <p className="font-semibold">Pedido Nº</p>
                <p className="font-mono text-lg">{order.id}</p>
             </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-4">
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

        <div className="border rounded-md overflow-hidden">
            <table className="w-full text-xs">
                <thead className="bg-muted/50 print:bg-gray-100">
                    <tr className="border-b">
                        <th className="p-1 text-center font-medium w-[15%]">Parcela</th>
                        <th className="p-1 text-left font-medium w-[25%]">Vencimento</th>
                        <th className="p-1 text-right font-medium w-[25%]">Valor (R$)</th>
                        <th className="p-1 text-left font-medium w-[35%]">Data do Pagamento</th>
                    </tr>
                </thead>
                <tbody>
                    {(order.installmentDetails || []).map((installment) => (
                        <tr key={installment.installmentNumber} className="border-b last:border-none">
                            <td className="p-1 text-center font-medium">{installment.installmentNumber} / {order.installments}</td>
                            <td className="p-1">{format(new Date(installment.dueDate), 'dd/MM/yyyy')}</td>
                            <td className="p-1 text-right font-mono">{formatCurrency(installment.amount)}</td>
                            <td className="p-1 border-l">
                                {installment.status === 'Pago' 
                                    ? (installment.paymentDate ? format(new Date(installment.paymentDate), 'dd/MM/yyyy') : 'Pago')
                                    : '___ / ___ / ______'
                                }
                            </td>
                        </tr>
                    ))}
                </tbody>
                 <tfoot className="bg-muted/50 print:bg-gray-100 font-bold">
                    <tr className="border-t">
                        <td colSpan={2} className="p-1 text-right">VALOR TOTAL:</td>
                        <td className="p-1 text-right font-mono">{formatCurrency(order.total)}</td>
                        <td className="p-1"></td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
            <p className="font-semibold">Observações:</p>
            <p>1. O pagamento pode ser realizado na loja ou via PIX (solicite o código ao vendedor).</p>
            <p>2. Em caso de atraso, juros e multas podem ser aplicados.</p>
        </div>
    </div>
);


export default function CarnetPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { settings } = useSettings();

  useEffect(() => {
    const fetchOrder = async () => {
        const orderId = params.id as string;
        if (!orderId) {
            setIsLoading(false);
            return;
        };

        try {
            const orderRef = doc(db, 'orders', orderId);
            const docSnap = await getDoc(orderRef);

            if(docSnap.exists()) {
                setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
            } else {
                setOrder(null);
            }
        } catch (error) {
            console.error("Error fetching order:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `orders/${orderId}`,
                operation: 'get',
            }));
            setOrder(null);
        } finally {
            setIsLoading(false);
        }
    }

    fetchOrder();
  }, [params.id]);


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
        
        <main className="max-w-4xl mx-auto bg-background rounded-lg border shadow-sm print:grid print:grid-cols-2 print:gap-x-8 print:border-none print:shadow-none print:bg-transparent">
            <div className="print:border-r print:border-dashed print:border-black print:pr-4">
                <CarnetContent order={order} settings={settings} />
            </div>
            <div className="hidden print:block print:pl-4">
                <CarnetContent order={order} settings={settings} />
            </div>
        </main>
      </div>
    </div>
  );
}
