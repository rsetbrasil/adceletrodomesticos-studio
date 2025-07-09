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
import { useState, useMemo } from 'react';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const productSchema = z.object({
  name: z.string().min(3, 'O nome do produto é obrigatório.'),
  description: z.string().min(10, 'A descrição curta é obrigatória.'),
  longDescription: z.string().min(20, 'A descrição longa é obrigatória.'),
  price: z.preprocess(
    (val) => (typeof val === 'string' ? String(val).replace(',', '.') : val),
    z.coerce.number().positive('O preço deve ser um número positivo.')
  ),
  category: z.string().min(1, 'A categoria é obrigatória.'),
  subcategory: z.string().optional(),
  stock: z.coerce.number().int().min(0, 'O estoque não pode ser negativo.'),
  imageUrls: z.array(z.string()).min(1, 'Pelo menos uma imagem é obrigatória.'),
  maxInstallments: z.coerce.number().int().min(1, 'O número mínimo de parcelas é 1.'),
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
    defaultValues: productToEdit ? 
    {
      ...productToEdit,
      maxInstallments: productToEdit.maxInstallments || 10,
    }
    : {
      name: '',
      description: '',
      longDescription: '',
      price: 0,
      category: '',
      subcategory: '',
      stock: 0,
      imageUrls: [],
      maxInstallments: 10,
    },
  });

  const price = form.watch('price');
  const maxInstallments = form.watch('maxInstallments');
  const selectedCategory = form.watch('category');
  const installmentValue = price > 0 && maxInstallments > 0 ? price / maxInstallments : 0;
  
  const subcategories = useMemo(() => {
    const category = categories.find(c => c.name === selectedCategory);
    return category ? category.subcategories : [];
  }, [selectedCategory, categories]);

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
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Produto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Smartphone Pro Z" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição Curta</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descreva os detalhes do produto..." {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição Longa</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Forneça uma descrição completa e detalhada do produto." {...field} rows={6} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              {...field}
                              value={String(field.value ?? '').replace('.', ',')}
                              onChange={(e) => {
                                let value = e.target.value;
                                // Allow only numbers and a single comma
                                value = value.replace(/[^0-9,]/g, '');
                                const parts = value.split(',');
                                if (parts.length > 2) {
                                    value = parts[0] + ',' + parts.slice(1).join('');
                                }
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          {price > 0 && maxInstallments > 1 && ( <p className="text-sm text-muted-foreground mt-2"> {maxInstallments}x de {formatCurrency(installmentValue)} </p> )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estoque</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue('subcategory', ''); // Reset subcategory on change
                            }} 
                            defaultValue={field.value}
                           >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.name} value={cat.name} className="capitalize">
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="subcategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcategoria</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={subcategories.length === 0}
                          >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma subcategoria" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {subcategories.map((sub) => (
                                    <SelectItem key={sub} value={sub} className="capitalize">
                                        {sub}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxInstallments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parcelas Máximas</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
            </div>

            <div className="space-y-4">
                 <FormField
                   control={form.control}
                   name="imageUrls"
                   render={() => (
                     <FormItem>
                       <FormLabel>Imagens do Produto</FormLabel>
                       <FormControl>
                         <Input type="file" accept="image/*" onChange={handleImageChange} multiple className="file:text-primary file:font-semibold cursor-pointer"/>
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                
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
