
'use client';

import { ReactNode, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, Shield } from 'lucide-react';
import AdminNav from "@/components/AdminNav";
import { Button } from "@/components/ui/button";
import { useAudit } from "@/context/AuditContext";
import { hasAccess, type AppSection } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";

const pathToSectionMap: { [key: string]: AppSection } = {
    '/admin/orders': 'orders',
    '/admin/customers': 'customers',
    '/admin/products': 'products',
    '/admin/categories': 'categories',
    '/admin/financeiro': 'financeiro',
    '/admin/auditoria': 'auditoria',
    '/admin/configuracao': 'configuracao',
    '/admin/users': 'users',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { logAction } = useAudit();
    const { toast } = useToast();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
            return;
        }

        if (!isLoading && isAuthenticated && user) {
            const currentSection = Object.entries(pathToSectionMap).find(([path]) => pathname.startsWith(path))?.[1];
            
            if (currentSection && !hasAccess(user.role, currentSection)) {
                toast({
                    title: "Acesso Negado",
                    description: "Você não tem permissão para acessar esta página.",
                    variant: "destructive"
                });
                router.push('/admin/orders');
            }
        }
    }, [isLoading, isAuthenticated, user, router, pathname, toast]);

    if (isLoading || !isAuthenticated || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <p>Verificando autenticação...</p>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-8">
            <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
                <div className="flex items-center gap-4">
                    <Shield className="h-10 w-10 text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold font-headline text-primary">Painel Administrativo</h1>
                        <p className="text-muted-foreground">Gerencie sua loja de forma fácil e rápida.</p>
                    </div>
                </div>
                 <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                    </div>
                    <Button variant="outline" onClick={() => logout(logAction)}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair
                    </Button>
                </div>
            </header>
            <AdminNav />
            <main>{children}</main>
        </div>
    );
}
