

'use client';

import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, Shield, Store, KeyRound } from 'lucide-react';
import AdminNav from "@/components/AdminNav";
import { Button } from "@/components/ui/button";
import { hasAccess, type AppSection } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/context/PermissionsContext";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'A senha atual é obrigatória.'),
  newPassword: z.string().min(6, 'A nova senha deve ter pelo menos 6 caracteres.'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'As senhas não correspondem.',
  path: ['confirmPassword'],
});

const pathToSectionMap: { [key: string]: AppSection } = {
    '/admin/orders': 'orders',
    '/admin/customers': 'customers',
    '/admin/products': 'products',
    '/admin/categories': 'categories',
    '/admin/financeiro': 'financeiro',
    '/admin/minhas-comissoes': 'minhas-comissoes',
    '/admin/auditoria': 'auditoria',
    '/admin/configuracao': 'configuracao',
    '/admin/users': 'users',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
    const { user, isAuthenticated, isLoading, logout, changeMyPassword } = useAuth();
    const { permissions, isLoading: permissionsLoading } = usePermissions();
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

    const form = useForm<z.infer<typeof changePasswordSchema>>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        }
    });

    useEffect(() => {
        const totalLoading = isLoading || permissionsLoading;
        if (!totalLoading && !isAuthenticated) {
            router.push('/login');
            return;
        }

        if (!totalLoading && isAuthenticated && user && permissions) {
            // Find the most specific matching path
            const currentSection = Object.entries(pathToSectionMap)
                .filter(([path]) => pathname.startsWith(path))
                .sort((a,b) => b[0].length - a[0].length)[0]?.[1];
            
            if (currentSection && !hasAccess(user.role, currentSection, permissions)) {
                toast({
                    title: "Acesso Negado",
                    description: "Você não tem permissão para acessar esta página.",
                    variant: "destructive"
                });
                router.push('/admin/orders');
            }
        }
    }, [isLoading, permissionsLoading, isAuthenticated, user, permissions, router, pathname, toast]);

    const handlePasswordChange = async (values: z.infer<typeof changePasswordSchema>) => {
        const success = await changeMyPassword(values.currentPassword, values.newPassword);
        if (success) {
            setIsPasswordDialogOpen(false);
            form.reset();
        }
    };

    if (isLoading || permissionsLoading || !isAuthenticated || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <p>Verificando autenticação e permissões...</p>
            </div>
        );
    }
    
    return (
        <>
            <div className="container mx-auto px-4 py-8">
                <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
                    <div className="flex items-center gap-4">
                        <Shield className="h-10 w-10 text-primary" />
                        <div>
                            <h1 className="text-3xl font-bold font-headline text-primary">Painel Administrativo</h1>
                            <p className="text-muted-foreground">Gerencie sua loja de forma fácil e rápida.</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/">
                                <Store className="mr-2 h-4 w-4" />
                                Voltar ao Catálogo
                            </Link>
                        </Button>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="font-semibold">{user.name}</p>
                                <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                            </div>
                             <div className="flex flex-col gap-1">
                                <Button variant="outline" size="sm" onClick={() => setIsPasswordDialogOpen(true)}>
                                    <KeyRound className="mr-2 h-4 w-4" />
                                    Alterar Senha
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => logout()}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sair
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>
                <AdminNav />
                <main>{children}</main>
            </div>

            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Alterar Minha Senha</DialogTitle>
                        <DialogDescription>
                            Para sua segurança, informe sua senha atual antes de definir uma nova.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handlePasswordChange)} className="space-y-4 py-4">
                            <FormField
                                control={form.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Senha Atual</FormLabel>
                                        <FormControl><Input type="password" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nova Senha</FormLabel>
                                        <FormControl><Input type="password" placeholder="Mínimo 6 caracteres" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirmar Nova Senha</FormLabel>
                                        <FormControl><Input type="password" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={form.formState.isSubmitting}>Salvar Nova Senha</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
}
