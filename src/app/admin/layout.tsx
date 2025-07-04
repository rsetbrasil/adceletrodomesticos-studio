import { ReactNode } from "react";
import { Shield } from 'lucide-react';

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <div className="container mx-auto px-4 py-8">
            <header className="mb-8 flex items-center gap-4 border-b pb-6">
                <Shield className="h-10 w-10 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold font-headline text-primary">Painel Administrativo</h1>
                    <p className="text-muted-foreground">Gerencie seus pedidos e clientes.</p>
                </div>
            </header>
            <main>{children}</main>
        </div>
    );
}
