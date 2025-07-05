'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, QrCode } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

interface PixQRCodeProps {
  payload: string;
}

export default function PixQRCode({ payload }: PixQRCodeProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (payload) {
      QRCode.toDataURL(payload, { width: 256, margin: 1 })
        .then(url => {
          setQrCodeUrl(url);
        })
        .catch(err => {
          console.error('Failed to generate QR Code', err);
        });
    }
  }, [payload]);

  const handleCopy = () => {
    navigator.clipboard.writeText(payload).then(() => {
      toast({
        title: 'Copiado!',
        description: 'O código PIX foi copiado para a área de transferência.',
      });
    });
  };

  if (!payload) return null;

  return (
    <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-muted/50">
        <div className="flex items-center gap-2 font-semibold">
            <QrCode className="h-5 w-5 text-primary"/>
            <span>Pague com PIX</span>
        </div>
      {qrCodeUrl ? (
        <img src={qrCodeUrl} alt="PIX QR Code" className="w-48 h-48 rounded-md" />
      ) : (
        <Skeleton className="w-48 h-48 rounded-md" />
      )}
      <div className="w-full text-center">
        <p className="text-sm font-semibold mb-1">PIX Copia e Cola</p>
        <div className="relative">
            <p className="text-xs text-muted-foreground break-all bg-background p-2 rounded border pr-10">
                {payload}
            </p>
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8 print-hidden pdf-hidden"
                onClick={handleCopy}
            >
                <Copy className="h-4 w-4" />
            </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2 print-hidden pdf-hidden">
        Abra o app do seu banco, escolha a opção PIX, selecione "Ler QR Code" ou "PIX Copia e Cola" e finalize o pagamento.
      </p>
    </div>
  );
}
