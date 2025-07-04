'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Trash, Edit, PackageSearch } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import ProductForm from '@/components/ProductForm';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function ManageProductsPage() {
    const { products, deleteProduct } = useCart();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);

    const handleAddNew = () => {
        setProductToEdit(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (product: Product) => {
        setProductToEdit(product);
        setIsDialogOpen(true);
    };
    
    const handleDelete = (productId: string) => {
        deleteProduct(productId);
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gerenciar Produtos</CardTitle>
                        <CardDescription>Adicione, edite ou remova produtos do seu catálogo.</CardDescription>
                    </div>
                    <Button onClick={handleAddNew}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Produto
                    </Button>
                </CardHeader>
                <CardContent>
                    {products.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Imagem</TableHead>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Categoria</TableHead>
                                        <TableHead className="text-right">Preço</TableHead>
                                        <TableHead className="text-center">Estoque</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell>
                                                <div className="relative h-12 w-12 rounded-md overflow-hidden">
                                                    <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell className="capitalize">{product.category}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                                            <TableCell className="text-center">{product.stock}</TableCell>
                                            <TableCell className="text-right">
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Abrir menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEdit(product)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDelete(product.id)}>
                                                            <Trash className="mr-2 h-4 w-4" />
                                                            Excluir
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                            <PackageSearch className="mx-auto h-12 w-12" />
                            <h3 className="mt-4 text-lg font-semibold">Nenhum produto cadastrado</h3>
                            <p className="mt-1 text-sm">Adicione seu primeiro produto para começar a vender.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                        <DialogTitle>{productToEdit ? 'Editar Produto' : 'Cadastrar Novo Produto'}</DialogTitle>
                        <DialogDescription>
                            {productToEdit ? 'Faça alterações nas informações do produto.' : 'Preencha os campos para adicionar um item ao catálogo.'}
                        </DialogDescription>
                    </DialogHeader>
                    <ProductForm
                        productToEdit={productToEdit}
                        onFinished={() => setIsDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
