
'use client';

import { useParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';
import { useMemo, useRef } from 'react';
import type { Order, Installment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Printer, Send, CheckCircle } from 'lucide-react';
import Logo from '@/components/Logo';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generatePixPayload } from '@/lib/pix';
import PixQRCode from '@/components/PixQRCode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (value: number) => {
  if (typeof value !== 'number') return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const ReceiptContent = ({ order, installment, settings, pixPayload }: { order: Order; installment: Installment; settings: any; pixPayload: string | null }) => {
    const isPaid = installment.status === 'Pago';
    return (
         <div className="bg-background rounded-lg border shadow-sm p-6 break-inside-avoid print:shadow-none print:border-none print:rounded-none print:p-0">
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
                   <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">VENDEDOR(A)</p>
                        <p className="font-semibold">{order.sellerName}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">PRODUTOS</p>
                        <p className="font-semibold text-sm">{order.items.map(item => `${item.name} (x${item.quantity})`).join(', ')}</p>
                    </div>
               </div>
               <div className="flex justify-between items-end bg-muted/50 rounded p-4 mt-2">
                    <div>
                         <p className="text-xs text-muted-foreground">VALOR DO DOCUMENTO</p>
                         <p className="text-2xl font-bold text-primary">{formatCurrency(installment.amount)}</p>
                    </div>
                     {isPaid ? (
                        <div className="text-right">
                            <p className="font-bold text-lg text-green-600">PAGO</p>
                            {installment.paymentDate && (
                            <p className="text-sm text-foreground">
                                {format(new Date(installment.paymentDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                           )}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">Pagamento em loja ou via PIX</p>
                    )}
               </div>
               <div className="mt-4 border-t pt-2 text-xs text-muted-foreground">
                    <p>(=) Valor Cobrado: {formatCurrency(installment.amount)}</p>
               </div>

                <div className="break-inside-avoid pt-6">
                {isPaid ? (
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-green-600 rounded-lg bg-green-500/10 text-green-700 h-[340px]">
                    <CheckCircle className="h-12 w-12 mb-4" />
                    <h2 className="text-xl font-bold">PAGAMENTO CONFIRMADO</h2>
                    <p className="text-sm">Esta parcela foi liquidada.</p>
                    </div>
                ) : (
                    pixPayload && <PixQRCode payload={pixPayload} />
                )}
                </div>
            </div>
    )
}

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

  const pixPayload = useMemo(() => {
    if (!order || !installment || installment.status === 'Pago' || !settings.pixKey) return null;
    
    const { pixKey, storeName, storeCity } = settings;
    const txid = `${order.id}-${installment.installmentNumber}`;
    
    return generatePixPayload(pixKey, storeName, storeCity, txid, installment.amount);
  }, [order, installment, settings]);

  const handleGeneratePdfAndSend = async () => {
    const input = receiptRef.current;
    if (!input || !order || !installment) return;

    const pdfHiddenElements = input.querySelectorAll('.pdf-hidden');
    pdfHiddenElements.forEach(el => ((el as HTMLElement).style.display = 'none'));
    
    const canvas = await html2canvas(input, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff'
    });

    pdfHiddenElements.forEach(el => ((el as HTMLElement).style.display = ''));

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
    
    const contentWidth = pdfWidth - 20; // A4 width minus margins
    const contentHeight = (canvasHeight * contentWidth) / canvasWidth;

    if (contentHeight > pdfHeight - 20) {
        toast({ title: "Erro de Layout", description: "O conteúdo é muito grande para caber na página.", variant: "destructive" });
        return;
    }

    const x = 10;
    const y = (pdfHeight - contentHeight) / 2;

    pdf.addImage(imgData, 'PNG', x, y, contentWidth, contentHeight);

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

  const isPaid = installment.status === 'Pago';

  return (
    <div className="bg-muted/30 print:bg-white">
      <div className="container mx-auto py-8 px-4 print:max-w-none print:px-0">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 print-hidden gap-4">
          <div className="text-center">
             <h1 className="text-2xl font-bold">{isPaid ? 'Comprovante de Pagamento' : 'Boleto de Parcela'}</h1>
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

        <main ref={receiptRef} className="print:grid print:grid-cols-2 print:gap-8 print-scale-down">
            <ReceiptContent order={order} installment={installment} settings={settings} pixPayload={pixPayload} />
            {/* This second instance is hidden on screen and only appears for printing */}
            <div className="hidden print:block">
                <ReceiptContent order={order} installment={installment} settings={settings} pixPayload={pixPayload} />
            </div>
        </main>
      </div>
    </div>
  );
}
