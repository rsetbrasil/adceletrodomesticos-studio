

'use client';

import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CustomerAuthProvider } from '@/context/CustomerAuthContext';
import { CartProvider } from '@/context/CartContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { PermissionsProvider } from '@/context/PermissionsContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Toaster } from '@/components/ui/toaster';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AuditProvider } from '@/context/AuditContext';
import FirebaseErrorListener from '@/components/FirebaseErrorListener';
import WhatsAppButton from '@/components/WhatsAppButton';
import { AdminProvider } from '@/context/AdminContext';

// This is a new component that wraps the main content
// It has access to all the contexts defined in the main RootLayout
const AppContent = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const isSpecialRoute = pathname.startsWith('/carnet') || pathname.startsWith('/login') || pathname.startsWith('/area-cliente');
  const isAdminRoute = pathname.startsWith('/admin');
  const isHomePage = pathname === '/';

  return (
    <>
      {isSpecialRoute || isAdminRoute ? (
        <>{children}</>
      ) : (
        <div className="relative flex min-h-screen flex-col bg-background">
          <Header />
          <main className={cn("flex-1", isHomePage ? '' : 'pb-20')}>{children}</main>
          <Footer />
          <WhatsAppButton />
        </div>
      )}
      <Toaster />
      <FirebaseErrorListener />
    </>
  );
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
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
        <AuditProvider>
          <AuthProvider>
            <PermissionsProvider>
              <SettingsProvider>
                <AdminProvider>
                  <CartProvider>
                      <CustomerAuthProvider>
                          <AppContent>{children}</AppContent>
                      </CustomerAuthProvider>
                  </CartProvider>
                </AdminProvider>
              </SettingsProvider>
            </PermissionsProvider>
          </AuthProvider>
        </AuditProvider>
      </body>
    </html>
  );
}
