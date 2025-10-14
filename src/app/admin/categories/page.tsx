
'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash, Edit, Tag, ChevronDown, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Category } from '@/lib/types';

export default function ManageCategoriesPage() {
    const { categories, addCategory, deleteCategory, updateCategoryName, addSubcategory, deleteSubcategory, updateSubcategory, moveCategory } = useCart();
    const { toast } = useToast();

    const [dialogState, setDialogState] = useState<{
        mode: 'addCategory' | 'editCategory' | 'addSubcategory' | 'editSubcategory' | null;
        data?: any;
    }>( { mode: null } );

    const [inputValue, setInputValue] = useState('');

    const openDialog = (mode: typeof dialogState.mode, data?: any) => {
        setDialogState({ mode, data });
        setInputValue(data?.categoryName || data?.subName || '');
    };

    const closeDialog = () => {
        setDialogState({ mode: null });
        setInputValue('');
    };

    const handleDialogSubmit = () => {
        if (!inputValue.trim()) {
            toast({ title: "Erro", description: "O nome não pode ser vazio.", variant: "destructive" });
            return;
        }

        switch (dialogState.mode) {
            case 'addCategory':
                addCategory(inputValue.trim());
                break;
            case 'editCategory':
                updateCategoryName(dialogState.data.categoryId, inputValue.trim());
                break;
            case 'addSubcategory':
                addSubcategory(dialogState.data.categoryId, inputValue.trim());
                break;
            case 'editSubcategory':
                updateSubcategory(dialogState.data.categoryId, dialogState.data.oldSubName, inputValue.trim());
                break;
        }
        closeDialog();
    };
    
    const getDialogTitle = () => {
        switch (dialogState.mode) {
            case 'addCategory': return 'Adicionar Nova Categoria';
            case 'editCategory': return `Editar Categoria: ${dialogState.data?.categoryName}`;
            case 'addSubcategory': return `Adicionar Subcategoria em ${dialogState.data?.categoryName}`;
            case 'editSubcategory': return `Editar Subcategoria: ${dialogState.data?.oldSubName}`;
            default: return '';
        }
    };


    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gerenciar Categorias</CardTitle>
                        <CardDescription>Adicione, edite, remova e reordene categorias e subcategorias.</CardDescription>
                    </div>
                    <Button onClick={() => openDialog('addCategory')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Categoria
                    </Button>
                </CardHeader>
                <CardContent>
                    {categories.length > 0 ? (
                        <div className="space-y-2">
                            {categories.map((category, index) => (
                                <Collapsible key={category.id} className="border rounded-lg">
                                    <div className="flex items-center justify-between w-full p-4 hover:bg-muted/50 rounded-t-lg data-[state=open]:rounded-b-none group">
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveCategory(category.id, 'up')} disabled={index === 0}>
                                                <ArrowUp className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveCategory(category.id, 'down')} disabled={index === categories.length - 1}>
                                                <ArrowDown className="h-4 w-4" />
                                            </Button>
                                            <CollapsibleTrigger className="flex items-center gap-2">
                                                <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                                                <span className="font-semibold">{category.name}</span>
                                            </CollapsibleTrigger>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => openDialog('editCategory', { categoryId: category.id, categoryName: category.name })}>
                                                <Edit className="mr-2 h-4 w-4"/> Editar Nome
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => openDialog('addSubcategory', { categoryId: category.id, categoryName: category.name })}>
                                                <PlusCircle className="mr-2 h-4 w-4"/> Adicionar Subcategoria
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteCategory(category.id)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <CollapsibleContent>
                                        <div className="p-4 pt-0">
                                            {category.subcategories && category.subcategories.length > 0 ? (
                                                <ul className="space-y-2 pl-6">
                                                    {category.subcategories.map(sub => (
                                                        <li key={sub} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                                            <span>{sub}</span>
                                                            <div className="flex items-center">
                                                                <Button variant="ghost" size="icon" onClick={() => openDialog('editSubcategory', { categoryId: category.id, oldSubName: sub })}>
                                                                    <Edit className="h-4 w-4"/>
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteSubcategory(category.id, sub)}>
                                                                    <Trash className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-sm text-muted-foreground text-center pl-6 py-2">Nenhuma subcategoria.</p>
                                            )}
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            ))}
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

            <Dialog open={!!dialogState.mode} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{getDialogTitle()}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Nome</Label>
                            <Input 
                                id="name" 
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                className="col-span-3"
                                onKeyDown={(e) => e.key === 'Enter' && handleDialogSubmit()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
                        <Button type="submit" onClick={handleDialogSubmit}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
