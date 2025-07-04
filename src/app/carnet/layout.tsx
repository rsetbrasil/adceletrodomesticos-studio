
import type { Metadata } from 'next';
import '../globals.css';
import { CartProvider } from '@/context/CartContext';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Carnê de Pagamento - ADC Móveis',
  description: 'Visualização e impressão de carnê de pagamento.',
};

export default function CarnetLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <CartProvider>
          {children}
          <Toaster />
        </CartProvider>
      </body>
    </html>
  );
}
