'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/context/CartContext';
import { PackagePlus, X } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';

const productSchema = z.object({
  name: z.string().min(3, 'O nome do produto é obrigatório.'),
  description: z.string().min(10, 'A descrição curta é obrigatória.'),
  longDescription: z.string().min(20, 'A descrição longa é obrigatória.'),
  price: z.coerce.number().positive('O preço deve ser um número positivo.'),
  category: z.string().min(1, 'A categoria é obrigatória.'),
  stock: z.coerce.number().int().min(0, 'O estoque não pode ser negativo.'),
  imageUrls: z.array(z.string()).min(1, 'Pelo menos uma imagem é obrigatória.'),
});

type ProductFormValues = z.infer<typeof productSchema>;

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
};

interface ProductFormProps {
    productToEdit?: Product | null;
    onFinished: () => void;
}

export default function ProductForm({ productToEdit, onFinished }: ProductFormProps) {
  const { addProduct, updateProduct, categories } = useCart();
  const [imagePreviews, setImagePreviews] = useState<string[]>(productToEdit?.imageUrls || []);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: productToEdit || {
      name: '',
      description: '',
      longDescription: '',
      price: 0,
      category: '',
      stock: 0,
      imageUrls: [],
    },
  });

  const price = form.watch('price');
  const installmentValue = price > 0 ? price / 10 : 0;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const currentPreviews = form.getValues('imageUrls') || [];
      const filePromises = Array.from(files).map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      Promise.all(filePromises).then(newPreviews => {
        const allPreviews = [...currentPreviews, ...newPreviews];
        setImagePreviews(allPreviews);
        form.setValue('imageUrls', allPreviews, { shouldValidate: true });
      });
    }
  };
  
  const removeImage = (index: number) => {
      const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
      setImagePreviews(updatedPreviews);
      form.setValue('imageUrls', updatedPreviews, { shouldValidate: true });
  }

  function onSubmit(values: ProductFormValues) {
    if (productToEdit) {
        updateProduct({ ...productToEdit, ...values });
    } else {
        addProduct(values);
    }
    form.reset();
    setImagePreviews([]);
    onFinished();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-6">
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome do Produto</FormLabel><FormControl><Input placeholder="Ex: Smartphone Pro Z" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Descrição Curta</FormLabel><FormControl><Textarea placeholder="Descreva os detalhes do produto..." {...field} rows={3} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="longDescription" render={({ field }) => ( <FormItem><FormLabel>Descrição Longa</FormLabel><FormControl><Textarea placeholder="Forneça uma descrição completa e detalhada do produto." {...field} rows={6} /></FormControl><FormMessage /></FormItem> )} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Preço (R$)</FormLabel> <FormControl> <Input type="number" step="0.01" {...field} /> </FormControl> {price > 0 && ( <p className="text-sm text-muted-foreground mt-2"> 10x de {formatCurrency(installmentValue)} </p> )} <FormMessage /> </FormItem> )} />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="">Selecione uma categoria</option>
                              {categories.map((cat) => (
                                <option key={cat} value={cat} className="capitalize">{cat}</option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="stock" render={({ field }) => ( <FormItem> <FormLabel>Estoque</FormLabel> <FormControl> <Input type="number" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                </div>
            </div>

            <div className="space-y-4">
                 <FormField control={form.control} name="imageUrls" render={() => ( <FormItem> <FormLabel>Imagens do Produto</FormLabel> <FormControl> <Input type="file" accept="image/*" onChange={handleImageChange} multiple className="file:text-primary file:font-semibold cursor-pointer"/> </FormControl> <FormMessage /> </FormItem> )} />
                
                <ScrollArea className="h-80 w-full rounded-md border">
                    <div className="p-4">
                        <h4 className="mb-4 font-medium text-sm leading-none">Pré-visualização</h4>
                         {imagePreviews.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                                {imagePreviews.map((src, index) => (
                                    <div key={index} className="relative group">
                                        <Image src={src} alt={`Preview ${index}`} width={100} height={100} className="w-full h-auto object-contain rounded-md aspect-square" />
                                        <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeImage(index)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                         ) : (
                            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                <p>Nenhuma imagem selecionada</p>
                            </div>
                         )}
                    </div>
                </ScrollArea>
            </div>
        </div>

        <Button type="submit" size="lg" className="w-full">
          <PackagePlus className="mr-2 h-5 w-5" />
          {productToEdit ? 'Salvar Alterações' : 'Cadastrar Produto'}
        </Button>
      </form>
    </Form>
  );
}
