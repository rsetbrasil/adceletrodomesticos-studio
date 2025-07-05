'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Users, KeyRound, UserCog } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';


const userFormSchema = z.object({
    name: z.string().min(3, 'O nome é obrigatório.'),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  }).refine(data => {
    if (data.password && data.password.length < 6) {
        return false;
    }
    return true;
  }, {
    message: 'A senha deve ter pelo menos 6 caracteres.',
    path: ['password'],
  }).refine(data => data.password === data.confirmPassword, {
    message: 'As senhas não correspondem.',
    path: ['confirmPassword'],
});

export default function ManageUsersPage() {
    const { user: currentUser, users, updateUser } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);

    const form = useForm<z.infer<typeof userFormSchema>>({
        resolver: zodResolver(userFormSchema),
    });

    useEffect(() => {
        if (currentUser && currentUser.role !== 'admin') {
            toast({ title: 'Acesso Negado', description: 'Você não tem permissão para acessar esta página.', variant: 'destructive' });
            router.push('/admin/orders');
        }
    }, [currentUser, router, toast]);

    const handleOpenEditDialog = (user: User) => {
        setUserToEdit(user);
        form.reset({ name: user.name, password: '', confirmPassword: '' });
        setIsEditDialogOpen(true);
    };

    const handleSaveChanges = (values: z.infer<typeof userFormSchema>) => {
        if (!userToEdit) return;
        
        const dataToUpdate: Partial<User> = { name: values.name };
        if (values.password) {
            dataToUpdate.password = values.password;
        }

        updateUser(userToEdit.id, dataToUpdate);
        setIsEditDialogOpen(false);
    };

    if (currentUser?.role !== 'admin') {
        return (
            <div className="flex justify-center items-center py-24">
                <p>Redirecionando...</p>
            </div>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserCog className="h-6 w-6" /> Gerenciar Usuários
                    </CardTitle>
                    <CardDescription>Edite as informações e senhas dos usuários do sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="rounded-md border">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Usuário</TableHead>
                                    <TableHead>Perfil</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.username}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(user)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Editar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Editar Usuário</DialogTitle>
                        <DialogDescription>
                            Altere o nome ou defina uma nova senha para <span className="font-bold">{userToEdit?.username}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSaveChanges)} className="space-y-6 py-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="space-y-2 pt-4 border-t">
                                 <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><KeyRound className="h-4 w-4" /> Alterar Senha (Opcional)</p>
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nova Senha</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                                            </FormControl>
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
                                            <FormControl>
                                                <Input type="password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit">Salvar Alterações</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
}