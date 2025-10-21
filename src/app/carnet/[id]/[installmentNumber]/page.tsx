
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSettings } from '@/context/SettingsContext';
import { useMemo, useRef, useState, useEffect }from 'react';
import type { Order, Installment, StoreSettings, Payment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Printer, Send, ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Logo from '@/components/Logo';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const formatCurrency = (value: number) => {
  if (typeof value !== 'number' || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

function numeroParaExtenso(n: number): string {
    if (isNaN(n)) return 'valor inválido';

    const numStr = n.toFixed(2);
    const [reaisStr, centavosStr] = numStr.split('.');
    const reais = parseInt(reaisStr, 10);
    const centavos = parseInt(centavosStr, 10);

    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dezenas = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const especiais = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    function getExtenso(num: number): string {
        if (num === 0) return '';
        if (num < 10) return unidades[num];
        if (num < 20) return especiais[num - 10];
        if (num < 100) {
            const dezena = Math.floor(num / 10);
            const unidade = num % 10;
            return `${dezenas[dezena]}${unidade > 0 ? ` e ${getExtenso(unidade)}` : ''}`;
        }
        if (num === 100) return 'cem';
        if (num < 1000) {
            const centena = Math.floor(num / 100);
            const resto = num % 100;
            return `${centenas[centena]}${resto > 0 ? ` e ${getExtenso(resto)}` : ''}`;
        }
        if (num < 1000000) {
            const milhar = Math.floor(num / 1000);
            const resto = num % 1000;
            const milharStr = milhar === 1 ? 'mil' : `${getExtenso(milhar)} mil`;
            return `${milharStr}${resto > 0 ? ` e ${getExtenso(resto)}` : ''}`;
        }
        return 'valor muito alto';
    }

    const reaisExtenso = reais > 0 ? `${getExtenso(reais)} ${reais > 1 ? 'reais' : 'real'}` : '';
    const centavosExtenso = centavos > 0 ? `${getExtenso(centavos)} ${centavos > 1 ? 'centavos' : 'centavo'}` : '';

    if (reaisExtenso && centavosExtenso) {
        return `${reaisExtenso} e ${centavosExtenso}`;
    }
    if (reaisExtenso) {
        return reaisExtenso;
    }
    if (centavosExtenso) {
        return centavosExtenso;
    }
    return 'zero reais';
}


const ReceiptContent = ({ order, installment, settings, via }: { order: Order; installment: Installment; settings: StoreSettings; via: 'Empresa' | 'Cliente' }) => {
    
    const sortedPayments = useMemo(() => {
        if (!installment.payments || installment.payments.length === 0) return [];
        return [...installment.payments].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [installment.payments]);

    const totalPaidOnInstallment = installment.paidAmount || 0;
    const remainingBalance = installment.amount - totalPaidOnInstallment;
    
    return (
        <div className="bg-white p-6 break-inside-avoid-page text-black font-mono text-xs relative">
             <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                    <Logo />
                    <div className="text-[10px]">
                        <p className="font-bold">{settings.storeName}</p>
                        <p className="whitespace-pre-line">{settings.storeAddress}</p>
                    </div>
                </div>
                <h1 className="font-bold text-lg tracking-wider">EXTRATO DA PARCELA</h1>
            </div>

            <div className="grid grid-cols-2 gap-x-4 border-y border-black py-2">
                <div className="space-y-1">
                    <p>CLIENTE: {order.customer.name.toUpperCase()}</p>
                    <p>CPF: {order.customer.cpf}</p>
                    <p>PEDIDO: {order.id}</p>
                </div>
                <div className="space-y-1 text-right">
                    <p>PARCELA: {installment.installmentNumber}/{order.installments}</p>
                    <p>VENCIMENTO: {format(new Date(installment.dueDate), 'dd/MM/yyyy')}</p>
                    <p>VALOR ORIGINAL: {formatCurrency(installment.amount)}</p>
                </div>
            </div>

            <div className="py-4">
                <h2 className="font-bold text-center mb-2">HISTÓRICO DE PAGAMENTOS</h2>
                {sortedPayments.length > 0 ? (
                    <table className="w-full">
                        <thead className="border-b border-black">
                            <tr>
                                <th className="text-left py-1">Data</th>
                                <th className="text-left py-1">Método</th>
                                <th className="text-right py-1">Valor Pago</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPayments.map((p, index) => (
                                <tr key={p.id + index}>
                                    <td className="py-1">{format(parseISO(p.date), 'dd/MM/yy HH:mm')}</td>
                                    <td className="py-1">{p.method}</td>
                                    <td className="py-1 text-right">{formatCurrency(p.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-center text-gray-500">Nenhum pagamento registrado para esta parcela.</p>
                )}
            </div>

            <div className="grid grid-cols-3 gap-x-4 border-y border-black py-2 mt-2">
                <div className="font-bold">
                    <p>TOTAL PAGO:</p>
                    <p>{formatCurrency(totalPaidOnInstallment)}</p>
                </div>
                <div className="font-bold text-red-600">
                    <p>SALDO PENDENTE:</p>
                    <p>{formatCurrency(remainingBalance)}</p>
                </div>
                <div className="text-right flex flex-col justify-center items-end">
                    {installment.status === 'Pago' && (
                        <div className="relative">
                            <div className="border-4 border-blue-500 rounded-md px-4 py-1 transform -rotate-12">
                                <p className="text-xl font-black text-blue-500 tracking-wider">PAGO</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex justify-center items-end flex-col mt-4">
                <p>{settings.storeCity}, {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
            </div>

            <div className="flex justify-between items-center mt-8 border-t border-black pt-1">
                <p>{settings.storeCity}/{order.customer.state}</p>
                <p className="font-bold">Via {via}</p>
                <p>Data da Compra: {format(new Date(order.date), "dd/MM/yyyy 'às' HH:mm")}</p>
            </div>
        </div>
    );
};


export default function SingleInstallmentPage() {
  const params = useParams();
  const router = useRouter();
  const { settings } = useSettings();
  const receiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const installment = useMemo(() => {
    if (!order || !params.installmentNumber) {
        return null;
    }
    const installmentNum = parseInt(params.installmentNumber as string, 10);
    if (isNaN(installmentNum)) {
        return null;
    }
    return order.installmentDetails?.find(i => i.installmentNumber === installmentNum) || null;
  }, [order, params.installmentNumber]);


  const handleGeneratePdfAndSend = async () => {
    const input = receiptRef.current;
    if (!input || !order || !installment) return;
    
    // Temporarily apply a class to the body for print-specific styles
    document.body.classList.add('print-receipt');
    
    const canvas = await html2canvas(input, {
        scale: 2.5, 
        useCORS: true,
        backgroundColor: '#ffffff'
    });

    // Remove the class after rendering
    document.body.classList.remove('print-receipt');

    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    const ratio = canvasWidth / canvasHeight;
    let imgWidth = pdfWidth - 20; // with margins
    let imgHeight = imgWidth / ratio;
    
    if(imgHeight > pdfHeight - 20) {
        imgHeight = pdfHeight - 20;
        imgWidth = imgHeight * ratio;
    }

    const x = (pdfWidth - imgWidth) / 2;
    const y = (pdfHeight - imgHeight) / 2;

    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
    pdf.save(`comprovante-${order.id}-${installment.installmentNumber}.pdf`);

    const customerName = order.customer.name.split(' ')[0];
    const phone = order.customer.phone.replace(/\D/g, '');
    const message = `Olá ${customerName}, segue o extrato atualizado da sua parcela nº ${installment.installmentNumber} (pedido ${order.id}).\n\nObrigado!\n*${settings.storeName}*`;
    
    const webUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(webUrl, '_blank');

    toast({
        title: "Passo 1/2: PDF Gerado!",
        description: "Seu PDF foi baixado. Agora, anexe o arquivo na conversa do WhatsApp que abriu.",
        duration: 10000
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center">Carregando parcela...</div>;
  }

  if (!order || !installment) {
    return (
      <div className="container mx-auto py-24 text-center">
        <h1 className="text-2xl font-bold">Parcela não encontrada</h1>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 print:bg-white">
      <div className="container mx-auto py-8 px-4 print:max-w-none print:px-0">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 print-hidden gap-4">
           <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
            </Button>
          <div className="text-center">
             <h1 className="text-2xl font-bold">Extrato da Parcela</h1>
             <p className="text-muted-foreground">Pedido: {order.id} / Parcela: {installment.installmentNumber}</p>
          </div>
           <div className="flex gap-2">
            <Button onClick={handleGeneratePdfAndSend} className="pdf-hidden">
                <Send className="mr-2 h-4 w-4" />
                Gerar PDF e Abrir WhatsApp
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="pdf-hidden">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
            </Button>
          </div>
        </header>

        <main ref={receiptRef} className="bg-white print:grid print:grid-cols-2 print:gap-8">
            <div className="print:border-r print:border-dashed print:border-black print:pr-4">
                <ReceiptContent order={order} installment={installment} settings={settings} via="Empresa" />
            </div>
            <div className="hidden print:block print:pl-4">
                <ReceiptContent order={order} installment={installment} settings={settings} via="Cliente" />
            </div>
        </main>
      </div>
    </div>
  );
}
