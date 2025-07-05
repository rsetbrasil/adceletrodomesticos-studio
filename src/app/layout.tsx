'use client';

import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Toaster } from '@/components/ui/toaster';
import { usePathname } from 'next/navigation';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isSpecialRoute = pathname.startsWith('/carnet') || pathname.startsWith('/login');
  const isAdminRoute = pathname.startsWith('/admin');

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* We can't use the Metadata object in a client component, 
            so we add title and other head tags manually,
            child layouts will still override this. */}
        <title>ADC MÓVEIS E ELETROS</title>
        <meta name="description" content="ADC MÓVEIS E ELETROS - Sua loja de móveis e eletrodomésticos." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <CartProvider>
            {isSpecialRoute || isAdminRoute ? (
              <>{children}</>
            ) : (
              <div className="relative flex min-h-screen flex-col bg-background">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            )}
            <Toaster />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
