'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash, Edit, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function ManageCategoriesPage() {
    const { categories, addCategory, updateCategory, deleteCategory } = useCart();
    const { toast } = useToast();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryToEdit, setCategoryToEdit] = useState<{ oldName: string, newName: string } | null>(null);

    const handleAddCategory = () => {
        if (!newCategoryName.trim()) {
            toast({ title: "Erro", description: "O nome da categoria não pode ser vazio.", variant: "destructive" });
            return;
        }
        addCategory(newCategoryName.trim());
        setNewCategoryName('');
        setIsAddDialogOpen(false);
    };

    const handleOpenEditDialog = (categoryName: string) => {
        setCategoryToEdit({ oldName: categoryName, newName: categoryName });
        setIsEditDialogOpen(true);
    };
    
    const handleUpdateCategory = () => {
        if (!categoryToEdit || !categoryToEdit.newName.trim()) {
            toast({ title: "Erro", description: "O nome da categoria não pode ser vazio.", variant: "destructive" });
            return;
        }
        if (categoryToEdit.oldName !== categoryToEdit.newName) {
            updateCategory(categoryToEdit.oldName, categoryToEdit.newName.trim());
        }
        setCategoryToEdit(null);
        setIsEditDialogOpen(false);
    };

    const handleDeleteCategory = (categoryName: string) => {
        deleteCategory(categoryName);
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gerenciar Categorias</CardTitle>
                        <CardDescription>Adicione, edite ou remova categorias de produtos.</CardDescription>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Adicionar Categoria
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Adicionar Nova Categoria</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Nome</Label>
                                    <Input 
                                        id="name" 
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        className="col-span-3"
                                        placeholder="Ex: Eletrodomésticos"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" onClick={handleAddCategory}>Salvar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    {categories.length > 0 ? (
                         <div className="rounded-md border">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome da Categoria</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categories.map((category) => (
                                        <TableRow key={category}>
                                            <TableCell className="font-medium capitalize">{category}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(category)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteCategory(category)}>
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                            <Tag className="mx-auto h-12 w-12" />
                            <h3 className="mt-4 text-lg font-semibold">Nenhuma categoria encontrada</h3>
                            <p className="mt-1 text-sm">Adicione sua primeira categoria para organizar seus produtos.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Editar Categoria</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right">Nome</Label>
                            <Input 
                                id="edit-name" 
                                value={categoryToEdit?.newName || ''}
                                onChange={(e) => setCategoryToEdit(prev => prev ? { ...prev, newName: e.target.value } : null)}
                                className="col-span-3"
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleUpdateCategory}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
