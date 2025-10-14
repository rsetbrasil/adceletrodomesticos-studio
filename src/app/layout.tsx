

'use client';

import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { PermissionsProvider } from '@/context/PermissionsContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Toaster } from '@/components/ui/toaster';
import { usePathname } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { AuditProvider } from '@/context/AuditContext';

// This is a new component that wraps the main content
// It has access to all the contexts defined in the main RootLayout
const AppContent = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const isSpecialRoute = pathname.startsWith('/carnet') || pathname.startsWith('/login');
  const isAdminRoute = pathname.startsWith('/admin');

  return (
    <>
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
    </>
  );
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isFirebaseConfigured = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'SUA_API_KEY';

  if (!isFirebaseConfigured) {
    return (
       <html lang="pt-BR" suppressHydrationWarning>
        <head>
          <title>Erro de Configuração - ADC MÓVEIS E ELETROS</title>
        </head>
        <body className="font-body antialiased">
          <div className="flex h-screen w-full items-center justify-center bg-background p-4">
            <div className="max-w-2xl rounded-lg border-2 border-destructive bg-card p-8 text-center shadow-lg">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <h1 className="text-2xl font-bold text-destructive">Erro de Configuração do Firebase</h1>
                <p className="mt-4 text-foreground">
                  As variáveis de ambiente do Firebase não foram configuradas corretamente.
                </p>
                <p className="mt-2 text-muted-foreground">
                  Para corrigir isso, crie um arquivo chamado <code className="font-mono bg-muted p-1 rounded-sm">.env.local</code> na raiz do projeto e preencha com as suas credenciais do Firebase.
                </p>
                <div className="mt-6 text-left bg-muted p-4 rounded-md text-sm overflow-auto">
                    <pre><code>
{`NEXT_PUBLIC_FIREBASE_API_KEY="SUA_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="SEU_AUTH_DOMAIN"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="SEU_PROJECT_ID"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="SEU_STORAGE_BUCKET"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="SEU_MESSAGING_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="SEU_APP_ID"`}
                    </code></pre>
                </div>
                 <p className="mt-4 text-xs text-muted-foreground">
                    Você pode encontrar essas credenciais nas configurações do seu projeto no console do Firebase. Após salvar o arquivo, reinicie o servidor de desenvolvimento.
                </p>
            </div>
          </div>
        </body>
      </html>
    )
  }

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
        <AuthProvider>
          <AuditProvider>
            <PermissionsProvider>
              <SettingsProvider>
                <CartProvider>
                  <AppContent>{children}</AppContent>
                </CartProvider>
              </SettingsProvider>
            </PermissionsProvider>
          </AuditProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
