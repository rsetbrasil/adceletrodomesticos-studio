

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
import ChatWidget from '@/components/ChatWidget';
import { DataProvider } from '@/context/DataContext';
import { AdminProvider } from '@/context/AdminContext';
import { ThemeProvider } from "next-themes";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter } from 'next/font/google';
import ScrollButtons from '@/components/ScrollButtons';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });


const AppContent = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const isSpecialRoute = pathname.startsWith('/carnet') || pathname.startsWith('/login') || pathname.startsWith('/area-cliente');
  const isAdminRoute = pathname.startsWith('/admin');
  const isHomePage = pathname === '/';

  return (
    <AdminProvider>
      {isSpecialRoute ? (
        <>{children}</>
      ) : isAdminRoute ? (
         <>{children}</>
      ) : (
        <div className="relative flex min-h-screen flex-col bg-background">
          <Header />
          <main className={cn("flex-1", isHomePage ? '' : 'pb-20')}>{children}</main>
          <Footer />
          <ChatWidget />
          <ScrollButtons />
        </div>
      )}
      <Toaster />
      <FirebaseErrorListener />
    </AdminProvider>
  );
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  return (
    <html lang="pt-BR" suppressHydrationWarning className={cn(inter.variable, isHomePage && 'light')}>
      <head>
        <title>ADC MÓVEIS E ELETROS</title>
        <meta name="description" content="ADC MÓVEIS E ELETROS - Sua loja de móveis e eletrodomésticos." />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <AuditProvider>
            <AuthProvider>
                <PermissionsProvider>
                <SettingsProvider>
                    <DataProvider>
                    <CustomerAuthProvider>
                        <CartProvider>
                        <AppContent>{children}</AppContent>
                        </CartProvider>
                    </CustomerAuthProvider>
                    </DataProvider>
                </SettingsProvider>
                </PermissionsProvider>
            </AuthProvider>
            </AuditProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
