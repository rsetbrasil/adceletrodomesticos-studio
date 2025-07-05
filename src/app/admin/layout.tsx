'use client';

import { ReactNode, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LogOut, Shield } from 'lucide-react';
import AdminNav from "@/components/AdminNav";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }: { children: ReactNode }) {
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isLoading, isAuthenticated, router]);

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
                    <Button variant="outline" onClick={logout}>
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
