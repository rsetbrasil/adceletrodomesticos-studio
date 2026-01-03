
'use client';

import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CustomerAuthProvider } from '@/context/CustomerAuthContext';
import { CartProvider } from '@/context/CartContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { PermissionsProvider } from '@/context/PermissionsContext';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { AuditProvider } from '@/context/AuditContext';
import FirebaseErrorListener from '@/components/FirebaseErrorListener';
import { DataProvider } from '@/context/DataContext';
import { AdminProvider } from '@/context/AdminContext';
import { ThemeProvider } from "next-themes";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter } from 'next/font/google';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ChatWidget from '@/components/ChatWidget';
import ScrollButtons from '@/components/ScrollButtons';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const PublicPageLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Header />
      <main className={cn("flex-1", isHomePage ? '' : 'pb-20')}>{children}</main>
      <Footer />
      <ChatWidget />
      <ScrollButtons />
    </div>
  );
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  
  const isPublicRoute = !pathname.startsWith('/admin') && !pathname.startsWith('/login') && !pathname.startsWith('/area-cliente') && !pathname.startsWith('/carnet');

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
                <CustomerAuthProvider>
                    <SettingsProvider>
                        <DataProvider>
                            <AdminProvider>
                                <PermissionsProvider>
                                    <CartProvider>
                                        {isPublicRoute ? (
                                          <PublicPageLayout>{children}</PublicPageLayout>
                                        ) : (
                                          <main>{children}</main>
                                        )}
                                        <Toaster />
                                        <FirebaseErrorListener />
                                    </CartProvider>
                                </PermissionsProvider>
                            </AdminProvider>
                        </DataProvider>
                    </SettingsProvider>
                </CustomerAuthProvider>
            </AuthProvider>
          </AuditProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
