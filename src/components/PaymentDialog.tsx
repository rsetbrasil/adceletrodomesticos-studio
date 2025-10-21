
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Installment, Payment } from '@/lib/types';
import { Banknote, CreditCard, Smartphone } from 'lucide-react';

const formatCurrency = (value: number) => {
  if (isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  installment: Installment;
  orderId: string;
  customerName: string;
  onSubmit: (payment: Payment, isFullPayment: boolean) => void;
}

export default function PaymentDialog({
  isOpen,
  onOpenChange,
  installment,
  orderId,
  customerName,
  onSubmit,
}: PaymentDialogProps) {
  const [amountPaidStr, setAmountPaidStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Payment['method']>('Dinheiro');

  const remainingAmount = useMemo(() => {
    return (installment.amount || 0) - (installment.paidAmount || 0);
  }, [installment]);

  useEffect(() => {
    if (isOpen) {
      setAmountPaidStr(remainingAmount.toFixed(2).replace('.', ','));
    }
  }, [isOpen, remainingAmount]);

  const amountPaid = useMemo(() => {
    const parsed = parseFloat(amountPaidStr.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  }, [amountPaidStr]);

  const change = useMemo(() => {
    if (paymentMethod === 'Dinheiro' && amountPaid > remainingAmount) {
      return amountPaid - remainingAmount;
    }
    return 0;
  }, [amountPaid, remainingAmount, paymentMethod]);

  const handleQuickValue = (value: number) => {
    setAmountPaidStr(value.toFixed(2).replace('.', ','));
  };

  const handleSubmit = () => {
    if (amountPaid <= 0) return;

    const finalAmountToRecord = Math.min(amountPaid, remainingAmount);

    const payment: Payment = {
      amount: finalAmountToRecord,
      date: new Date().toISOString(),
      method: paymentMethod,
    };
    
    const isFullPayment = finalAmountToRecord >= remainingAmount;

    onSubmit(payment, isFullPayment);
  };
  
  const quickValues = [10, 20, 50, 100, remainingAmount].filter(v => v > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento da Parcela #{installment.installmentNumber}</DialogTitle>
          <DialogDescription>
            Pedido {orderId} de {customerName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="p-4 rounded-lg bg-muted text-center">
            <p className="text-sm text-muted-foreground">Valor Pendente da Parcela</p>
            <p className="text-3xl font-bold">{formatCurrency(remainingAmount)}</p>
          </div>

          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as Payment['method'])}
              className="flex gap-4"
            >
              <Label className="flex flex-col items-center justify-center gap-2 rounded-md border p-3 hover:bg-accent hover:text-accent-foreground has-[:checked]:border-primary has-[:checked]:bg-primary/10 flex-1 cursor-pointer">
                <RadioGroupItem value="Dinheiro" id="dinheiro" className="sr-only" />
                <Banknote />
                <span className="text-sm">Dinheiro</span>
              </Label>
               <Label className="flex flex-col items-center justify-center gap-2 rounded-md border p-3 hover:bg-accent hover:text-accent-foreground has-[:checked]:border-primary has-[:checked]:bg-primary/10 flex-1 cursor-pointer">
                <RadioGroupItem value="Pix" id="pix" className="sr-only" />
                <Smartphone />
                <span className="text-sm">Pix</span>
              </Label>
               <Label className="flex flex-col items-center justify-center gap-2 rounded-md border p-3 hover:bg-accent hover:text-accent-foreground has-[:checked]:border-primary has-[:checked]:bg-primary/10 flex-1 cursor-pointer">
                <RadioGroupItem value="Cartão" id="cartao" className="sr-only" />
                <CreditCard />
                <span className="text-sm">Cartão</span>
              </Label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount-paid">Valor Recebido</Label>
            <Input
              id="amount-paid"
              value={amountPaidStr}
              onChange={(e) => setAmountPaidStr(e.target.value)}
              className="text-2xl h-12 text-right"
              placeholder="0,00"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {quickValues.map(val => (
                <Button key={val} type="button" variant="outline" size="sm" onClick={() => handleQuickValue(val)}>
                    {formatCurrency(val)}
                </Button>
            ))}
          </div>


          {change > 0 && (
            <div className="p-4 rounded-lg bg-green-500/10 text-center">
              <p className="text-sm text-green-700">Troco</p>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(change)}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
