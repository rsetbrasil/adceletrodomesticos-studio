
'use client';

import { useParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';
import { useMemo, useRef }from 'react';
import type { Order, Installment, StoreSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Printer, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (value: number) => {
  if (typeof value !== 'number') return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Simple number to currency words converter (Portuguese)
function numeroParaExtenso(n: number) {
    const extenso = {
        '0': 'zero', '1': 'um', '2': 'dois', '3': 'três', '4': 'quatro', '5': 'cinco', '6': 'seis', '7': 'sete', '8': 'oito', '9': 'nove', '10': 'dez',
        '11': 'onze', '12': 'doze', '13': 'treze', '14': 'catorze', '15': 'quinze', '16': 'dezesseis', '17': 'dezessete', '18': 'dezoito', '19': 'dezenove',
        '20': 'vinte', '30': 'trinta', '40': 'quarenta', '50': 'cinquenta', '60': 'sessenta', '70': 'setenta', '80': 'oitenta', '90': 'noventa',
        '100': 'cem', '200': 'duzentos', '300': 'trezentos', '400': 'quatrocentos', '500': 'quinhentos', '600': 'seiscentos', '700': 'setecentos', '800': 'oitocentos', '900': 'novecentos',
        '1000': 'mil'
    };

    const numStr = n.toFixed(2);
    const [reaisStr, centavosStr] = numStr.split('.');
    const reais = parseInt(reaisStr);
    const centavos = parseInt(centavosStr);

    function getExtenso(num: number): string {
        if (extenso[num]) return extenso[num];
        if (num > 1000) { // Basic support for thousands
             const thousands = Math.floor(num / 1000);
             const remainder = num % 1000;
             return `${getExtenso(thousands)} mil${remainder > 0 ? ' e ' + getExtenso(remainder) : ''}`;
        }
        if (num > 100) {
            const hundreds = Math.floor(num / 100) * 100;
            const remainder = num % 100;
            return `${extenso[hundreds]}${remainder > 0 ? ' e ' + getExtenso(remainder) : ''}`;
        }
        if (num > 19) {
            const tens = Math.floor(num / 10) * 10;
            const remainder = num % 10;
            return `${extenso[tens]}${remainder > 0 ? ' e ' + getExtenso(remainder) : ''}`;
        }
        return '';
    }

    let result = '';
    if (reais > 0) {
        result += `${getExtenso(reais)} ${reais > 1 ? 'reais' : 'real'}`;
    }
    if (centavos > 0) {
        if (reais > 0) result += ' e ';
        result += `${getExtenso(centavos)} ${centavos > 1 ? 'centavos' : 'centavo'}`;
    }

    return result || 'zero reais';
}


const ReceiptContent = ({ order, installment, settings, via }: { order: Order; installment: Installment; settings: StoreSettings; via: 'Empresa' | 'Cliente' }) => {
    
    return (
        <div className="bg-white p-6 break-inside-avoid-page text-black font-mono text-xs">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="font-bold">Empresa: {settings.storeName}</p>
                    <p>CNPJ: {'00.000.000/0001-00'}</p>
                </div>
                <h1 className="font-bold text-lg tracking-wider">RECIBO</h1>
            </div>

            <div className="grid grid-cols-2 gap-x-4 border-y border-black py-2">
                <div className="space-y-1">
                    <p>Imóvel: {order.items.map(i => i.name).join(', ')}</p>
                    <p>Documento: {order.id}</p>
                    <p>Centro Custo: {'N/A'}</p>
                    <p>Unidades: {order.items.reduce((acc, i) => acc + i.quantity, 0)}</p>
                    <p>Vencimento: {format(new Date(installment.dueDate), 'dd/MM/yyyy')}</p>
                    <p>Valor: {formatCurrency(installment.amount)}</p>
                    <p>Seguro: R$ 0,00</p>
                </div>
                <div className="space-y-1 text-right">
                    <p>Título/Parcela: {installment.installmentNumber}/{order.installments}</p>
                    <p>Tipo Parc: {'PM'}</p>
                    <p>Desconto: R$ 0,00</p>
                    <p>Líquido: {formatCurrency(installment.amount)}</p>
                </div>
            </div>

            <div className="py-4 text-justify">
                <p>
                    Recebemos de {order.customer.name.toUpperCase()}, CPF {order.customer.cpf},
                    a importância supra de {formatCurrency(installment.amount)} ({numeroParaExtenso(installment.amount)}),
                    referente a sua liquidação (da parcela acima citada).
                </p>
            </div>
            
            <div className="flex justify-center items-end flex-col">
                <p>{settings.storeCity}, {format(new Date(installment.paymentDate || new Date()), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                <div className="border-t border-black w-72 mt-8 pt-1 text-center">
                    <p>{settings.storeName}</p>
                </div>
            </div>

            <div className="flex justify-between items-center mt-12 border-t border-black pt-1">
                <p>{settings.storeCity}/{order.customer.state}</p>
                <p className="font-bold">Via {via}</p>
                <p>Cadastrado em {format(new Date(order.date), "dd/MM/yyyy 'às' HH:mm")}</p>
            </div>
        </div>
    );
};


export default function SingleInstallmentPage() {
  const params = useParams();
  const { orders, isLoading } = useCart();
  const { settings } = useSettings();
  const receiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { order, installment } = useMemo(() => {
    if (isLoading || !orders || !params.id || !params.installmentNumber) {
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
  }, [isLoading, orders, params.id, params.installmentNumber]);


  const handleGeneratePdfAndSend = async () => {
    const input = receiptRef.current;
    if (!input || !order || !installment) return;

    // Temporarily remove print-only styles for canvas rendering
    input.classList.remove('print:grid', 'print:grid-cols-2', 'print:gap-8', 'print-scale-down');
    
    const canvas = await html2canvas(input, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff'
    });

    // Re-add print styles
    input.classList.add('print:grid', 'print:grid-cols-2', 'print:gap-8', 'print-scale-down');


    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
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
    const message = `Olá ${customerName}, segue o comprovante de pagamento da sua parcela nº ${installment.installmentNumber} (pedido ${order.id}), no valor de ${formatCurrency(installment.amount)}.\n\nObrigado!\n*${settings.storeName}*`;
    
    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

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
          <div className="text-center">
             <h1 className="text-2xl font-bold">Comprovante de Pagamento</h1>
             <p className="text-muted-foreground">Pedido: {order.id}</p>
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

        <main ref={receiptRef} className="bg-white print:grid print:grid-cols-1 print:gap-8 print-scale-down">
             <div className="space-y-8">
                <ReceiptContent order={order} installment={installment} settings={settings} via="Empresa" />
                <ReceiptContent order={order} installment={installment} settings={settings} via="Cliente" />
            </div>
        </main>
      </div>
    </div>
  );
}

